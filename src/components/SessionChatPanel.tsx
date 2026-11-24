import {ensureChatCameraPermission} from '../lib/chat-camera-permission';
import {t} from '../lib/i18n';
import {JynloIcon} from './JynloIcon';
import ChatPdfComposer from './ChatPdfComposer';
import SecureChatAttachment from './SecureChatAttachment';
import {chatAttachmentList,recentPreviewMessageIds,appendChatMediaSelection} from '../lib/chat-attachments-core.cjs';
import {uncertainChatSend} from '../lib/chat-send-uncertainty.cjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Alert,AppState,Image,Keyboard,KeyboardAvoidingView,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import type * as ImagePicker from 'expo-image-picker';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from './UI';
import {useAuth} from '../lib/auth';
import {ApiError} from '../lib/api';
import {sessionChatHistory,postSessionChat,markSessionChatRead,editSessionChatMessage,deleteSessionChatMessage} from '../lib/session-chat-api';
import {observeSessionChat} from '../lib/session-chat-realtime';
import type {SessionChatEntry} from '../lib/session-chat-api';
import {chatLook} from '../lib/chat-look';
import {C,MobileTheme} from '../lib/theme';
import {chatPhotoAvailable,sendChatPhoto} from '../lib/chat-photo-attachment';
import {confirmedSessionChatSend} from '../lib/session-chat-receipt.cjs';
import {sendChatPhotoAlbum} from '../lib/chat-photo-album';
import {validateChatAlbum} from '../lib/chat-attachments-core.cjs';
import {validateChatPhoto} from '../lib/chat-photo-validation';
import {listConversationMutes,isConversationMuted,setConversationMuted} from '../lib/conversation-mutes-api';
import {giphyImageUrl} from '../lib/chat-giphy.cjs';
import {chatLocationUrl} from '../lib/chat-location.cjs';
import {ChatReactionRow,useChatReactions} from './ChatReactionRow';
import ChatSearchPanel from './ChatSearchPanel';
import ChatReplyPreview from './ChatReplyPreview';
import {ChatMentionText,ChatMentionSuggestions} from './ChatMentions';
import {readPoll,isPollText} from '../lib/chat-poll.cjs';
import {PollCard} from './PollCard';
import {PollComposer} from './PollComposer';
export default function SessionChatPanel({embedded=false}:{embedded?:boolean}){
 const params=useLocalSearchParams<{id:string}>(),id=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [entries,setEntries]=useState<SessionChatEntry[]>([]);
 const [uncertainSend,setUncertainSend]=useState<{identity:string;body:string;replyId:number|null}|null>(null);
 const uncertainSendRef=useRef<{identity:string;body:string;replyId:number|null}|null>(null);
 // Keep embedded message history readable as the Android keyboard opens.
 // Never auto-scroll older messages unless the composer has keyboard focus.
 const inlineHistoryRef=useRef<ScrollViewInstance|null>(null);
 const inlineNearBottom=useRef(false);
 // Position the first authorized history at the newest message.
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
  const latest=entries.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
  if(latest>previousLatestMessageId.current&&previousLatestMessageId.current>0&&!inlineNearBottom.current)
   setUnseenBelow(true);
  previousLatestMessageId.current=latest;
 },[entries]);
 const [historyLimit,setHistoryLimit]=useState(40);
 const [draft,setDraft]=useState(''),[reply,setReply]=useState<SessionChatEntry|null>(null);
 const [editing,setEditing]=useState<SessionChatEntry|null>(null),[editText,setEditText]=useState('');
 const [mutationBusy,setMutationBusy]=useState(false),mutationLock=useRef(false);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [closed,setClosed]=useState(false),[error,setError]=useState('');
 const historyError=useRef<string|null>(null);
 const [syncWarning,setSyncWarning]=useState('');
 const refreshing=useRef<number|null>(null),sendingNow=useRef(false),generation=useRef(0),pendingRefresh=useRef(false);
 // A request remains locked to its original session/account across refocus.
 const pendingWrites=useRef(new Map<string,'text'|'photo'>()),activeChat=useRef('');
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [extraPhotos,setExtraPhotos]=useState<ImagePicker.ImagePickerAsset[]>([]);
 const [attachmentCaption,setAttachmentCaption]=useState('');
 const pickerInFlight=useRef(false),focusedIdentity=useRef('');
 const [photoReady,setPhotoReady]=useState(false),[uploading,setUploading]=useState(false);
 const [attachmentsOpen,setAttachmentsOpen]=useState(false);
 const [pollOpen,setPollOpen]=useState(false);
 const [muted,setMuted]=useState(false),[muteKnown,setMuteKnown]=useState(false),[muteBusy,setMuteBusy]=useState(false);
 const [muteError,setMuteError]=useState(''),[locationBusy,setLocationBusy]=useState(false);
 const muteWrites=useRef(new Set<string>());
 const refresh=useCallback(async(silent=false,version=generation.current)=>{
  if(refreshing.current===version){pendingRefresh.current=true;return;}
  refreshing.current=version;
  if(!auth.token||!Number.isSafeInteger(id)||id<=0){if(version===generation.current){setEntries([]);setLoading(false);}refreshing.current=null;return;}
  if(!silent)setLoading(true);
  if(!silent)setError('');
  try{
   const history=await sessionChatHistory(id,auth.token);
   if(version!==generation.current)return;
   setEntries(history);setClosed(false);setSyncWarning('');
   const previousHistoryError=historyError.current;historyError.current=null;
   if(previousHistoryError)setError(current=>current===previousHistoryError?'':current);
   // Server refresh does not prove that new messages were visible in either view.
  }catch(e){
   if(version!==generation.current)return;
   const accessRevoked=e instanceof ApiError&&[401,403,404,409,410].includes(e.status);
   if(accessRevoked){
    // A confirmed permission change must immediately hide private messages.
    setClosed(true);setEntries([]);setDraft('');setReply(null);setEditing(null);setEditText('');setSyncWarning('');
    setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');setAttachmentsOpen(false);setPhotoReady(false);
    historyError.current=null;
    setError(e instanceof Error?e.message:t('Já não tens acesso a este chat.'));
   }else{
    // Network failures are not evidence of revoked access; the existing chat remains visible.
    setSyncWarning(t('Sem sincronização neste momento. As mensagens podem estar desatualizadas.'));
    if(!silent){const message=e instanceof Error?e.message:t('Não foi possível atualizar o chat.');
     historyError.current=message;setError(message);}
   }
  }finally{
   if(refreshing.current===version)refreshing.current=null;
   if(version===generation.current){
    if(!silent)setLoading(false);
    if(pendingRefresh.current){pendingRefresh.current=false;void refresh(true,version);}
   }
  }
 },[auth.token,id]);
 useFocusEffect(useCallback(()=>{
  let active=true;
  const version=++generation.current;
  // A previous screen's dimensions must never authorize reads in this focus.
  // Wait for the current ScrollView to report both its viewport and content.
  historyViewportHeight.current=0;
  historyContentHeight.current=0;
  firstHistoryPositionPending.current=true;
    initialAutoScrollPending.current=true;
  const identity=id+'|'+auth.token;
  const changedAccountOrSession=focusedIdentity.current!==identity;
  focusedIdentity.current=identity;
  activeChat.current=identity;
  const pending=pendingWrites.current.get(identity);
  pendingRefresh.current=false;
  if(changedAccountOrSession){
   uncertainSendRef.current=null;setUncertainSend(null);
   lastAcknowledgedMessageId.current=0;
   // Preserve unsent text, replies and selected media on ordinary refocus.
   // Clear everything only when the session or authenticated account changed.
   inlineNearBottom.current=false;setHistoryLimit(40);previousLatestMessageId.current=0;setUnseenBelow(false);
   setEntries([]);setDraft('');setReply(null);setEditing(null);setEditText('');
   setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');
  }
  setClosed(false);setError('');setSyncWarning('');historyError.current=null;setLoading(true);
  sendingNow.current=Boolean(pending);setSending(pending==='text');setUploading(pending==='photo');
  setPhotoReady(false);setMuteKnown(false);setMuteError('');setLocationBusy(false);
  if(auth.token&&Number.isSafeInteger(id)&&id>0)void chatPhotoAvailable('session',id,auth.token).then(ok=>{if(active&&version===generation.current)setPhotoReady(ok);}).catch(()=>{});
  if(auth.token&&Number.isSafeInteger(id)&&id>0){
   void listConversationMutes(auth.token).then(items=>{
    if(active&&version===generation.current&&!muteWrites.current.has(identity)){
     setMuted(isConversationMuted(items,'session',String(id)));setMuteKnown(true);
    }
   }).catch(()=>{if(active&&version===generation.current)setMuteError(t('Não foi possível consultar os avisos deste chat.'));});
  }
  void refresh(false,version);
  // Session events are delivered only to authorized participants. The socket
  // payload never populates our UI: reconcile private messages over HTTP.
  let socketOnline=false,pollTicks=0;
  const disconnect=auth.token&&Number.isSafeInteger(id)&&id>0
   ?observeSessionChat({sessionId:id,token:auth.token,onInvalidated:()=>{
     if(active&&version===generation.current&&AppState.currentState==='active'&&!sendingNow.current)
      void refresh(true,version);
    },onStatus:status=>{
     if(active&&version===generation.current)socketOnline=status==='online';
    }}):()=>{};
  // WebSocket gives immediate hints; 5s offline / 30s online HTTP fallback.
  // Polling only reads authorized history, never retries an outbound message.
  const timer=setInterval(()=>{
   if(active&&version===generation.current&&AppState.currentState==='active'&&!sendingNow.current){
    pollTicks++;
    if(!socketOnline||pollTicks%6===0)void refresh(true,version);
   }
  },5000);
  // Mirror the Messages and Community chats: reconcile immediately on app resume.
  // The refresh guard coalesces concurrent reads and cannot retry an outbound POST.
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&active&&version===generation.current&&!sendingNow.current)
    void refresh(true,version);
  });
  return ()=>{active=false;clearInterval(timer);resume.remove();disconnect();pendingRefresh.current=false;generation.current++;
   if(activeChat.current===identity)activeChat.current='';
  };
 },[refresh,auth.token,id]));
 function toggleMute(){
  const token=auth.token,identity=id+'|'+token;
  if(!token||closed||!muteKnown||muteBusy||muteWrites.current.has(identity))return;
  const next=!muted,version=generation.current;
  Alert.alert(next?t('Silenciar avisos?'):t('Ativar avisos?'),
   t('As mensagens e o histórico continuam disponíveis para os participantes.'),[
    {text:t('Cancelar'),style:'cancel'},
    {text:next?'Silenciar':'Ativar',onPress:()=>{
     if(activeChat.current!==identity||muteWrites.current.has(identity))return;
     muteWrites.current.add(identity);setMuteBusy(true);setMuteError('');
     void setConversationMuted('session',String(id),next,token).then(async()=>{
      const updated=await listConversationMutes(token);
      if(version===generation.current&&activeChat.current===identity){
       setMuted(isConversationMuted(updated,'session',String(id)));setMuteKnown(true);
      }
     }).catch(()=>{
      if(version===generation.current&&activeChat.current===identity)
       setMuteError(t('Não foi possível confirmar a alteração de notificações.'));
     }).finally(()=>{
      muteWrites.current.delete(identity);
      if(version===generation.current&&activeChat.current===identity)setMuteBusy(false);
     });
    }}
   ]);
 }
 function prepareLocation(){
  const token=auth.token,identity=id+'|'+token,version=generation.current;
  if(!token||closed||locationBusy||sendingNow.current||pendingWrites.current.has(identity))return;
  Alert.alert(t('Partilhar localização atual?'),
   t('A localização só será consultada se continuares. O link ficará no campo de escrita para reveres antes de enviar ao grupo.'),[
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
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
       throw Error(t('O telemóvel não devolveu uma localização válida.'));
      const url='https://www.google.com/maps?q='+lat.toFixed(5)+','+lng.toFixed(5);
      if(version===generation.current&&activeChat.current===identity){
       setDraft(current=>[current.trim(),url].filter(Boolean).join('\n'));
        setAttachmentsOpen(false);
       Alert.alert(t('Localização pronta'),t('Confirma o destino e envia a mensagem quando quiseres.'));
      }
     })().catch(e=>{
      if(version===generation.current&&activeChat.current===identity)
       setError(e instanceof Error?e.message:t('Não foi possível obter a localização.'));
     }).finally(()=>{
      if(version===generation.current&&activeChat.current===identity)setLocationBusy(false);
     });
    }}
   ]);
 }
 async function send(){
  const identity=id+'|'+auth.token;
  if(mutationLock.current||sendingNow.current||pendingWrites.current.has(identity)||closed||!auth.token||!draft.trim())return;
  if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===draft.trim()&&uncertainSendRef.current.replyId===(reply?.id??null))return;
  const version=generation.current,originalDraft=draft,originalReplyId=reply?.id;
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=await postSessionChat(id,originalDraft,auth.token,originalReplyId);
   if(!confirmedSessionChatSend(confirmed,id,auth.username||'',originalDraft,originalReplyId))
    throw Error(t('O servidor respondeu, mas não confirmou esta mensagem. Consulta o histórico antes de repetir.'));
   if(version!==generation.current)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===originalDraft.trim()&&uncertainSendRef.current.replyId===(originalReplyId??null)){uncertainSendRef.current=null;setUncertainSend(null);}
   // Render only the validated server acknowledgement, never an invented
   // optimistic message. Deduplicate if the socket already delivered it.
   setEntries(current=>current.some(entry=>entry.id===confirmed.id)?current:
    [...current,confirmed].sort((a,b)=>a.id-b.id));
   setDraft(current=>current===originalDraft?'':current);
   setReply(current=>current?.id===originalReplyId?null:current);
   // The server already confirmed the write; history is a separate read.
   // A slow/offline GET must never report the acknowledged POST as failed.
   void refresh(true,version);
  }catch(e){
   if(version!==generation.current||activeChat.current!==identity)return;
   if(e instanceof ApiError&&[401,403,404,409,410].includes(e.status)){
    // A session may have started while the send was in flight.
    await refresh(true,version);return;
   }
   if(uncertainChatSend(e)){const uncertain={identity,body:originalDraft.trim(),replyId:originalReplyId??null};uncertainSendRef.current=uncertain;setUncertainSend(uncertain);}
   setError((e instanceof Error?e.message:t('Falha no envio.'))+
    ' '+t('Consulta o histórico antes de voltares a tentar.'));
  }
  finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setSending(false);}
  }
 }
 function ownMessage(message:SessionChatEntry){
  return Boolean(auth.username&&!message.senderGuest&&
    message.senderUsername.toLowerCase()===auth.username.toLowerCase()&&!message.deletedAt);
 }
 function editable(message:SessionChatEntry){
  const created=Date.parse(message.createdAt);
  return ownMessage(message)&&Boolean(message.body?.trim())&&!message.attachmentName&&
   !message.attachments?.length&&!message.body.startsWith('[JYNLO:GIPHY:1]')&&!isPollText(message.body)&&
   Number.isFinite(created)&&created<=Date.now()&&Date.now()-created<=15*60*1000;
 }
 function messageOptions(message:SessionChatEntry){
  if(!ownMessage(message)||mutationLock.current||sendingNow.current||uploading)return;
  const items:Array<{text:string;style?:'cancel'|'destructive';onPress?:()=>void}>=[];
  if(editable(message))items.push({text:t('Editar mensagem'),onPress:()=>{
    setEditing(message);setEditText(message.body);setReply(null);
  }});
  items.push({text:t('Apagar para todos'),style:'destructive',onPress:()=>Alert.alert(
    t('Apagar mensagem para todos?'),t('O conteúdo ficará identificado como removido na conversa.'),
    [{text:t('Cancelar'),style:'cancel'},{text:t('Apagar'),style:'destructive',onPress:()=>void deleteMessage(message)}])});
  items.push({text:t('Cancelar'),style:'cancel'});
  Alert.alert(t('A minha mensagem'),t('Seleciona uma ação.'),items);
 }
 async function saveEdit(){
  if(!editing||!editable(editing)||!auth.token||mutationLock.current||sendingNow.current||uploading)return;
  const text=editText.trim(),original=editing,version=generation.current,identity=id+'|'+auth.token;
  if(!text||text.length>2000||text.startsWith('[JYNLO:GIPHY:1]')){
   setError(t('A mensagem editada deve ter entre 1 e 2000 caracteres.'));return;
  }
  mutationLock.current=true;setMutationBusy(true);setError('');
  try{
   const result=await editSessionChatMessage(id,original.id,text,auth.token);
   if(version!==generation.current||activeChat.current!==identity)return;
   setEntries(old=>old.map(item=>item.id===result.id?result:item));
   setEditing(current=>current?.id===original.id?null:current);setEditText('');
   await refresh(true,version);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity){
    if(e instanceof ApiError&&[401,403,404,409,410].includes(e.status))await refresh(true,version);
    else setError((e instanceof Error?e.message:t('Edição não confirmada.'))+' '+t('Consulta o histórico antes de repetir.'));
   }
  }finally{mutationLock.current=false;setMutationBusy(false);}
 }
 async function deleteMessage(message:SessionChatEntry){
  if(!ownMessage(message)||!auth.token||mutationLock.current||sendingNow.current||uploading)return;
  const version=generation.current,identity=id+'|'+auth.token;
  mutationLock.current=true;setMutationBusy(true);setError('');
  try{
   const result=await deleteSessionChatMessage(id,message.id,auth.token);
   if(version!==generation.current||activeChat.current!==identity)return;
   setEntries(old=>old.map(item=>item.id===result.id?result:
    item.replyToMessageId===result.id?{...item,replyToText:t('Mensagem removida')}:item));
   setEditing(current=>current?.id===message.id?null:current);
   setReply(current=>current?.id===message.id?null:current);
   await refresh(true,version);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity){
    if(e instanceof ApiError&&[401,403,404,409,410].includes(e.status))await refresh(true,version);
    else setError((e instanceof Error?e.message:t('Eliminação não confirmada.'))+' '+t('Consulta o histórico antes de repetir.'));
   }
  }finally{mutationLock.current=false;setMutationBusy(false);}
 }
 /** Sondagem: sent alone, exactly as encoded by the composer, under the same write lock. */
 async function sendPoll(text:string){
  setPollOpen(false);
  const identity=id+'|'+auth.token;
  if(!text||mutationLock.current||closed||!auth.token||!auth.username||sendingNow.current||pendingWrites.current.has(identity))return;
  // A timed-out poll may have been accepted; require history verification before retrying.
  if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===text&&uncertainSendRef.current.replyId===null)return;
  const version=generation.current;
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   const confirmed=await postSessionChat(id,text,auth.token);
   if(!confirmedSessionChatSend(confirmed,id,auth.username||'',text,null))
    throw Error(t('O servidor respondeu, mas não confirmou a sondagem. Consulta o histórico antes de repetir.'));
   if(version!==generation.current||activeChat.current!==identity)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===text&&uncertainSendRef.current.replyId===null){uncertainSendRef.current=null;setUncertainSend(null);}
   setEntries(current=>current.some(entry=>entry.id===confirmed.id)?current:[...current,confirmed].sort((a,b)=>a.id-b.id));
   void refresh(true,version);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity){
    if(uncertainChatSend(e)){const uncertain={identity,body:text,replyId:null};uncertainSendRef.current=uncertain;setUncertainSend(uncertain);}
    setError((e instanceof Error?e.message:t('Não foi possível enviar a sondagem.'))+' '+t('Consulta o histórico antes de repetir.'));
   }
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setSending(false);}
  }
 }
 async function choosePhoto(source:'gallery'|'camera'='gallery'){
  if(!auth.token||!photoReady||closed||sendingNow.current||uploading||pickerInFlight.current||mutationLock.current)return;
  const current=photo?[photo,...extraPhotos]:[];
  const remaining=4-current.length;
  if(remaining<=0){setError(t('Já selecionaste 4 ficheiros. Remove um antes de adicionares outro.'));return;}
  const version=generation.current,identity=id+'|'+auth.token,token=auth.token;
  pickerInFlight.current=true;
  try{
   const ImagePicker=await import('expo-image-picker');
   if(source==='camera'&&!await ensureChatCameraPermission())return;
   const chosen=source==='camera'?
    await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,videoMaxDuration:30}):
    await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,allowsMultipleSelection:true,selectionLimit:remaining});
   if(version!==generation.current||activeChat.current!==identity||auth.token!==token||chosen.canceled||!chosen.assets?.length)return;
   for(const asset of chosen.assets){if(asset.type==='image')validateChatPhoto(asset);}
   const result=appendChatMediaSelection(current,chosen.assets);
   if(result.error)throw Error(result.error);
   if(version!==generation.current||activeChat.current!==identity||closed)return;
   setPhoto(result.items[0]||null);setExtraPhotos(result.items.slice(1));
  }catch(e){
   if(version===generation.current&&activeChat.current===identity)
    setError(e instanceof Error?e.message:t('Não foi possível abrir a câmara ou a galeria.'));
  }finally{pickerInFlight.current=false;}
 }
  async function uploadPhoto(){
  const identity=id+'|'+auth.token;
  if(mutationLock.current||!auth.token||!photo||!photoReady||closed||sendingNow.current||pendingWrites.current.has(identity)||uploading)return;
  const version=generation.current,originalReplyId=reply?.id;
  const captionToSend=attachmentCaption;
  pendingWrites.current.set(identity,'photo');
  sendingNow.current=true;setUploading(true);setError('');
  try{
   if(extraPhotos.length||photo.type==='video'||captionToSend.trim())await sendChatPhotoAlbum({scope:'session',id},auth.token,[photo,...extraPhotos],originalReplyId,captionToSend);
   else await sendChatPhoto('session',id,auth.token,photo,originalReplyId);
   if(version!==generation.current)return;
   setPhoto(null);setExtraPhotos([]);setAttachmentCaption(current=>current===captionToSend?'':current);setReply(current=>current?.id===originalReplyId?null:current);
   // The server already confirmed the write; history is a separate read.
   // A slow/offline GET must never report the acknowledged POST as failed.
   void refresh(true,version);
  }catch(e){
   if(version===generation.current&&activeChat.current===identity){
    // Multipart failures may surface as text instead of ApiError. Never
    // retry an uncertain upload, only revalidate conversation access.
    if((e instanceof ApiError&&[401,403,404,409,410].includes(e.status))||
       (e instanceof Error&&/permissão para enviar|sessão expirou|chat (?:da sessão )?(?:fechado|encerrado)/i.test(e.message)))
     await refresh(true,version);
    else setError((e instanceof Error?e.message:t('Envio não confirmado.'))+' '+t('Verifica o histórico antes de repetir.'));
   }
  }
  finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setUploading(false);}
  }
 }
 const recentPhotoIds=new Set(recentPreviewMessageIds(entries));
 const reactions=useChatReactions('session',String(id),auth.token,entries.slice(-historyLimit).map(m=>m.id),!closed);
 const renderedMessages=entries.slice(-historyLimit).map(m=><View key={m.id} style={[styles.message,m.senderUsername.toLowerCase()===auth.username?.toLowerCase()&&styles.mine]}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
     <Text style={styles.sender}>{m.senderUsername}{m.senderGuest?' · '+t('Convidado'):''}</Text>
     <View style={{flexDirection:'row',gap:5}}>
      {!m.deletedAt&&!closed?<Pressable accessibilityRole="button" accessibilityLabel={t('Responder a {v}',{v:m.senderUsername})} style={styles.messageAction} onPress={()=>setReply(m)}><JynloIcon name="reply" size={19} color={C.mint}/></Pressable>:null}
      {ownMessage(m)&&!closed?<Pressable accessibilityRole="button" accessibilityLabel={t('Opções da minha mensagem')} disabled={mutationBusy} style={styles.messageAction} onPress={()=>messageOptions(m)}><JynloIcon name="more" size={21} color={C.mint}/></Pressable>:null}
     </View>
    </View>
    {m.replyToText?<View style={styles.quote}><Text numberOfLines={1} style={styles.quoteAuthor}>{m.replyToSender||t('Mensagem anterior')}</Text><Text numberOfLines={2} style={styles.quoteBody}>{m.replyToText}</Text></View>:null}
    {!m.deletedAt&&giphyImageUrl(m.body)?<Image source={{uri:giphyImageUrl(m.body)!}} resizeMode="contain" style={styles.gif}/>:null}
    {!m.deletedAt&&readPoll(m.body)?<PollCard poll={readPoll(m.body)!} kind="session" conversationId={id} messageId={m.id} token={auth.token}/>:
    <ChatMentionText body={m.deletedAt?t('Mensagem removida'):giphyImageUrl(m.body)?'GIF':m.body||m.attachmentName||'Anexo'} style={styles.body}/>}
    {!m.deletedAt&&chatLocationUrl(m.body)?
     <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir localização partilhada no mapa')} onPress={()=>void Linking.openURL(chatLocationUrl(m.body)!).catch(()=>Alert.alert(t('Localização'),t('Não foi possível abrir o mapa.')))}>
       <View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="location" size={16} color={C.mint}/><Text style={styles.mapLink}>{t('Abrir localização no mapa')}</Text><JynloIcon name="chevron-right" size={15} color={C.mint}/></View>
     </Pressable>:null}
    {!m.deletedAt?chatAttachmentList(m).map(attachment=><SecureChatAttachment key={attachment.index} index={attachment.index} scope="session" conversationId={id} messageId={m.id} token={auth.token} name={attachment.name} mime={attachment.mime} size={attachment.size} autoPreview={recentPhotoIds.has(m.id)&&attachment.mime?.startsWith('image/')===true}
      onAuthorizationError={()=>{setEntries([]);void refresh(false,generation.current);}}/>):null}
    {!m.deletedAt?<ChatReactionRow id={m.id} summary={reactions.summaries[m.id]} busy={reactions.busyIds.has(m.id)} disabled={closed||!auth.token} onReact={reactions.react} onInspect={reactions.inspect}/>:null}
    <Text style={styles.time}>{m.createdAt&&Number.isFinite(Date.parse(m.createdAt))?
     new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):''}{m.editedAt?' · '+t('editada'):''}</Text>
  </View>);
 const content=<>{!embedded?<><Brand subtitle={t('SESSÃO')}/><DemoBanner/><Eyebrow>{t('CHAT DA SESSÃO')}</Eyebrow></>:null}
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Conversa do jogo')}</Text>
  <ChatSearchPanel kind="session" conversationId={String(id)} token={auth.token} enabled={!closed}/> 
  {!embedded?<Text style={styles.note}>{t('Apenas o organizador e participantes confirmados. O chat encerra quando o jogo começa.')}</Text>:null}
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push('/login')}/>:null}
  {muteError&&!closed?<Message tone="error">{muteError}</Message>:null}
  {!embedded&&auth.token&&muteKnown&&!closed?<View style={styles.muteRow}>
   <Text style={styles.note}>{muted?t('Avisos deste chat silenciados'):t('Avisos deste chat ativos')}</Text>
   <Button title={muteBusy?t('A guardar…'):muted?t('Ativar avisos'):t('Silenciar avisos')} secondary disabled={muteBusy} onPress={toggleMute}/>
  </View>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null)?<Text accessibilityRole="alert" style={{color:C.muted,fontSize:12}}>{t('Envio sem confirmação. Confirma no histórico antes de repetir esta mensagem.')}</Text>:null}
  {!closed&&uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null)?<Button secondary title={t('Já confirmei no histórico · Permitir novo envio')}
   onPress={()=>{uncertainSendRef.current=null;setUncertainSend(null);}}/>:null}
  {syncWarning&&!closed?<Message>{syncWarning}</Message>:null}
  {!loading&&!closed&&!entries.length?<Message>{t('Sem mensagens. Inicia a conversa!')}</Message>:null}
  {<ScrollView ref={inlineHistoryRef} style={[styles.inlineHistory,keyboardVisible&&styles.inlineHistoryKeyboard]} nestedScrollEnabled keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
   onScrollBeginDrag={()=>{initialAutoScrollPending.current=false;}}
    onScroll={event=>{const {contentOffset,layoutMeasurement,contentSize}=event.nativeEvent;
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
     const latest=entries.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
     if(lastMessageVisible&&AppState.currentState==='active'&&!closed&&auth.token&&Number.isSafeInteger(id)&&id>0&&latest>lastAcknowledgedMessageId.current){
      lastAcknowledgedMessageId.current=latest;
      void markSessionChatRead(id,latest,auth.token).catch(()=>{if(lastAcknowledgedMessageId.current===latest)lastAcknowledgedMessageId.current=0;});
     }
    }}}
   onLayout={event=>{
    historyViewportHeight.current=event.nativeEvent.layout.height;
    if(firstHistoryPositionPending.current&&entries.length>0&&historyContentHeight.current>0){
     firstHistoryPositionPending.current=false;
     inlineNearBottom.current=true;
     inlineHistoryRef.current?.scrollToEnd({animated:false});
    }
    // Content size can be reported before the viewport layout; acknowledge only when fully visible.
    if(!firstHistoryPositionPending.current&&inlineNearBottom.current&&!unseenBelow&&historyContentHeight.current>0&&historyContentHeight.current<=historyViewportHeight.current&&AppState.currentState==='active'&&!closed&&auth.token&&Number.isSafeInteger(id)&&id>0){
     const latest=entries.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
    if(latest>lastAcknowledgedMessageId.current){
     lastAcknowledgedMessageId.current=latest;
     void markSessionChatRead(id,latest,auth.token).catch(()=>{if(lastAcknowledgedMessageId.current===latest)lastAcknowledgedMessageId.current=0;});
    }
    }
   }}
   onContentSizeChange={(_width,height)=>{
    historyContentHeight.current=height;
    if(firstHistoryPositionPending.current&&entries.length>0&&historyViewportHeight.current>0){
     firstHistoryPositionPending.current=false;
     inlineNearBottom.current=true;
     inlineHistoryRef.current?.scrollToEnd({animated:false});
    }
    // A short conversation can change without firing onScroll. Its entire content must fit.
    if(!firstHistoryPositionPending.current&&inlineNearBottom.current&&!unseenBelow&&height<=historyViewportHeight.current&&historyViewportHeight.current>0&&
        AppState.currentState==='active'&&!closed&&auth.token&&Number.isSafeInteger(id)&&id>0){
     const latest=entries.reduce((max,item)=>Number.isSafeInteger(item.id)?Math.max(max,item.id):max,0);
     if(latest>lastAcknowledgedMessageId.current){
      lastAcknowledgedMessageId.current=latest;
      void markSessionChatRead(id,latest,auth.token).catch(()=>{if(lastAcknowledgedMessageId.current===latest)lastAcknowledgedMessageId.current=0;});
     }
    }
    if(inlineNearBottom.current&&composerFocused.current&&!unseenBelow)inlineHistoryRef.current?.scrollToEnd({animated:true});
   }}
   contentContainerStyle={{gap:8,padding:8}}>
    {entries.length>historyLimit?<Pressable accessibilityRole="button" onPress={()=>{inlineNearBottom.current=false;setHistoryLimit(count=>count+40);}} style={styles.olderMessages}>
      <Text style={styles.actionText}>{t('Ver mensagens anteriores')}</Text>
    </Pressable>:null}{renderedMessages}
   </ScrollView>}
  {unseenBelow?<Pressable accessibilityRole="button" accessibilityLabel={t('Ver mensagens novas')}
    onPress={()=>{initialAutoScrollPending.current=false;inlineHistoryRef.current?.scrollToEnd({animated:true});}}
    style={styles.newMessages}><JynloIcon name="chevron-down" size={17} color={C.background}/>
    <Text style={styles.newMessagesText}>{t('Mensagens novas')}</Text></Pressable>:null}
  {auth.token&&!closed&&attachmentsOpen?<View style={styles.quickActions}>
    {muteKnown?<Pressable accessibilityRole="button" accessibilityLabel={muted?t('Ativar avisos deste chat'):t('Silenciar avisos deste chat')}
      style={styles.iconAction} disabled={muteBusy} onPress={toggleMute}>
      <JynloIcon name="notifications" size={22} color={muted?C.muted:C.mint} active={!muted}/>
    </Pressable>:null}
    {photoReady?<Pressable accessibilityRole="button" accessibilityLabel={t('Selecionar fotografias ou vídeos')} disabled={sending||uploading}
      style={styles.iconAction} onPress={()=>{void choosePhoto();}}><JynloIcon name="gallery" size={22} color={C.mint}/></Pressable>:null}
    {photoReady?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir câmara')} disabled={sending||uploading}
      style={styles.iconAction} onPress={()=>{void choosePhoto('camera');}}><JynloIcon name="camera" size={22} color={C.mint}/></Pressable>:null}
    <ChatPdfComposer compact target={{scope:'session',id}} token={auth.token} onPermissionError={()=>{void refresh(true,generation.current);}} enabled={!closed&&!sending&&!uploading&&!pendingWrites.current.has(id+'|'+auth.token)} replyId={reply?.id}
      onSent={async(sentReplyId)=>{setReply(current=>current?.id===(sentReplyId??undefined)?null:current);await refresh();}}/>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Partilhar localização atual')} disabled={locationBusy||sending||uploading}
      style={styles.iconAction} onPress={prepareLocation}><JynloIcon name="location" size={22} color={C.mint}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Criar sondagem')} disabled={sending}
      style={styles.iconAction} onPress={()=>setPollOpen(true)}><Text style={{fontSize:20}}>📊</Text></Pressable>
    <PollComposer visible={pollOpen} onClose={()=>setPollOpen(false)} onSend={text=>void sendPoll(text)}/>
   </View>:null}
  {false&&auth.token&&!closed?<Pressable accessibilityRole="button" accessibilityState={{expanded:attachmentsOpen}}
    onPress={()=>setAttachmentsOpen(value=>!value)} style={styles.attachmentToggle}>
    <View style={{flexDirection:'row',alignItems:'center',gap:7}}><JynloIcon name={attachmentsOpen?'close':'attachment'} size={19} color={C.mint}/><Text style={styles.attachmentToggleText}>{attachmentsOpen?t('Fechar anexos'):t('Anexar ficheiro')}</Text></View>
   </Pressable>:null}
   {false&&attachmentsOpen&&!closed?<View style={styles.attachmentOptions}>
   {auth.token&&!closed?<Button title={locationBusy?t('A obter localização…'):t('Partilhar localização atual')} secondary disabled={locationBusy||sending||uploading} onPress={prepareLocation}/>:null}
  <ChatPdfComposer target={{scope:'session',id}} token={auth.token} onPermissionError={()=>{void refresh(true,generation.current);}} enabled={!closed&&!sending&&!uploading&&!pendingWrites.current.has(id+'|'+auth.token)} replyId={reply?.id} onSent={async(sentReplyId)=>{
   // Only clear the reply actually attached to this PDF, not a new choice
   // the user may have made while the file was being uploaded.
   setReply(current=>current?.id===(sentReplyId??undefined)?null:current);
   await refresh();
  }}/>
  {auth.token&&!closed&&photoReady?<Button title={photo?"Adicionar mais ficheiros":"Escolher fotografias ou vídeos"} secondary disabled={sending||uploading||Boolean(photo&&1+extraPhotos.length>=4)} onPress={()=>{setAttachmentsOpen(false);void choosePhoto();}}/>:null}
  {auth.token&&!closed&&photoReady?<Button title={t('Abrir câmara')} secondary disabled={sending||uploading} onPress={()=>{setAttachmentsOpen(false);void choosePhoto('camera');}}/>:null}
  </View>:null}
  {photo&&!closed?<View style={styles.photoPanel}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
    {[photo,...extraPhotos].map((file,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={t('Remover ficheiro {v}',{v:(index+1)})} disabled={uploading} onPress={()=>{
     const remaining=[photo,...extraPhotos].filter((_,i)=>i!==index);
     setPhoto(remaining[0]||null);setExtraPhotos(remaining.slice(1));
    }} style={{gap:4}}>
     {file.type==='video'?<View style={{width:90,height:90,borderRadius:10,backgroundColor:'#173039',justifyContent:'center',alignItems:'center'}}><View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="video" size={20} color={C.white}/><Text style={{color:C.white,fontSize:12}}>{t('Vídeo')}</Text></View></View>:<Image source={{uri:file.uri}} style={{width:90,height:90,borderRadius:10}}/>}
     <View style={{flexDirection:"row",alignItems:"center",gap:5}}><JynloIcon name="remove" size={16} color={C.mint}/><Text style={styles.note}>{t('Remover')}</Text></View>
    </Pressable>)}
   </View>
   <Text style={styles.note}>{t('{a}/4 ficheiros · fotografias até 5 MB, vídeos até 20 MB. Confirma antes de enviar.',{a:1+extraPhotos.length})}</Text>
   <TextInput accessibilityLabel={t('Legenda dos anexos')} multiline maxLength={2000} value={attachmentCaption} onChangeText={setAttachmentCaption} editable={!uploading} placeholder={t('Legenda para as fotografias ou vídeos (opcional)')} placeholderTextColor={C.muted} style={{borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,minHeight:48}}/>
   <Button title={uploading?t('A enviar…'):t('Enviar ficheiros')} disabled={uploading||sending} onPress={()=>{void uploadPhoto();}}/>
   <Button title={t('Cancelar anexos')} secondary disabled={uploading} onPress={()=>{setPhoto(null);setExtraPhotos([]);setAttachmentCaption('');}}/>
  </View>:null}
  {editing&&!closed?<View style={styles.editPanel}>
   <Text style={styles.actionText}>{t('Editar mensagem · até 15 minutos após o envio')}</Text>
   <TextInput accessibilityLabel={t('Editar mensagem')} multiline maxLength={2000} editable={!mutationBusy} value={editText} onChangeText={setEditText} placeholder={t('Editar texto…')} placeholderTextColor={C.muted} style={styles.editInput}/>
   <View style={{flexDirection:'row',gap:10}}><Button title={mutationBusy?t('A guardar…'):t('Guardar edição')} disabled={mutationBusy||!editText.trim()} onPress={()=>void saveEdit()}/><Button secondary title={t('Cancelar edição')} disabled={mutationBusy} onPress={()=>{setEditing(null);setEditText('');}}/></View>
  </View>:null}
  {auth.token&&!closed?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.editor}>
    {reply?<ChatReplyPreview sender={reply.senderUsername} body={reply.body||reply.attachmentName||'Anexo'} onCancel={()=>setReply(null)} disabled={sending||uploading}/>:null}
    <View style={styles.composer}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:attachmentsOpen}} accessibilityLabel={attachmentsOpen?t('Fechar anexos'):t('Abrir anexos')}
      onPress={()=>setAttachmentsOpen(value=>!value)} style={styles.plus}><JynloIcon name={attachmentsOpen?'close':'plus'} size={24} color={C.mint}/></Pressable>
     <TextInput multiline value={draft} onChangeText={setDraft} maxLength={2000}
      accessibilityLabel={t('Mensagem da sessão')} placeholder={t('Escreve uma mensagem')}
       onFocus={()=>{composerFocused.current=true;if(inlineNearBottom.current)inlineHistoryRef.current?.scrollToEnd({animated:true});setAttachmentsOpen(false);}}
       onBlur={()=>{composerFocused.current=false;}}
      placeholderTextColor={C.muted} style={styles.input}/>
     <ChatMentionSuggestions draft={draft} token={auth.token} onChange={setDraft} disabled={sending||uploading}/>
     <Pressable accessibilityRole="button" accessibilityLabel={sending?t('A enviar mensagem…'):t('Enviar mensagem')} style={styles.send}
       disabled={sending||uploading||sendingNow.current||pendingWrites.current.has(id+'|'+auth.token)||!draft.trim()||(uncertainSend?.identity===(id+'|'+auth.token)&&uncertainSend.body===draft.trim()&&uncertainSend.replyId===(reply?.id??null))}
       onPress={()=>{void send();}}><JynloIcon name="send" size={22} color={C.background}/></Pressable>
    </View>
  </KeyboardAvoidingView>:null}
  {syncWarning&&!closed?<Button title={t('Tentar novamente')} secondary disabled={loading||sending||uploading} onPress={()=>{void refresh();}}/>:null}
  {!embedded?<Button title={t('Voltar à sessão')} secondary onPress={()=>router.back()}/>:null}
 </>;
 return embedded?<View style={styles.inline}>{content}</View>:<Page>{content}</Page>;
}
const styles=StyleSheet.create({
 ...chatLook,
 inline:{gap:10,padding:12,borderWidth:1,borderColor:C.border,borderRadius:16,backgroundColor:C.surface},
 inlineHistory:{height:470,maxHeight:470,minHeight:240,borderWidth:1,borderColor:'#3AAEAA55',borderRadius:14,backgroundColor:'#041D29'},
 inlineHistoryKeyboard:{height:230,maxHeight:230,minHeight:120},
 olderMessages:{padding:10,alignItems:'center'},
 newMessages:{alignSelf:'center',flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:14,paddingVertical:9,borderRadius:20,backgroundColor:C.mint},
 newMessagesText:{fontSize:12,fontWeight:'800',color:C.background},quickActions:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 iconAction:{height:44,width:44,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
 sendAction:{height:44,width:44,borderRadius:12,backgroundColor:C.mint,alignItems:'center',justifyContent:'center'},
 editPanel:{padding:12,gap:9,borderWidth:1,borderColor:C.border,borderRadius:14,backgroundColor:C.surface},editInput:{minHeight:48,maxHeight:150,color:C.white,padding:12,borderWidth:1,borderColor:C.border,borderRadius:10},messageAction:{minHeight:38,minWidth:35,alignItems:'center',justifyContent:'center'},actionText:{fontSize:12,color:C.mint,fontWeight:'800'},
 title:{fontSize:26,fontWeight:'900',color:C.white},note:{fontSize:12,color:C.muted},

 sender:{fontSize:12,fontWeight:'800',color:C.mint},
 quote:{borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:9,gap:3,marginVertical:3},
 quoteAuthor:{fontSize:12,color:C.mint,fontWeight:'800'},quoteBody:{fontSize:12,lineHeight:18,color:C.muted},
 time:{color:C.muted,fontSize:10,textAlign:'right'},
 photoPanel:{gap:9,padding:12,backgroundColor:C.surface,borderRadius:14},preview:{height:180,width:'100%'},
 muteRow:{padding:12,borderWidth:1,borderColor:C.border,borderRadius:14,backgroundColor:C.surface,gap:8},
 attachmentToggle:{alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:11,minHeight:44,justifyContent:'center'},
 attachmentToggleText:{color:C.mint,fontWeight:'800',fontSize:13},attachmentOptions:{gap:8},
 mapLink:{color:C.mint,fontSize:13,fontWeight:'800',paddingVertical:9},gif:{width:240,height:200,maxWidth:'100%',borderRadius:12,backgroundColor:C.surface},
 editor:{gap:9},
});
