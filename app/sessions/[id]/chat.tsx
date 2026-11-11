import ChatPdfComposer from '../../../src/components/ChatPdfComposer';
import SecureChatAttachment from '../../../src/components/SecureChatAttachment';
import React,{useCallback,useRef,useState} from 'react';
import {AppState,Image,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {ApiError} from '../../../src/lib/api';
import {sessionChatHistory,postSessionChat,markSessionChatRead} from '../../../src/lib/session-chat-api';
import type {SessionChatEntry} from '../../../src/lib/session-chat-api';
import {C,MobileTheme} from '../../../src/lib/theme';
import {chatPhotoAvailable,sendChatPhoto} from '../../../src/lib/chat-photo-attachment';
export default function SessionChat(){
 const params=useLocalSearchParams<{id:string}>(),id=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [entries,setEntries]=useState<SessionChatEntry[]>([]);
 const [draft,setDraft]=useState(''),[reply,setReply]=useState<SessionChatEntry|null>(null);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [closed,setClosed]=useState(false),[error,setError]=useState('');
 const historyError=useRef<string|null>(null);
 const [syncWarning,setSyncWarning]=useState('');
 const refreshing=useRef<number|null>(null),sendingNow=useRef(false),generation=useRef(0),pendingRefresh=useRef(false);
 // A request remains locked to its original session/account across refocus.
 const pendingWrites=useRef(new Map<string,'text'|'photo'>()),activeChat=useRef('');
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [photoReady,setPhotoReady]=useState(false),[uploading,setUploading]=useState(false);
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
   const latest=history.reduce((n,m)=>Math.max(n,m.id),0);
   if(latest>0)void markSessionChatRead(id,latest,auth.token).catch(()=>{});
  }catch(e){
   if(version!==generation.current)return;
   const accessRevoked=e instanceof ApiError&&[401,403,404,409,410].includes(e.status);
   if(accessRevoked){
    // A confirmed permission change must immediately hide private messages.
    setClosed(true);setEntries([]);setDraft('');setReply(null);setSyncWarning('');
    setPhoto(null);setPhotoReady(false);
    historyError.current=null;
    setError(e instanceof Error?e.message:'Já não tens acesso a este chat.');
   }else{
    // Network failures are not evidence of revoked access; the existing chat remains visible.
    setSyncWarning('Sem sincronização neste momento. As mensagens podem estar desatualizadas.');
    if(!silent){const message=e instanceof Error?e.message:'Não foi possível atualizar o chat.';
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
  const identity=id+'|'+auth.token;
  activeChat.current=identity;
  const pending=pendingWrites.current.get(identity);
  pendingRefresh.current=false;
  setEntries([]);setClosed(false);setError('');setSyncWarning('');historyError.current=null;setLoading(true);setDraft('');setReply(null);
  sendingNow.current=Boolean(pending);setSending(pending==='text');setUploading(pending==='photo');
  setPhoto(null);setPhotoReady(false);
  if(auth.token&&Number.isSafeInteger(id)&&id>0)void chatPhotoAvailable('session',id,auth.token).then(ok=>{if(active&&version===generation.current)setPhotoReady(ok);}).catch(()=>{});
  void refresh(false,version);
  // Read-only polling while focused; a send is never retried automatically.
  const timer=setInterval(()=>{if(AppState.currentState==='active'&&!sendingNow.current)void refresh(true,version);},15000);
  return ()=>{active=false;clearInterval(timer);pendingRefresh.current=false;generation.current++;
   if(activeChat.current===identity)activeChat.current='';
  };
 },[refresh,auth.token,id]));
 async function send(){
  const identity=id+'|'+auth.token;
  if(sendingNow.current||pendingWrites.current.has(identity)||closed||!auth.token||!draft.trim())return;
  const version=generation.current,originalDraft=draft,originalReplyId=reply?.id;
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{await postSessionChat(id,originalDraft,auth.token,originalReplyId);
   if(version!==generation.current)return;
   setDraft(current=>current===originalDraft?'':current);
   setReply(current=>current?.id===originalReplyId?null:current);
   await refresh(false,version);
  }catch(e){if(version===generation.current)setError((e instanceof Error?e.message:'Falha no envio.')+
   ' Consulta o histórico antes de voltares a tentar.');}
  finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setSending(false);}
  }
 }
 async function choosePhoto(){
  if(!auth.token||!photoReady||closed||sending||uploading)return;
  const version=generation.current;
  try{
   const chosen=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.8,exif:false,base64:false});
   if(version===generation.current&&!chosen.canceled&&chosen.assets[0])setPhoto(chosen.assets[0]);
  }catch{if(version===generation.current)setError('Não foi possível abrir a galeria.');}
 }
 async function uploadPhoto(){
  const identity=id+'|'+auth.token;
  if(!auth.token||!photo||!photoReady||closed||sendingNow.current||pendingWrites.current.has(identity)||uploading)return;
  const version=generation.current,originalReplyId=reply?.id;
  pendingWrites.current.set(identity,'photo');
  sendingNow.current=true;setUploading(true);setError('');
  try{
   await sendChatPhoto('session',id,auth.token,photo,originalReplyId);
   if(version!==generation.current)return;
   setPhoto(null);setReply(current=>current?.id===originalReplyId?null:current);
   await refresh(false,version);
  }catch(e){if(version===generation.current)setError((e instanceof Error?e.message:'Envio não confirmado.')+' Verifica o histórico antes de repetir.');}
  finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setUploading(false);}
  }
 }
 return <Page autoScrollToEnd><Brand subtitle="SESSÃO"/><DemoBanner/><Eyebrow>CHAT DA SESSÃO</Eyebrow>
  <Text style={styles.title}>Conversa do jogo</Text>
  <Text style={styles.note}>Apenas o organizador e participantes confirmados. O chat encerra quando o jogo começa.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {syncWarning&&!closed?<Message>{syncWarning}</Message>:null}
  {!loading&&!closed&&!entries.length?<Message>Sem mensagens. Inicia a conversa!</Message>:null}
  {entries.map(m=><Pressable key={m.id} disabled={!!m.deletedAt||closed} onPress={()=>setReply(m)}
    accessibilityRole="button" accessibilityLabel={'Responder a '+m.senderUsername}
    style={[styles.message,m.senderUsername.toLowerCase()===auth.username?.toLowerCase()&&styles.mine]}>
    <Text style={styles.sender}>{m.senderUsername}{m.senderGuest?' · Convidado':''}</Text>
    {m.replyToText?<Text style={styles.quote}>{m.replyToSender}: {m.replyToText}</Text>:null}
    <Text style={styles.body}>{m.deletedAt?'Mensagem removida':m.body||m.attachmentName||'Anexo'}</Text>
    {m.attachmentName&&!m.deletedAt?<SecureChatAttachment scope="session" conversationId={id} messageId={m.id} token={auth.token} name={m.attachmentName} mime={m.attachmentMimeType} size={m.attachmentSize}/>:null}
    <Text style={styles.time}>{m.createdAt&&Number.isFinite(Date.parse(m.createdAt))?
     new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):''}</Text>
  </Pressable>)}
  <ChatPdfComposer target={{scope:'session',id}} token={auth.token} enabled={!closed&&photoReady&&!sending&&!uploading} replyId={reply?.id} onSent={async(sentReplyId)=>{
   // Only clear the reply actually attached to this PDF, not a new choice
   // the user may have made while the file was being uploaded.
   setReply(current=>current?.id===(sentReplyId??undefined)?null:current);
   await refresh();
  }}/>
  {auth.token&&!closed&&photoReady?<Button title="Escolher fotografia" secondary disabled={sending||uploading} onPress={()=>{void choosePhoto();}}/>:null}
  {photo&&!closed?<View style={styles.photoPanel}>
   <Image source={{uri:photo.uri}} style={styles.preview} resizeMode="contain"/>
   <Text style={styles.note}>Confirma antes de enviar. Limite 5 MB.</Text>
   <Button title={uploading?'A enviar…':'Confirmar envio da fotografia'} disabled={uploading||sending} onPress={()=>{void uploadPhoto();}}/>
   <Button title="Cancelar fotografia" secondary disabled={uploading} onPress={()=>setPhoto(null)}/>
  </View>:null}
  {auth.token&&!closed?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.editor}>
    {reply?<View style={styles.editor}><Text style={styles.note}>A responder a {reply.senderUsername}</Text>
     <Button title="Cancelar resposta" secondary onPress={()=>setReply(null)}/></View>:null}
    <View style={styles.composer}>
     <TextInput multiline value={draft} onChangeText={setDraft} maxLength={2000}
      accessibilityLabel="Mensagem da sessão" placeholder="Escreve uma mensagem"
      placeholderTextColor={C.muted} style={styles.input}/>
     <Button title={sending?'A enviar…':'Enviar'} disabled={sending||uploading||sendingNow.current||pendingWrites.current.has(id+'|'+auth.token)||!draft.trim()} onPress={()=>{void send();}}/>
    </View>
  </KeyboardAvoidingView>:null}
  {syncWarning&&!closed?<Button title="↻ Tentar novamente" secondary disabled={loading||sending||uploading} onPress={()=>{void refresh();}}/>:null}
  <Button title="Voltar à sessão" secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:26,fontWeight:'900',color:C.white},note:{fontSize:12,color:C.muted},
 message:{padding:12,borderRadius:MobileTheme.radius.lg,backgroundColor:MobileTheme.colors.surface,borderWidth:1,borderColor:MobileTheme.colors.border,gap:6,maxWidth:'86%',alignSelf:'flex-start',borderBottomLeftRadius:5},
 mine:{backgroundColor:'#10483F',borderColor:'#267566',alignSelf:'flex-end',borderBottomLeftRadius:MobileTheme.radius.lg,borderBottomRightRadius:5},sender:{fontSize:12,fontWeight:'800',color:C.mint},
 quote:{color:C.muted,fontSize:12},body:{color:C.white,fontSize:15},time:{color:C.muted,fontSize:10,textAlign:'right'},
 photoPanel:{gap:9,padding:12,backgroundColor:C.surface,borderRadius:14},preview:{height:180,width:'100%'},
 editor:{gap:9},composer:{flexDirection:'row',gap:8,alignItems:'center'},
 input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:130,backgroundColor:MobileTheme.colors.surface,color:MobileTheme.colors.text,
  borderWidth:1,borderColor:MobileTheme.colors.border,borderRadius:MobileTheme.radius.lg,padding:12}
});
