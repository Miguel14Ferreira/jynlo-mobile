import {ensureChatCameraPermission} from '../lib/chat-camera-permission';
import {chatLook} from '../lib/chat-look';
import {useChatTyping} from '../lib/chat-typing';
import {useChatViewing} from '../lib/chat-viewing';
import {t} from '../lib/i18n';
import {JynloIcon} from './JynloIcon';
import ChatPdfComposer from './ChatPdfComposer';
import SecureChatAttachment from './SecureChatAttachment';
import {chatAttachmentList,recentPreviewMessageIds,appendChatMediaSelection} from '../lib/chat-attachments-core.cjs';
import {confirmedCommunityChatSend} from '../lib/chat-send-receipt.cjs';
import {uncertainChatSend} from '../lib/chat-send-uncertainty.cjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,Image,Keyboard,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardFrame} from './KeyboardFrame';
import {CHAT_REACTION_EMOJIS} from '../lib/chat-reactions-api';
import type {ScrollViewInstance} from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Loader,Message} from './UI';
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
 useChatViewing('community',Number.isSafeInteger(id)&&id>0?id:null,auth.token);
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
 const typing=useChatTyping('community',Number.isSafeInteger(id)&&id>0?id:null,auth.token,auth.username);
 useEffect(()=>{typing.onInput(draft);},[draft]);
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
 const [searchOpen,setSearchOpen]=useState(false);
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
     setRefreshWarning('');setError(t('Já não tens acesso a esta comunidade. Atualiza para confirmar as permissões.'));
    }else{
     setRefreshWarning(t('Não foi possível sincronizar o chat. As mensagens apresentadas podem estar desatualizadas.'));
     if(!silent){const message=e instanceof Error?e.message:t('Não foi possível abrir o chat.');
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
    }).catch(()=>{if(active&&version===generation.current)setMuteError(t('Não foi possível consultar os avisos deste chat.'));});
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
  Alert.alert(next?t('Silenciar avisos?'):t('Ativar avisos?'),t('As mensagens continuam disponíveis.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:next?'Silenciar':'Ativar',onPress:()=>{
    if(activeChat.current!==identity||muteWrites.current.has(identity))return;
    muteWrites.current.add(identity);setMuteBusy(true);setMuteError('');
    void setConversationMuted('community',String(id),next,token).then(async()=>{
     const saved=await listConversationMutes(token);
     if(version===generation.current&&activeChat.current===identity){
      setMuted(isConversationMuted(saved,'community',String(id)));setMuteKnown(true);
     }
    }).catch(()=>{
     if(version===generation.current&&activeChat.current===identity)setMuteError(t('Não foi possível confirmar os avisos.'));
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
  Alert.alert(t('Partilhar localização?'),t('A localização só será obtida com a tua autorização e ficará no rascunho para confirmares antes de enviar.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Continuar'),onPress:()=>{
    if(activeChat.current!==identity)return;
    setLocationBusy(true);setError('');
    void (async()=>{
     const Location=await import('expo-location');
     const permission=await Location.requestForegroundPermissionsAsync();
     if(permission.status!=='granted')throw Error(t('Acesso à localização não autorizado.'));
     const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
     const lat=point.coords.latitude,lng=point.coords.longitude;
     if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error(t('Localização inválida.'));
     const url='https://www.google.com/maps?q='+lat.toFixed(5)+','+lng.toFixed(5);
     if(version===generation.current&&activeChat.current===identity){
      setDraft(current=>[current.trim(),url].filter(Boolean).join('\n'));
        setAttachmentsOpen(false);
      Alert.alert(t('Localização pronta'),t('Confirma o destinatário e toca em Enviar.'));
     }
    })().catch(e=>{
     if(version===generation.current&&activeChat.current===identity)setError(e instanceof Error?e.message:t('Não foi possível obter a localização.'));
    }).finally(()=>{if(version===generation.current&&activeChat.current===identity)setLocationBusy(false);});
   }}
  ]);
 }
 /** Sondagem: sent alone, exactly as encoded by the composer. */
 async function sendPoll(text:string){
  setPollOpen(false);
  await sendStructured(text,t('Não foi possível enviar a sondagem.'));
 }
 /** Convocatória: one of my sessions, sent alone as the server envelope. */
 async function sendCallUp(sessionId:number){
  setCallUpOpen(false);
  await sendStructured(encodeCallUp(sessionId),t('Não foi possível enviar a convocatória.'));
 }
 async function sendStructured(text:string,failure:string){
  const identity=id+'|'+auth.token;
  if(!text||!auth.token||!auth.username||revokedRef.current||mutationLock.current||sendingNow.current||uploadingNow.current||pendingWrites.current.has(identity))return;
  // A timed-out structured POST may already have reached the server. Do not
  // silently send the same poll/call-up again before the user checks history.
  if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===text&&uncertainSendRef.current.replyId===null)return;
  const version=generation.current,token=auth.token,username=auth.username;
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=await sendCommunityMessage(id,text,token,username);
   if(!confirmedCommunityChatSend(confirmed,id,username,text,null))
    throw Error(t('O servidor respondeu, mas não confirmou esta mensagem.'));
   if(version!==generation.current||activeChat.current!==identity)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===text&&uncertainSendRef.current.replyId===null){
    uncertainSendRef.current=null;setUncertainSend(null);
   }
   setMessages(current=>mergeMessages(current,[confirmed]));
   void refresh(version,true);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity){
    if(uncertainChatSend(e)){
     const uncertain={identity,body:text,replyId:null};
     uncertainSendRef.current=uncertain;setUncertainSend(uncertain);
    }
    setError((e instanceof Error?e.message:failure)+' '+t('Confirma o histórico antes de repetir.'));
   }
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setSending(false);}
  }
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
    throw Error(t('O servidor respondeu, mas não confirmou esta mensagem. Confirma o histórico antes de repetir.'));
   if(version!==generation.current)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===originalDraft.trim()&&uncertainSendRef.current.replyId===(originalReplyId??null)){uncertainSendRef.current=null;setUncertainSend(null);}
   // The verified server receipt is already an authorized chat entry. Show it
   // immediately rather than waiting for an eventually consistent history GET.
   setMessages(current=>mergeMessages(current,[confirmed]));
   // My own message: always jump to it.
   inlineNearBottom.current=true;setTimeout(()=>inlineHistoryRef.current?.scrollToEnd({animated:true}),80);
   setDraft(current=>current===originalDraft?'':current);
   setReply(current=>current?.id===originalReplyId?null:current);
   // A confirmed POST is complete even if a subsequent history refresh fails.
   void refresh(version,true);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity&&uncertainChatSend(e))
    {const uncertain={identity,body:originalDraft.trim(),replyId:originalReplyId??null};uncertainSendRef.current=uncertain;setUncertainSend(uncertain);}
   if(version===generation.current)setError((e instanceof Error?e.message:t('Não foi possível enviar.'))+' '+t('Verifica o histórico antes de repetir.'));
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
  if(editable(message))actions.push({text:t('Editar mensagem'),onPress:()=>{
    setEditing(message);setEditText(message.body||'');setReply(null);
  }});
  actions.push({text:t('Apagar para todos'),style:'destructive',onPress:()=>{
    Alert.alert(t('Apagar mensagem para todos?'),
      t('O conteúdo será removido da conversa. A mensagem ficará identificada como removida.'),
      [{text:t('Cancelar'),style:'cancel'},{text:t('Apagar'),style:'destructive',onPress:()=>void deleteMessage(message)}]);
  }});
  actions.push({text:t('Cancelar'),style:'cancel'});
  Alert.alert(t('A minha mensagem'),t('Seleciona uma ação.'),actions);
 }
 async function saveEdit(){
  if(!editing||!editable(editing)||!auth.token||!auth.username||mutationLock.current||
   sendingNow.current||uploadingNow.current)return;
  const text=editText.trim(),version=generation.current,identity=id+'|'+auth.token,original=editing;
  if(!text||text.length>2000||text.startsWith('[JYNLO:GIPHY:1]')){
   setError(t('A edição deve conter entre 1 e 2000 caracteres.'));return;
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
    setError((e instanceof Error?e.message:t('Edição não confirmada.'))+' '+t('Consulta o histórico antes de repetir.'));
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
    item.replyToMessageId===updated.id?{...item,replyToText:t('Mensagem removida')}:item));
   setEditing(current=>current?.id===message.id?null:current);
   setReply(current=>current?.id===message.id?null:current);
   await refresh(version,true);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity)
    setError((e instanceof Error?e.message:t('Eliminação não confirmada.'))+' '+t('Consulta o histórico antes de repetir.'));
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
  if(remaining<=0){setError(t('Já selecionaste 4 ficheiros. Remove um antes de adicionares outro.'));return;}
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
    setError(e instanceof Error?e.message:t('Não foi possível abrir a câmara ou a galeria.'));
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
   if(version===generation.current)setError((e instanceof Error?e.message:t('Envio não confirmado.'))+' '+t('Confirma o histórico antes de tentar novamente.'));
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){uploadingNow.current=false;setUploading(false);}
  }
 }
 const recentPhotoIds=new Set(recentPreviewMessageIds(messages));
 const visibleMessages=embedded?messages.slice(-historyLimit):messages;
 const reactions=useChatReactions('community',String(id),auth.token,visibleMessages.map(m=>m.id),!accessRevoked);
 const sendBlocked=sending||uploading||pendingWrites.current.has(id+'|'+auth.token)||!draft.trim()||(uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null));
 const timeOf=(m:CommunityChatEntry)=>m.createdAt&&Number.isFinite(Date.parse(m.createdAt))?new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):'';
 // Messaging-app layout: compact bubbles; reply, reactions and options appear on a long press.
 const renderedMessages=visibleMessages.map((m,index)=>{
  const mine=m.username===auth.username;
  const previous=visibleMessages[index-1];
  const showSender=!mine&&(!previous||previous.username!==m.username);
  const actionsOpen=expandedMessageActions===m.id&&!m.deletedAt&&!accessRevoked;
  return <Pressable key={m.id} accessibilityRole="button"
    accessibilityLabel={t('Mensagem de @{v}. Mantém pressionado para responder ou reagir.',{v:m.username})}
    accessibilityState={{expanded:actionsOpen}}
    onLongPress={()=>{if(!m.deletedAt&&!accessRevoked)setExpandedMessageActions(current=>current===m.id?null:m.id);}}
    delayLongPress={280}
    style={[styles.message,mine&&styles.mine]}>
     {showSender?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir perfil de @{v}',{v:m.username})} hitSlop={6}
       onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}>
       <Text style={styles.sender}>{m.username}</Text>
      </Pressable>:null}
     {m.replyToMessageId?<View style={styles.quote}><Text style={styles.quoteTitle}>↩ {m.replyToSender||t('Mensagem anterior')}</Text><Text numberOfLines={2} style={styles.quoteBody}>{m.replyToText||t('Mensagem citada')}</Text></View>:null}
     {!m.deletedAt&&giphyImageUrl(m.body)?<Image source={{uri:giphyImageUrl(m.body)!}} resizeMode="contain" style={styles.gif}/>:null}
     {!m.deletedAt&&readPoll(m.body)?<PollCard poll={readPoll(m.body)!} kind="community" conversationId={id} messageId={m.id} token={auth.token}/>:
     !m.deletedAt&&readCallUp(m.body)?<CallUpCard sessionId={readCallUp(m.body)!} token={auth.token} username={auth.username}/>:
     <ChatMentionText body={m.deletedAt?t('Mensagem removida'):giphyImageUrl(m.body)?'GIF':m.body||m.attachmentName||'Anexo'} style={[styles.body,m.deletedAt&&styles.deleted]}/>}
     {!m.deletedAt&&chatLocationUrl(m.body)?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir localização partilhada no mapa')} onPress={()=>void Linking.openURL(chatLocationUrl(m.body)!).catch(()=>Alert.alert(t('Localização'),t('Não foi possível abrir o mapa.')))}>
      <View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="location" size={16} color={C.mint}/><Text style={styles.mapLink}>{t('Abrir localização no mapa')}</Text><JynloIcon name="chevron-right" size={15} color={C.mint}/></View>
     </Pressable>:null}
     {!m.deletedAt?chatAttachmentList(m).map(attachment=><SecureChatAttachment key={attachment.index} index={attachment.index} scope="community" conversationId={id} messageId={m.id} token={auth.token} name={attachment.name} mime={attachment.mime} size={attachment.size} autoPreview={recentPhotoIds.has(m.id)&&attachment.mime?.startsWith('image/')===true}
      onAuthorizationError={()=>{setMessages([]);void refresh(generation.current,false);}}/>):null}
     <View style={styles.metaRow}>
      {!m.deletedAt?<View style={styles.metaReactions}><ChatReactionRow id={m.id} summary={reactions.summaries[m.id]} busy={reactions.busyIds.has(m.id)} disabled={accessRevoked||!auth.token} onReact={reactions.react} onInspect={reactions.inspect} hideAdd/></View>:<View style={styles.metaReactions}/>}
      <Text style={styles.time}>{timeOf(m)}{m.editedAt?' · '+t('editada'):''}</Text>
     </View>
     {actionsOpen?<View style={styles.contextActions}>
       <View style={styles.quickReactions}>
        {CHAT_REACTION_EMOJIS.map(emoji=><Pressable key={emoji} accessibilityRole="button" accessibilityLabel={t('Reagir com {v}',{v:emoji})}
          disabled={reactions.busyIds.has(m.id)}
          onPress={()=>{setExpandedMessageActions(null);void reactions.react(m.id,reactions.summaries[m.id]?.myEmoji===emoji?null:emoji);}}
          style={[styles.quickReaction,reactions.summaries[m.id]?.myEmoji===emoji&&styles.quickReactionOn]}>
          <Text style={styles.quickReactionText}>{emoji}</Text></Pressable>)}
       </View>
       <View style={styles.contextRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Responder a {v}',{v:m.username})}
          onPress={()=>{setReply(m);setExpandedMessageActions(null);}} style={styles.replyAction}>
          <JynloIcon name="reply" size={18} color={C.mint}/>
          <Text style={styles.quoteTitle}>{t('Responder')}</Text>
        </Pressable>
        {ownMessage(m)?<Pressable accessibilityRole="button" accessibilityLabel={t('Editar ou eliminar a minha mensagem')}
          disabled={mutationBusy} onPress={()=>{setExpandedMessageActions(null);messageOptions(m);}}
          style={styles.replyAction}>
          <JynloIcon name="more" size={20} color={C.mint}/>
          <Text style={styles.quoteTitle}>{t('Mais opções')}</Text>
        </Pressable>:null}
       </View>
      </View>:null}
   </Pressable>;
 });
 const status=connection==='online'?t('● Ligado'):connection==='connecting'?t('○ A ligar'):t('○ A sincronizar sem ligação em tempo real');
 const history=<ScrollView ref={inlineHistoryRef} style={embedded?[styles.inlineHistory,keyboardVisible&&styles.inlineHistoryKeyboard]:styles.historyScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
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
   contentContainerStyle={styles.history}>
   {messages.length>historyLimit&&embedded?<Pressable accessibilityRole="button" onPress={()=>{inlineNearBottom.current=false;setHistoryLimit(count=>count+40);}} style={styles.olderMessages}>
    <Text style={styles.quoteTitle}>{t('Ver mensagens anteriores')}</Text>
   </Pressable>:null}
   {!loading&&!error&&messages.length===0?<Text style={styles.empty}>{t('Começa a conversa. A primeira mensagem pode ser tua!')}</Text>:null}
   {renderedMessages}
  </ScrollView>;
 const attachMenu=auth.token&&!accessRevoked&&attachmentsOpen?<View style={styles.attachmentOptions}>
    {canSendPhoto?<Pressable accessibilityRole="button" accessibilityLabel={t('Selecionar fotografias ou vídeos')} disabled={sending||uploading}
     style={styles.attachItem} onPress={()=>{setAttachmentsOpen(false);void choosePhoto();}}><JynloIcon name="gallery" size={22} color={C.mint}/><Text style={styles.attachLabel}>{t('Galeria')}</Text></Pressable>:null}
    {canSendPhoto?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir câmara')} disabled={sending||uploading}
     style={styles.attachItem} onPress={()=>{setAttachmentsOpen(false);void choosePhoto('camera');}}><JynloIcon name="camera" size={22} color={C.mint}/><Text style={styles.attachLabel}>{t('Câmara')}</Text></Pressable>:null}
    <View style={styles.attachItem}><ChatPdfComposer compact target={{scope:'community',id}} token={auth.token} enabled={!accessRevoked&&!sending&&!uploading&&!pendingWrites.current.has(id+'|'+auth.token)}
      replyId={reply?.id} onSent={async(sentReplyId)=>{setAttachmentsOpen(false);setReply(current=>current?.id===(sentReplyId??undefined)?null:current);await refresh();}}/><Text style={styles.attachLabel}>PDF</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Partilhar localização atual')} disabled={locationBusy||sending||uploading}
     style={styles.attachItem} onPress={()=>{setAttachmentsOpen(false);prepareLocation();}}><JynloIcon name="location" size={22} color={C.mint}/><Text style={styles.attachLabel}>{t('Localização')}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Convocatória: convocar para um dos teus jogos')}
     style={styles.attachItem} disabled={sending} onPress={()=>{setAttachmentsOpen(false);setCallUpOpen(true);}}><JynloIcon name="session" size={22} color={C.mint}/><Text style={styles.attachLabel}>{t('Convocatória')}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Criar sondagem')}
     style={styles.attachItem} disabled={sending} onPress={()=>{setAttachmentsOpen(false);setPollOpen(true);}}><Text style={{fontSize:20}}>📊</Text><Text style={styles.attachLabel}>{t('Sondagem')}</Text></Pressable>
   </View>:null;
 const footer=<View style={styles.footer}>
   {uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null)?<Text accessibilityRole="alert" style={{color:C.muted,fontSize:12}}>{t('Envio sem confirmação. Confirma no histórico antes de repetir esta mensagem.')}</Text>:null}
   {!accessRevoked&&uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null)?<Button secondary title={t('Já confirmei no histórico · Permitir novo envio')}
    onPress={()=>{uncertainSendRef.current=null;setUncertainSend(null);}}/>:null}
   {photo&&!accessRevoked?<View style={styles.photoPanel}>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
     {[photo,...extraPhotos].map((file,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={t('Remover ficheiro {v}',{v:(index+1)})} disabled={uploading} onPress={()=>{
      const remaining=[photo,...extraPhotos].filter((_,i)=>i!==index);
      setPhoto(remaining[0]||null);setExtraPhotos(remaining.slice(1));
     }} style={{gap:4}}>
      {file.type==='video'?<View style={{width:72,height:72,borderRadius:10,backgroundColor:'#173039',justifyContent:'center',alignItems:'center'}}><JynloIcon name="video" size={20} color={C.white}/><Text style={{color:C.white,fontSize:11}}>{t('Vídeo')}</Text></View>:<Image source={{uri:file.uri}} style={{width:72,height:72,borderRadius:10}}/>}
      <View style={{flexDirection:"row",alignItems:"center",gap:4}}><JynloIcon name="remove" size={14} color={C.mint}/><Text style={styles.note}>{t('Remover')}</Text></View>
     </Pressable>)}
    </View>
     <Text style={styles.note}>{t('{a}/4 ficheiros · fotografias até 5 MB, vídeos até 20 MB. Confirma antes de enviar.',{a:1+extraPhotos.length})}</Text>
   <TextInput accessibilityLabel={t('Legenda dos anexos')} multiline maxLength={2000} value={attachmentCaption} onChangeText={setAttachmentCaption} editable={!uploading} placeholder={t('Legenda para as fotografias ou vídeos (opcional)')} placeholderTextColor={C.muted} style={styles.editInput}/>
     <View style={{flexDirection:'row',gap:10}}><Button title={uploading?t('A enviar…'):t('Enviar ficheiros')} disabled={uploading||sending||pendingWrites.current.has(id+'|'+auth.token)} onPress={()=>{void uploadPhoto();}}/>
     <Button secondary title={t('Cancelar anexos')} disabled={uploading} onPress={()=>{setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');}}/></View>
   </View>:null}
   {editing&&!accessRevoked?<View style={styles.editPanel}>
     <Text style={styles.quoteTitle}>{t('Editar a minha mensagem · até 15 minutos após o envio')}</Text>
     <TextInput accessibilityLabel={t('Editar mensagem')} multiline maxLength={2000} editable={!mutationBusy} value={editText} onChangeText={setEditText} placeholder={t('Mensagem…')} placeholderTextColor={C.muted} style={styles.editInput}/>
     <View style={{flexDirection:'row',gap:12}}><Button title={mutationBusy?t('A guardar…'):t('Guardar edição')} disabled={mutationBusy||!editText.trim()} onPress={()=>void saveEdit()}/><Button secondary title={t('Cancelar')} disabled={mutationBusy} onPress={()=>{setEditing(null);setEditText('');}}/></View>
   </View>:null}
   {reply&&!accessRevoked?<ChatReplyPreview sender={reply.username} body={reply.body||reply.attachmentName||'Anexo'} onCancel={()=>setReply(null)} disabled={sending||uploading}/>:null}
   {attachMenu}
   <CallUpPicker visible={callUpOpen} token={auth.token} username={auth.username} onClose={()=>setCallUpOpen(false)} onPick={sessionId=>void sendCallUp(sessionId)}/>
   <PollComposer visible={pollOpen} onClose={()=>setPollOpen(false)} onSend={text=>void sendPoll(text)}/>
   <ChatMentionSuggestions draft={draft} token={auth.token} onChange={setDraft} disabled={sending||uploading||accessRevoked}/>
   {typing.label?<Text style={chatLook.typing} accessibilityLiveRegion="polite">{typing.label}</Text>:null}
   {auth.token&&!accessRevoked?<View style={styles.composer}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:attachmentsOpen}}
       accessibilityLabel={attachmentsOpen?t('Fechar anexos'):t('Abrir anexos')}
       onPress={()=>setAttachmentsOpen(value=>!value)} style={styles.plus}>
       <JynloIcon name={attachmentsOpen?'close':'plus'} size={24} color={C.mint}/>
     </Pressable>
     <TextInput multiline style={styles.input} placeholder={t('Escreve uma mensagem…')} placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
       maxLength={2000} accessibilityLabel={t('Mensagem para a comunidade')}
       onFocus={()=>{composerFocused.current=true;setAttachmentsOpen(false);if(inlineNearBottom.current)inlineHistoryRef.current?.scrollToEnd({animated:true});}}
       onBlur={()=>{composerFocused.current=false;}}/>
     <Pressable style={[styles.send,(sending||sendBlocked)&&{opacity:.5}]} onPress={()=>{void send();}} disabled={sending||uploading||pendingWrites.current.has(id+'|'+auth.token)||!draft.trim()||(uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null))} accessibilityRole="button" accessibilityLabel={sending?t('A enviar mensagem…'):t('Enviar mensagem para a comunidade')}>
       {sending?<ActivityIndicator color={C.background}/>:<JynloIcon name="send" size={22} color={C.background}/>}
     </Pressable>
   </View>:null}
   {!auth.token?<Button title={t('Entrar para conversar')} onPress={()=>router.push('/login')}/>:null}
   {refreshWarning&&!accessRevoked?<Button secondary title={t('Tentar novamente')} disabled={loading||sending||uploading} onPress={()=>{void refresh();}} />:null}
  </View>;
 const alerts=<>
   {muteError&&!accessRevoked?<Message tone="error">{muteError}</Message>:null}
   {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}
   {refreshWarning?<Message tone="error">{refreshWarning}</Message>:null}
  </>;
 const newMessagesPill=unseenBelow?<Pressable accessibilityRole="button" accessibilityLabel={t('Ver mensagens novas')}
    onPress={()=>{initialAutoScrollPending.current=false;inlineHistoryRef.current?.scrollToEnd({animated:true});}}
    style={styles.newMessages}><JynloIcon name="chevron-down" size={17} color={C.background}/>
    <Text style={styles.newMessagesText}>{t('Mensagens novas')}</Text></Pressable>:null;
 if(embedded)return <View style={styles.inline}>
   <ChatSearchPanel kind="community" conversationId={String(id)} token={auth.token} enabled={!accessRevoked}/>
   {alerts}{history}{newMessagesPill}{footer}
  </View>;
 return <SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
  <KeyboardFrame style={styles.keyboardFrame}>
   <DemoBanner/>
   <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Voltar')} onPress={()=>router.back()} style={styles.headerIcon}><JynloIcon name="back" size={23} color={C.white}/></Pressable>
    <View style={styles.headerAvatar}><JynloIcon name="community" size={22} color={C.mint}/></View>
    <View style={{flex:1,minWidth:0}}>
     <Text maxFontSizeMultiplier={1.2} style={styles.headerTitle} numberOfLines={1}>{name}</Text>
     <Text maxFontSizeMultiplier={1.2} style={styles.headerStatus} numberOfLines={1}>{status}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:searchOpen}} accessibilityLabel={searchOpen?t('Fechar pesquisa'):t('Pesquisar no chat')}
      onPress={()=>setSearchOpen(value=>!value)} style={styles.headerIcon}><JynloIcon name={searchOpen?'close':'search'} size={22} color={C.mint}/></Pressable>
    {auth.token&&muteKnown&&!accessRevoked?<Pressable accessibilityRole="button" accessibilityLabel={muted?t('Ativar avisos deste chat'):t('Silenciar avisos deste chat')}
      disabled={muteBusy} onPress={toggleMute} style={styles.headerIcon}>
      <JynloIcon name="notifications" size={22} color={muted?C.muted:C.mint} active={!muted}/></Pressable>:null}
   </View>
   {searchOpen?<View style={styles.searchWrap}><ChatSearchPanel kind="community" conversationId={String(id)} token={auth.token} enabled={!accessRevoked}/></View>:null}
   {alerts}
   {history}
   {newMessagesPill}
   {footer}
  </KeyboardFrame>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:C.background},keyboardFrame:{flex:1},
 header:{minHeight:58,paddingHorizontal:6,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:C.border,backgroundColor:C.background},
 headerIcon:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 headerAvatar:{width:36,height:36,borderRadius:18,backgroundColor:C.surface,alignItems:'center',justifyContent:'center'},
 headerTitle:{fontSize:17,fontWeight:'900',color:C.white},headerStatus:{fontSize:11,color:C.muted},
 searchWrap:{paddingHorizontal:12,paddingTop:8},
 inline:{gap:10,padding:10,borderWidth:1,borderColor:'#3FC6B04D',borderRadius:18,backgroundColor:'#082B39'},
 inlineHistory:{height:470,maxHeight:470,minHeight:240,borderRadius:14,backgroundColor:'#041D29'},
 inlineHistoryKeyboard:{height:230,maxHeight:230,minHeight:120},
 historyScroll:{flex:1},
 history:{paddingHorizontal:10,paddingTop:10,paddingBottom:12,gap:6,flexGrow:1},
 empty:{color:C.muted,fontSize:13,textAlign:'center',marginTop:24},
 olderMessages:{padding:10,alignItems:'center'},
 newMessages:{alignSelf:'center',flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:C.mint,marginBottom:6},
 newMessagesText:{fontSize:12,fontWeight:'800',color:C.background},
 footer:{flexShrink:0,paddingHorizontal:10,paddingTop:8,paddingBottom:8,gap:7,borderTopWidth:1,borderTopColor:C.border,backgroundColor:C.background},
 attachmentOptions:{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'flex-start',paddingVertical:4},
 attachItem:{width:72,alignItems:'center',gap:4},
 attachLabel:{fontSize:11,color:C.muted,textAlign:'center'},
 plus:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:C.surface},
 editPanel:{gap:9,padding:12,borderRadius:14,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 editInput:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,minHeight:48,maxHeight:150},
 contextActions:{gap:6,marginTop:4,paddingTop:6,borderTopWidth:1,borderTopColor:'#3BB2AE40'},
 quickReactions:{flexDirection:'row',flexWrap:'wrap',gap:4},
 quickReaction:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#0A2A35'},
 quickReactionOn:{borderWidth:1,borderColor:C.mint},
 quickReactionText:{fontSize:19},
 contextRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
 replyAction:{minHeight:36,flexDirection:'row',alignItems:'center',gap:5,justifyContent:'center',paddingHorizontal:8},
 quote:{borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:8,gap:2,marginBottom:2},quoteTitle:{fontSize:12,color:C.mint,fontWeight:'800'},quoteBody:{fontSize:12,color:C.muted},
 note:{color:C.muted,fontSize:12},
 message:{paddingHorizontal:11,paddingTop:7,paddingBottom:5,borderRadius:16,backgroundColor:'#0D3945',gap:3,maxWidth:'84%',alignSelf:'flex-start',borderBottomLeftRadius:5},
 mine:{backgroundColor:'#12554D',alignSelf:'flex-end',borderBottomLeftRadius:16,borderBottomRightRadius:5},
 sender:{fontSize:12,color:C.mint,fontWeight:'800'},body:{fontSize:15,color:C.white,lineHeight:21},deleted:{fontStyle:'italic',color:C.muted},
 metaRow:{flexDirection:'row',alignItems:'flex-end',gap:6},metaReactions:{flexShrink:1},
 time:{fontSize:10,color:C.muted,marginLeft:'auto'},
 photoPanel:{gap:8,padding:10,backgroundColor:C.surface,borderRadius:14},
 gif:{width:220,height:180,maxWidth:'100%',borderRadius:12,backgroundColor:C.surface},
 mapLink:{color:C.mint,fontSize:13,fontWeight:'800',paddingVertical:6},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:8},
 input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:130,backgroundColor:'#061F2E',borderColor:'#3BB6AA66',borderWidth:1,color:MobileTheme.colors.text,paddingHorizontal:14,paddingVertical:11,borderRadius:22},
 send:{backgroundColor:MobileTheme.colors.accent,borderRadius:22,width:46,minHeight:MobileTheme.touchTarget,justifyContent:'center',alignItems:'center'}});
