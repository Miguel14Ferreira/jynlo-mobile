import ChatPdfComposer from '../../src/components/ChatPdfComposer';
import SecureChatAttachment from '../../src/components/SecureChatAttachment';
import React,{useCallback,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message} from '../../src/components/UI';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE} from '../../src/lib/api';
import {directChatHistory,markDirectRead,sendDirectChat} from '../../src/lib/chat-api';
import {directPhotoAvailable,sendDirectPhoto} from '../../src/lib/direct-photo-attachment';
import type {DirectChatEntry} from '../../src/lib/chat-api';
import {C} from '../../src/lib/theme';
import {giphyImageUrl} from '../../src/lib/chat-giphy.cjs';
import {blockUser,reportUser,unblockUser,userBlockStatus} from '../../src/lib/user-safety-api';

export default function DirectConversation(){
 const params=useLocalSearchParams<{peer:string}>();
 const peer=typeof params.peer==='string'?params.peer:'';
 const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<DirectChatEntry[]>([]);
 const conversationScroll=useRef<ScrollView|null>(null);
 const nearBottom=useRef(true);
 const [attachmentsOpen,setAttachmentsOpen]=useState(false);
 const [safetyOpen,setSafetyOpen]=useState(false);
 const [draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [syncWarning,setSyncWarning]=useState('');
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [photoAvailable,setPhotoAvailable]=useState(false),[photoBusy,setPhotoBusy]=useState(false);
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
   const last=results.reduce((n,m)=>m.id>n?m.id:n,0);
   if(last>0)void markDirectRead(peer,last,auth.token).catch(()=>{});
  }catch(e){
   if(version===generation.current){
    if(silent)setSyncWarning('Não foi possível atualizar as mensagens. O histórico apresentado pode estar desatualizado.');
    else setError(e instanceof Error?e.message:'Não foi possível abrir a conversa.');
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
   conversation.current=identity;
   setMessages([]);setDraft('');setPhoto(null);setError('');setSyncWarning('');
   setAttachmentsOpen(false);setSafetyOpen(false);
   const pending=pendingWrites.current.get(identity);
   setSending(pending==='text');setPhotoBusy(pending==='photo');sendingNow.current=Boolean(pending);
  }
  const version=++generation.current;
  // Refocusing the same chat must not unlock an unsettled message or photo.
  const pending=pendingWrites.current.get(identity);
  sendingNow.current=Boolean(pending);
  setSending(pending==='text');setPhotoBusy(pending==='photo');
  // A previous block/report POST may still be running after navigation.
  setSafetyBusy(safetyInFlight.current);
  const blockRequest=++blockCheckRequest.current;
  pendingRefresh.current=false;
  setPhoto(null);setPhotoAvailable(false);
  if(auth.token)void directPhotoAvailable(peer,auth.token).then(available=>{
   if(active&&generation.current===version)setPhotoAvailable(available);
  }).catch(()=>{if(active&&generation.current===version)setPhotoAvailable(false);});
  void refresh(false,version);
  setShowReport(false);setReportReason('');setBlocked(false);setBlockStatusKnown(false);
  if(auth.token&&peer&&peer.toLowerCase()!==auth.username?.toLowerCase()&&!DEMO_MODE){
   void userBlockStatus(peer,auth.token).then(value=>{
    if(active&&generation.current===version&&blockCheckRequest.current===blockRequest){setBlocked(value);setBlockStatusKnown(true);}
   }).catch(()=>{ /* Keep calls disabled when the block status cannot be verified. */ });
  }
  // Poll only while focused; old responses cannot overwrite a new conversation.
  const timer=setInterval(()=>{
   if(AppState.currentState==='active'&&!sendingNow.current)void refresh(true,version);
  },15000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&generation.current===version)void refresh(true,version);
  });
  // Native notification delivery is optional. A missing/unavailable module
  // must not prevent opening a direct chat on Android.
  let received:ReturnType<typeof Notifications.addNotificationReceivedListener>|null=null;
  try{
   received=Notifications.addNotificationReceivedListener(notification=>{
    if(notification.request?.content?.data?.kind!=='notification'||generation.current!==version)return;
    if(auth.token)void refresh(true,version);
   });
  }catch{
   // The 15-second poll and app-resume refresh still keep this chat current.
  }
  return ()=>{
   active=false;clearInterval(timer);resume.remove();
   try{received?.remove();}catch{
    // Optional native listener teardown must not block navigation.
   }
   pendingRefresh.current=false;generation.current++;blockCheckRequest.current++;
  };
 },[refresh,peer,auth.token]));
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
   Alert.alert(value?'Utilizador bloqueado':'Utilizador desbloqueado',
    value?'Deixaste de poder trocar mensagens com este utilizador.':'Podes voltar a comunicar com este utilizador.');
   await refresh(true,version);
  }catch(e){
   if(conversation.current===identity&&version===generation.current)
    setError(e instanceof Error?e.message:'Não foi possível alterar o bloqueio. Confirma o estado antes de repetir.');
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
   Alert.alert('Denúncia enviada','Obrigado. A equipa Jynlo poderá analisar a situação.');
  }catch(e){
   if(conversation.current===identity&&version===generation.current)
    setError(e instanceof Error?e.message:'Não foi possível confirmar a denúncia. Verifica antes de repetires.');
  }finally{
   safetyInFlight.current=false;
   setSafetyBusy(false);
  }
 }
 async function send(){
  const identity=peer+'|'+auth.token;
  if(sending||sendingNow.current||pendingWrites.current.has(identity)||blocked||!blockStatusKnown||!auth.token||!draft.trim())return;
  const originalDraft=draft;
  const submittedText=originalDraft.trim();
  const version=generation.current;
  pendingWrites.current.set(identity,'text');
  sendingNow.current=true;setSending(true);setError('');
  try{
   await sendDirectChat(peer,submittedText,auth.token);
   if(version!==generation.current||conversation.current!==identity)return;
   // Preserve anything typed while the previous message was being sent.
   setDraft(current=>current===originalDraft?'':current);
   await refresh(false,version);
  }catch(e){
   if(version===generation.current&&conversation.current===identity)
    setError((e instanceof Error?e.message:'Não foi possível enviar.')+
     ' Consulta o histórico antes de repetires o envio.');
  }finally{
   pendingWrites.current.delete(identity);
   if(conversation.current===identity){
    sendingNow.current=false;setSending(false);
   }
  }
 }
 async function choosePhoto(){
  if(!auth.token||blocked||!blockStatusKnown||!photoAvailable||photoBusy)return;
  const identity=peer+'|'+auth.token;
  const version=generation.current;
  setError('');
  try{
   const selected=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:['images'],quality:0.8,exif:false,base64:false
   });
   if(version!==generation.current||conversation.current!==identity)return;
   if(!selected.canceled&&selected.assets?.[0])setPhoto(selected.assets[0]);
  }catch{
   if(version===generation.current&&conversation.current===identity)
    setError('Não foi possível abrir a galeria.');
  }
 }
 async function uploadPhoto(){
  const identity=peer+'|'+auth.token;
  if(!auth.token||blocked||!blockStatusKnown||!photo||!photoAvailable||photoBusy||sending||sendingNow.current||pendingWrites.current.has(identity))return;
  const version=generation.current;
  pendingWrites.current.set(identity,'photo');
  setPhotoBusy(true);sendingNow.current=true;setError('');
  try{
   await sendDirectPhoto(peer,auth.token,photo);
   if(version!==generation.current||conversation.current!==identity)return;
   setPhoto(null);await refresh(false,version);
  }catch(e){
   if(version===generation.current&&conversation.current===identity)
    setError(e instanceof Error?e.message:'Não foi possível enviar a fotografia.');
  }finally{
   pendingWrites.current.delete(identity);
   if(conversation.current===identity){
    sendingNow.current=false;setPhotoBusy(false);
   }
  }
 }
 return <SafeAreaView style={styles.screen} edges={['top','left','right']}>
  <ScrollView ref={conversationScroll} contentContainerStyle={styles.history} keyboardShouldPersistTaps="handled"
    onScroll={event=>{const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;
      nearBottom.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-90;}}
    scrollEventThrottle={100}
    onContentSizeChange={()=>{if(nearBottom.current)conversationScroll.current?.scrollToEnd({animated:false});}}>
  <DemoBanner/><Eyebrow>CHAT PRIVADO</Eyebrow>
  <Text style={styles.title}>{peer}</Text>
  <Text style={styles.note}>Conversas sincronizadas com a tua conta Jynlo. As permissões de amizade e bloqueio são verificadas pelo servidor.</Text>
  {auth.token&&!DEMO_MODE&&blockStatusKnown&&!blocked&&peer.toLowerCase()!==auth.username?.toLowerCase()?<Button secondary title="Chamada de voz ou vídeo" onPress={()=>router.push({pathname:'/messages/call',params:{peer}})}/>:null}
  {!auth.token?<Button title="Entrar para conversar" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {syncWarning?<Message tone="error">{syncWarning}</Message>:null}
  {auth.token&&!DEMO_MODE&&peer.toLowerCase()!==auth.username?.toLowerCase()?<View style={styles.safety}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:safetyOpen}} onPress={()=>setSafetyOpen(open=>!open)}>
    <Text style={styles.safetyToggle}>{safetyOpen?'Ocultar opções de segurança':'Segurança da conversa ▾'}</Text>
   </Pressable>
   {safetyOpen?<>
   {blocked?<Message>Bloqueaste este utilizador. As mensagens estão desativadas.</Message>:null}
   <Button secondary title={blocked?'Desbloquear utilizador':'Bloquear utilizador'}
    disabled={safetyBusy} onPress={()=>Alert.alert(
      blocked?'Desbloquear utilizador?':'Bloquear utilizador?',
      blocked?'Voltarás a permitir a comunicação com este utilizador.':'Esta pessoa deixará de poder trocar mensagens contigo.',
      [{text:'Cancelar',style:'cancel'},{text:'Confirmar',style:blocked?'default':'destructive',onPress:()=>{void updateBlock();}}])}/>
   <Button secondary title={showReport?'Cancelar denúncia':'Denunciar utilizador'}
    disabled={safetyBusy} onPress={()=>{setShowReport(v=>!v);setReportReason('');}}/>
   {showReport?<View style={styles.report}>
    <Text style={styles.note}>Descreve o problema para a equipa Jynlo (até 1000 caracteres). Não incluas palavras-passe.</Text>
    <TextInput multiline value={reportReason} onChangeText={setReportReason}
      maxLength={1000} accessibilityLabel="Motivo da denúncia" placeholder="Descreve o motivo da denúncia…"
      placeholderTextColor={C.muted} style={styles.reportInput}/>
    <Button danger title={safetyBusy?'A enviar denúncia…':'Enviar denúncia'} 
      disabled={safetyBusy||!reportReason.trim()} onPress={()=>{void submitReport();}}/>
   </View>:null}
   </>:null}
  </View>:null}
  {!loading&&!error&&messages.length===0?<Message>Ainda não existem mensagens nesta conversa.</Message>:null}
  {messages.map(m=><View key={m.id} style={[styles.message,m.username1.toLowerCase()===auth.username?.toLowerCase()&&styles.mine]}>
   <Text style={styles.sender}>{m.username1}</Text>
   {m.replyToText?<Text style={styles.quote}>{m.replyToSender}: {m.replyToText}</Text>:null}
   {m.deletedAt?<Text style={styles.body}>Mensagem removida</Text>:
    giphyImageUrl(m.text)?<Image source={{uri:giphyImageUrl(m.text)!}} resizeMode="contain" style={styles.gif}
      accessibilityLabel="GIF enviado na conversa"/>:
    m.attachmentName&&(!m.text||m.text.trim()===m.attachmentName.trim())?null:
    <Text style={styles.body}>{m.text||'Mensagem sem texto'}</Text>}
   {m.attachmentName&&!m.deletedAt?<SecureChatAttachment scope="direct" conversationId={peer} messageId={m.id} token={auth.token} name={m.attachmentName} mime={m.attachmentMimeType} size={m.attachmentSize}/>:null}
   <Text style={styles.time}>{m.date&&Number.isFinite(Date.parse(m.date))?
     new Date(m.date).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''}{m.editedAt?' · editada':''}</Text>
  </View>)}
  <Button secondary title="Atualizar conversa" onPress={()=>{void refresh();}} disabled={sending||loading}/>
  </ScrollView>
  <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.footer}>
  {photo?<View style={styles.photoContainer}>
   <Image source={{uri:photo.uri}} style={styles.photoPreview} resizeMode="contain"/>
   <Text style={styles.note}>A fotografia só é enviada depois de confirmares (máximo 5 MB).</Text>
   <Button title={photoBusy?'A enviar fotografia…':'Confirmar envio da fotografia'} disabled={photoBusy||sending} onPress={()=>{void uploadPhoto();}}/>
   <Button secondary title="Cancelar fotografia" disabled={photoBusy} onPress={()=>setPhoto(null)}/>
  </View>:null}

  {auth.token&&!blocked&&blockStatusKnown&&photoAvailable?<Pressable accessibilityRole="button"
    accessibilityState={{expanded:attachmentsOpen}} onPress={()=>setAttachmentsOpen(value=>!value)}
    style={styles.attachmentToggle}><Text style={styles.attachmentToggleText}>{attachmentsOpen?'Fechar anexos':'＋ Anexar ficheiro'}</Text></Pressable>:null}
  {blocked?<Text style={styles.note}>Este contacto está bloqueado. Abre «Segurança da conversa» para o desbloquear.</Text>:null}
  {!blockStatusKnown&&auth.token&&!DEMO_MODE?<View style={{gap:7}}>
    <Text style={styles.note}>Não foi possível confirmar ainda se esta conversa permite enviar mensagens.</Text>
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
          setError('Não foi possível verificar o estado do contacto. Tenta novamente.');
      });
    }}><Text style={styles.attachmentToggleText}>Verificar novamente</Text></Pressable>
  </View>:null}
  <View style={[styles.attachmentOptions,!attachmentsOpen&&styles.hidden]}>
  <ChatPdfComposer target={{scope:'direct',id:peer}} token={auth.token} enabled={!blocked&&blockStatusKnown&&photoAvailable&&!sending&&!photoBusy} onSent={async()=>{
   if(conversation.current!==peer+'|'+auth.token)return;
   setAttachmentsOpen(false);await refresh(true,generation.current);
  }}/>
  {auth.token&&!blocked&&blockStatusKnown&&photoAvailable?<Button secondary title="Escolher fotografia para enviar" disabled={photoBusy||sending} onPress={()=>{setAttachmentsOpen(false);void choosePhoto();}}/>:null}

  </View>
  {auth.token&&!blocked&&blockStatusKnown?<View style={styles.composer}>
   <TextInput multiline style={styles.input} placeholder="Escreve uma mensagem privada…"
    placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
    maxLength={2000} accessibilityLabel="Mensagem privada para o contacto"/>
   <Pressable accessibilityRole="button" style={[styles.send,sending&&{opacity:0.5}]}
    disabled={sending||!draft.trim()} onPress={()=>{void send();}}>
    {sending?<ActivityIndicator color={C.background}/>:<Text style={styles.sendText}>Enviar</Text>}
   </Pressable>
  </View>:null}

  </KeyboardAvoidingView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:C.background},
 history:{paddingHorizontal:16,paddingTop:12,paddingBottom:22,gap:12},
 footer:{paddingHorizontal:12,paddingVertical:10,borderTopWidth:1,borderTopColor:C.border,backgroundColor:C.background,gap:8},
 attachmentToggle:{alignSelf:'flex-start',paddingVertical:7,paddingHorizontal:10},
 attachmentToggleText:{color:C.mint,fontWeight:'800',fontSize:13},
 attachmentOptions:{gap:7,maxHeight:180},
 hidden:{display:'none'},
 safetyToggle:{fontSize:12,color:C.mint,fontWeight:'800'},
 safety:{gap:10,padding:14,borderRadius:15,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 report:{gap:10},
 reportInput:{minHeight:100,maxHeight:180,color:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,textAlignVertical:'top'},
 title:{fontSize:23,fontWeight:'900',color:C.white},
 note:{fontSize:12,color:C.muted,lineHeight:19},
 message:{padding:11,borderRadius:17,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,gap:5,maxWidth:'88%',alignSelf:'flex-start'},
 mine:{backgroundColor:'#19473E',borderColor:'#347D62',alignSelf:'flex-end'},
 sender:{fontSize:11,color:C.mint,fontWeight:'800'},
 quote:{fontSize:12,color:C.muted,borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:8},
 body:{fontSize:15,color:C.white,lineHeight:21},
 gif:{width:240,height:200,maxWidth:'100%',borderRadius:12,backgroundColor:C.surface},
 time:{fontSize:10,color:C.muted,textAlign:'right'},
 photoContainer:{gap:10,padding:12,borderRadius:14,backgroundColor:C.surface},
 photoPreview:{height:110,width:'100%',borderRadius:12},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9},
 input:{flex:1,minHeight:55,maxHeight:145,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,color:C.white,padding:14,borderRadius:15},
 send:{backgroundColor:C.mint,borderRadius:13,padding:14,minHeight:53,justifyContent:'center'},
 sendText:{color:C.background,fontWeight:'900'}
});
