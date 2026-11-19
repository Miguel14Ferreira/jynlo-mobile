import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,AppState,Image,Keyboard,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {JynloIcon} from './JynloIcon';
import {giphyImageUrl} from '../lib/chat-giphy.cjs';
import {chatLocationUrl} from '../lib/chat-location.cjs';
import type {ScrollViewInstance} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {C} from '../lib/theme';
import {ApiError} from '../lib/api';
import type {ImagePickerAsset} from 'expo-image-picker';
import {sendChatPhotoAlbum} from '../lib/chat-photo-album';
import {observeTeamContent} from '../lib/team-content-realtime';
import {teamPlayerAvatarUri} from '../lib/sports-teams-api';
import {appendChatMediaSelection} from '../lib/chat-attachments-core.cjs';
import SecureChatAttachment from './SecureChatAttachment';
import ChatPdfComposer from './ChatPdfComposer';
import {teamContentHistory,olderTeamFeed,reconcileTeamFeedEntries,searchTeamContent,sendTeamContent,editTeamContent,deleteTeamContent,teamReactionSummaries,setTeamReaction,removeTeamReaction,teamPrivateAttachmentsAvailable,type TeamReactionState,type TeamContentEntry,type TeamContentKind} from '../lib/sports-team-content-api';

type Props={teamId:number;kind:TeamContentKind;token:string;username:string};
/** Keep comment replies next to their post, without hiding orphaned history. */
function teamFeedCommentCounts(entries:TeamContentEntry[]):Map<number,number> {
 const byId=new Map(entries.map(item=>[item.id,item]));
 const counts=new Map<number,number>();
 const roots=new Map<number,number|null>();
 const rootOf=(item:TeamContentEntry):number|null=>{
  if(item.replyToId===null)return item.id;
  if(roots.has(item.id))return roots.get(item.id)!;
  const chain:number[]=[];
  const seen=new Set<number>();
  let current:TeamContentEntry|undefined=item;
  let root:number|null=null;
  while(current){
   if(roots.has(current.id)){root=roots.get(current.id)!;break;}
   if(seen.has(current.id)){root=null;break;}
   seen.add(current.id);chain.push(current.id);
   if(current.replyToId===null){root=current.id;break;}
   current=byId.get(current.replyToId);
  }
  for(const id of chain)roots.set(id,root);
  return root;
 };
 for(const item of entries){
  if(item.replyToId===null)continue;
  const root=rootOf(item);
  if(root!==null&&root!==item.id)
   counts.set(root,(counts.get(root)||0)+1);
 }
 return counts;
}
function orderedTeamFeed(entries:TeamContentEntry[],collapsed:Set<number>,searchActive:boolean,replyTo:number|null):TeamContentEntry[]{
 const byId=new Map(entries.map(item=>[item.id,item]));
 const rootById=new Map<number,number>();
 const rootOf=(item:TeamContentEntry):number=>{
  const cached=rootById.get(item.id);
  if(cached!==undefined)return cached;
  let current=item;
  const chain:number[]=[];
  const seen=new Set<number>();
  while(!rootById.has(current.id)&&!seen.has(current.id)){
   seen.add(current.id);
   chain.push(current.id);
   const parent=current.replyToId;
   if(parent===null||!byId.has(parent)||seen.has(parent))break;
   current=byId.get(parent)!;
  }
  const root=rootById.get(current.id)??current.id;
  for(const id of chain)rootById.set(id,root);
  return root;
 };
 const groups=new Map<number,TeamContentEntry[]>();
 for(const item of entries){
  const root=rootOf(item),group=groups.get(root)||[];
  group.push(item);groups.set(root,group);
 }
 return [...groups.entries()].sort((a,b)=>b[0]-a[0])
  .flatMap(([root,items])=>items.slice().sort((a,b)=>
   a.id===root?-1:b.id===root?1:a.id-b.id)
   .filter(item=>searchActive||item.id===root||!collapsed.has(root)||replyTo===item.id));
}

export default function SportsTeamContentPanel({teamId,kind,token,username}:Props){
 const router=useRouter();
 const [entries,setEntries]=useState<TeamContentEntry[]>([]);
 const [olderEntries,setOlderEntries]=useState<TeamContentEntry[]>([]);
 const [hasOlderPosts,setHasOlderPosts]=useState(false);
 const [olderBusy,setOlderBusy]=useState(false);
 const [olderError,setOlderError]=useState('');
 const olderPending=useRef(false);
 const olderExhausted=useRef(false);
 const olderRef=useRef<TeamContentEntry[]>([]);
 const olderReconcilePending=useRef(false),olderReconcileAt=useRef(0),olderReconcileOffset=useRef(0);
 useEffect(()=>{olderRef.current=olderEntries;},[olderEntries]);
 const [collapsedFeedPosts,setCollapsedFeedPosts]=useState<Set<number>>(()=>new Set());
 const [brokenAuthorAvatars,setBrokenAuthorAvatars]=useState<Record<number,boolean>>({});
 const historyRef=useRef<ScrollViewInstance|null>(null);
 const composerFocused=useRef(false);
 const [keyboardOpen,setKeyboardOpen]=useState(false);
 const nearLatest=useRef(true),latestId=useRef(0);
 const [unseenBelow,setUnseenBelow]=useState(false);
 useEffect(()=>{
  const open=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow',()=>{
   setKeyboardOpen(true);
   // Never pull someone away from older messages merely because a keyboard opens.
   if(kind==='chat'&&composerFocused.current&&nearLatest.current)
    historyRef.current?.scrollToEnd({animated:true});
  });
  const close=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillHide':'keyboardDidHide',()=>setKeyboardOpen(false));
  return()=>{open.remove();close.remove();};
 },[kind]);
 const [draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [syncWarning,setSyncWarning]=useState('');
 const [connection,setConnection]=useState<'connecting'|'online'|'offline'>('connecting');
 const [locationBusy,setLocationBusy]=useState(false);
 const locationRequest=useRef(false);
 const [accessRevoked,setAccessRevoked]=useState(false);
 const [blockReason,setBlockReason]=useState('Já não tens acesso a esta conversa.');
 const accessRevokedRef=useRef(false);
 const [replyTo,setReplyTo]=useState<number|null>(null);
 const feedRootDraft=useRef<{draft:string;media:ImagePickerAsset[]}>({draft:'',media:[]});
 const feedCommentDrafts=useRef(new Map<number,{draft:string;media:ImagePickerAsset[]}>());
 const [editingId,setEditingId]=useState<number|null>(null);
 const [editDraft,setEditDraft]=useState('');
 const [attachmentsEnabled,setAttachmentsEnabled]=useState(false);
 const [media,setMedia]=useState<ImagePickerAsset[]>([]);
 const [uploading,setUploading]=useState(false);
 const choosing=useRef(false);
 const [searchTerm,setSearchTerm]=useState('');
 const [searchResults,setSearchResults]=useState<TeamContentEntry[]>([]);
 const [searchActive,setSearchActive]=useState(false);
 const [searching,setSearching]=useState(false);
 const searchVersion=useRef(0);
 const searchQueryRef=useRef(''),searchActiveRef=useRef(false);
 const searchPendingRef=useRef(false),searchRecheckRef=useRef(false);
 const reactionVersion=useRef(0);
 const [reactions,setReactions]=useState<Record<number,TeamReactionState>>({});
 const [reactionBusyId,setReactionBusyId]=useState<number|null>(null);
 const [feedReactionPickerId,setFeedReactionPickerId]=useState<number|null>(null);
 const reactionBusyRef=useRef(false);
 const reactionBusyContentId=useRef<number|null>(null);
 const emojis=['👍','❤️','😂','🔥','👏'];
 const version=useRef(0),reading=useRef<number|null>(null),sendingNow=useRef(false);
 // A write remains owned by its actual team/account even across focus changes.
 // Reopening the same chat must never turn an unresolved write into a duplicate.
 const writeKey=teamId+'|'+kind+'|'+token;
 const pendingWrites=useRef(new Map<string,'media'|'text'|'edit'|'delete'>());
 const activeWriteKey=useRef('');
 const focusedIdentity=useRef('');
 const needsInitialRead=useRef(false);
 const mutationVersion=useRef(0),readRequestVersion=useRef(0),pendingRefresh=useRef(false);
 const revokeIfUnauthorized=useCallback((failure:unknown):boolean=>{
  if(!(failure instanceof ApiError)||![401,403,409].includes(failure.status))return false;
  // A revoked membership must immediately hide cached private content,
  // even when the rejection occurs during a write rather than a history GET.
  accessRevokedRef.current=true;setAccessRevoked(true);
  // Invalidate any HTTP read that started before access was revoked.
  mutationVersion.current++;readRequestVersion.current++;
  reading.current=null;pendingRefresh.current=false;setLoading(false);
  setEntries([]);setOlderEntries([]);olderRef.current=[];olderExhausted.current=false;setHasOlderPosts(false);setOlderBusy(false);setOlderError('');olderPending.current=false;
  olderReconcilePending.current=false;olderReconcileAt.current=0;olderReconcileOffset.current=0;
  setSearchResults([]);setSearchActive(false);setSearching(false);
  setBrokenAuthorAvatars({});setCollapsedFeedPosts(new Set());
  latestId.current=0;nearLatest.current=true;setUnseenBelow(false);
  searchVersion.current++;searchActiveRef.current=false;searchQueryRef.current='';searchPendingRef.current=false;searchRecheckRef.current=false;
  reactionVersion.current++;setReactions({});setFeedReactionPickerId(null);reactionBusyContentId.current=null;
  setDraft('');setReplyTo(null);setEditingId(null);setEditDraft('');
  feedRootDraft.current={draft:'',media:[]};feedCommentDrafts.current.clear();
  setMedia([]);setAttachmentsEnabled(false);setSyncWarning('');
  const message=failure.status===409?'O chat ou feed da equipa foi desativado pelo responsável.':'Já não tens acesso a esta conversa.';
  setBlockReason(message);setError(message);
  return true;
 },[]);
 const rejectPrivateUpload=(failure:unknown):boolean=>{
  // Multipart uploads use expo/fetch and raise a user-facing Error, rather
  // than ApiError. Only explicit authorization failures revoke local access.
  if(!(failure instanceof Error))return false;
  if(/^O (?:chat|feed) da equipa está desativado/i.test(failure.message))
   return revokeIfUnauthorized(new ApiError(409,'Conversa desativada.'));
  if(!/^(?:A sessão expirou|Já não tens permissão para enviar)/i.test(failure.message))return false;
  return revokeIfUnauthorized(new ApiError(403,'Acesso à conversa revogado.'));
 };
 const loadReactions=useCallback(async(items:TeamContentEntry[])=>{
  // Never replace an optimistic reaction with a stale background summary.
  const ids=items.filter(item=>!item.deleted&&item.id!==reactionBusyContentId.current).slice(-100).map(item=>item.id);
  if(!ids.length)return;
  const current=++reactionVersion.current;
  const conversation=version.current;
  try{
   const updated=await teamReactionSummaries(teamId,kind,ids,token);
   if(current===reactionVersion.current&&conversation===version.current&&!accessRevokedRef.current)
    setReactions(previous=>({...previous,...updated}));
  }catch(e){
   // Reading private reaction totals must enforce the same membership rules
   // as history and message mutations.
   if(current===reactionVersion.current&&conversation===version.current)
    revokeIfUnauthorized(e);
  }
 },[teamId,kind,token,revokeIfUnauthorized]);
 const invalidatePendingRead=()=>{
  // Reads started before a write must not overwrite newly saved messages.
  mutationVersion.current++;
  reading.current=null;
  pendingRefresh.current=false;
 };
 const reconcileOlder=useCallback(async(expected:number)=>{
  const older=olderRef.current;
  if(kind!=='feed'||!older.length||olderPending.current||olderReconcilePending.current
    ||sendingNow.current||accessRevokedRef.current||Date.now()-olderReconcileAt.current<30000)return;
  olderReconcileAt.current=Date.now();
  const start=olderReconcileOffset.current%older.length;
  const ids=older.slice(start,start+100).map(item=>item.id);
  olderReconcileOffset.current=start+ids.length>=older.length?0:start+ids.length;
  if(!ids.length)return;
  olderReconcilePending.current=true;
  const writeVersion=mutationVersion.current;
  try{
   const updated=await reconcileTeamFeedEntries(teamId,ids,token);
   if(expected!==version.current||accessRevokedRef.current)return;
   if(writeVersion!==mutationVersion.current){olderReconcileAt.current=0;return;}
   const fresh=new Map(updated.map(item=>[item.id,item]));
   const requested=new Set(ids);
   setOlderEntries(previous=>previous.filter(item=>!requested.has(item.id)||fresh.has(item.id))
    .map(item=>fresh.get(item.id)||item));
   if(updated.length)void loadReactions(updated);
  }catch(failure){
   if(expected===version.current&&!accessRevokedRef.current)revokeIfUnauthorized(failure);
  }finally{
   if(expected===version.current)olderReconcilePending.current=false;
  }
 },[teamId,kind,token,loadReactions,revokeIfUnauthorized]);
 const refresh=useCallback(async(quiet=false,expected=version.current,revalidateBlocked=false)=>{
  // Only deduplicate requests within the same conversation generation.
  // An old request must never block loading a newly focused team.
  if(reading.current===expected){pendingRefresh.current=true;return;}
  if(sendingNow.current||(accessRevokedRef.current&&!revalidateBlocked))return;
  reading.current=expected;
  const readRequest=++readRequestVersion.current;
  const writeVersion=mutationVersion.current;
  if(!quiet){setLoading(true);setError('');}
  try{
   const history=await teamContentHistory(teamId,kind,token);
   if(expected!==version.current||writeVersion!==mutationVersion.current)return;
   const wasBlocked=accessRevokedRef.current;
   accessRevokedRef.current=false;setAccessRevoked(false);
   setBlockReason('Já não tens acesso a esta conversa.');setError('');
   setEntries(history);
   if(kind==='feed'){
    setOlderEntries(previous=>previous.filter(old=>!history.some(row=>row.id===old.id)));
    if(history.length<100){
     olderExhausted.current=true;
     setHasOlderPosts(false);
    }else if(!olderPending.current)
     setHasOlderPosts(!olderExhausted.current);
   }
   // Reconcile visible search hits with authenticated history after live edits
   // and deletions without resetting the user's search or scroll position.
   setSearchResults(previous=>{
    if(!previous.length)return previous;
    const latest=new Map(history.map(item=>[item.id,item]));
    return previous.map(item=>latest.get(item.id)||item);
   });
   setSyncWarning('');void loadReactions(history);
   void reconcileOlder(expected);
   // Results outside the 100 newest messages also need revalidation after
   // content-free WebSocket hints. Keep the search view and scroll stable.
   const query=searchQueryRef.current,searchGeneration=searchVersion.current;
   if(searchActiveRef.current&&!searchPendingRef.current&&!searchRecheckRef.current
      &&query.length>=2&&query.length<=80){
    searchRecheckRef.current=true;
    void searchTeamContent(teamId,kind,query,token).then(results=>{
     if(expected!==version.current||searchGeneration!==searchVersion.current
        ||!searchActiveRef.current||searchQueryRef.current!==query||accessRevokedRef.current)return;
     setSearchResults(results);void loadReactions(results);
    }).catch(failure=>{
     if(expected===version.current&&searchGeneration===searchVersion.current){
      if(!revokeIfUnauthorized(failure))
       setSyncWarning('Não foi possível sincronizar os resultados da pesquisa.');
     }
    }).finally(()=>{if(expected===version.current)searchRecheckRef.current=false;});
   }
   if(wasBlocked){
    void teamPrivateAttachmentsAvailable(teamId,kind,token).then(available=>{
     if(expected===version.current&&!accessRevokedRef.current)setAttachmentsEnabled(available);
    }).catch(failure=>{
     if(expected===version.current){
      setAttachmentsEnabled(false);
      revokeIfUnauthorized(failure);
     }
    });
   }
  }catch(e){
   if(expected!==version.current||writeVersion!==mutationVersion.current)return;
   if(revokeIfUnauthorized(e))return;
   const message=e instanceof Error?e.message:'Não foi possível carregar as mensagens.';
   if(quiet)setSyncWarning('A sincronização falhou. As mensagens podem estar desatualizadas.');
   else setError(message);
  }finally{
   if(reading.current===expected&&readRequestVersion.current===readRequest){
    reading.current=null;
    if(pendingRefresh.current&&expected===version.current&&!sendingNow.current){
     pendingRefresh.current=false;
     void refresh(true,expected);
    }
   }
   if(!quiet&&expected===version.current)setLoading(false);
  }
 },[teamId,kind,token,loadReactions,revokeIfUnauthorized,reconcileOlder]);
 useFocusEffect(useCallback(()=>{
  const current=++version.current;
  // Old async work belongs to the previous team/account. Reset all mutation
  // locks and request ownership before loading this conversation.
  mutationVersion.current++;readRequestVersion.current++;
  reading.current=null;pendingRefresh.current=false;
  const changedConversation=focusedIdentity.current!==writeKey;
  focusedIdentity.current=writeKey;
  activeWriteKey.current=writeKey;
  const pendingKind=pendingWrites.current.get(writeKey);
  needsInitialRead.current=!!pendingKind;
  sendingNow.current=!!pendingKind;
  reactionBusyRef.current=false;reactionBusyContentId.current=null;choosing.current=false;
  setSending(!!pendingKind);setUploading(pendingKind==='media');setReactionBusyId(null);setLoading(true);
  setConnection('connecting');locationRequest.current=false;setLocationBusy(false);
  latestId.current=0;nearLatest.current=true;setUnseenBelow(false);
  accessRevokedRef.current=false;setAccessRevoked(false);setBlockReason('Já não tens acesso a esta conversa.');
  setEntries([]);setOlderEntries([]);olderRef.current=[];olderExhausted.current=false;setHasOlderPosts(false);setOlderBusy(false);setOlderError('');olderPending.current=false;
  olderReconcilePending.current=false;olderReconcileAt.current=0;olderReconcileOffset.current=0;
  setBrokenAuthorAvatars({});
  if(changedConversation){setDraft('');setReplyTo(null);setEditingId(null);setEditDraft('');
   feedRootDraft.current={draft:'',media:[]};feedCommentDrafts.current.clear();}
  setError('');setSyncWarning('');
  searchVersion.current++;searchActiveRef.current=false;searchQueryRef.current='';
  searchPendingRef.current=false;searchRecheckRef.current=false;
  setSearchTerm('');setSearchResults([]);setSearchActive(false);
  reactionVersion.current++;setReactions({});setFeedReactionPickerId(null);
  if(changedConversation)setMedia([]);
  setAttachmentsEnabled(false);setSearching(false);
  void teamPrivateAttachmentsAvailable(teamId,kind,token).then(available=>{
   if(version.current===current&&!accessRevokedRef.current)setAttachmentsEnabled(available);
  }).catch(failure=>{
   // Authorization errors may arrive before the first history response.
   // Never leave an unhandled Promise rejection or expose stale attachment controls.
   if(version.current===current&&!accessRevokedRef.current){
    setAttachmentsEnabled(false);
    revokeIfUnauthorized(failure);
   }
  });
  void refresh(false,current);
  // Authenticated WebSocket signals trigger immediate HTTP refresh. Polling
  // remains a fallback for disconnected devices and missed events.
  let socketOnline=false;
  const stopObserving=observeTeamContent({teamId,kind,token,
   onInvalidated:()=>{if(version.current===current&&AppState.currentState==='active')void refresh(true,current,true);},
   onStatus:status=>{if(version.current===current){socketOnline=status==='online';setConnection(status);}}
  });
  let pollTicks=0;
  const timer=setInterval(()=>{
   // Even a connected socket can miss a server event: reconcile once every
   // 30 seconds online, and every 5 seconds while disconnected.
   if(AppState.currentState!=='active')return;
   pollTicks++;
   if(!socketOnline||pollTicks%6===0)void refresh(true,current,true);
  },5000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active')void refresh(true,current,true);
  });
  return()=>{clearInterval(timer);resume.remove();stopObserving();pendingRefresh.current=false;
   if(activeWriteKey.current===writeKey)activeWriteKey.current='';
   version.current++;searchVersion.current++;reactionVersion.current++;};
 },[refresh,writeKey]));
 const chooseMedia=async(source:'gallery'|'camera'='gallery')=>{
  if(!attachmentsEnabled||choosing.current||sendingNow.current||accessRevokedRef.current)return;
  const current=version.current;
  choosing.current=true;setError('');
  try{
   const ImagePicker=await import('expo-image-picker');
   if(source==='camera'){
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted)throw Error('É necessária permissão para utilizar a câmara.');
   }
   const chosen=source==='camera'
    ?await ImagePicker.launchCameraAsync({
      mediaTypes:['images','videos'],quality:.8,exif:false,base64:false,videoMaxDuration:30
     })
    :await ImagePicker.launchImageLibraryAsync({
      mediaTypes:['images','videos'],allowsMultipleSelection:true,
      selectionLimit:Math.max(1,4-media.length),quality:.8,exif:false,base64:false
     });
   if(chosen.canceled||!chosen.assets?.length||current!==version.current||accessRevokedRef.current)return;
   const next=appendChatMediaSelection(media,chosen.assets);
   if(next.error)throw Error(next.error);
   setMedia(next.items);
  }catch(e){if(current===version.current)
    setError(e instanceof Error?e.message:'Não foi possível selecionar os anexos.');}
  finally{if(current===version.current)choosing.current=false;}
 };
 const switchReply=(id:number|null)=>{
  if(sendingNow.current||accessRevokedRef.current)return;
  if(kind!=='feed'){setReplyTo(current=>current===id?null:id);return;}
  if(id!==null)setCollapsedFeedPosts(previous=>{const next=new Set(previous);next.delete(id);return next;});
  if(replyTo===null)feedRootDraft.current={draft,media};
  else feedCommentDrafts.current.set(replyTo,{draft,media});
  const target=replyTo===id?null:id;
  const restored=target===null?feedRootDraft.current:feedCommentDrafts.current.get(target);
  setDraft(restored?.draft||'');setMedia(restored?.media||[]);
  setReplyTo(target);
 };
 const sendMedia=async()=>{
  if(!media.length||sendingNow.current||pendingWrites.current.has(writeKey)||!attachmentsEnabled)return;
  pendingWrites.current.set(writeKey,'media');
  sendingNow.current=true;invalidatePendingRead();setUploading(true);setSending(true);setError('');
  const current=version.current,selection=[...media],submittedDraft=draft,submittedReply=replyTo;
  try{
   await sendChatPhotoAlbum({scope:'team',id:teamId,kind},token,selection,submittedReply,submittedDraft);
   // A send may finish after returning to this same team. Clear only the
   // submitted values; never mutate a different team/account's composer.
   if(activeWriteKey.current!==writeKey||accessRevokedRef.current)return;
   setMedia(previous=>previous===media?[]:previous);
   if(kind==='feed'&&submittedReply!==null){
    feedCommentDrafts.current.delete(submittedReply);
    const original=feedRootDraft.current;
    setDraft(original.draft);setMedia(original.media);
    feedRootDraft.current={draft:'',media:[]};
    setReplyTo(current=>current===submittedReply?null:current);
   }else{
    setDraft(previous=>previous===submittedDraft?'':previous);
    setReplyTo(previous=>previous===submittedReply?null:previous);
   }
  }catch(e){
   if(current===version.current&&!rejectPrivateUpload(e))
    setError((e instanceof Error?e.message:'Envio não confirmado.')+
     ' Confirma o histórico antes de repetir.');
  }finally{
   pendingWrites.current.delete(writeKey);
   if(activeWriteKey.current===writeKey){
    sendingNow.current=false;setUploading(false);setSending(false);
    const initial=needsInitialRead.current;needsInitialRead.current=false;
    void refresh(!initial,version.current);
   }
  }
 };
 const send=async()=>{
  // One explicit publish action for text, albums and captioned media.
  if(media.length){await sendMedia();return;}
  const message=draft.trim();
  if(!message||sendingNow.current||pendingWrites.current.has(writeKey)||!token)return;
  pendingWrites.current.set(writeKey,'text');
  sendingNow.current=true;invalidatePendingRead();setSending(true);setError('');
  const current=version.current,submittedReply=replyTo;
  try{
   const saved=await sendTeamContent(teamId,kind,message,token,submittedReply);
   if(activeWriteKey.current!==writeKey||accessRevokedRef.current)return;
   // The authenticated history can still be loading after a refocus.
   // Append the confirmed item only if this is the current generation;
   // the follow-up HTTP refresh is the source of truth otherwise.
   if(current===version.current)
    setEntries(previous=>previous.some(item=>item.id===saved.id)?previous:[...previous,saved].sort((a,b)=>a.id-b.id));
   if(kind==='feed'&&submittedReply!==null){
    feedCommentDrafts.current.delete(submittedReply);
    const original=feedRootDraft.current;
    setDraft(original.draft);setMedia(original.media);
    feedRootDraft.current={draft:'',media:[]};
    setReplyTo(current=>current===submittedReply?null:current);
   }else{
    setDraft(previous=>previous===draft?'':previous);
    setReplyTo(previous=>previous===submittedReply?null:previous);
   }
  }catch(e){
   if(current===version.current&&!revokeIfUnauthorized(e))
    setError((e instanceof Error?e.message:'Envio não confirmado.')+
      ' Consulta o histórico antes de repetires a operação.');
  }finally{
   pendingWrites.current.delete(writeKey);
   if(activeWriteKey.current===writeKey){
    sendingNow.current=false;setSending(false);
    const initial=needsInitialRead.current;needsInitialRead.current=false;
    void refresh(!initial,version.current);
   }
  }
 };
 const search=async()=>{
  const term=searchTerm.trim();
  if(term.length<2||term.length>80||searching||accessRevokedRef.current)return;
  const current=++searchVersion.current;
  searchQueryRef.current=term;searchActiveRef.current=true;searchPendingRef.current=true;
  setSearchActive(true);setSearching(true);setError('');
  try{
   const results=await searchTeamContent(teamId,kind,term,token);
   if(current===searchVersion.current&&!accessRevokedRef.current){setSearchResults(results);void loadReactions(results);}
  }catch(e){
   if(current===searchVersion.current&&!revokeIfUnauthorized(e))
    setError('Não foi possível pesquisar as mensagens.');
  }finally{
   if(current===searchVersion.current){searchPendingRef.current=false;setSearching(false);}
  }
 };
 const composeLocation=async()=>{
  // A location is only inserted into the composer. Sending always requires an
  // independent tap on Enviar, so a permission grant never broadcasts GPS.
  if(locationRequest.current||sendingNow.current||accessRevokedRef.current)return;
  const current=version.current;
  locationRequest.current=true;setLocationBusy(true);setError('');
  try{
   const Location=await import('expo-location');
   const permission=await Location.requestForegroundPermissionsAsync();
   if(!permission.granted)throw Error('Autoriza a localização para a partilhares.');
   const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
   if(current!==version.current||accessRevokedRef.current)return;
   const lat=position.coords.latitude,lng=position.coords.longitude;
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
    throw Error('Não foi possível obter coordenadas válidas.');
   const link='https://www.google.com/maps?q='+lat.toFixed(6)+','+lng.toFixed(6);
   setDraft(previous=>{
    const next=previous.trim()?previous.trim()+'\n'+link:link;
    if(next.length>2000){setError('A mensagem já atingiu o limite de caracteres.');return previous;}
    return next;
   });
  }catch(e){
   if(current===version.current&&!accessRevokedRef.current)
    setError(e instanceof Error?e.message:'Não foi possível obter a localização.');
  }finally{
   if(current===version.current){locationRequest.current=false;setLocationBusy(false);}
  }
 };
 const clearSearch=()=>{
  searchVersion.current++;searchActiveRef.current=false;searchQueryRef.current='';searchPendingRef.current=false;
  setSearchActive(false);setSearching(false);setSearchResults([]);
 };
 const changeSearchTerm=(term:string)=>{
  // Never display an obsolete response after editing a search.
  searchVersion.current++;searchActiveRef.current=false;searchQueryRef.current='';searchPendingRef.current=false;
  setSearchTerm(term);setSearchResults([]);
  setSearchActive(false);setSearching(false);
 };
 const replyPreview=(id:number|null):string=>{
  const original=[...searchResults,...entries,...olderEntries].find(item=>item.id===id);
  if(!original)return 'uma mensagem anterior';
  if(original.deleted)return 'uma mensagem eliminada';
  return '@'+original.username+': '+original.body.slice(0,110);
 };
 const react=async(item:TeamContentEntry,emoji:string)=>{
  if(kind==='feed')setFeedReactionPickerId(null);
  if(item.deleted||reactionBusyRef.current||accessRevokedRef.current)return;
  reactionBusyRef.current=true;reactionBusyContentId.current=item.id;setReactionBusyId(item.id);setError('');
  const current=version.current;
  const original:TeamReactionState=reactions[item.id]||{counts:{},mine:null};
  const counts:Record<string,number>={...original.counts};
  if(original.mine)counts[original.mine]=Math.max(0,(counts[original.mine]||0)-1);
  const next=original.mine===emoji?null:emoji;
  if(next)counts[next]=(counts[next]||0)+1;
  // Prevent an older read from replacing the pending optimistic value.
  reactionVersion.current++;
  setReactions(previous=>({...previous,[item.id]:{counts,mine:next}}));
  try{
   if(original.mine===emoji)
    await removeTeamReaction(teamId,kind,item.id,token);
   else await setTeamReaction(teamId,kind,item.id,emoji,token);
  }catch(e){
   if(current===version.current&&!accessRevokedRef.current){
    if(!revokeIfUnauthorized(e)){
     setReactions(previous=>({...previous,[item.id]:original}));
     setError('Reação não confirmada. Consulta o histórico antes de repetir.');
    }
   }
  }finally{
   if(current===version.current){
    reactionBusyRef.current=false;reactionBusyContentId.current=null;setReactionBusyId(null);
    if(!accessRevokedRef.current)void loadReactions([item]);
   }
  }
 };
 const update=async()=>{
  const body=editDraft.trim();
  if(!editingId||!body||sendingNow.current||pendingWrites.current.has(writeKey))return;
  pendingWrites.current.set(writeKey,'edit');
  sendingNow.current=true;invalidatePendingRead();setSending(true);setError('');
  const current=version.current;
  try{
   const updated=await editTeamContent(teamId,kind,editingId,body,token);
   if(current===version.current&&!accessRevokedRef.current){
    setEntries(previous=>previous.map(item=>item.id===updated.id?updated:item));
    setOlderEntries(previous=>{
     const next=previous.map(item=>item.id===updated.id?updated:item);
     olderRef.current=next;
     return next;
    });
    setSearchResults(previous=>previous.map(item=>item.id===updated.id?updated:item));
    setEditingId(null);setEditDraft('');
   }
  }catch(e){
   if(current===version.current){
    if(e instanceof ApiError&&e.status===409){
     // 409 on edit may mean the message was removed, not that the entire
     // team chat was disabled. The next authorized history GET decides.
     setError('Esta mensagem pode ter sido eliminada. A verificar o histórico.');
    }else if(!revokeIfUnauthorized(e))
     setError('Edição não confirmada. Consulta o histórico antes de repetir.');
   }
  }finally{
   pendingWrites.current.delete(writeKey);
   if(activeWriteKey.current===writeKey){
    sendingNow.current=false;setSending(false);
    const initial=needsInitialRead.current;needsInitialRead.current=false;
    void refresh(!initial,version.current);
   }
  }
 };
 const remove=(item:TeamContentEntry)=>{
  if(sendingNow.current||!item.canManage||item.deleted)return;
  Alert.alert('Eliminar conteúdo','Queres eliminar esta mensagem da equipa?',[
   {text:'Cancelar',style:'cancel'},
   {text:'Eliminar',style:'destructive',onPress:()=>{void (async()=>{
    if(sendingNow.current||pendingWrites.current.has(writeKey)||accessRevokedRef.current)return;
    pendingWrites.current.set(writeKey,'delete');
    sendingNow.current=true;invalidatePendingRead();setSending(true);setError('');
    const current=version.current;
    try{
     await deleteTeamContent(teamId,kind,item.id,token);
     if(current===version.current&&!accessRevokedRef.current){
      const tombstone=(entry:TeamContentEntry):TeamContentEntry=>entry.id===item.id
       ?{...entry,body:'',deleted:true,attachments:[]}:entry;
      setEntries(previous=>previous.map(tombstone));
      setOlderEntries(previous=>{
       const next=previous.map(tombstone);
       olderRef.current=next;
       return next;
      });
      setSearchResults(previous=>previous.map(tombstone));
     }
    }catch(e){
     if(current===version.current){
      if(e instanceof ApiError&&e.status===409){
       setError('A mensagem já pode ter sido eliminada. A verificar o histórico.');
      }else if(!revokeIfUnauthorized(e))
       setError('Eliminação não confirmada. Consulta o histórico antes de repetir.');
     }
    }finally{
     pendingWrites.current.delete(writeKey);
     if(activeWriteKey.current===writeKey){
      sendingNow.current=false;setSending(false);
      const initial=needsInitialRead.current;needsInitialRead.current=false;
      void refresh(!initial,version.current);
     }
    }
   })();}}
  ]);
 };
 useEffect(()=>{
  if(kind!=='chat'||accessRevoked)return;
  const latest=entries.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
  if(latest>latestId.current&&latestId.current>0&&!nearLatest.current)setUnseenBelow(true);
  latestId.current=latest;
 },[entries,kind,accessRevoked]);
 const allFeedEntries=useMemo(()=>{
  if(kind!=='feed'||!olderEntries.length)return entries;
  const latestIds=new Set(entries.map(item=>item.id));
  return [...olderEntries.filter(item=>!latestIds.has(item.id)),...entries];
 },[kind,entries,olderEntries]);
 // Expensive thread grouping and comment counts should not rerun on every keystroke.
 const visibleEntries=useMemo(()=>kind==='feed'
  ?orderedTeamFeed(searchActive?searchResults:allFeedEntries,collapsedFeedPosts,searchActive,replyTo)
  :(searchActive?searchResults:entries),
  [kind,searchActive,searchResults,entries,allFeedEntries,collapsedFeedPosts,replyTo]);
 // Keep private team feed media traffic bounded while showing recent photos inline.
 const recentFeedPhotoKeys=useMemo(()=>{
  const selected=new Set<string>();
  if(kind!=='feed')return selected;
  for(const item of [...entries].reverse()){
   if(selected.size>=4)break;
   if(item.deleted||item.replyToId!==null)continue;
   const firstImage=item.attachments?.find(file=>
    ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimeType));
   if(firstImage)selected.add(item.id+':'+firstImage.index);
  }
  return selected;
 },[kind,entries]);
 const feedCommentCounts=useMemo(()=>
  kind==='feed'?teamFeedCommentCounts(searchActive?searchResults:allFeedEntries):new Map<number,number>(),
  [kind,searchActive,searchResults,allFeedEntries]);
 const loadOlderPosts=async()=>{
  if(kind!=='feed'||accessRevokedRef.current||olderPending.current||!hasOlderPosts||sendingNow.current)return;
  const oldest=allFeedEntries.reduce((min,item)=>Math.min(min,item.id),Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(oldest)||oldest===Number.MAX_SAFE_INTEGER){setHasOlderPosts(false);return;}
  const current=version.current;
  olderPending.current=true;setOlderBusy(true);setOlderError('');
  try{
   const page=await olderTeamFeed(teamId,oldest,token,30);
   if(current!==version.current||accessRevokedRef.current)return;
   const known=new Set(allFeedEntries.map(item=>item.id));
   const additions=page.filter(item=>item.id<oldest&&!known.has(item.id));
   setOlderEntries(previous=>[...additions,...previous]);
   olderExhausted.current=page.length<30||additions.length===0;
   setHasOlderPosts(!olderExhausted.current);
   if(additions.length)void loadReactions(additions);
  }catch(e){
   if(current!==version.current||accessRevokedRef.current)return;
   if(!revokeIfUnauthorized(e))setOlderError('Não foi possível carregar publicações anteriores.');
  }finally{
   if(current===version.current){olderPending.current=false;setOlderBusy(false);}
  }
 };
 const composer=<>
  {replyTo?<View style={styles.actions}><Text style={styles.sub}>{kind==='chat'?'A responder a':'A comentar'} {replyPreview(replyTo)}</Text>
   <Pressable onPress={()=>switchReply(null)}><Text style={styles.actionText}>Cancelar</Text></Pressable></View>:null}
  <View style={styles.attachmentActions}>
   <Pressable accessibilityRole="button" accessibilityLabel="Partilhar localização atual"
    accessibilityState={{disabled:sending||locationBusy}}
    disabled={sending||locationBusy} onPress={()=>void composeLocation()} style={styles.attachmentButton}>
    <JynloIcon name="location" size={20} color={C.mint}/>
   </Pressable>
   {attachmentsEnabled?<>
   <Pressable accessibilityRole="button" accessibilityLabel="Selecionar fotografias ou vídeos"
     disabled={sending||uploading} onPress={()=>void chooseMedia()} style={styles.attachmentButton}>
     <JynloIcon name="gallery" size={20} color={C.mint}/>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Abrir câmara"
     disabled={sending||uploading} onPress={()=>void chooseMedia('camera')} style={styles.attachmentButton}>
     <JynloIcon name="camera" size={20} color={C.mint}/>
   </Pressable>
   <ChatPdfComposer target={{scope:'team',id:teamId,kind}} token={token}
     enabled={!sending&&!uploading} compact replyId={replyTo}
     onPermissionError={reason=>{revokeIfUnauthorized(new ApiError(reason==='disabled'?409:403,'Conversa indisponível.'));}}
     onSent={async()=>{await refresh(true,version.current);}}/>
   </>:null}
  </View>
  {media.length?<View style={styles.selectedMedia}>
   <Text style={styles.sub}>{media.length} ficheiro(s) selecionado(s) · A legenda é opcional.</Text>
   <View style={styles.mediaPreviews}>
    {media.map((file,index)=><View key={file.uri+'-'+index} style={styles.mediaPreviewCard}>
     {file.type==='image'?<Image source={{uri:file.uri}} style={styles.mediaPreviewImage} resizeMode="cover"/>:
      <View style={styles.mediaPreviewVideo}><JynloIcon name="video" size={24} color={C.mint}/></View>}
     <Pressable accessibilityRole="button" accessibilityLabel={'Retirar anexo '+(index+1)}
      disabled={sending||uploading} onPress={()=>setMedia(current=>current.filter((_,i)=>i!==index))}
      style={styles.removeMedia}><JynloIcon name="close" size={17} color={C.white}/></Pressable>
    </View>)}
   </View>
  </View>:null}
  <TextInput multiline style={[styles.input,kind==='chat'&&styles.chatInput]} value={draft} onChangeText={setDraft}
   onFocus={()=>{composerFocused.current=true;}} onBlur={()=>{composerFocused.current=false;}}
   maxLength={2000} placeholder={kind==='chat'?'Escreve uma mensagem…':'Partilha uma novidade com o plantel…'}
   placeholderTextColor={C.muted} editable={!sending} accessibilityLabel="Texto da mensagem"/>
  <Pressable accessibilityRole="button" accessibilityLabel={kind==='chat'?'Enviar mensagem':'Publicar na equipa'}
   accessibilityState={{disabled:sending||uploading||(!media.length&&!draft.trim())}}
   disabled={sending||uploading||(!media.length&&!draft.trim())} onPress={()=>void send()} style={styles.button}>
   <JynloIcon name="send" size={20} color="#062A30"/>
   <Text style={styles.buttonText}>{sending?'A enviar…':kind==='chat'?'Enviar':'Publicar'}</Text>
  </Pressable>
 </>;
 if(accessRevoked)return <View style={styles.panel}>
  <Text style={styles.title}>Conversa indisponível</Text>
  <Text style={styles.error} accessibilityRole="alert">{blockReason}</Text>
 </View>;
 return <View style={styles.panel}>
  <View style={styles.headingRow}>
   <View style={{flex:1}}>
    <Text style={styles.sub}>Só para membros confirmados · {connection==='online'?'Em tempo real':connection==='connecting'?'A ligar…':'A sincronizar por rede'}</Text>
   </View>
  </View>
  {kind==='feed'&&(replyTo===null||!(searchActive?searchResults:allFeedEntries).some(item=>item.id===replyTo))?composer:null}
  <View style={styles.searchRow}>
   <TextInput style={styles.searchInput} value={searchTerm} onChangeText={changeSearchTerm}
    maxLength={80} placeholder={kind==='chat'?'Pesquisar nesta conversa…':'Pesquisar publicações…'} placeholderTextColor={C.muted}
    accessibilityLabel={kind==='chat'?'Pesquisar mensagens da equipa':'Pesquisar publicações da equipa'}/>
   <Pressable accessibilityRole="button" accessibilityLabel="Pesquisar mensagens" disabled={searching||searchTerm.trim().length<2} onPress={()=>void search()}
    style={styles.searchButton}><JynloIcon name="search" size={20} color={C.mint}/></Pressable>
   {searchActive?<Pressable accessibilityRole="button" accessibilityLabel="Voltar à conversa" onPress={clearSearch} style={styles.searchButton}>
    <JynloIcon name="close" size={20} color={C.mint}/></Pressable>:null}
  </View>
  {searchActive?<Text style={styles.sub}>{searching?'A pesquisar…':searchResults.length+' resultados encontrados'}</Text>:null}
  {loading&&!searchActive?<Text style={styles.sub}>A carregar…</Text>:null}
  {error?<Text style={styles.error} accessibilityRole="alert">{error}</Text>:null}
  {syncWarning?<Text style={styles.sub}>{syncWarning}</Text>:null}
  {!searchActive&&!loading&&!entries.length?<Text style={styles.empty}>
   {kind==='chat'?'Ainda não existem mensagens. Começa a conversa!':'Ainda não há publicações nesta equipa.'}
  </Text>:null}
  <ScrollView ref={historyRef} nestedScrollEnabled keyboardShouldPersistTaps="handled"
   style={kind==='chat'?[styles.chatHistory,keyboardOpen&&styles.chatHistoryKeyboard]:styles.feedHistory}
   contentContainerStyle={styles.historyContent}
   scrollEventThrottle={100}
   onScroll={event=>{
    if(kind!=='chat'||searchActive)return;
    const {contentOffset,layoutMeasurement,contentSize}=event.nativeEvent;
    nearLatest.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-85;
    if(nearLatest.current)setUnseenBelow(false);
   }}
   onContentSizeChange={()=>{
    if(kind==='chat'&&!searchActive&&nearLatest.current)
     historyRef.current?.scrollToEnd({animated:false});
   }}>
  {kind==='feed'&&!searchActive&&(hasOlderPosts||olderBusy||!!olderError)?<View style={styles.historyLoadMore}>
   <Pressable accessibilityRole="button" disabled={olderBusy||loading||sending} onPress={()=>void loadOlderPosts()} style={styles.attachmentButton}>
    <Text style={styles.actionText}>{olderBusy?'A carregar publicações…':'Ver publicações anteriores'}</Text>
   </Pressable>
   {olderError?<Text accessibilityRole="alert" style={styles.error}>{olderError}</Text>:null}
  </View>:null}
  {visibleEntries.map(item=><View key={item.id} style={[styles.entry,item.username?.toLowerCase()===username.toLowerCase()&&styles.ownEntry,kind==='feed'&&item.replyToId!=null&&(searchActive?searchResults:allFeedEntries).some(parent=>parent.id===item.replyToId)&&styles.feedComment]}>
   <View style={styles.authorHeader}>
    <View style={styles.authorAvatar}>
     {teamPlayerAvatarUri(item.profilePicUrl)&&!brokenAuthorAvatars[item.id]?
      <Image source={{uri:teamPlayerAvatarUri(item.profilePicUrl)!}} style={styles.authorAvatarPhoto}
       onError={()=>setBrokenAuthorAvatars(prev=>({...prev,[item.id]:true}))}/>:
      <Text style={styles.avatarLetter}>{(item.username||'J').slice(0,1).toUpperCase()}</Text>}
    </View>
    <View style={{flex:1}}>
     <Pressable accessibilityRole="link" accessibilityLabel={'Abrir perfil de @'+item.username}
      onPress={()=>router.push({pathname:'/social/[username]',params:{username:item.username}})}
      style={styles.authorLink}><Text style={styles.author}>@{item.username}</Text></Pressable>
     <Text style={styles.sub}>{new Date(item.createdAt).toLocaleString('pt-PT')}</Text>
    </View>
   </View>
   {item.replyToId?<Text style={styles.sub}>↳ {replyPreview(item.replyToId)}</Text>:null}
   <Text style={styles.body}>{item.deleted?(kind==='chat'?'Mensagem eliminada':'Publicação eliminada'):giphyImageUrl(item.body)?'GIF partilhado':item.body}</Text>
   {!item.deleted&&giphyImageUrl(item.body)?<Image source={{uri:giphyImageUrl(item.body)!}} resizeMode="contain" style={styles.sharedGif}/>:null}
   {!item.deleted&&chatLocationUrl(item.body)?<Pressable accessibilityRole="link" accessibilityLabel="Abrir localização no mapa"
    onPress={()=>{const link=chatLocationUrl(item.body);if(link)void Linking.openURL(link);}}
    style={styles.mapLink}><JynloIcon name="location" size={18} color={C.mint}/><Text style={styles.actionText}>Abrir localização no mapa</Text></Pressable>:null}
   {!item.deleted&&item.attachments?.length?item.attachments.map(file=>
    <SecureChatAttachment key={file.index} scope="team" kind={kind} conversationId={teamId}
      messageId={item.id} token={token} index={file.index} name={file.filename}
      mime={file.mimeType} size={file.size} autoPreview={kind==='chat'?file.mimeType.startsWith('image/'):
       recentFeedPhotoKeys.has(item.id+':'+file.index)}
      onAuthorizationError={status=>{revokeIfUnauthorized(new ApiError(status,'Anexo privado indisponível.'));}}/>):null}
   {kind==='feed'&&!searchActive&&item.replyToId==null&&(feedCommentCounts.get(item.id)||0)>0?
    <Pressable accessibilityRole="button" accessibilityLabel={(collapsedFeedPosts.has(item.id)?'Ver ':'Ocultar ')+(feedCommentCounts.get(item.id)||0)+' comentários'}
     accessibilityState={{expanded:!collapsedFeedPosts.has(item.id)}}
     onPress={()=>setCollapsedFeedPosts(previous=>{const next=new Set(previous);if(next.has(item.id))next.delete(item.id);else next.add(item.id);return next;})}
     style={styles.commentToggle}>
     <Text style={styles.commentToggleText}>{collapsedFeedPosts.has(item.id)?'Ver':'Ocultar'} {feedCommentCounts.get(item.id)||0} {(feedCommentCounts.get(item.id)||0)===1?'comentário':'comentários'}</Text>
    </Pressable>:null}
   {item.editedAt&&!item.deleted?<Text style={styles.sub}>Editada</Text>:null}
   {!item.deleted?<View style={styles.reactionRow}>
    {kind==='feed'?<>
     <Pressable accessibilityRole="button" accessibilityLabel={'Gostar da publicação de @'+item.username}
      accessibilityState={{selected:reactions[item.id]?.mine==='❤️',disabled:reactionBusyId!==null}}
      disabled={reactionBusyId!==null} onPress={()=>void react(item,'❤️')}
      style={[styles.reactionButton,reactions[item.id]?.mine==='❤️'&&styles.reactionSelected]}>
      <Text style={styles.reactionLabel}>❤️ {Object.values(reactions[item.id]?.counts||{}).reduce((sum,count)=>sum+(Number(count)||0),0)||'Gostar'}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={'Escolher reação à publicação de @'+item.username}
      accessibilityState={{expanded:feedReactionPickerId===item.id,disabled:reactionBusyId!==null}}
      disabled={reactionBusyId!==null}
      onPress={()=>setFeedReactionPickerId(current=>current===item.id?null:item.id)}
      style={styles.reactionButton}><Text style={styles.reactionLabel}>☺ Reagir</Text></Pressable>
    </>:null}
    {(kind==='chat'||feedReactionPickerId===item.id)?emojis.map(emoji=><Pressable key={emoji} accessibilityRole="button"
      accessibilityLabel={'Reagir com '+emoji}
      accessibilityState={{selected:reactions[item.id]?.mine===emoji,disabled:reactionBusyId===item.id}}
      disabled={reactionBusyId!==null} onPress={()=>void react(item,emoji)}
      style={[styles.reactionButton,reactions[item.id]?.mine===emoji&&styles.reactionSelected]}>
      <Text style={styles.reactionLabel}>{emoji} {reactions[item.id]?.counts?.[emoji]||''}</Text>
    </Pressable>):null}
   </View>:null}
   {!item.deleted?<View style={styles.actions}>
    <Pressable accessibilityRole="button" accessibilityLabel={kind==='chat'?'Responder à mensagem':'Comentar publicação'} style={styles.entryAction} disabled={sending} onPress={()=>switchReply(item.id)}><JynloIcon name="reply" size={19} color={C.mint}/></Pressable>
    {item.canEdit?<Pressable accessibilityRole="button" accessibilityLabel={kind==='chat'?'Editar mensagem da equipa':'Editar publicação da equipa'} style={styles.entryAction} disabled={sending} onPress={()=>{setEditingId(item.id);setEditDraft(item.body);}}><JynloIcon name="edit" size={19} color={C.mint}/></Pressable>:null}
    {item.canManage?<Pressable accessibilityRole="button" accessibilityLabel={kind==='chat'?'Eliminar mensagem da equipa':'Eliminar publicação da equipa'} style={styles.entryAction} disabled={sending} onPress={()=>remove(item)}><JynloIcon name="remove" size={19} color={C.mint}/></Pressable>:null}
   </View>:null}
   {kind==='feed'&&replyTo===item.id?<View style={styles.inlineCommentComposer}>
    <Text style={styles.commentContext}>A comentar publicação de @{item.username}</Text>
    {composer}
   </View>:null}
   {editingId===item.id?<View style={styles.editBox}>
    <TextInput multiline maxLength={2000} style={styles.input} value={editDraft} onChangeText={setEditDraft} editable={!sending} accessibilityLabel="Editar mensagem"/>
    <Pressable disabled={sending||!editDraft.trim()} onPress={()=>void update()}><Text style={styles.actionText}>Guardar alteração</Text></Pressable>
    <Pressable onPress={()=>setEditingId(null)}><Text style={styles.actionText}>Cancelar</Text></Pressable>
   </View>:null}
  </View>)}
  </ScrollView>
  {kind==='chat'&&unseenBelow&&!searchActive?<Pressable accessibilityRole="button"
   accessibilityLabel="Ver mensagens novas" onPress={()=>{
    nearLatest.current=true;setUnseenBelow(false);
    historyRef.current?.scrollToEnd({animated:true});
   }} style={styles.newMessagesButton}>
   <Text style={styles.newMessagesText}>↓ Mensagens novas</Text>
  </Pressable>:null}
  {kind==='chat'?composer:null}
 </View>;
}
const styles=StyleSheet.create({
 panel:{borderColor:'#3FC6B04D',borderWidth:1,borderRadius:18,padding:14,gap:12,backgroundColor:'#082B39'},
 chatHistory:{height:470,maxHeight:470,minHeight:240,borderWidth:1,borderColor:'#3AAEAA55',borderRadius:14,backgroundColor:'#041D29'},
 chatHistoryKeyboard:{height:230,maxHeight:230,minHeight:120},
 feedHistory:{maxHeight:780},
 historyContent:{gap:11,paddingBottom:12},
 newMessagesButton:{alignSelf:'center',paddingHorizontal:15,paddingVertical:10,
   borderWidth:1,borderColor:C.mint,borderRadius:24,backgroundColor:'#124C50'},
 newMessagesText:{color:C.mint,fontWeight:'800',fontSize:12},
 headingRow:{flexDirection:'row',alignItems:'center',gap:11,borderBottomColor:'#42BDAE40',borderBottomWidth:1,paddingBottom:12},
 authorHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:5},
 authorAvatar:{width:37,height:37,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#198B8C'},
 authorAvatarPhoto:{width:37,height:37,borderRadius:19},
 authorLink:{alignSelf:'flex-start',minHeight:36,justifyContent:'center'},
 avatarLetter:{color:'#062A30',fontWeight:'900',fontSize:17},
 title:{fontSize:18,color:C.white,fontWeight:'800'},sub:{fontSize:12,color:C.muted,lineHeight:18},
 empty:{padding:18,textAlign:'center',color:C.muted},error:{color:C.danger,fontSize:12},
 entry:{borderWidth:1,borderColor:'#3BB2AE52',borderRadius:17,padding:13,gap:9,backgroundColor:'#0D3945'},
 ownEntry:{backgroundColor:'#12554D',borderColor:'#3CBB9B80'},
 feedComment:{marginLeft:18,borderLeftWidth:3,borderLeftColor:C.mint,backgroundColor:'#0B303C'},
 historyLoadMore:{paddingVertical:12,alignItems:'center',gap:7},
 commentToggle:{alignSelf:'flex-start',minHeight:40,justifyContent:'center'},
 commentToggleText:{color:C.mint,fontSize:12,fontWeight:'800'},
 inlineCommentComposer:{gap:10,padding:12,borderRadius:12,borderWidth:1,borderColor:C.mint,backgroundColor:'#103D43'},
 commentContext:{color:C.mint,fontSize:12,fontWeight:'800'},author:{fontSize:11,fontWeight:'800',color:C.mint},
 body:{fontSize:14,lineHeight:20,color:C.white},
 input:{minHeight:78,borderWidth:1,borderColor:'#3BB6AA66',borderRadius:14,padding:12,color:C.white,textAlignVertical:'top',backgroundColor:'#061F2E'},
 chatInput:{minHeight:48,maxHeight:120},
 button:{backgroundColor:C.mint,borderRadius:11,padding:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,minHeight:48},
 buttonText:{color:'#062A30',fontWeight:'800'},
 actions:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:14,paddingTop:6},
 actionText:{color:C.mint,fontSize:12,fontWeight:'800'},
 entryAction:{minWidth:40,minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:11,borderWidth:1,borderColor:C.border,backgroundColor:'#153B45'},
 sharedGif:{width:'100%',height:190,borderRadius:12,backgroundColor:'#102E38'},
 mapLink:{flexDirection:'row',alignSelf:'flex-start',alignItems:'center',gap:8,padding:9,borderWidth:1,borderColor:C.border,borderRadius:11},
 editBox:{gap:10},
 searchRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 searchInput:{flexGrow:1,flexBasis:160,minWidth:0,borderWidth:1,borderColor:C.border,borderRadius:10,padding:9,color:C.white},
 searchButton:{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.border,borderRadius:11},
 reactionRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:6},
 reactionButton:{borderWidth:1,borderColor:C.border,borderRadius:20,paddingHorizontal:9,paddingVertical:6},
 reactionSelected:{borderColor:C.mint,backgroundColor:'#104D50'},
 reactionLabel:{color:C.white,fontSize:12},
 selectedMedia:{gap:8},
 mediaPreviews:{flexDirection:'row',flexWrap:'wrap',gap:8},
 mediaPreviewCard:{width:78,height:78,borderRadius:10,overflow:'hidden',backgroundColor:'#143A47',borderWidth:1,borderColor:C.border},
 mediaPreviewImage:{width:'100%',height:'100%'},
 mediaPreviewVideo:{flex:1,justifyContent:'center',alignItems:'center'},
 removeMedia:{position:'absolute',right:2,top:2,minWidth:30,minHeight:30,borderRadius:15,backgroundColor:'#092934DD',justifyContent:'center',alignItems:'center'},
 attachmentActions:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},
 attachmentButton:{padding:11,minHeight:44,minWidth:48,alignItems:'center',borderWidth:1,borderColor:C.border,borderRadius:12,justifyContent:'center',backgroundColor:'#143A47'}
});