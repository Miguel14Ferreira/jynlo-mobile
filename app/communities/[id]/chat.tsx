import ChatPdfComposer from '../../../src/components/ChatPdfComposer';
import SecureChatAttachment from '../../../src/components/SecureChatAttachment';
import React,{useCallback,useRef,useState} from 'react';
import {ActivityIndicator,AppState,Image,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {ApiError} from '../../../src/lib/api';
import {communityMessages,sendCommunityMessage} from '../../../src/lib/chat-api';
import {communityDetails} from '../../../src/lib/community-api';
import {observeCommunityChat} from '../../../src/lib/community-realtime';
import {markCommunityRead} from '../../../src/lib/chat-api';
import {mergeMessages} from '../../../src/lib/realtime-core.cjs';
import {C,MobileTheme} from '../../../src/lib/theme';
import {chatPhotoAvailable,sendChatPhoto} from '../../../src/lib/chat-photo-attachment';
import type {CommunityChatEntry} from '../../../src/lib/types';
export default function CommunityChatScreen(){
 const {id:raw}=useLocalSearchParams<{id:string}>(),id=Number(raw);const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<CommunityChatEntry[]>([]);
 const generation=useRef(0),sendingNow=useRef(false),uploadingNow=useRef(false);
 // Keep in-flight writes locked across navigation; leaving the screen does not cancel the server request.
 const pendingWrites=useRef(new Map<string,'text'|'photo'>()),activeChat=useRef('');
 const [name,setName]=useState('Comunidade'),[draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState('');
 const historyError=useRef<string|null>(null);
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [canSendPhoto,setCanSendPhoto]=useState(false),[uploading,setUploading]=useState(false);
 const [refreshWarning,setRefreshWarning]=useState('');
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
    const last=chat.reduce((max,m)=>Number.isSafeInteger(m.id)&&m.id>max?m.id:max,0);
    if(last)void markCommunityRead(id,last,auth.token,auth.username).catch(()=>{});
  }catch(e){if(version===generation.current){
    const forbidden=e instanceof ApiError&&[401,403,404,410].includes(e.status);
    if(forbidden){
     revokedRef.current=true;setAccessRevoked(true);setMessages([]);setDraft('');setPhoto(null);setCanSendPhoto(false);
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
   setMessages([]);setName('Comunidade');setError('');setRefreshWarning('');historyError.current=null;setLoading(true);setAccessRevoked(false);revokedRef.current=false;
   setDraft('');setPhoto(null);setConnection('offline');connectionStatus.current='offline';queuedRefresh.current=false;
   const identity=id+'|'+auth.token;
   activeChat.current=identity;
   const pending=pendingWrites.current.get(identity);
   sendingNow.current=Boolean(pending);uploadingNow.current=pending==='photo';
   setSending(pending==='text');setUploading(pending==='photo');
   setCanSendPhoto(false);
   if(auth.token)void chatPhotoAvailable('community',id,auth.token).then(ok=>{if(active&&version===generation.current)setCanSendPhoto(ok);}).catch(()=>{});
   void refresh(version);
   if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0)return ()=>{active=false;generation.current++;if(activeChat.current===identity)activeChat.current='';};
   const disconnect=observeCommunityChat({id,token:auth.token,username:auth.username,onStatus:(status)=>{if(active&&version===generation.current){const wasConnected=connectionStatus.current==='online';connectionStatus.current=status;setConnection(status);
    // Reconcile missed messages and clear an offline warning only after a successful server read.
    if(status==='online'&&!wasConnected)void refresh(version,true);
   }}, 
    onMessage:(msg)=>{if(!active||version!==generation.current||revokedRef.current)return;
      setMessages(old=>mergeMessages(old,[msg]));
      if(msg.username!==auth.username)void markCommunityRead(id,msg.id,auth.token!,auth.username!).catch(()=>{});}
   });
   // A disconnected WebSocket must not leave the conversation frozen until a manual refresh.
   const timer=setInterval(()=>{
    if(active&&generation.current===version&&connectionStatus.current!=='online'&&AppState.currentState==='active')
     void refresh(version,true);
   },15000);
   const resume=AppState.addEventListener('change',state=>{
    if(state==='active'&&active&&generation.current===version)void refresh(version,true);
   });
   return ()=>{active=false;clearInterval(timer);resume.remove();queuedRefresh.current=false;generation.current++;if(activeChat.current===identity)activeChat.current='';disconnect();};
 },[refresh,id,auth.token,auth.username]));
 async function send(){
  const identity=id+'|'+auth.token;
  if(sendingNow.current||uploadingNow.current||pendingWrites.current.has(identity)||revokedRef.current||!auth.token||!auth.username||!draft.trim())return;
  const version=generation.current,token=auth.token,username=auth.username;
  const originalDraft=draft;
  const message=originalDraft.trim();
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   await sendCommunityMessage(id,message,token,username);
   if(version!==generation.current)return;
   setDraft(current=>current===originalDraft?'':current);
   await refresh(version);
  }catch(e){
   if(version===generation.current)setError((e instanceof Error?e.message:'Não foi possível enviar.')+' Verifica o histórico antes de repetir.');
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){sendingNow.current=false;setSending(false);}
  }
 }
 async function choosePhoto(){
  if(!auth.token||!canSendPhoto||revokedRef.current||uploadingNow.current||sendingNow.current||pendingWrites.current.has(id+'|'+auth.token))return;
  const version=generation.current;
  try{
   const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.8,exif:false,base64:false});
   if(version!==generation.current)return;
   if(!selected.canceled&&selected.assets?.[0])setPhoto(selected.assets[0]);
  }catch{
   if(version===generation.current)setError('Não foi possível abrir a galeria.');
  }
 }
 async function uploadPhoto(){
  const identity=id+'|'+auth.token;
  if(!auth.token||!photo||!canSendPhoto||revokedRef.current||uploadingNow.current||sendingNow.current||pendingWrites.current.has(identity))return;
  const version=generation.current,token=auth.token,selectedPhoto=photo;
  pendingWrites.current.set(identity,'photo');
  uploadingNow.current=true;setUploading(true);setError('');
  try{
   await sendChatPhoto('community',id,token,selectedPhoto);
   if(version!==generation.current)return;
   setPhoto(null);await refresh(version);
  }catch(e){
   if(version===generation.current)setError((e instanceof Error?e.message:'Envio não confirmado.')+' Confirma o histórico antes de tentar novamente.');
  }finally{
   pendingWrites.current.delete(identity);
   if(activeChat.current===identity){uploadingNow.current=false;setUploading(false);}
  }
 }
 return <Page>
   <DemoBanner/><Eyebrow>CHAT DA COMUNIDADE</Eyebrow><Text style={styles.title}>{name}</Text>
   <Text style={styles.note}>Apenas os membros podem ler e enviar mensagens. · {connection==='online'?'● Ligado':connection==='connecting'?'○ A ligar':'○ A sincronizar sem ligação em tempo real'}</Text>
   {!auth.token?<Button title="Entrar para conversar" onPress={()=>router.push('/login')}/>:null}
   {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}
   {refreshWarning?<Message tone="error">{refreshWarning}</Message>:null}
   {!loading&&!error&&messages.length===0?<Message>Começa a conversa. A primeira mensagem pode ser tua!</Message>:null}
   {messages.map(m=><View key={m.id} style={[styles.message,m.username===auth.username&&styles.mine]}>
     <Text style={styles.sender}>{m.username}</Text><Text style={styles.body}>{m.deletedAt?'Mensagem removida':m.body||m.attachmentName||'Anexo'}</Text>
     {m.attachmentName&&!m.deletedAt?<SecureChatAttachment scope="community" conversationId={id} messageId={m.id} token={auth.token} name={m.attachmentName} mime={m.attachmentMimeType} size={m.attachmentSize}/>:null}
     <Text style={styles.time}>{m.createdAt&&Number.isFinite(Date.parse(m.createdAt))?new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):''}</Text>
   </View>)}
   <ChatPdfComposer target={{scope:'community',id}} token={auth.token} enabled={!accessRevoked&&canSendPhoto&&!sending&&!uploading&&!pendingWrites.current.has(id+'|'+auth.token)} onSent={async()=>{await refresh();}}/>
   {auth.token&&!accessRevoked&&canSendPhoto?<Button secondary title="Escolher fotografia" disabled={sending||uploading||pendingWrites.current.has(id+'|'+auth.token)} onPress={()=>{void choosePhoto();}}/>:null}
   {photo&&!accessRevoked?<View style={styles.photoPanel}>
     <Image source={{uri:photo.uri}} style={styles.preview} resizeMode="contain"/>
     <Text style={styles.note}>Confirma antes de enviar. Limite 5 MB.</Text>
     <Button title={uploading?'A enviar…':'Confirmar envio da fotografia'} disabled={uploading||sending||pendingWrites.current.has(id+'|'+auth.token)} onPress={()=>{void uploadPhoto();}}/>
     <Button secondary title="Cancelar fotografia" disabled={uploading} onPress={()=>setPhoto(null)}/>
   </View>:null}
   {auth.token&&!accessRevoked?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.composer}>
     <TextInput multiline style={styles.input} placeholder="Escreve uma mensagem…" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
       maxLength={4000} accessibilityLabel="Mensagem para a comunidade"/>
     <Pressable style={[styles.send,sending&&{opacity:.5}]} onPress={()=>{void send();}} disabled={sending||uploading||pendingWrites.current.has(id+'|'+auth.token)||!draft.trim()} accessibilityRole="button">
       {sending?<ActivityIndicator color={C.background}/>:<Text style={styles.sendText}>Enviar</Text>}
     </Pressable>
   </KeyboardAvoidingView>:null}
   {refreshWarning&&!accessRevoked?<Button secondary title="↻ Tentar novamente" disabled={loading||sending||uploading} onPress={()=>{void refresh();}} />:null}
  </Page>;
}
const styles=StyleSheet.create({title:{fontSize:26,fontWeight:'900',color:C.white},note:{color:C.muted,fontSize:12},
 message:{padding:12,borderRadius:MobileTheme.radius.lg,backgroundColor:MobileTheme.colors.surface,borderWidth:1,borderColor:MobileTheme.colors.border,gap:6,maxWidth:'86%',alignSelf:'flex-start',borderBottomLeftRadius:5},
 mine:{backgroundColor:'#10483F',borderColor:'#267566',alignSelf:'flex-end',borderBottomLeftRadius:MobileTheme.radius.lg,borderBottomRightRadius:5},sender:{fontSize:11,color:C.mint,fontWeight:'800'},body:{fontSize:15,color:C.white,lineHeight:21},time:{fontSize:10,color:C.muted,textAlign:'right'},
 photoPanel:{gap:9,padding:12,backgroundColor:C.surface,borderRadius:14},preview:{height:180,width:'100%'},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9},input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:145,backgroundColor:MobileTheme.colors.surface,borderColor:MobileTheme.colors.border,borderWidth:1,color:MobileTheme.colors.text,padding:13,borderRadius:MobileTheme.radius.lg},
 send:{backgroundColor:MobileTheme.colors.accent,borderRadius:MobileTheme.radius.md,paddingHorizontal:16,minHeight:MobileTheme.touchTarget,justifyContent:'center'},sendText:{color:C.background,fontWeight:'900'}});
