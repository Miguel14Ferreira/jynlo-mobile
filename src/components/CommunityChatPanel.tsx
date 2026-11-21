import {ensureChatCameraPermission} from '../lib/chat-camera-permission';
import {JynloIcon} from './JynloIcon';
import ChatPdfComposer from './ChatPdfComposer';
import SecureChatAttachment from './SecureChatAttachment';
import {chatAttachmentList,recentPreviewMessageIds,appendChatMediaSelection} from '../lib/chat-attachments-core.cjs';
import {confirmedCommunityChatSend} from '../lib/chat-send-receipt.cjs';
import {uncertainChatSend} from '../lib/chat-send-uncertainty.cjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,Image,Keyboard,KeyboardAvoidingView,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from './UI';
import {useAuth} from '../lib/auth';
import {ApiError} from '../lib/api';
import {communityMessages,sendCommunityMessage,editCommunityChatMessage,deleteCommunityChatMessageForEveryone} from '../lib/chat-api';
import {communityDetails} from '../lib/community-api';
import {observeCommunityChat} from '../lib/community-realtime';
import {markCommunityRead} from '../lib/chat-api';
import {mergeMessages} from '../lib/realtime-core.cjs';
import {C,MobileTheme} from '../lib/theme';
import {chatPhotoAvailable,sendChatPhoto} from '../lib/chat-photo-attachment';
import {sendChatPhotoAlbum} from '../lib/chat-photo-album';
import {validateChatAlbum} from '../lib/chat-attachments-core.cjs';
import {validateChatPhoto} from '../lib/chat-photo-validation';
import type {CommunityChatEntry} from '../lib/types';
import {listConversationMutes,isConversationMuted,setConversationMuted} from '../lib/conversation-mutes-api';
import {giphyImageUrl} from '../lib/chat-giphy.cjs';
import {encodeCallUp,readCallUp} from '../lib/chat-callup.cjs';
import {CallUpCard} from './CallUpCard';
import {CallUpPicker} from './CallUpPicker';
import {readPoll,isPollText} from '../lib/chat-poll.cjs';
import {PollCard} from './PollCard';
import {PollComposer} from './PollComposer';
import {chatLocationUrl} from '../lib/chat-location.cjs';
import {ChatReactionRow,useChatReactions} from './ChatReactionRow';
import {ChatMentionText,ChatMentionSuggestions} from './ChatMentions';
import ChatSearchPanel from './ChatSearchPanel';
import ChatReplyPreview from './ChatReplyPreview';
export default function CommunityChatPanel({embedded=false}:{embedded?:boolean}){
 const {id:raw}=useLocalSearchParams<{id:string}>(),id=Number(raw);const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<CommunityChatEntry[]>([]);
 const [uncertainSend,setUncertainSend]=useState<{identity:string;body:string;replyId:number|null}|null>(null);
 const uncertainSendRef=useRef<{identity:string;body:string;replyId:number|null}|null>(null);
 // Keep embedded message history readable as the Android keyboard opens.
 // Never auto-scroll older messages unless the composer has keyboard focus.
 const inlineHistoryRef=useRef<ScrollViewInstance|null>(null);
 const inlineNearBottom=useRef(false);
 // Position the first authorized history at the latest messages, never re-jump later.
 const firstHistoryPositionPending=useRef(true);
  // Ignore scroll events caused by the initial automatic jump until a deliberate gesture/action.
  const initialAutoScrollPending=useRef(true);
 const historyViewportHeight=useRef(0);
 const historyContentHeight=useRef(0);
 const previousLatestMessageId=useRef(0);
 const lastAcknowledgedMessageId=useRef(0);
 const [unseenBelow,setUnseenBelow]=useState(false);
 const composerFocused=useRef(false);
 const [keyboardVisible,setKeyboardVisible]=useState(false);
 useEffect(()=>{
  const showEvent=Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow';
  const hideEvent=Platform.OS==='ios'?'keyboardWillHide':'keyboardDidHide';
  const shown=Keyboard.addListener(showEvent,()=>{
   setKeyboardVisible(true);
   // Keep the most recent messages nearby while typing, without jumping
   // when a caption or edit field (rather than the composer) has focus.
   if(composerFocused.current&&inlineNearBottom.current)inlineHistoryRef.current?.scrollToEnd({animated:true});
  });
  const hidden=Keyboard.addListener(hideEvent,()=>setKeyboardVisible(false));
  return()=>{shown.remove();hidden.remove();};
 },[embedded]);
 useEffect(()=>{
  const latest=messages.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
  if(latest>previousLatestMessageId.current&&previousLatestMessageId.current>0&&!inlineNearBottom.current)
   setUnseenBelow(true);
  previousLatestMessageId.current=latest;
 },[messages]);
 const [historyLimit,setHistoryLimit]=useState(40);
 const generation=useRef(0),sendingNow=useRef(false),uploadingNow=useRef(false);
 // Keep in-flight writes locked across navigation; leaving the screen does not cancel the server request.
 const pendingWrites=useRef(new Map<string,'text'|'photo'>()),activeChat=useRef('');
 const [name,setName]=useState('Comunidade'),[draft,setDraft]=useState('');
 const [reply,setReply]=useState<CommunityChatEntry|null>(null);
 const [expandedMessageActions,setExpandedMessageActions]=useState<number|null>(null);
 const [editing,setEditing]=useState<CommunityChatEntry|null>(null),[editText,setEditText]=useState('');
 const [mutationBusy,setMutationBusy]=useState(false),mutationLock=useRef(false);
 const mutationOwner=useRef(''),mutationEpoch=useRef(0);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState('');
 const [callUpOpen,setCallUpOpen]=useState(false);
 const [pollOpen,setPollOpen]=useState(false);
 const historyError=useRef<string|null>(null);
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [extraPhotos,setExtraPhotos]=useState<ImagePicker.ImagePickerAsset[]>([]);
 const pickerInFlight=useRef(false),pickerOwner=useRef(''),pickerEpoch=useRef(0);
 const [attachmentCaption,setAttachmentCaption]=useState('');
 const focusedIdentity=useRef('');
 const [canSendPhoto,setCanSendPhoto]=useState(false),[uploading,setUploading]=useState(false);
 const [attachmentsOpen,setAttachmentsOpen]=useState(false);
 const [refreshWarning,setRefreshWarning]=useState('');
 const [muted,setMuted]=useState(false),[muteKnown,setMuteKnown]=useState(false),[muteBusy,setMuteBusy]=useState(false);
 const [muteError,setMuteError]=useState(''),[locationBusy,setLocationBusy]=useState(false);
 const muteWrites=useRef(new Set<string>());
 const [accessRevoked,setAccessRevoked]=useState(false);
 const revokedRef=useRef(false);
 const [connection,setConnection]=useState<'connecting'|'online'|'offline'>('offline');
 const connectionStatus=useRef<'connecting'|'online'|'offline'>('offline');
 const refreshing=useRef<number|null>(null),queuedRefresh=useRef(false);
 const refresh=useCallback(async(version=generation.current,silent=false)=>{
  if(refreshing.current===version){queuedRefresh.current=true;return;}
  if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0){if(version===generation.current){setMessages([]);setLoading(false);}return;}
  refreshing.current=version;
  if(!silent){setLoading(true);setError('');}
  try{
    const [chatResult,detailsResult]=await Promise.allSettled([
      communityMessages(id,auth.token,auth.username),
      communityDetails(id,auth.token,auth.username)
    ]);
    if(version!==generation.current)return;
    // A revoked membership on either endpoint wins over a successful response
    // from the other one: never keep a private history after a confirmed 403.
    if(detailsResult.status==='rejected'&&detailsResult.reason instanceof ApiError&&
      [401,403,404,410].includes(detailsResult.reason.status))throw detailsResult.reason;
    if(chatResult.status==='rejected')throw chatResult.reason;
    const chat=chatResult.value;
    revokedRef.current=false;setAccessRevoked(false);
    // A temporary failure loading the community label must not block chat history.
    setMessages(old=>mergeMessages(old,chat));
    if(detailsResult.status==='fulfilled')setName(detailsResult.value.name);
    setRefreshWarning('');
    const previousHistoryError=historyError.current;historyError.current=null;
    if(previousHistoryError)setError(current=>current===previousHistoryError?'':current);
    // A server refresh does not prove that the newest messages were displayed.
    // Only a measured viewport scroll may acknowledge the current history.
  }catch(e){if(version===generation.current){
    const forbidden=e instanceof ApiError&&[401,403,404,410].includes(e.status);
    if(forbidden){
     revokedRef.current=true;setAccessRevoked(true);setMessages([]);setDraft('');setReply(null);setEditing(null);setEditText('');setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');setCanSendPhoto(false);setAttachmentsOpen(false);
     historyError.current=null;
     setRefreshWarning('');setError('Já não tens acesso a esta comunidade. Atualiza para confirmar as permissões.');
    }else{
     setRefreshWarning('Não foi possível sincronizar o chat. As mensagens apresentadas podem estar desatualizadas.');
     if(!silent){const message=e instanceof Error?e.message:'Não foi possível abrir o chat.';
      historyError.current=message;setError(message);}
    }
  }}
  finally{
   if(refreshing.current===version)refreshing.current=null;
   if(version===generation.current){
    if(!silent)setLoading(false);
    if(queuedRefresh.current){queuedRefresh.current=false;void refresh(version,true);}
   }
  }
 },[id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
   let active=true;
   const version=++generation.current;
   // Never reuse geometry from a previous focus to acknowledge new messages.
   // The current ScrollView must measure its viewport and content again.
   historyViewportHeight.current=0;
   historyContentHeight.current=0;
   firstHistoryPositionPending.current=true;
    initialAutoScrollPending.current=true;
   const identity=id+'|'+auth.token;
   const changedAccountOrCommunity=focusedIdentity.current!==identity;
   focusedIdentity.current=identity;
   if(changedAccountOrCommunity){
    uncertainSendRef.current=null;setUncertainSend(null);
    // The new conversation must never inherit locks from another account.
    mutationEpoch.current++;mutationOwner.current='';mutationLock.current=false;setMutationBusy(false);
    pickerEpoch.current++;pickerOwner.current='';pickerInFlight.current=false;
    lastAcknowledgedMessageId.current=0;
    // Keep local drafts when refocusing the same community, but never cross accounts.
    setMessages([]);setDraft('');setReply(null);setEditing(null);setEditText('');
    setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');setAttachmentsOpen(false);
   }
   // History requires fresh membership validation on every focus; local drafts do not.
   inlineNearBottom.current=false;setHistoryLimit(40);previousLatestMessageId.current=0;setUnseenBelow(false);setMessages([]);setName('Comunidade');setError('');setRefreshWarning('');historyError.current=null;setLoading(true);setAccessRevoked(false);revokedRef.current=false;
   setConnection('offline');connectionStatus.current='offline';queuedRefresh.current=false;
   activeChat.current=identity;
   const pending=pendingWrites.current.get(identity);
   sendingNow.current=Boolean(pending);uploadingNow.current=pending==='photo';
   setSending(pending==='text');setUploading(pending==='photo');
   setCanSendPhoto(false);setMuteKnown(false);setMuteError('');setLocationBusy(false);
   if(auth.token)void chatPhotoAvailable('community',id,auth.token).then(ok=>{if(active&&version===generation.current)setCanSendPhoto(ok);}).catch(()=>{});
   if(auth.token&&Number.isSafeInteger(id)&&id>0){
    void listConversationMutes(auth.token).then(items=>{
     if(active&&version===generation.current&&!muteWrites.current.has(identity)){
      setMuted(isConversationMuted(items,'community',String(id)));setMuteKnown(true);
     }
    }).catch(()=>{if(active&&version===generation.current)setMuteError('Não foi possível consultar os avisos deste chat.');});
   }
   void refresh(version);
   if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0)return ()=>{active=false;generation.current++;if(activeChat.current===identity)activeChat.current='';};
   const disconnect=observeCommunityChat({id,token:auth.token,username:auth.username,onStatus:(status)=>{if(active&&version===generation.current){const wasConnected=connectionStatus.current==='online';connectionStatus.current=status;setConnection(status);
    // Reconcile missed messages and clear an offline warning only after a successful server read.
    if(status==='online'&&!wasConnected)void refresh(version,true);
   }}, 
    onMessage:(_msg)=>{if(!active||version!==generation.current||revokedRef.current)return;
      // WebSocket delivery is an invalidation hint, not a new authorization.
      // Only the authenticated HTTP history may put messages in the UI.
      // If membership was revoked, refresh clears cached private messages.
      if(AppState.currentState==='active'&&!sendingNow.current)
       void refresh(version,true);
    }});
   // Real-time events normally update this conversation immediately.
   // Poll every 5 seconds only offline; while connected, reconcile every
   // 30 seconds to recover from a missed socket event without manual refresh.
   let pollTicks=0;
   const timer=setInterval(()=>{
    if(active&&generation.current===version&&AppState.currentState==='active'&&!sendingNow.current){
     pollTicks++;
     if(connectionStatus.current!=='online'||pollTicks%6===0)
      void refresh(version,true);
    }
   },5000);
   const resume=AppState.addEventListener('change',state=>{
    if(state==='active'&&active&&generation.current===version)void refresh(version,true);
   });
   return ()=>{active=false;clearInterval(timer);resume.remove();queuedRefresh.current=false;generation.current++;if(activeChat.current===identity)activeChat.current='';disconnect();};
 },[refresh,id,auth.token,auth.username]));
 function toggleMute(){
  const token=auth.token,identity=id+'|'+token;
  if(!token||accessRevoked||!muteKnown||muteBusy||muteWrites.current.has(identity))return;
  const version=generation.current,next=!muted;
  Alert.alert(next?'Silenciar avisos?':'Ativar avisos?','As mensagens continuam disponíveis.',[
   {text:'Cancelar',style:'cancel'},
   {text:next?'Silenciar':'Ativar',onPress:()=>{
    if(activeChat.current!==identity||muteWrites.current.has(identity))return;
    muteWrites.current.add(identity);setMuteBusy(true);setMuteError('');
    void setConversationMuted('community',String(id),next,token).then(async()=>{
     const saved=await listConversationMutes(token);
     if(version===generation.current&&activeChat.current===identity){
      setMuted(isConversationMuted(saved,'community',String(id)));setMuteKnown(true);
     }
    }).catch(()=>{
     if(version===generation.current&&activeChat.current===identity)setMuteError('Não foi possível confirmar os avisos.');
    }).finally(()=>{
     muteWrites.current.delete(identity);
     if(version===generation.current&&activeChat.current===identity)setMuteBusy(false);
    });
   }}
  ]);
 }
 function prepareLocation(){
  const token=auth.token,identity=id+'|'+token,version=generation.current;
  if(!token||accessRevoked||locationBusy||sendingNow.current||pendingWrites.current.has(identity))return;
  Alert.alert('Partilhar localização?','A localização só será obtida com a tua autorização e ficará no rascunho para confirmares antes de enviar.',[
   {text:'Cancelar',style:'cancel'},
   {text:'Continuar',onPress:()=>{
    if(activeChat.current!==identity)return;
    setLocationBusy(true);setError('');
    void (async()=>{
     const Location=await import('expo-location');
     const permission=await Location.requestForegroundPermissionsAsync();
     if(permission.status!=='granted')throw Error('Acesso à localização não autorizado.');
     const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
     const lat=point.coords.latitude,lng=point.coords.longitude;
     if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('Localização inválida.');
     const url='https://www.google.com/maps?q='+lat.toFixed(5)+','+lng.toFixed(5);
     if(version===generation.current&&activeChat.current===identity){
      setDraft(current=>[current.trim(),url].filter(Boolean).join('\n'));
        setAttachmentsOpen(false);
      Alert.alert('Localização pronta','Confirma o destinatário e toca em Enviar.');
     }
    })().catch(e=>{
     if(version===generation.current&&activeChat.current===identity)setError(e instanceof Error?e.message:'Não foi possível obter a localização.');
    }).finally(()=>{if(version===generation.current&&activeChat.current===identity)setLocationBusy(false);});
   }}
  ]);
 }
 /** Sondagem: sent alone, exactly as encoded by the composer. */
 async function sendPoll(text:string){
  setPollOpen(false);
  await sendStructured(text,'Não foi possível enviar a sondagem.');
 }
 /** Convocatória: one of my sessions, sent alone as the server envelope. */
 async function sendCallUp(sessionId:number){
  setCallUpOpen(false);
  await sendStructured(encodeCallUp(sessionId),'Não foi possível enviar a convocatória.');
 }
 async function sendStructured(text:string,failure:string){
  const identity=id+'|'+auth.token;
  if(!text||!auth.token||!auth.username||revokedRef.current||sendingNow.current||uploadingNow.current||pendingWrites.current.has(identity))return;
  const version=generation.current;
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=await sendCommunityMessage(id,text,auth.token,auth.username);
   if(version!==generation.current||activeChat.current!==identity)return;
   setMessages(current=>current.some(m=>m.id===confirmed.id)?current:[...current,confirmed].sort((a,b)=>a.id-b.id));
   void refresh(version,true);
  }catch(e){
   if(version===generation.current)setError((e instanceof Error?e.message:failure)+' Confirma o histórico antes de repetir.');
  }finally{sendingNow.current=false;setSending(false);}
 }
 async function send(){
  const identity=id+'|'+auth.token;
  if(mutationLock.current||sendingNow.current||uploadingNow.current||pendingWrites.current.has(identity)||revokedRef.current||!auth.token||!auth.username||!draft.trim())return;
  if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===draft.trim()&&uncertainSendRef.current.replyId===(reply?.id??null))return;
  const version=generation.current,token=auth.token,username=auth.username;
  const originalDraft=draft,originalReplyId=reply?.id;
  const message=originalDraft.trim();
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=await sendCommunityMessage(id,message,token,username,originalReplyId);
   if(!confirmedCommunityChatSend(confirmed,id,username,message,originalReplyId))
    throw Error('O servidor respondeu, mas não confirmou esta mensagem. Confirma o histórico antes de repetir.');
   if(version!==generation.current)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===originalDraft.trim()&&uncertainSendRef.current.replyId===(originalReplyId??null)){uncertainSendRef.current=null;setUncertainSend(null);}
   // The verified server receipt is already an authorized chat entry. Show it
   // immediately rather than waiting for an eventually consistent history GET.
   setMessages(current=>mergeMessages(current,[confirmed]));
   setDraft(current=>current===originalDraft?'':current);
   setReply(current=>current?.id===originalReplyId?null:current);
   // A confirmed POST is complete even if a subsequent history refresh fails.
   void refresh(version,true);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity&&uncertainChatSend(e))
    {const uncertain={identity,body:originalDraft.trim(),replyId:originalReplyId??null};uncertainSendRef.current=uncertain;setUncertainSend(uncertain);}
   if(version===generation.current)setError((e instanceof Error?e.message:'Não foi possível enviar.')+' Verifica o histórico antes de repetir.');
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setSending(false);}
  }
 }
 function ownMessage(message:CommunityChatEntry){
  return Boolean(auth.username&&message.username.toLowerCase()===auth.username.toLowerCase()&&!message.deletedAt);
 }
 function editable(message:CommunityChatEntry){
  const created=Date.parse(message.createdAt);
  return ownMessage(message)&&Boolean(message.body?.trim())&&!message.attachmentName&&
   !message.attachments?.length&&!message.body.startsWith('[JYNLO:GIPHY:1]')&&!isPollText(message.body)&&
   Number.isFinite(created)&&created<=Date.now()&&Date.now()-created<=15*60*1000;
 }
 function messageOptions(message:CommunityChatEntry){
  if(!ownMessage(message)||mutationLock.current||sendingNow.current||uploadingNow.current)return;
  const actions:Array<{text:string;style?:'cancel'|'destructive';onPress?:()=>void}>=[];
  if(editable(message))actions.push({text:'Editar mensagem',onPress:()=>{
    setEditing(message);setEditText(message.body||'');setReply(null);
  }});
  actions.push({text:'Apagar para todos',style:'destructive',onPress:()=>{
    Alert.alert('Apagar mensagem para todos?',
      'O conteúdo será removido da conversa. A mensagem ficará identificada como removida.',
      [{text:'Cancelar',style:'cancel'},{text:'Apagar',style:'destructive',onPress:()=>void deleteMessage(message)}]);
  }});
  actions.push({text:'Cancelar',style:'cancel'});
  Alert.alert('A minha mensagem','Seleciona uma ação.',actions);
 }
 async function saveEdit(){
  if(!editing||!editable(editing)||!auth.token||!auth.username||mutationLock.current||
   sendingNow.current||uploadingNow.current)return;
  const text=editText.trim(),version=generation.current,identity=id+'|'+auth.token,original=editing;
  if(!text||text.length>2000||text.startsWith('[JYNLO:GIPHY:1]')){
   setError('A edição deve conter entre 1 e 2000 caracteres.');return;
  }
  const operation=++mutationEpoch.current;
  mutationOwner.current=identity;mutationLock.current=true;setMutationBusy(true);setError('');
  try{
   const updated=await editCommunityChatMessage(id,original.id,text,auth.token,auth.username);
   if(version!==generation.current||activeChat.current!==identity)return;
   setMessages(old=>old.map(item=>item.id===updated.id?updated:item));
   setEditing(current=>current?.id===original.id?null:current);
   setEditText(current=>current===editText?'':current);
   await refresh(version,true);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity)
    setError((e instanceof Error?e.message:'Edição não confirmada.')+' Consulta o histórico antes de repetir.');
  }finally{
   if(mutationOwner.current===identity&&mutationEpoch.current===operation){
    mutationLock.current=false;mutationOwner.current='';setMutationBusy(false);
   }
  }
 }
 async function deleteMessage(message:CommunityChatEntry){
  if(!ownMessage(message)||!auth.token||!auth.username||mutationLock.current||
   sendingNow.current||uploadingNow.current)return;
  const version=generation.current,identity=id+'|'+auth.token;
  const operation=++mutationEpoch.current;
  mutationOwner.current=identity;mutationLock.current=true;setMutationBusy(true);setError('');
  try{
   const updated=await deleteCommunityChatMessageForEveryone(id,message.id,auth.token,auth.username);
   if(version!==generation.current||activeChat.current!==identity)return;
   setMessages(old=>old.map(item=>item.id===updated.id?updated:
    item.replyToMessageId===updated.id?{...item,replyToText:'Mensagem removida'}:item));
   setEditing(current=>current?.id===message.id?null:current);
   setReply(current=>current?.id===message.id?null:current);
   await refresh(version,true);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity)
    setError((e instanceof Error?e.message:'Eliminação não confirmada.')+' Consulta o histórico antes de repetir.');
  }finally{
   if(mutationOwner.current===identity&&mutationEpoch.current===operation){
    mutationLock.current=false;mutationOwner.current='';setMutationBusy(false);
   }
  }
 }
 async function choosePhoto(source:'gallery'|'camera'='gallery'){
  const identity=id+'|'+auth.token;
  if(!auth.token||!canSendPhoto||revokedRef.current||uploadingNow.current||sendingNow.current||mutationLock.current||pendingWrites.current.has(identity)||pickerInFlight.current)return;
  const current=photo?[photo,...extraPhotos]:[];
  const remaining=4-current.length;
  if(remaining<=0){setError('Já selecionaste 4 ficheiros. Remove um antes de adicionares outro.');return;}
  const version=generation.current,token=auth.token;
  const operation=++pickerEpoch.current;
  pickerOwner.current=identity;pickerInFlight.current=true;setError('');
  try{
   const ImagePicker=await import('expo-image-picker');
   if(source==='camera'&&!await ensureChatCameraPermission())return;
   const selected=source==='camera'?
    await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,videoMaxDuration:30}):
    await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,allowsMultipleSelection:true,selectionLimit:remaining});
   if(version!==generation.current||activeChat.current!==identity||auth.token!==token||selected.canceled||!selected.assets?.length)return;
   for(const asset of selected.assets){if(asset.type==='image')validateChatPhoto(asset);}
   const result=appendChatMediaSelection(current,selected.assets);
   if(result.error)throw Error(result.error);
   if(version!==generation.current||activeChat.current!==identity||revokedRef.current||!canSendPhoto)return;
   setPhoto(result.items[0]||null);setExtraPhotos(result.items.slice(1));
  }catch(e){
   if(version===generation.current&&activeChat.current===identity)
    setError(e instanceof Error?e.message:'Não foi possível abrir a câmara ou a galeria.');
  }finally{
   if(pickerOwner.current===identity&&pickerEpoch.current===operation){
    pickerInFlight.current=false;pickerOwner.current='';
   }
  }
 }
 async function uploadPhoto(){
  const identity=id+'|'+auth.token;
  if(mutationLock.current||!auth.token||!photo||!canSendPhoto||revokedRef.current||uploadingNow.current||sendingNow.current||pendingWrites.current.has(identity))return;
  const version=generation.current,token=auth.token,selectedPhoto=photo,originalReplyId=reply?.id;
  const captionToSend=attachmentCaption;
  pendingWrites.current.set(identity,'photo');
  uploadingNow.current=true;setUploading(true);setError('');
  try{
   if(extraPhotos.length||selectedPhoto.type==='video'||captionToSend.trim())await sendChatPhotoAlbum({scope:'community',id},token,[selectedPhoto,...extraPhotos],originalReplyId,captionToSend);
   else await sendChatPhoto('community',id,token,selectedPhoto,originalReplyId);
   if(version!==generation.current)return;
   setPhoto(null);setExtraPhotos([]);setAttachmentCaption(current=>current===captionToSend?'':current);setReply(current=>current?.id===originalReplyId?null:current);
   // Reconcile history separately after a confirmed photo/album upload.
   void refresh(version,true);
  }catch(e){
   if(version===generation.current)setError((e instanceof Error?e.message:'Envio não confirmado.')+' Confirma o histórico antes de tentar novamente.');
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){uploadingNow.current=false;setUploading(false);}
  }
 }
 const recentPhotoIds=new Set(recentPreviewMessageIds(messages));
 const reactions=useChatReactions('community',String(id),auth.token,(embedded?messages.slice(-historyLimit):messages).map(m=>m.id),!accessRevoked);
 const renderedMessages=(embedded?messages.slice(-historyLimit):messages).map(m=><View key={m.id} style={[styles.message,m.username===auth.username&&styles.mine]}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
       <Pressable accessibilityRole="button" accessibilityLabel={'Abrir perfil de @'+m.username}
        onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}>
        <Text style={styles.sender}>{m.username}</Text>
       </Pressable>
       {!m.deletedAt&&!accessRevoked?
        <Pressable accessibilityRole="button" accessibilityLabel={'Mostrar ações da mensagem de @'+m.username}
         accessibilityState={{expanded:expandedMessageActions===m.id}}
         onPress={()=>setExpandedMessageActions(current=>current===m.id?null:m.id)}
         style={styles.replyAction}>
          <JynloIcon name="more" size={21} color={C.mint}/>
        </Pressable>:null}
     </View>
     {expandedMessageActions===m.id&&!m.deletedAt&&!accessRevoked?
      <View style={styles.contextActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Responder a '+m.username}
          onPress={()=>{setReply(m);setExpandedMessageActions(null);}} style={styles.replyAction}>
          <JynloIcon name="reply" size={18} color={C.mint}/>
          <Text style={styles.quoteTitle}>Responder</Text>
        </Pressable>
        {ownMessage(m)?<Pressable accessibilityRole="button" accessibilityLabel="Editar ou eliminar a minha mensagem"
          disabled={mutationBusy} onPress={()=>{setExpandedMessageActions(null);messageOptions(m);}}
          style={styles.replyAction}>
          <JynloIcon name="more" size={20} color={C.mint}/>
          <Text style={styles.quoteTitle}>Mais opções</Text>
        </Pressable>:null}
      </View>:null}
     {m.replyToMessageId?<View style={styles.quote}><Text style={styles.quoteTitle}>↩ {m.replyToSender||'Mensagem anterior'}</Text><Text numberOfLines={2} style={styles.quoteBody}>{m.replyToText||'Mensagem citada'}</Text></View>:null}
     {!m.deletedAt&&giphyImageUrl(m.body)?<Image source={{uri:giphyImageUrl(m.body)!}} resizeMode="contain" style={styles.gif}/>:null}
     {!m.deletedAt&&readPoll(m.body)?<PollCard poll={readPoll(m.body)!} kind="community" conversationId={id} messageId={m.id} token={auth.token}/>:
     !m.deletedAt&&readCallUp(m.body)?<CallUpCard sessionId={readCallUp(m.body)!} token={auth.token} username={auth.username}/>:
     <ChatMentionText body={m.deletedAt?'Mensagem removida':giphyImageUrl(m.body)?'GIF':m.body||m.attachmentName||'Anexo'} style={styles.body}/>}
     {!m.deletedAt&&chatLocationUrl(m.body)?<Pressable accessibilityRole="button" accessibilityLabel="Abrir localização partilhada no mapa" onPress={()=>void Linking.openURL(chatLocationUrl(m.body)!).catch(()=>Alert.alert('Localização','Não foi possível abrir o mapa.'))}>
      <View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="location" size={16} color={C.mint}/><Text style={styles.mapLink}>Abrir localização no mapa</Text><JynloIcon name="chevron-right" size={15} color={C.mint}/></View>
     </Pressable>:null}
     {!m.deletedAt?chatAttachmentList(m).map(attachment=><SecureChatAttachment key={attachment.index} index={attachment.index} scope="community" conversationId={id} messageId={m.id} token={auth.token} name={attachment.name} mime={attachment.mime} size={attachment.size} autoPreview={recentPhotoIds.has(m.id)&&attachment.mime?.startsWith('image/')===true}
      onAuthorizationError={()=>{setMessages([]);void refresh(generation.current,false);}}/>):null}
     {!m.deletedAt?<ChatReactionRow id={m.id} summary={reactions.summaries[m.id]} busy={reactions.busyIds.has(m.id)} disabled={accessRevoked||!auth.token} onReact={reactions.react} onInspect={reactions.inspect}/>:null}
     <Text style={styles.time}>{m.createdAt&&Number.isFinite(Date.parse(m.createdAt))?new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):''}{m.editedAt?' · editada':''}</Text>
   </View>);
 const content=<>
   {!embedded?<DemoBanner/>:null}<Eyebrow>CHAT DA COMUNIDADE</Eyebrow>{!embedded?<Text style={styles.title}>{name}</Text>:null}
   <ChatSearchPanel kind="community" conversationId={String(id)} token={auth.token} enabled={!accessRevoked}/>
   <Text style={styles.note}>Apenas os membros podem ler e enviar mensagens. · {connection==='online'?'● Ligado':connection==='connecting'?'○ A ligar':'○ A sincronizar sem ligação em tempo real'}</Text>
   {!auth.token?<Button title="Entrar para conversar" onPress={()=>router.push('/login')}/>:null}
   {muteError&&!accessRevoked?<Message tone="error">{muteError}</Message>:null}
   {!embedded&&auth.token&&muteKnown&&!accessRevoked?<View style={styles.muteRow}>
    <Text style={styles.note}>{muted?'Avisos deste chat silenciados':'Avisos deste chat ativos'}</Text>
    <Button title={muteBusy?'A guardar…':muted?'Ativar avisos':'Silenciar avisos'} secondary disabled={muteBusy} onPress={toggleMute}/>
   </View>:null}
   {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}
  {uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null)?<Text accessibilityRole="alert" style={{color:C.muted,fontSize:12}}>Envio sem confirmação. Confirma no histórico antes de repetir esta mensagem.</Text>:null}
  {!accessRevoked&&uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null)?<Button secondary title="Já confirmei no histórico · Permitir novo envio"
   onPress={()=>{uncertainSendRef.current=null;setUncertainSend(null);}}/>:null}
   {refreshWarning?<Message tone="error">{refreshWarning}</Message>:null}
   {!loading&&!error&&messages.length===0?<Message>Começa a conversa. A primeira mensagem pode ser tua!</Message>:null}
   {<ScrollView ref={inlineHistoryRef} style={[styles.inlineHistory,keyboardVisible&&styles.inlineHistoryKeyboard]} nestedScrollEnabled keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
   onScrollBeginDrag={()=>{initialAutoScrollPending.current=false;}}
    onScroll={event=>{const {contentOffset,layoutMeasurement,contentSize}=event.nativeEvent;
    // Initial positioning is programmatic: it must never count as a user-visible read.
    if(firstHistoryPositionPending.current||initialAutoScrollPending.current)return;
    // Ignore scroll measurements from an earlier layout after history/keyboard changes.
    // A stale event must not clear the unread indicator or acknowledge newer messages.
    if(historyContentHeight.current<=0||historyViewportHeight.current<=0||
       Math.abs(contentSize.height-historyContentHeight.current)>2||
       Math.abs(layoutMeasurement.height-historyViewportHeight.current)>2)return;
    inlineNearBottom.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-90;
    // Near-bottom is for auto-follow; a read receipt requires the actual end to be visible.
    const lastMessageVisible=contentOffset.y+layoutMeasurement.height>=contentSize.height-4;
    if(inlineNearBottom.current){
     // Keep the unread marker until the newest message is actually visible.
     if(lastMessageVisible)setUnseenBelow(false);
     const latest=messages.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
     if(lastMessageVisible&&AppState.currentState==='active'&&!accessRevoked&&auth.token&&auth.username&&Number.isSafeInteger(id)&&id>0&&latest>lastAcknowledgedMessageId.current){
      lastAcknowledgedMessageId.current=latest;
      void markCommunityRead(id,latest,auth.token,auth.username).catch(()=>{if(lastAcknowledgedMessageId.current===latest)lastAcknowledgedMessageId.current=0;});
     }
    }}}
   onLayout={event=>{
    historyViewportHeight.current=event.nativeEvent.layout.height;
    if(firstHistoryPositionPending.current&&messages.length>0&&historyContentHeight.current>0){
     firstHistoryPositionPending.current=false;
     inlineNearBottom.current=true;
     inlineHistoryRef.current?.scrollToEnd({animated:false});
    }
    // Content size can be reported before the viewport layout; acknowledge only when fully visible.
    if(!firstHistoryPositionPending.current&&inlineNearBottom.current&&!unseenBelow&&historyContentHeight.current>0&&historyContentHeight.current<=historyViewportHeight.current&&AppState.currentState==='active'&&!accessRevoked&&auth.token&&auth.username&&Number.isSafeInteger(id)&&id>0){
     const latest=messages.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
    if(latest>lastAcknowledgedMessageId.current){
     lastAcknowledgedMessageId.current=latest;
     void markCommunityRead(id,latest,auth.token,auth.username).catch(()=>{if(lastAcknowledgedMessageId.current===latest)lastAcknowledgedMessageId.current=0;});
    }
    }
   }}
   onContentSizeChange={(_width,height)=>{
    historyContentHeight.current=height;
    // Follow the most recent message only on the first authorized history load.
    // Later updates honor the user's position in earlier messages.
    if(firstHistoryPositionPending.current&&messages.length>0&&historyViewportHeight.current>0){
     firstHistoryPositionPending.current=false;
     inlineNearBottom.current=true;
     inlineHistoryRef.current?.scrollToEnd({animated:false});
    }
    // A short conversation can change without firing onScroll. Its entire content must fit.
    if(!firstHistoryPositionPending.current&&inlineNearBottom.current&&!unseenBelow&&height<=historyViewportHeight.current&&historyViewportHeight.current>0&&
        AppState.currentState==='active'&&!accessRevoked&&auth.token&&auth.username&&Number.isSafeInteger(id)&&id>0){
     const latest=messages.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
     if(latest>lastAcknowledgedMessageId.current){
      lastAcknowledgedMessageId.current=latest;
      void markCommunityRead(id,latest,auth.token,auth.username).catch(()=>{if(lastAcknowledgedMessageId.current===latest)lastAcknowledgedMessageId.current=0;});
     }
    }
    if(inlineNearBottom.current&&composerFocused.current&&!unseenBelow)inlineHistoryRef.current?.scrollToEnd({animated:true});
   }}
   contentContainerStyle={{gap:8,padding:8}}>
   {messages.length>historyLimit?<Pressable accessibilityRole="button" onPress={()=>{inlineNearBottom.current=false;setHistoryLimit(count=>count+40);}} style={styles.olderMessages}>
    <Text style={styles.quoteTitle}>Ver mensagens anteriores</Text>
   </Pressable>:null}{renderedMessages}
  </ScrollView>}
  {unseenBelow?<Pressable accessibilityRole="button" accessibilityLabel="Ver mensagens novas"
    onPress={()=>{initialAutoScrollPending.current=false;inlineHistoryRef.current?.scrollToEnd({animated:true});}}
    style={styles.newMessages}><JynloIcon name="chevron-down" size={17} color={C.background}/>
    <Text style={styles.newMessagesText}>Mensagens novas</Text></Pressable>:null}
   {auth.token&&!accessRevoked?<View style={styles.quickActions}>
    {muteKnown?<Pressable accessibilityRole="button" accessibilityLabel={muted?'Ativar avisos deste chat':'Silenciar avisos deste chat'}
      style={styles.iconAction} disabled={muteBusy} onPress={toggleMute}>
      <JynloIcon name="notifications" size={22} color={muted?C.muted:C.mint} active={!muted}/>
    </Pressable>:null}
    {canSendPhoto?<Pressable accessibilityRole="button" accessibilityLabel="Selecionar fotografias ou vídeos" disabled={sending||uploading}
     style={styles.iconAction} onPress={()=>{void choosePhoto();}}><JynloIcon name="gallery" size={22} color={C.mint}/></Pressable>:null}
    {canSendPhoto?<Pressable accessibilityRole="button" accessibilityLabel="Abrir câmara" disabled={sending||uploading}
     style={styles.iconAction} onPress={()=>{void choosePhoto('camera');}}><JynloIcon name="camera" size={22} color={C.mint}/></Pressable>:null}
    <ChatPdfComposer compact target={{scope:'community',id}} token={auth.token} enabled={!accessRevoked&&!sending&&!uploading&&!pendingWrites.current.has(id+'|'+auth.token)}
      replyId={reply?.id} onSent={async(sentReplyId)=>{setReply(current=>current?.id===(sentReplyId??undefined)?null:current);await refresh();}}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Partilhar localização atual" disabled={locationBusy||sending||uploading}
     style={styles.iconAction} onPress={prepareLocation}><JynloIcon name="location" size={22} color={C.mint}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Convocatória: convocar para um dos teus jogos"
     style={styles.iconAction} disabled={sending} onPress={()=>setCallUpOpen(true)}><JynloIcon name="session" size={22} color={C.mint}/></Pressable>
    <CallUpPicker visible={callUpOpen} token={auth.token} username={auth.username} onClose={()=>setCallUpOpen(false)} onPick={sessionId=>void sendCallUp(sessionId)}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Criar sondagem"
     style={styles.iconAction} disabled={sending} onPress={()=>setPollOpen(true)}><Text style={{fontSize:20}}>📊</Text></Pressable>
    <PollComposer visible={pollOpen} onClose={()=>setPollOpen(false)} onSend={text=>void sendPoll(text)}/>
   </View>:null}
   {false&&auth.token&&!accessRevoked?<Pressable accessibilityRole="button" accessibilityState={{expanded:attachmentsOpen}}
     onPress={()=>setAttachmentsOpen(value=>!value)} style={styles.attachmentToggle}>
     <View style={{flexDirection:'row',alignItems:'center',gap:7}}><JynloIcon name={attachmentsOpen?'close':'attachment'} size={19} color={C.mint}/><Text style={styles.attachmentToggleText}>{attachmentsOpen?'Fechar anexos':'Anexar ficheiro'}</Text></View>
    </Pressable>:null}
    {false&&attachmentsOpen&&!accessRevoked?<View style={styles.attachmentOptions}>
    {auth.token&&!accessRevoked?<Button title={locationBusy?'A obter localização…':'Partilhar localização atual'} secondary disabled={locationBusy||sending||uploading} onPress={prepareLocation}/>:null}
   <ChatPdfComposer target={{scope:'community',id}} token={auth.token} enabled={!accessRevoked&&!sending&&!uploading&&!pendingWrites.current.has(id+'|'+auth.token)} replyId={reply?.id} onSent={async(sentReplyId)=>{setReply(current=>current?.id===(sentReplyId??undefined)?null:current);await refresh();}}/>
   {auth.token&&!accessRevoked&&canSendPhoto?<Button secondary title={photo?"Adicionar mais ficheiros":"Escolher fotografias ou vídeos"} disabled={sending||uploading||pendingWrites.current.has(id+'|'+auth.token)||Boolean(photo&&1+extraPhotos.length>=4)} onPress={()=>{setAttachmentsOpen(false);void choosePhoto();}}/>:null}
   {auth.token&&!accessRevoked&&canSendPhoto?<Button secondary title="Abrir câmara" disabled={sending||uploading||pendingWrites.current.has(id+'|'+auth.token)} onPress={()=>{setAttachmentsOpen(false);void choosePhoto('camera');}}/>:null}
   </View>:null}
   {photo&&!accessRevoked?<View style={styles.photoPanel}>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
     {[photo,...extraPhotos].map((file,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={'Remover ficheiro '+(index+1)} disabled={uploading} onPress={()=>{
      const remaining=[photo,...extraPhotos].filter((_,i)=>i!==index);
      setPhoto(remaining[0]||null);setExtraPhotos(remaining.slice(1));
     }} style={{gap:4}}>
      {file.type==='video'?<View style={{width:90,height:90,borderRadius:10,backgroundColor:'#173039',justifyContent:'center',alignItems:'center'}}><View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="video" size={20} color={C.white}/><Text style={{color:C.white,fontSize:12}}>Vídeo</Text></View></View>:<Image source={{uri:file.uri}} style={{width:90,height:90,borderRadius:10}}/>}
      <View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="remove" size={16} color={C.mint}/><Text style={styles.note}>Remover</Text></View>
     </Pressable>)}
    </View>
     <Text style={styles.note}>{1+extraPhotos.length}/4 ficheiros · fotografias até 5 MB, vídeos até 20 MB. Confirma antes de enviar.</Text>
   <TextInput accessibilityLabel="Legenda dos anexos" multiline maxLength={2000} value={attachmentCaption} onChangeText={setAttachmentCaption} editable={!uploading} placeholder="Legenda para as fotografias ou vídeos (opcional)" placeholderTextColor={C.muted} style={{borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,minHeight:48}}/>
     <Button title={uploading?'A enviar…':'Enviar ficheiros'} disabled={uploading||sending||pendingWrites.current.has(id+'|'+auth.token)} onPress={()=>{void uploadPhoto();}}/>
     <Button secondary title="Cancelar anexos" disabled={uploading} onPress={()=>{setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');}}/>
   </View>:null}
   {editing&&!accessRevoked?<View style={styles.editPanel}>
     <Text style={styles.quoteTitle}>Editar a minha mensagem · até 15 minutos após o envio</Text>
     <TextInput accessibilityLabel="Editar mensagem" multiline maxLength={2000} editable={!mutationBusy} value={editText} onChangeText={setEditText} placeholder="Mensagem…" placeholderTextColor={C.muted} style={styles.editInput}/>
     <View style={{flexDirection:'row',gap:12}}><Button title={mutationBusy?'A guardar…':'Guardar edição'} disabled={mutationBusy||!editText.trim()} onPress={()=>void saveEdit()}/><Button secondary title="Cancelar" disabled={mutationBusy} onPress={()=>{setEditing(null);setEditText('');}}/></View>
   </View>:null}
   {reply&&!accessRevoked?<ChatReplyPreview sender={reply.username} body={reply.body||reply.attachmentName||'Anexo'} onCancel={()=>setReply(null)} disabled={sending||uploading}/>:null}
   {auth.token&&!accessRevoked?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.composer}>
     <TextInput multiline style={styles.input} placeholder="Escreve uma mensagem…" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
       maxLength={2000} accessibilityLabel="Mensagem para a comunidade"
       onFocus={()=>{composerFocused.current=true;if(inlineNearBottom.current)inlineHistoryRef.current?.scrollToEnd({animated:true});}}
       onBlur={()=>{composerFocused.current=false;}}/>
     <ChatMentionSuggestions draft={draft} token={auth.token} onChange={setDraft} disabled={sending||uploading||accessRevoked}/>
     <Pressable style={[styles.send,sending&&{opacity:.5}]} onPress={()=>{void send();}} disabled={sending||uploading||pendingWrites.current.has(id+'|'+auth.token)||!draft.trim()||(uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null))} accessibilityRole="button" accessibilityLabel={sending?'A enviar mensagem…':'Enviar mensagem para a comunidade'}>
       {sending?<ActivityIndicator color={C.background}/>:<JynloIcon name="send" size={22} color={C.background}/>}
     </Pressable>
   </KeyboardAvoidingView>:null}
   {refreshWarning&&!accessRevoked?<Button secondary title="Tentar novamente" disabled={loading||sending||uploading} onPress={()=>{void refresh();}} />:null}
  </>;
 return embedded?<View style={styles.inline}>{content}</View>:<Page>{content}</Page>;
}
const styles=StyleSheet.create({inline:{gap:12,padding:14,borderWidth:1,borderColor:'#3FC6B04D',borderRadius:18,backgroundColor:'#082B39'},
 inlineHistory:{height:470,maxHeight:470,minHeight:240,borderWidth:1,borderColor:'#3AAEAA55',borderRadius:14,backgroundColor:'#041D29'},
 inlineHistoryKeyboard:{height:230,maxHeight:230,minHeight:120},
 olderMessages:{padding:10,alignItems:'center'},
 newMessages:{alignSelf:'center',flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:14,paddingVertical:9,borderRadius:20,backgroundColor:C.mint},
 newMessagesText:{fontSize:12,fontWeight:'800',color:C.background},quickActions:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 iconAction:{height:44,width:44,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},editPanel:{gap:9,padding:12,borderRadius:14,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},editInput:{borderWidth:1,borderColor:C.border,borderRadius:10,padding:12,color:C.white,minHeight:52,maxHeight:150},contextActions:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:7,
  paddingVertical:4,paddingHorizontal:6,borderWidth:1,borderColor:C.border,borderRadius:10,
  backgroundColor:C.surface,alignSelf:'flex-end',flexWrap:'wrap'},
 replyAction:{minHeight:38,flexDirection:'row',alignItems:'center',gap:5,justifyContent:'center',paddingHorizontal:8},quote:{borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:9,gap:3,marginVertical:4},quoteTitle:{fontSize:12,color:C.mint,fontWeight:'800'},quoteBody:{fontSize:12,color:C.muted},quoteComposer:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},quoteCancel:{color:C.white,fontWeight:'900',fontSize:20,padding:8},title:{fontSize:26,fontWeight:'900',color:C.white},note:{color:C.muted,fontSize:12},
 message:{padding:12,borderRadius:17,backgroundColor:'#0D3945',borderWidth:1,borderColor:'#3BB2AE52',gap:6,maxWidth:'88%',alignSelf:'flex-start',borderBottomLeftRadius:5},
 mine:{backgroundColor:'#12554D',borderColor:'#3CBB9B80',alignSelf:'flex-end',borderBottomLeftRadius:17,borderBottomRightRadius:5},sender:{fontSize:11,color:C.mint,fontWeight:'800'},body:{fontSize:15,color:C.white,lineHeight:21},time:{fontSize:10,color:C.muted,textAlign:'right'},
 photoPanel:{gap:9,padding:12,backgroundColor:C.surface,borderRadius:14},preview:{height:180,width:'100%'},
 muteRow:{gap:8,padding:12,borderWidth:1,borderColor:C.border,borderRadius:14,backgroundColor:C.surface},
 attachmentToggle:{alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:11,minHeight:44,justifyContent:'center'},
 attachmentToggleText:{color:C.mint,fontWeight:'800',fontSize:13},attachmentOptions:{gap:8},
 gif:{width:240,height:200,maxWidth:'100%',borderRadius:12,backgroundColor:C.surface},
 mapLink:{color:C.mint,fontSize:13,fontWeight:'800',paddingVertical:9},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9,paddingTop:10,borderTopWidth:1,borderTopColor:'#42BDAE40'},input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:145,backgroundColor:'#061F2E',borderColor:'#3BB6AA66',borderWidth:1,color:MobileTheme.colors.text,padding:13,borderRadius:14},
 send:{backgroundColor:MobileTheme.colors.accent,borderRadius:13,paddingHorizontal:16,minWidth:52,minHeight:MobileTheme.touchTarget,justifyContent:'center',alignItems:'center'},sendText:{color:C.background,fontWeight:'900'}});
