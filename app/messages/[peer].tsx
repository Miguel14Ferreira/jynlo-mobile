import {KeyboardFrame} from '../../src/components/KeyboardFrame';
import {chatLocationUrl} from '../../src/lib/chat-location.cjs';
import {t} from '../../src/lib/i18n';
import {ensureChatCameraPermission} from '../../src/lib/chat-camera-permission';
import {JynloIcon} from '../../src/components/JynloIcon';
import ChatPdfComposer from '../../src/components/ChatPdfComposer';
import SecureChatAttachment from '../../src/components/SecureChatAttachment';
import {chatAttachmentList,recentPreviewMessageIds,appendChatMediaSelection} from '../../src/lib/chat-attachments-core.cjs';
import {confirmedDirectChatSend} from '../../src/lib/chat-send-receipt.cjs';
import {uncertainChatSend} from '../../src/lib/chat-send-uncertainty.cjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,Image,Keyboard,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../../src/lib/optional-notifications.cjs';
import {observeDirectChat} from '../../src/lib/direct-chat-realtime';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Loader,Message} from '../../src/components/UI';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../src/lib/auth';
import {ApiError,DEMO_MODE} from '../../src/lib/api';
import {directChatHistory,markDirectRead,sendDirectChat,sendDirectChatReply,editDirectChatMessage,deleteDirectChatMessage} from '../../src/lib/chat-api';
import {listConversationMutes,isConversationMuted,setConversationMuted} from '../../src/lib/conversation-mutes-api';
import {directPhotoAvailable,sendDirectPhoto} from '../../src/lib/direct-photo-attachment';
import {sendChatPhotoAlbum} from '../../src/lib/chat-photo-album';
import {validateChatAlbum} from '../../src/lib/chat-attachments-core.cjs';
import {validateChatPhoto} from '../../src/lib/chat-photo-validation';
import type {DirectChatEntry} from '../../src/lib/chat-api';
import {C,MobileTheme} from '../../src/lib/theme';
import {giphyImageUrl} from '../../src/lib/chat-giphy.cjs';
import {encodeCallUp,readCallUp} from '../../src/lib/chat-callup.cjs';
import {CallUpCard} from '../../src/components/CallUpCard';
import {CallUpPicker} from '../../src/components/CallUpPicker';
import {ChatReactionRow,useChatReactions} from '../../src/components/ChatReactionRow';
import ChatSearchPanel from '../../src/components/ChatSearchPanel';
import {blockUser,reportUser,unblockUser,userBlockStatus} from '../../src/lib/user-safety-api';
import {myStoryReplies,type PrivateStoryReply} from '../../src/lib/social-feed-api';
import {storyReplyKind} from '../../src/lib/story-reply-display.cjs';

export default function DirectConversation(){
 const params=useLocalSearchParams<{peer:string}>();
 const peer=typeof params.peer==='string'?params.peer:'';
 const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<DirectChatEntry[]>([]);
 const [uncertainSend,setUncertainSend]=useState<{identity:string;body:string;replyId:number|null}|null>(null);
 const uncertainSendRef=useRef<{identity:string;body:string;replyId:number|null}|null>(null);
 const [storyReplies,setStoryReplies]=useState<PrivateStoryReply[]>([]);
 const storyRepliesIdentity=useRef('');
 const conversationScroll=useRef<ScrollViewInstance|null>(null);
 const nearBottom=useRef(false);
 const historyViewportMeasured=useRef(false);
 const historyViewportHeight=useRef(0);
 const historyContentHeight=useRef(0);
 const latestVisibleAtBottom=useRef(false);
 // Visibility measurements belong to a specific rendered history, never a previous refresh.
 const measuredHistoryKey=useRef('');
 const lastAcknowledgedMessageId=useRef(0);
 const composerFocused=useRef(false);
 useEffect(()=>{
  const event=Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow';
  const subscription=Keyboard.addListener(event,()=>{
   if(!composerFocused.current)return;
   if(nearBottom.current)conversationScroll.current?.scrollToEnd({animated:true});
  });
  return()=>subscription.remove();
 },[]);
 const [attachmentsOpen,setAttachmentsOpen]=useState(false);
 const [locationBusy,setLocationBusy]=useState(false);
 const [safetyOpen,setSafetyOpen]=useState(false);
 const [muteKnown,setMuteKnown]=useState(false);
 const [muted,setMuted]=useState(false);
 const [muteBusy,setMuteBusy]=useState(false);
 const [muteError,setMuteError]=useState('');
 const pendingMuteWrites=useRef(new Set<string>());
 const [draft,setDraft]=useState('');
 const [replyTarget,setReplyTarget]=useState<{id:number;sender:string;text:string}|null>(null);
 const [editing,setEditing]=useState<DirectChatEntry|null>(null),[editText,setEditText]=useState('');
 const [mutationBusy,setMutationBusy]=useState(false),mutationLock=useRef(false);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [callUpOpen,setCallUpOpen]=useState(false);
 const [error,setError]=useState('');
 const [syncWarning,setSyncWarning]=useState('');
 const historyError=useRef<string|null>(null);
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [extraPhotos,setExtraPhotos]=useState<ImagePicker.ImagePickerAsset[]>([]);
 const pickerInFlight=useRef(false);
 const [attachmentCaption,setAttachmentCaption]=useState('');
 const [photoAvailable,setPhotoAvailable]=useState(false),[photoBusy,setPhotoBusy]=useState(false);
 const [photoAvailabilityError,setPhotoAvailabilityError]=useState('');
 const refreshing=useRef<number|null>(null),sendingNow=useRef(false);
 // A write stays locked to its conversation even when the route is reused.
 const pendingWrites=useRef(new Map<string,'text'|'photo'>());
 const generation=useRef(0),conversation=useRef('');
 const blockCheckRequest=useRef(0);
 const pendingRefresh=useRef(false);
 const [blocked,setBlocked]=useState(false);
 const [blockStatusKnown,setBlockStatusKnown]=useState(false);
 const [safetyBusy,setSafetyBusy]=useState(false);
 const safetyInFlight=useRef(false);
 const [showReport,setShowReport]=useState(false);
 const [reportReason,setReportReason]=useState('');
 // Keep Story replies separate from the direct-chat read receipt and chat history.
 useFocusEffect(useCallback(()=>{
  const account=(auth.token||'')+'|'+(auth.username||'')+'|'+peer;
  storyRepliesIdentity.current=account;setStoryReplies([]);
  let active=true;
  if(auth.token&&auth.username&&peer&&blockStatusKnown&&!blocked){
   void myStoryReplies(auth.token,0,auth.username).then(replies=>{
    if(active&&storyRepliesIdentity.current===account)
     setStoryReplies(replies.filter(item=>item.senderUsername.toLowerCase()===peer.toLowerCase()).slice(0,3));
   }).catch(()=>{/* The authenticated direct chat remains usable without Story history. */});
  }
  return()=>{active=false;storyRepliesIdentity.current='';};
 },[auth.token,auth.username,peer,blockStatusKnown,blocked]));
 const refresh:(silent?:boolean,version?:number)=>Promise<void>=useCallback(async(silent=false,version=generation.current)=>{
  if(refreshing.current===version){
   // A send may finish while the 15-second history poll is still running.
   // Queue one fresh server read instead of silently dropping it.
   pendingRefresh.current=true;
   return;
  }
  if(!auth.token||!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer)){
   if(version===generation.current){setLoading(false);setMessages([]);}
   return;
  }
  refreshing.current=version;
  if(!silent){setLoading(true);setError('');}
  try{
   const results=await directChatHistory(peer,auth.token);
   if(version!==generation.current)return;
   setMessages(results);setSyncWarning('');
   const previousHistoryError=historyError.current;historyError.current=null;
   if(previousHistoryError)setError(current=>current===previousHistoryError?'':current);
   // A history refresh does not prove that newly received messages were visible.
   // Read receipts are sent only after the scroll viewport confirms visibility.
  }catch(e){
   if(version===generation.current){
    const accessRevoked=e instanceof ApiError&&[401,403,404,410].includes(e.status);
    if(accessRevoked){
     // A confirmed server-side access change must hide cached private content.
     // Ordinary network failures are not evidence of permission revocation.
     setMessages([]);setDraft('');setReplyTarget(null);setEditing(null);setEditText('');setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');setPhotoAvailable(false);
     setAttachmentsOpen(false);setSyncWarning('');
     setBlocked(true);setBlockStatusKnown(false);
     historyError.current=null;
     setError(t('Já não tens acesso a esta conversa. Volta à lista de mensagens para confirmar as permissões.'));
    }else if(silent){
     setSyncWarning(t('Não foi possível atualizar as mensagens. O histórico apresentado pode estar desatualizado.'));
    }else{
     setSyncWarning(t('Não foi possível sincronizar a conversa. Tenta novamente quando tiveres ligação.'));
     const message=e instanceof Error?e.message:t('Não foi possível abrir a conversa.');
     historyError.current=message;setError(message);
    }
   }
  }finally{
   if(refreshing.current===version)refreshing.current=null;
   if(version===generation.current){
    if(!silent)setLoading(false);
    if(pendingRefresh.current){
     pendingRefresh.current=false;
     void refresh(true,version);
    }
   }
  }
 },[peer,auth.token]);
 useFocusEffect(useCallback(()=>{
  let active=true;
  const identity=peer+'|'+auth.token;
  if(conversation.current!==identity){
   uncertainSendRef.current=null;setUncertainSend(null);
   conversation.current=identity;
   lastAcknowledgedMessageId.current=0;
   nearBottom.current=false;
   historyViewportMeasured.current=false;
   historyViewportHeight.current=0;
   historyContentHeight.current=0;
   latestVisibleAtBottom.current=false;
   measuredHistoryKey.current='';
   setMessages([]);setDraft('');setReplyTarget(null);setEditing(null);setEditText('');setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');setError('');setSyncWarning('');historyError.current=null;
   setAttachmentsOpen(false);setSafetyOpen(false);
   setMuteKnown(false);setMuted(false);setMuteBusy(false);setMuteError('');
   const pending=pendingWrites.current.get(identity);
   setSending(pending==='text');setPhotoBusy(pending==='photo');sendingNow.current=Boolean(pending);
  }
  const version=++generation.current;
  // Revalidate private history on every focus, while retaining the unsent draft.
  setMessages([]);setLoading(true);
  // Refocusing the same chat must not unlock an unsettled message or photo.
  const pending=pendingWrites.current.get(identity);
  sendingNow.current=Boolean(pending);
  setSending(pending==='text');setPhotoBusy(pending==='photo');
  // A previous block/report POST may still be running after navigation.
  setSafetyBusy(safetyInFlight.current);
  const blockRequest=++blockCheckRequest.current;
  pendingRefresh.current=false;
  // Refresh permission and availability, but keep unsent files on a normal refocus.
  setPhotoAvailable(false);setPhotoAvailabilityError('');
  if(auth.token)void directPhotoAvailable(peer,auth.token).then(available=>{
   if(active&&generation.current===version){setPhotoAvailable(available);setPhotoAvailabilityError(available?'':t('O envio de fotografias não está disponível neste momento.'));}
  }).catch(()=>{if(active&&generation.current===version){setPhotoAvailable(false);setPhotoAvailabilityError(t('Não foi possível verificar os anexos de fotografias.'));}});
  void refresh(false,version);
  if(auth.token&&!DEMO_MODE&&/^[a-zA-Z0-9._-]{1,128}$/.test(peer)&&
     peer.toLowerCase()!==auth.username?.toLowerCase()){
   const muteIdentity=identity;
   void listConversationMutes(auth.token).then(mutes=>{
     if(active&&generation.current===version&&conversation.current===muteIdentity&&
        !pendingMuteWrites.current.has(muteIdentity)){
       setMuted(isConversationMuted(mutes,'direct',peer));setMuteKnown(true);setMuteError('');
     }
   }).catch(()=>{
     if(active&&generation.current===version&&conversation.current===muteIdentity)
       setMuteError(t('Não foi possível consultar os avisos desta conversa.'));
   });
  }
  setShowReport(false);setReportReason('');setBlocked(false);setBlockStatusKnown(false);
  if(auth.token&&peer&&peer.toLowerCase()!==auth.username?.toLowerCase()&&!DEMO_MODE){
   void userBlockStatus(peer,auth.token).then(value=>{
    if(active&&generation.current===version&&blockCheckRequest.current===blockRequest){setBlocked(value);setBlockStatusKnown(true);}
   }).catch(()=>{ /* Keep calls disabled when the block status cannot be verified. */ });
  }
  // The authenticated socket gives instant hints; all message content still
  // comes from block-aware HTTP. A modest fallback protects against lost hints.
  let socketOnline=false,pollTicks=0;
  const disconnect=auth.token&&auth.username?observeDirectChat({
   peer,self:auth.username,token:auth.token,
   onInvalidated:()=>{
    if(active&&generation.current===version&&AppState.currentState==='active'&&!sendingNow.current)
     void refresh(true,version);
   },
   onStatus:status=>{if(active&&generation.current===version)socketOnline=status==='online';}
  }):()=>{};
  const timer=setInterval(()=>{
   if(active&&generation.current===version&&AppState.currentState==='active'&&!sendingNow.current){
    pollTicks++;
    if(!socketOnline||pollTicks%6===0)void refresh(true,version);
   }
  },5000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&generation.current===version)void refresh(true,version);
  });
  // Native notification delivery is optional. A missing/unavailable module
  // must not prevent opening a direct chat on Android.
  let received:ReturnType<typeof NotificationTypes.addNotificationReceivedListener>|null=null;
  try{
   const Notifications=getNativeNotifications() as typeof NotificationTypes|null;
   if(Notifications)received=Notifications.addNotificationReceivedListener(notification=>{
    if(notification.request?.content?.data?.kind!=='notification'||generation.current!==version)return;
    if(auth.token)void refresh(true,version);
   });
  }catch{
   // The socket and fallback poll still keep this chat current.
  }
  return ()=>{
   active=false;clearInterval(timer);disconnect();resume.remove();
   try{received?.remove();}catch{
    // Optional native listener teardown must not block navigation.
   }
   pendingRefresh.current=false;generation.current++;blockCheckRequest.current++;
  };
 },[refresh,peer,auth.token,auth.username]));
 function toggleMute(){
  const token=auth.token,identity=peer+'|'+token;
  if(!token||!muteKnown||muteBusy||pendingMuteWrites.current.has(identity))return;
  const version=generation.current,next=!muted;
  const title=next?t('Silenciar avisos?'):t('Ativar avisos?');
  Alert.alert(title,
    t('As mensagens e os indicadores de não lidas continuam a funcionar normalmente.'),[
    {text:t('Cancelar'),style:'cancel'},
    {text:next?t('Silenciar'):t('Ativar'),onPress:()=>{
      if(conversation.current!==identity||pendingMuteWrites.current.has(identity))return;
      pendingMuteWrites.current.add(identity);setMuteBusy(true);setMuteError('');
      void setConversationMuted('direct',peer,next,token).then(async()=>{
        const confirmed=await listConversationMutes(token);
        if(generation.current===version&&conversation.current===identity){
          setMuted(isConversationMuted(confirmed,'direct',peer));setMuteKnown(true);
        }
      }).catch(()=>{
        if(generation.current===version&&conversation.current===identity)
          setMuteError(t('Não foi possível confirmar esta alteração. Tenta novamente.'));
      }).finally(()=>{
        pendingMuteWrites.current.delete(identity);
        if(generation.current===version&&conversation.current===identity)setMuteBusy(false);
      });
    }}
   ]);
 }
 async function updateBlock(){
  if(!auth.token||safetyInFlight.current||!peer||!blockStatusKnown)return;
  safetyInFlight.current=true;
  const identity=peer+'|'+auth.token,version=generation.current;
  const actorToken=auth.token,wasBlocked=blocked;
  // Invalidate an older block-status lookup before the write begins.
  // Its late response must never overwrite this confirmed change.
  ++blockCheckRequest.current;
  setSafetyBusy(true);setError('');
  try{
   const value=wasBlocked?await unblockUser(peer,actorToken):await blockUser(peer,actorToken);
   if(conversation.current!==identity||version!==generation.current)return;
   setBlocked(value);setBlockStatusKnown(true);
   Alert.alert(value?t('Utilizador bloqueado'):t('Utilizador desbloqueado'),
    value?t('Deixaste de poder trocar mensagens com este utilizador.'):t('Podes voltar a comunicar com este utilizador.'));
   await refresh(true,version);
  }catch(e){
   if(conversation.current===identity&&version===generation.current)
    setError(e instanceof Error?e.message:t('Não foi possível alterar o bloqueio. Confirma o estado antes de repetir.'));
  }finally{
   safetyInFlight.current=false;
   setSafetyBusy(false);
  }
 }
 async function submitReport(){
  if(!auth.token||safetyInFlight.current||!reportReason.trim())return;
  safetyInFlight.current=true;
  const identity=peer+'|'+auth.token,version=generation.current;
  const actorToken=auth.token,submittedReason=reportReason.trim();
  setSafetyBusy(true);setError('');
  try{
   await reportUser(peer,submittedReason,actorToken);
   if(conversation.current!==identity||version!==generation.current)return;
   setShowReport(false);
   setReportReason(current=>current===submittedReason?'':current);
   Alert.alert(t('Denúncia enviada'),t('Obrigado. A equipa Jynlo poderá analisar a situação.'));
  }catch(e){
   if(conversation.current===identity&&version===generation.current)
    setError(e instanceof Error?e.message:t('Não foi possível confirmar a denúncia. Verifica antes de repetires.'));
  }finally{
   safetyInFlight.current=false;
   setSafetyBusy(false);
  }
 }
 function ownMessage(m:DirectChatEntry){
  return Boolean(auth.username&&m.username1.toLowerCase()===auth.username.toLowerCase()&&!m.deletedAt);
 }
 function editable(m:DirectChatEntry){
  const created=Date.parse(m.date||'');
  return ownMessage(m)&&Boolean(m.text?.trim())&&!m.attachmentName&&!m.attachments?.length&&
   m.text?.startsWith('[JYNLO:GIPHY:1]')!==true&&Number.isFinite(created)&&
   created<=Date.now()&&Date.now()-created<=15*60*1000;
 }
 function messageOptions(m:DirectChatEntry){
  if(!ownMessage(m)||blocked||mutationLock.current||sendingNow.current||photoBusy)return;
  const items:Array<{text:string;style?:'cancel'|'destructive';onPress?:()=>void}>=[];
  if(editable(m))items.push({text:t('Editar mensagem'),onPress:()=>{
    setEditing(m);setEditText(m.text||'');setReplyTarget(null);
  }});
  items.push({text:t('Apagar para todos'),style:'destructive',onPress:()=>Alert.alert(
   t('Apagar mensagem para todos?'),t('O conteúdo ficará identificado como removido na conversa.'),
   [{text:t('Cancelar'),style:'cancel'},{text:t('Apagar'),style:'destructive',onPress:()=>void deleteMessage(m)}])});
  items.push({text:t('Cancelar'),style:'cancel'});
  Alert.alert(t('A minha mensagem'),t('Seleciona uma ação.'),items);
 }
 async function saveEdit(){
  if(!editing||!editable(editing)||!auth.token||blocked||mutationLock.current||sendingNow.current||photoBusy)return;
  const original=editing,text=editText.trim(),version=generation.current,identity=peer+'|'+auth.token;
  if(!text||text.length>2000||text.startsWith('[JYNLO:GIPHY:1]')){
   setError(t('A mensagem editada deve ter entre 1 e 2000 caracteres.'));return;
  }
  mutationLock.current=true;setMutationBusy(true);setError('');
  try{
   const result=await editDirectChatMessage(peer,original.id,text,auth.token);
   if(version!==generation.current||conversation.current!==identity)return;
   setMessages(old=>old.map(m=>m.id===result.id?result:m));
   setEditing(current=>current?.id===original.id?null:current);
   setEditText(current=>current===editText?'':current);
   await refresh(true,version);
  }catch(e){
   if(version===generation.current&&conversation.current===identity)
    setError((e instanceof Error?e.message:t('Edição não confirmada.'))+' '+t('Consulta o histórico antes de repetir.'));
  }finally{mutationLock.current=false;setMutationBusy(false);}
 }
 async function deleteMessage(m:DirectChatEntry){
  if(!ownMessage(m)||!auth.token||blocked||mutationLock.current||sendingNow.current||photoBusy)return;
  const version=generation.current,identity=peer+'|'+auth.token;
  mutationLock.current=true;setMutationBusy(true);setError('');
  try{
   const result=await deleteDirectChatMessage(peer,m.id,auth.token);
   if(version!==generation.current||conversation.current!==identity)return;
   setMessages(old=>old.map(item=>item.id===result.id?result:
    item.replyToMessageId===result.id?{...item,replyToText:t('Mensagem removida')}:item));
   setEditing(current=>current?.id===m.id?null:current);
   setReplyTarget(current=>current?.id===m.id?null:current);
   await refresh(true,version);
  }catch(e){
   if(version===generation.current&&conversation.current===identity)
    setError((e instanceof Error?e.message:t('Eliminação não confirmada.'))+' '+t('Consulta o histórico antes de repetir.'));
  }finally{mutationLock.current=false;setMutationBusy(false);}
 }
 async function send(){
  const identity=peer+'|'+auth.token;
  if(mutationLock.current||sending||sendingNow.current||pendingWrites.current.has(identity)||blocked||!blockStatusKnown||!auth.token||!draft.trim())return;
  if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===draft.trim()&&uncertainSendRef.current.replyId===(replyTarget?.id??null))return;
  const originalDraft=draft;
  const originalReply=replyTarget;
  const submittedText=originalDraft.trim();
  const version=generation.current;
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=originalReply
    ?await sendDirectChatReply(peer,submittedText,auth.token,originalReply.id)
    :await sendDirectChat(peer,submittedText,auth.token);
   if(!confirmedDirectChatSend(confirmed,auth.username||'',peer,submittedText,originalReply?.id))
    throw Error(t('O servidor respondeu, mas não confirmou esta mensagem. Consulta o histórico antes de repetir.'));
   if(version!==generation.current||conversation.current!==identity)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===submittedText&&uncertainSendRef.current.replyId===(originalReply?.id??null)){uncertainSendRef.current=null;setUncertainSend(null);}
   // The server confirmed the write: render it now, independent of a later GET.
   setMessages(current=>current.some(message=>message.id===confirmed.id)?current:
    [...current,confirmed].sort((left,right)=>left.id-right.id));
   setDraft(current=>current===originalDraft?'':current);
   if(originalReply)setReplyTarget(current=>current?.id===originalReply.id?null:current);
   void refresh(true,version);
  }catch(e){
   if(version===generation.current&&conversation.current===identity&&uncertainChatSend(e))
    {const uncertain={identity,body:submittedText,replyId:originalReply?.id??null};uncertainSendRef.current=uncertain;setUncertainSend(uncertain);}
   if(version===generation.current&&conversation.current===identity)
    setError((e instanceof Error?e.message:t('Não foi possível enviar.'))+
     ' '+t('Consulta o histórico antes de repetires o envio.'));
  }finally{
   pendingWrites.current.delete(identity);
   if(conversation.current===identity){
    sendingNow.current=false;setSending(false);
   }
  }
 }
 /** Convocatória: one of my sessions, sent alone as the server envelope. */
 async function sendCallUp(sessionId:number){
  setCallUpOpen(false);
  const text=encodeCallUp(sessionId),identity=peer+'|'+auth.token;
  if(!text||!auth.token||blocked||sending||sendingNow.current||pendingWrites.current.has(identity))return;
  const version=generation.current;
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=await sendDirectChat(peer,text,auth.token);
   if(version!==generation.current||conversation.current!==identity)return;
   setMessages(current=>current.some(m=>m.id===confirmed.id)?current:[...current,confirmed].sort((a,b)=>a.id-b.id));
   void refresh(true,version);
  }catch(e){
   if(version===generation.current)setError((e instanceof Error?e.message:t('Não foi possível enviar a convocatória.'))+' '+t('Consulta o histórico antes de repetir.'));
  }finally{if(conversation.current===identity){sendingNow.current=false;setSending(false);}}
 }
 async function prepareLocation(){
  const identity=peer+'|'+auth.token;
  if(!auth.token||!blockStatusKnown||blocked||locationBusy||sendingNow.current)return;
  const version=generation.current;
  Alert.alert(t('Partilhar localização atual?'),t('A Jynlo só consultará a localização nesta ação. Será colocada numa mensagem que podes rever antes de enviar ao contacto.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Continuar'),onPress:()=>{
    setLocationBusy(true);setError('');
    void (async()=>{
      const Location=await import('expo-location');
      const permission=await Location.requestForegroundPermissionsAsync();
      if(permission.status!=='granted')throw new Error(t('Não autorizaste o acesso à localização. Podes continuar a enviar mensagens normalmente.'));
      const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      if(!Number.isFinite(point.coords.latitude)||!Number.isFinite(point.coords.longitude))throw new Error(t('Não foi possível determinar a localização.'));
      const url='https://www.google.com/maps?q='+point.coords.latitude.toFixed(5)+','+point.coords.longitude.toFixed(5);
      if(generation.current===version&&conversation.current===identity){
        setDraft(previous=>[previous.trim(),url].filter(Boolean).join('\n'));
        setAttachmentsOpen(false);
        Alert.alert(t('Localização pronta'),t('O link foi colocado na mensagem. Confirma o destinatário e toca em Enviar quando quiseres partilhar.'));
      }
    })().catch(e=>{
      if(generation.current===version&&conversation.current===identity)setError(e instanceof Error?e.message:t('Não foi possível obter a localização.'));
    }).finally(()=>{if(generation.current===version&&conversation.current===identity)setLocationBusy(false);});
   }}
  ]);
 }
 async function choosePhoto(source:'gallery'|'camera'='gallery'){
  const identity=peer+'|'+auth.token;
  if(mutationLock.current||!auth.token||blocked||!blockStatusKnown||!photoAvailable||photoBusy||sendingNow.current||pickerInFlight.current)return;
  const current=photo?[photo,...extraPhotos]:[];
  const remaining=4-current.length;
  if(remaining<=0){setError(t('Já selecionaste 4 ficheiros. Remove um antes de adicionares outro.'));return;}
  const version=generation.current,token=auth.token;
  pickerInFlight.current=true;setError('');
  try{
   const ImagePicker=await import('expo-image-picker');
   if(source==='camera'&&!await ensureChatCameraPermission())return;
   const selected=source==='camera'?
    await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,videoMaxDuration:30}):
    await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,allowsMultipleSelection:true,selectionLimit:remaining});
   if(version!==generation.current||conversation.current!==identity||auth.token!==token||selected.canceled||!selected.assets?.length)return;
   for(const asset of selected.assets){if(asset.type==='image')validateChatPhoto(asset);}
   const result=appendChatMediaSelection(current,selected.assets);
   if(result.error)throw Error(result.error);
   if(version!==generation.current||conversation.current!==identity||blocked||!blockStatusKnown||!photoAvailable)return;
   setPhoto(result.items[0]||null);setExtraPhotos(result.items.slice(1));
  }catch(e){
   if(version===generation.current&&conversation.current===identity)
    setError(e instanceof Error?e.message:t('Não foi possível abrir a câmara ou a galeria.'));
  }finally{pickerInFlight.current=false;}
 }
 async function uploadPhoto(){
  const identity=peer+'|'+auth.token;
  if(mutationLock.current||!auth.token||blocked||!blockStatusKnown||!photo||!photoAvailable||photoBusy||sending||sendingNow.current||pendingWrites.current.has(identity))return;
  const version=generation.current,originalReplyId=replyTarget?.id;
  const captionToSend=attachmentCaption;
  pendingWrites.current.set(identity,'photo');
  setPhotoBusy(true);sendingNow.current=true;setError('');
  try{
   if(extraPhotos.length||photo.type==='video'||captionToSend.trim())await sendChatPhotoAlbum({scope:'direct',id:peer},auth.token,[photo,...extraPhotos],originalReplyId,captionToSend);
    else await sendDirectPhoto(peer,auth.token,photo,originalReplyId);
   if(version!==generation.current||conversation.current!==identity)return;
   setPhoto(null);setExtraPhotos([]);setAttachmentCaption(current=>current===captionToSend?'':current);setReplyTarget(current=>current?.id===originalReplyId?null:current);
   // Confirmed photo/album upload and later history synchronization are separate operations.
   void refresh(true,version);
  }catch(e){
   if(version===generation.current&&conversation.current===identity)
    setError(e instanceof Error?e.message:t('Não foi possível enviar a fotografia.'));
  }finally{
   pendingWrites.current.delete(identity);
   if(conversation.current===identity){
    sendingNow.current=false;setPhotoBusy(false);
   }
  }
 }
 // A message edit or removal may change layout without changing its ID.
 // Require a new content-size measurement before acknowledging that history.
 const historyKey=JSON.stringify(messages.map(item=>[
  item.id,item.text,item.editedAt,item.deletedAt,item.attachmentName,
  item.replyToText,item.attachments
 ]));
 const acknowledgeVisibleHistory=useCallback((fullyVisible:boolean)=>{
  if(measuredHistoryKey.current!==historyKey)return;
  if(!fullyVisible||!auth.token||!blockStatusKnown||blocked||loading||syncWarning||
     AppState.currentState!=='active'||DEMO_MODE)return;
  const latest=messages.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
  if(latest<=lastAcknowledgedMessageId.current)return;
  const identity=peer+'|'+auth.token,version=generation.current;
  lastAcknowledgedMessageId.current=latest;
  void markDirectRead(peer,latest,auth.token).catch(()=>{
   if(conversation.current===identity&&generation.current===version&&lastAcknowledgedMessageId.current===latest)
    lastAcknowledgedMessageId.current=0;
  });
 },[auth.token,blockStatusKnown,blocked,loading,syncWarning,messages,peer,historyKey]);
 useEffect(()=>{
  // Short histories may become visible without a native scroll event.
  if(historyViewportHeight.current>0&&historyContentHeight.current>0&&
     historyContentHeight.current<=historyViewportHeight.current)
   acknowledgeVisibleHistory(true);
  else if(latestVisibleAtBottom.current)acknowledgeVisibleHistory(true);
 },[acknowledgeVisibleHistory]);
 // Only preview the most recent images automatically; all attachments remain
 // authenticated and subject to the secure 5 MB cache limit.
 const recentPhotoIds=new Set(recentPreviewMessageIds(messages));
 const reactions=useChatReactions('direct',peer,auth.token,messages.map(m=>m.id),!blocked&&blockStatusKnown);
 return <SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
  <KeyboardFrame style={styles.keyboardFrame}>
  <View style={styles.fixedChatHeader}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Voltar às conversas')} onPress={()=>router.back()} style={styles.headerIcon}><JynloIcon name="back" size={23} color={C.white}/></Pressable>
    <View style={styles.peerAvatar}><JynloIcon name="profile" size={25} color={C.mint}/></View>
    <Text style={styles.peerTitle} numberOfLines={1}>{peer}</Text>
    {auth.token&&!DEMO_MODE&&blockStatusKnown&&!blocked&&peer.toLowerCase()!==auth.username?.toLowerCase()?<Pressable accessibilityRole="button" accessibilityLabel={t('Iniciar chamada com este contacto')} style={styles.headerIcon} onPress={()=>router.push({pathname:'/messages/call',params:{peer}})}><JynloIcon name="video" size={23} color={C.mint}/></Pressable>:null}
  </View>
  <ScrollView ref={conversationScroll} style={styles.historyScroll} contentContainerStyle={styles.history} keyboardShouldPersistTaps="handled"
    onLayout={event=>{
      historyViewportHeight.current=event.nativeEvent.layout.height;
      historyViewportMeasured.current=historyViewportHeight.current>0;
      if(historyViewportHeight.current>0&&historyContentHeight.current>0&&
         historyContentHeight.current<=historyViewportHeight.current&&measuredHistoryKey.current===historyKey){
        nearBottom.current=true;latestVisibleAtBottom.current=true;
        acknowledgeVisibleHistory(true);
      }
    }}
    onScroll={event=>{const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;
      historyViewportHeight.current=layoutMeasurement.height;
      // A scroll event may refer to an older native layout. Never replace the
      // content height certified by onContentSizeChange with that stale value.
      const currentMeasurement=measuredHistoryKey.current===historyKey&&
       historyContentHeight.current>0&&layoutMeasurement.height>0&&
       Math.abs(contentSize.height-historyContentHeight.current)<=1;
      historyViewportMeasured.current=currentMeasurement;
      if(!currentMeasurement){
       nearBottom.current=false;
       latestVisibleAtBottom.current=false;
       return;
      }
      nearBottom.current=contentOffset.y+layoutMeasurement.height>=historyContentHeight.current-90;
      // A 90px proximity tolerance is for auto-scroll only, not read receipts.
      latestVisibleAtBottom.current=
       contentOffset.y+layoutMeasurement.height>=historyContentHeight.current-2;
      acknowledgeVisibleHistory(latestVisibleAtBottom.current);
    }}
    scrollEventThrottle={100}
    onContentSizeChange={(_,height)=>{
      historyContentHeight.current=height;
      measuredHistoryKey.current=historyKey;
      if(historyViewportHeight.current>0&&height>0&&height<=historyViewportHeight.current){
       nearBottom.current=true;latestVisibleAtBottom.current=true;
       acknowledgeVisibleHistory(true);
      }else if(nearBottom.current&&historyViewportMeasured.current){
       conversationScroll.current?.scrollToEnd({animated:false});
      }
    }}>
  <DemoBanner/>
  <ChatSearchPanel kind="direct" conversationId={peer} token={auth.token} enabled={blockStatusKnown&&!blocked}/>
  <Text style={styles.note}>{t('Conversas sincronizadas com a tua conta Jynlo. As permissões de amizade e bloqueio são verificadas pelo servidor.')}</Text>
  {auth.token&&!DEMO_MODE&&blockStatusKnown&&!blocked&&peer.toLowerCase()!==auth.username?.toLowerCase()?<Button secondary title={t('Chamada de voz ou vídeo')} onPress={()=>router.push({pathname:'/messages/call',params:{peer}})}/>:null}
  {!auth.token?<Button title={t('Entrar para conversar')} onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {uncertainSend?.identity===(peer+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(replyTarget?.id??null)?<Text accessibilityRole="alert" style={{color:C.muted,fontSize:12}}>{t('Envio sem confirmação. Confirma no histórico antes de repetir esta mensagem.')}</Text>:null}
  {!blocked&&uncertainSend?.identity===(peer+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(replyTarget?.id??null)?<Button secondary title={t('Já confirmei no histórico · Permitir novo envio')}
   onPress={()=>{uncertainSendRef.current=null;setUncertainSend(null);}}/>:null}
  {syncWarning?<Message tone="error">{syncWarning}</Message>:null}
  {muteError?<Message tone="error">{muteError}</Message>:null}
  {muteKnown&&auth.token&&!DEMO_MODE?<View style={styles.muteRow}>
    <View style={{flex:1,gap:3}}>
      <Text style={styles.muteTitle}>{muted?t('Avisos silenciados'):t('Avisos ativos')}</Text>
      <Text style={styles.note}>{t('Esta preferência é sincronizada com a tua conta na Web e na Mobile.')}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={muted?t('Ativar avisos desta conversa'):t('Silenciar avisos desta conversa')}
     disabled={muteBusy} onPress={toggleMute} style={styles.muteButton}>
      <Text style={styles.muteButtonText}>{muteBusy?t('A guardar…'):muted?t('Ativar'):t('Silenciar')}</Text>
    </Pressable>
   </View>:null}
  {auth.token&&!DEMO_MODE&&peer.toLowerCase()!==auth.username?.toLowerCase()?<View style={styles.safety}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:safetyOpen}} onPress={()=>setSafetyOpen(open=>!open)}>
    <Text style={styles.safetyToggle}>{safetyOpen?t('Ocultar opções de segurança'):t('Segurança da conversa ▾')}</Text>
   </Pressable>
   {safetyOpen?<>
   {blocked?<Message>{t('Bloqueaste este utilizador. As mensagens estão desativadas.')}</Message>:null}
   <Button secondary title={blocked?t('Desbloquear utilizador'):t('Bloquear utilizador')}
    disabled={safetyBusy} onPress={()=>Alert.alert(
      blocked?t('Desbloquear utilizador?'):t('Bloquear utilizador?'),
      blocked?t('Voltarás a permitir a comunicação com este utilizador.'):t('Esta pessoa deixará de poder trocar mensagens contigo.'),
      [{text:t('Cancelar'),style:'cancel'},{text:t('Confirmar'),style:blocked?'default':'destructive',onPress:()=>{void updateBlock();}}])}/>
   <Button secondary title={showReport?t('Cancelar denúncia'):t('Denunciar utilizador')}
    disabled={safetyBusy} onPress={()=>{setShowReport(v=>!v);setReportReason('');}}/>
   {showReport?<View style={styles.report}>
    <Text style={styles.note}>{t('Descreve o problema para a equipa Jynlo (até 1000 caracteres). Não incluas palavras-passe.')}</Text>
    <TextInput multiline value={reportReason} onChangeText={setReportReason}
      maxLength={1000} accessibilityLabel={t('Motivo da denúncia')} placeholder={t('Descreve o motivo da denúncia…')}
      placeholderTextColor={C.muted} style={styles.reportInput}/>
    <Button danger title={safetyBusy?t('A enviar denúncia…'):t('Enviar denúncia')} 
      disabled={safetyBusy||!reportReason.trim()} onPress={()=>{void submitReport();}}/>
   </View>:null}
   </>:null}
  </View>:null}
  {auth.token&&auth.username&&blockStatusKnown&&!blocked&&
   storyRepliesIdentity.current===auth.token+'|'+auth.username+'|'+peer&&storyReplies.length>0?
   <View style={styles.storyRepliesSection}>
    <Text style={styles.storyRepliesHeading}>{t('Reações às tuas Stories')}</Text>
    <Text style={styles.note}>{t('Respostas privadas desta pessoa, ligadas às Stories de origem.')}</Text>
    {storyReplies.map(item=><View key={'story-reply-'+item.id} style={styles.storyReplyCard}>
     <View style={styles.storyReplyContext}>
      <Text style={styles.storyReplyContextTitle}>{t('◉ À tua Story')}</Text>
      <Text style={styles.storyReplyContextDate}>{Number.isFinite(Date.parse(item.createdAt))?new Date(item.createdAt).toLocaleString('pt-PT'):t('Resposta recebida')}</Text>
     </View>
     {storyReplyKind(item.content)==='reaction'?
      <Text maxFontSizeMultiplier={1.3} style={styles.storyReplyEmoji}>{item.content}</Text>:
      <Text style={styles.storyReplyText}>{item.content}</Text>}
     <Pressable accessibilityRole="button" accessibilityLabel={t('Ver Story original, se disponível')}
      onPress={()=>router.push({pathname:'/',params:{storyId:String(item.storyId)}})}
      style={styles.storyReplyLink}><Text style={styles.storyReplyLinkText}>{t('Ver Story original ›')}</Text></Pressable>
    </View>)}
    <Pressable accessibilityRole="button" accessibilityLabel={t('Ver todas as reações às tuas Stories')}
     onPress={()=>router.push('/stories/replies')} style={styles.storyAllLink}>
     <Text style={styles.storyReplyLinkText}>{t('Ver todas as respostas ›')}</Text>
    </Pressable>
   </View>:null}
  {!loading&&!error&&messages.length===0?<Message>{t('Ainda não existem mensagens nesta conversa.')}</Message>:null}
  {messages.map(m=><View key={m.id} style={[styles.message,m.username1.toLowerCase()===auth.username?.toLowerCase()&&styles.mine]}>
   <Text style={styles.sender}>{m.username1}</Text>
   {m.replyToText?<Text style={styles.quote}>{m.replyToSender}: {m.replyToText}</Text>:null}
   {m.deletedAt?<Text style={styles.body}>{t('Mensagem removida')}</Text>:
    readCallUp(m.text)?<CallUpCard sessionId={readCallUp(m.text)!} token={auth.token} username={auth.username}/>:
    giphyImageUrl(m.text)?<Image source={{uri:giphyImageUrl(m.text)!}} resizeMode="contain" style={styles.gif}
      accessibilityLabel={t('GIF enviado na conversa')}/>:
    m.attachmentName&&(!m.text||m.text.trim()===m.attachmentName.trim())?null:
    <Text style={styles.body}>{m.text||t('Mensagem sem texto')}</Text>}
   {!m.deletedAt?chatAttachmentList(m).map(attachment=><SecureChatAttachment key={attachment.index} index={attachment.index} scope="direct" conversationId={peer} messageId={m.id} token={auth.token} name={attachment.name} mime={attachment.mime} size={attachment.size} autoPreview={recentPhotoIds.has(m.id)&&attachment.mime?.startsWith('image/')===true}
     onAuthorizationError={()=>{setMessages([]);void refresh(false,generation.current);}}/>):null}
   {!m.deletedAt&&chatLocationUrl(m.text)?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir localização partilhada no Google Maps')}
    onPress={()=>void Linking.openURL(chatLocationUrl(m.text)!).catch(()=>Alert.alert(t('Localização'),t('Não foi possível abrir o mapa.')))}
    style={styles.replyAction}><View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="location" size={15} color={C.mint}/><Text style={styles.replyActionText}>{t('Abrir localização no mapa')}</Text></View></Pressable>:null}
   <View style={styles.metaRow}>
    <View style={styles.metaReactions}>{!m.deletedAt?<ChatReactionRow id={m.id} summary={reactions.summaries[m.id]} busy={reactions.busyIds.has(m.id)} disabled={blocked||!blockStatusKnown||!auth.token} onReact={reactions.react} onInspect={reactions.inspect}/>:null}</View>
    {!m.deletedAt?<Pressable accessibilityRole="button" accessibilityLabel={t('Responder à mensagem de {a}',{a:m.username1})} onPress={()=>{setReplyTarget({id:m.id,sender:m.username1,text:(m.text||m.attachmentName||t('Anexo')).slice(0,150)});}} style={styles.replyAction}><JynloIcon name="reply" size={18} color={C.mint}/></Pressable>:null}
    {ownMessage(m)&&!blocked?<Pressable accessibilityRole="button" accessibilityLabel={t('Opções da minha mensagem')} disabled={mutationBusy} onPress={()=>messageOptions(m)} style={styles.replyAction}><JynloIcon name="more" size={20} color={C.mint}/></Pressable>:null}
    <Text style={styles.metaTime}>{m.date&&Number.isFinite(Date.parse(m.date))?
     new Date(m.date).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''}{m.editedAt?' · '+t('editada'):''}</Text>
   </View>
  </View>)}
  {syncWarning?<Pressable accessibilityRole="button" accessibilityLabel={t('Tentar sincronizar novamente')} onPress={()=>{void refresh();}} disabled={sending||loading||photoBusy} style={styles.refreshLink}><Text style={styles.refreshText}>{t('↻ Tentar novamente')}</Text></Pressable>:null}
  </ScrollView>
  <View style={styles.footer}>
  {photo?<View style={styles.photoContainer}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
     {[photo,...extraPhotos].map((file,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={t('Remover ficheiro {v}',{v:(index+1)})} disabled={photoBusy} onPress={()=>{
      const remaining=[photo,...extraPhotos].filter((_,i)=>i!==index);
      setPhoto(remaining[0]||null);setExtraPhotos(remaining.slice(1));
     }} style={{width:85,gap:3}}>
      {file.type==='video'?<View style={{width:85,height:85,borderRadius:10,backgroundColor:'#173039',justifyContent:'center',alignItems:'center'}}><View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="video" color={C.white} size={19}/><Text style={{color:C.white,fontSize:12}}>{t('Vídeo')}</Text></View></View>:<Image source={{uri:file.uri}} style={{width:85,height:85,borderRadius:10}}/>}
      <View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="remove" size={16} color={C.mint}/><Text style={styles.note}>{t('Remover')}</Text></View>
     </Pressable>)}
    </View>
   <Text style={styles.note}>{t('{a}/4 ficheiros · fotografias até 5 MB, vídeos até 20 MB. Confirma antes de enviar.',{a:1+extraPhotos.length})}</Text>
   <TextInput accessibilityLabel={t('Legenda dos anexos')} multiline maxLength={2000} value={attachmentCaption} onChangeText={setAttachmentCaption} editable={!photoBusy} placeholder={t('Legenda para as fotografias ou vídeos (opcional)')} placeholderTextColor={C.muted} style={{borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,minHeight:48}}/>
   <Button title={photoBusy?t('A enviar ficheiros…'):t('Enviar ficheiros')} disabled={mutationBusy||photoBusy||sending} onPress={()=>{void uploadPhoto();}}/>
   <Button secondary title={t('Cancelar anexos')} disabled={photoBusy} onPress={()=>{setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');}}/>
  </View>:null}

  {auth.token&&!blocked&&blockStatusKnown?<Pressable accessibilityRole="button"
    accessibilityState={{expanded:attachmentsOpen}} onPress={()=>setAttachmentsOpen(value=>!value)}
    style={styles.attachmentToggle} accessibilityLabel={attachmentsOpen?t('Fechar anexos'):t('Abrir anexos')}><JynloIcon name={attachmentsOpen?'close':'attachment'} size={23} color={C.mint}/></Pressable>:null}
  {blocked?<Text style={styles.note}>{t('Este contacto está bloqueado. Abre «Segurança da conversa» para o desbloquear.')}</Text>:null}
  {!blockStatusKnown&&auth.token&&!DEMO_MODE?<View style={{gap:7}}>
    <Text style={styles.note}>{t('Não foi possível confirmar as opções de bloqueio. O envio continua protegido pelas permissões do servidor.')}</Text>
    <Pressable accessibilityRole="button" onPress={()=>{
      if(!auth.token||!peer)return;
      const version=generation.current,identity=peer+'|'+auth.token;
      const requestId=++blockCheckRequest.current;
      setBlockStatusKnown(false);
      void userBlockStatus(peer,auth.token).then(value=>{
        if(version!==generation.current||conversation.current!==identity||
          blockCheckRequest.current!==requestId)return;
        setBlocked(value);setBlockStatusKnown(true);
      }).catch(()=>{
        if(version===generation.current&&conversation.current===identity&&
          blockCheckRequest.current===requestId)
          setError(t('Não foi possível verificar o estado do contacto. Tenta novamente.'));
      });
    }}><Text style={styles.attachmentToggleText}>{t('Verificar novamente')}</Text></Pressable>
  </View>:null}
  <View style={[styles.attachmentOptions,!attachmentsOpen&&styles.hidden]}>
  {photoAvailabilityError?<Text style={styles.note}>{t('{a} Podes continuar a enviar PDF ou partilhar localização.',{a:photoAvailabilityError})}</Text>:null}
  {photoAvailabilityError&&auth.token?<Button secondary title={t('Verificar fotografias novamente')} disabled={photoBusy||sending} onPress={()=>{
    if(!auth.token)return;
    const identity=peer+'|'+auth.token,version=generation.current;
    setPhotoAvailabilityError('');
    void directPhotoAvailable(peer,auth.token).then(available=>{
      if(generation.current===version&&conversation.current===identity){setPhotoAvailable(available);setPhotoAvailabilityError(available?'':t('O envio de fotografias não está disponível neste momento.'));}
    }).catch(()=>{
      if(generation.current===version&&conversation.current===identity)setPhotoAvailabilityError(t('Não foi possível confirmar a disponibilidade das fotografias.'));
    });
  }}/>:null}
  <ChatPdfComposer compact target={{scope:'direct',id:peer}} token={auth.token} enabled={!blocked&&blockStatusKnown&&!sending&&!photoBusy} replyId={replyTarget?.id} onSent={async(sentReplyId)=>{
   if(conversation.current!==peer+'|'+auth.token)return;
   setReplyTarget(current=>current?.id===(sentReplyId??undefined)?null:current);
   setAttachmentsOpen(false);await refresh(true,generation.current);
  }}/>
  {auth.token&&!blocked&&blockStatusKnown&&photoAvailable?<Pressable accessibilityRole="button" accessibilityLabel={t('Selecionar fotografias ou vídeos')}
     style={styles.iconAction} disabled={mutationBusy||photoBusy||sending||Boolean(photo&&1+extraPhotos.length>=4)}
     onPress={()=>{setAttachmentsOpen(false);void choosePhoto();}}><JynloIcon name="gallery" size={23} color={C.mint}/></Pressable>:null}
  {auth.token&&!blocked&&blockStatusKnown&&photoAvailable?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir câmara')}
     style={styles.iconAction} disabled={mutationBusy||photoBusy||sending}
     onPress={()=>{setAttachmentsOpen(false);void choosePhoto('camera');}}><JynloIcon name="camera" size={23} color={C.mint}/></Pressable>:null}
  {auth.token&&!blocked&&blockStatusKnown?<Pressable accessibilityRole="button" accessibilityLabel={locationBusy?t('A obter localização…'):t('Partilhar localização atual')}
     style={styles.iconAction} disabled={locationBusy||sending||photoBusy}
     onPress={()=>{void prepareLocation();}}><JynloIcon name="location" size={23} color={C.mint}/></Pressable>:null}
  {auth.token&&!blocked&&blockStatusKnown?<Pressable accessibilityRole="button" accessibilityLabel={t('Convocatória: convocar para um dos teus jogos')}
     style={styles.iconAction} disabled={sending||photoBusy}
     onPress={()=>{setAttachmentsOpen(false);setCallUpOpen(true);}}><JynloIcon name="session" size={23} color={C.mint}/></Pressable>:null}
  <CallUpPicker visible={callUpOpen} token={auth.token} username={auth.username} onClose={()=>setCallUpOpen(false)} onPick={id=>void sendCallUp(id)}/>

  </View>
  {editing&&!blocked?<View style={styles.editPanel}>
   <Text style={styles.replyPreviewTitle}>{t('Editar mensagem · até 15 minutos após o envio')}</Text>
   <TextInput multiline maxLength={2000} accessibilityLabel={t('Editar mensagem')} editable={!mutationBusy} value={editText} onChangeText={setEditText} placeholder={t('Editar texto…')} placeholderTextColor={C.muted} style={styles.editInput}/>
   <View style={{flexDirection:'row',gap:10}}><Button title={mutationBusy?t('A guardar…'):t('Guardar edição')} disabled={mutationBusy||!editText.trim()} onPress={()=>void saveEdit()}/><Button secondary title={t('Cancelar edição')} disabled={mutationBusy} onPress={()=>{setEditing(null);setEditText('');}}/></View>
  </View>:null}
  {replyTarget?<View style={styles.replyPreview}><View style={{flex:1,gap:4}}><Text style={styles.replyPreviewTitle}>{t('A responder a {a}',{a:replyTarget.sender})}</Text><Text numberOfLines={2} style={styles.replyPreviewText}>{replyTarget.text}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t('Cancelar resposta')} onPress={()=>setReplyTarget(null)} style={styles.replyCancel}><JynloIcon name="close" size={19} color={C.mint}/></Pressable></View>:null}
  {auth.token&&!blocked?<View style={styles.composer}>
   <TextInput multiline style={styles.input} placeholder={t('Escreve uma mensagem privada…')}
    placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
    onFocus={()=>{composerFocused.current=true;if(nearBottom.current)conversationScroll.current?.scrollToEnd({animated:true});}}
    onBlur={()=>{composerFocused.current=false;}}
    maxLength={2000} accessibilityLabel={t('Mensagem privada para o contacto')}/>
   <Pressable accessibilityRole="button" accessibilityLabel={sending?t('A enviar mensagem…'):t('Enviar mensagem privada')} style={[styles.send,sending&&{opacity:0.5}]}
    disabled={mutationBusy||sending||photoBusy||sendingNow.current||pendingWrites.current.has(peer+'|'+auth.token)||!blockStatusKnown||!draft.trim()||(uncertainSend?.identity===(peer+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(replyTarget?.id??null))} onPress={()=>{void send();}}>
    {sending?<ActivityIndicator color={C.background}/>:<Text style={styles.sendText}>{t('Enviar')}</Text>}
   </Pressable>
  </View>:null}

  </View>
  </KeyboardFrame>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 storyRepliesSection:{padding:12,gap:8,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 storyRepliesHeading:{fontSize:15,fontWeight:'900',color:C.white},
 storyReplyCard:{padding:12,borderRadius:13,gap:9,backgroundColor:C.surface2,borderLeftWidth:3,borderLeftColor:C.mint},
 storyReplyContext:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6,flexWrap:'wrap'},
 storyReplyContextTitle:{fontSize:12,fontWeight:'900',color:C.mint},
 storyReplyContextDate:{fontSize:10,color:C.muted},
 storyReplyEmoji:{fontSize:32,color:C.white},storyReplyText:{fontSize:14,lineHeight:21,color:C.white},
 storyReplyLink:{alignSelf:'flex-start',minHeight:38,justifyContent:'center'},
 storyAllLink:{alignSelf:'flex-start',minHeight:40,justifyContent:'center'},
 storyReplyLinkText:{color:C.mint,fontSize:12,fontWeight:'800'},
 editPanel:{gap:9,padding:12,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},editInput:{minHeight:48,maxHeight:145,color:C.white,padding:12,borderWidth:1,borderColor:C.border,borderRadius:12},
 muteRow:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderWidth:1,borderColor:C.border,borderRadius:14,backgroundColor:C.surface},
 muteTitle:{color:C.white,fontSize:13,fontWeight:'800'},
 muteButton:{minHeight:MobileTheme.touchTarget,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:C.mint,alignItems:'center',justifyContent:'center'},
 muteButtonText:{color:C.mint,fontSize:12,fontWeight:'800'},
 screen:{flex:1,backgroundColor:C.background},keyboardFrame:{flex:1},
 fixedChatHeader:{minHeight:62,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:C.border,backgroundColor:C.background},
 headerIcon:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 peerAvatar:{width:38,height:38,borderRadius:19,backgroundColor:C.surface2,alignItems:'center',justifyContent:'center'},
 peerTitle:{flex:1,fontSize:17,fontWeight:'900',color:C.white},
 metaRow:{flexDirection:'row',alignItems:'center',gap:2,marginTop:2},metaReactions:{flex:1,minWidth:0},metaTime:{fontSize:11,color:C.muted,marginLeft:4},
 historyScroll:{flex:1},history:{paddingHorizontal:12,paddingTop:10,paddingBottom:18,gap:8,flexGrow:1},
 footer:{flexShrink:0,paddingHorizontal:12,paddingTop:8,paddingBottom:10,borderTopWidth:1,borderTopColor:C.border,backgroundColor:C.background,gap:7},
 refreshLink:{alignSelf:'center',padding:10,minHeight:44,justifyContent:'center'},refreshText:{color:C.muted,fontSize:12,fontWeight:'700'},
 attachmentToggle:{alignSelf:'flex-start',paddingVertical:7,paddingHorizontal:10},
 attachmentToggleText:{color:C.mint,fontWeight:'800',fontSize:13},
 attachmentOptions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 iconAction:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 hidden:{display:'none'},
 safetyToggle:{fontSize:12,color:C.mint,fontWeight:'800'},
 safety:{gap:10,padding:14,borderRadius:15,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 report:{gap:10},
 reportInput:{minHeight:100,maxHeight:180,color:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,textAlignVertical:'top'},
 title:{fontSize:23,fontWeight:'900',color:C.white},
 note:{fontSize:12,color:C.muted,lineHeight:19},
 message:{padding:10,borderRadius:MobileTheme.radius.md,backgroundColor:MobileTheme.colors.surface,borderWidth:1,borderColor:MobileTheme.colors.border,gap:5,maxWidth:'86%',alignSelf:'flex-start',borderBottomLeftRadius:5},
 mine:{backgroundColor:'#10483F',borderColor:'#267566',alignSelf:'flex-end',borderBottomLeftRadius:MobileTheme.radius.lg,borderBottomRightRadius:5},
 sender:{fontSize:11,color:C.mint,fontWeight:'800'},replyAction:{alignSelf:'flex-end',paddingHorizontal:9,paddingVertical:6,minHeight:32,justifyContent:'center'},replyActionText:{fontSize:11,fontWeight:'800',color:C.mint},replyPreview:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12,paddingVertical:9,borderLeftWidth:3,borderLeftColor:C.mint,backgroundColor:C.surface,borderRadius:10},replyPreviewTitle:{fontSize:12,fontWeight:'800',color:C.mint},replyPreviewText:{fontSize:12,color:C.white},replyCancel:{minWidth:38,minHeight:38,justifyContent:'center',alignItems:'center'},
 quote:{fontSize:12,color:C.muted,borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:8},
 body:{fontSize:15,color:C.white,lineHeight:21},
 gif:{width:240,height:200,maxWidth:'100%',borderRadius:12,backgroundColor:C.surface},
 time:{fontSize:10,color:C.muted,textAlign:'right'},
 photoContainer:{gap:7,padding:8,borderRadius:12,backgroundColor:C.surface},
 photoPreview:{height:110,width:'100%',borderRadius:12},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9},
 input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:145,backgroundColor:MobileTheme.colors.surface,borderColor:MobileTheme.colors.border,borderWidth:1,color:MobileTheme.colors.text,padding:13,borderRadius:MobileTheme.radius.lg},
 send:{backgroundColor:MobileTheme.colors.accent,borderRadius:MobileTheme.radius.md,paddingHorizontal:16,minHeight:MobileTheme.touchTarget,justifyContent:'center'},
 sendText:{color:C.background,fontWeight:'900'}
});
