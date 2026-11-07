import ChatPdfComposer from '../../../src/components/ChatPdfComposer';
import SecureChatAttachment from '../../../src/components/SecureChatAttachment';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {communityMessages,sendCommunityMessage} from '../../../src/lib/chat-api';
import {communityDetails} from '../../../src/lib/community-api';
import {observeCommunityChat} from '../../../src/lib/community-realtime';
import {markCommunityRead} from '../../../src/lib/chat-api';
import {mergeMessages} from '../../../src/lib/realtime-core.cjs';
import {C} from '../../../src/lib/theme';
import {chatPhotoAvailable,sendChatPhoto} from '../../../src/lib/chat-photo-attachment';
import type {CommunityChatEntry} from '../../../src/lib/types';
export default function CommunityChatScreen(){
 const {id:raw}=useLocalSearchParams<{id:string}>(),id=Number(raw);const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<CommunityChatEntry[]>([]);
 const generation=useRef(0);
 const [name,setName]=useState('Comunidade'),[draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState('');
 const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);
 const [canSendPhoto,setCanSendPhoto]=useState(false),[uploading,setUploading]=useState(false);
 const [connection,setConnection]=useState<'connecting'|'online'|'offline'>('offline');
 useEffect(()=>{setMessages([]);setName('Comunidade');setPhoto(null);setCanSendPhoto(false);},[id,auth.username]);
 const refresh=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0){setMessages([]);setLoading(false);return;}
  setLoading(true);setError('');
  try{const [chat,community]=await Promise.all([communityMessages(id,auth.token,auth.username),communityDetails(id,auth.token,auth.username)]);
    if(version!==generation.current)return;
    setMessages(old=>mergeMessages(old,chat));setName(community.name);
    const last=chat.at(-1)?.id;if(last)void markCommunityRead(id,last,auth.token,auth.username).catch(()=>{});
  }catch(e){if(version===generation.current){setError(e instanceof Error?e.message:'Não foi possível abrir o chat.');setMessages([]);}}
  finally{if(version===generation.current)setLoading(false);}
 },[id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
   let active=true;
   const version=++generation.current;
   setMessages([]);setName('Comunidade');setError('');setLoading(true);
   setCanSendPhoto(false);
   if(auth.token)void chatPhotoAvailable('community',id,auth.token).then(ok=>{if(active)setCanSendPhoto(ok);}).catch(()=>{});
   void refresh(version);
   if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0)return ()=>{active=false;generation.current++;};
   const disconnect=observeCommunityChat({id,token:auth.token,username:auth.username,onStatus:(status)=>{if(active&&version===generation.current)setConnection(status);},
    onMessage:(msg)=>{if(!active||version!==generation.current)return;
      setMessages(old=>mergeMessages(old,[msg]));
      if(msg.username!==auth.username)void markCommunityRead(id,msg.id,auth.token!,auth.username!).catch(()=>{});}
   });
   return ()=>{active=false;generation.current++;disconnect();};
 },[refresh,id,auth.token,auth.username]));
 async function send(){
  if(sending||!auth.token||!auth.username||!draft.trim())return;
  const message=draft.trim();setSending(true);setError('');
  try{await sendCommunityMessage(id,message,auth.token,auth.username);setDraft('');await refresh();}
  catch(e){setError((e instanceof Error?e.message:'Não foi possível enviar.')+' Verifica o histórico antes de repetir.');}
  finally{setSending(false);}
 }
 async function choosePhoto(){
  if(!auth.token||!canSendPhoto||uploading||sending)return;
  try{
   const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.8,exif:false,base64:false});
   if(!selected.canceled&&selected.assets[0])setPhoto(selected.assets[0]);
  }catch{setError('Não foi possível abrir a galeria.');}
 }
 async function uploadPhoto(){
  if(!auth.token||!photo||!canSendPhoto||uploading||sending)return;
  setUploading(true);setError('');
  try{
   await sendChatPhoto('community',id,auth.token,photo);
   setPhoto(null);await refresh();
  }catch(e){setError((e instanceof Error?e.message:'Envio não confirmado.')+' Confirma o histórico antes de tentar novamente.');}
  finally{setUploading(false);}
 }
 return <Page>
   <DemoBanner/><Eyebrow>CHAT DA COMUNIDADE</Eyebrow><Text style={styles.title}>{name}</Text>
   <Text style={styles.note}>Apenas os membros podem ler e enviar mensagens. · {connection==='online'?'● Ligado':connection==='connecting'?'○ A ligar':'○ Offline'}</Text>
   {!auth.token?<Button title="Entrar para conversar" onPress={()=>router.push('/login')}/>:null}
   {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}
   {!loading&&messages.length===0?<Message>Começa a conversa. A primeira mensagem pode ser tua!</Message>:null}
   {messages.map(m=><View key={m.id} style={[styles.message,m.username===auth.username&&styles.mine]}>
     <Text style={styles.sender}>{m.username}</Text><Text style={styles.body}>{m.deletedAt?'Mensagem removida':m.body||m.attachmentName||'Anexo'}</Text>
     {m.attachmentName&&!m.deletedAt?<SecureChatAttachment scope="community" conversationId={id} messageId={m.id} token={auth.token} name={m.attachmentName} mime={m.attachmentMimeType} size={m.attachmentSize}/>:null}
     <Text style={styles.time}>{new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</Text>
   </View>)}
   <ChatPdfComposer target={{scope:'community',id}} token={auth.token} enabled={canSendPhoto&&!sending&&!uploading} onSent={async()=>{await refresh();}}/>
   {auth.token&&canSendPhoto?<Button secondary title="Escolher fotografia" disabled={sending||uploading} onPress={()=>{void choosePhoto();}}/>:null}
   {photo?<View style={styles.photoPanel}>
     <Image source={{uri:photo.uri}} style={styles.preview} resizeMode="contain"/>
     <Text style={styles.note}>Confirma antes de enviar. Limite 5 MB.</Text>
     <Button title={uploading?'A enviar…':'Confirmar envio da fotografia'} disabled={uploading||sending} onPress={()=>{void uploadPhoto();}}/>
     <Button secondary title="Cancelar fotografia" disabled={uploading} onPress={()=>setPhoto(null)}/>
   </View>:null}
   {auth.token?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.composer}>
     <TextInput multiline style={styles.input} placeholder="Escreve uma mensagem…" placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
       maxLength={4000} accessibilityLabel="Mensagem para a comunidade"/>
     <Pressable style={[styles.send,sending&&{opacity:.5}]} onPress={()=>{void send();}} disabled={sending||!draft.trim()} accessibilityRole="button">
       {sending?<ActivityIndicator color={C.background}/>:<Text style={styles.sendText}>Enviar</Text>}
     </Pressable>
   </KeyboardAvoidingView>:null}
   <Button secondary title="Atualizar mensagens" onPress={()=>{void refresh();}} />
  </Page>;
}
const styles=StyleSheet.create({title:{fontSize:26,fontWeight:'900',color:C.white},note:{color:C.muted,fontSize:12},
 message:{padding:14,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,gap:6},
 mine:{backgroundColor:'#19473E',borderColor:'#347D62'},sender:{fontSize:11,color:C.mint,fontWeight:'800'},body:{fontSize:15,color:C.white,lineHeight:21},time:{fontSize:10,color:C.muted,textAlign:'right'},
 photoPanel:{gap:9,padding:12,backgroundColor:C.surface,borderRadius:14},preview:{height:180,width:'100%'},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9},input:{flex:1,minHeight:55,maxHeight:145,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,color:C.white,padding:14,borderRadius:15},
 send:{backgroundColor:C.mint,borderRadius:13,padding:14,minHeight:53,justifyContent:'center'},sendText:{color:C.background,fontWeight:'900'}});
