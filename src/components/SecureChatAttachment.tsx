import React,{useCallback,useRef,useState} from 'react';
import {AppState,Image,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {File,Paths} from 'expo-file-system';
import {fetch as expoFetch} from 'expo/fetch';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {useFocusEffect} from 'expo-router';
import {API_BASE,DEMO_MODE} from '../lib/api';
import {C} from '../lib/theme';

type Scope='direct'|'community'|'session';
type Props={scope:Scope;conversationId:string|number;messageId:number;token:string|null;
 name:string;mime:string|null|undefined;size:number|null|undefined};
const isVoice=(mime:string|null|undefined)=>typeof mime==='string'&&mime.startsWith('audio/');
const formats:Record<string,string>={
 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
 'application/pdf':'pdf',
 'audio/webm':'webm','audio/ogg':'ogg','audio/mpeg':'mp3',
 'audio/mp4':'m4a','audio/x-m4a':'m4a','audio/aac':'aac'
};
function attachmentPath(scope:Scope,id:string|number,messageId:number):string{
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Anexo inválido.');
 if(scope==='direct'){
  const peer=String(id);
  if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error('Conversa inválida.');
  return '/api/chat/me/'+encodeURIComponent(peer)+'/attachments/'+messageId;
 }
 const numeric=Number(id);
 if(!Number.isSafeInteger(numeric)||numeric<=0||String(numeric)!==String(id))
  throw Error('Conversa inválida.');
 return '/api/'+(scope==='community'?'communities':'sessions')+'/'+numeric+
  '/messages/attachments/'+messageId;
}

/** Authenticated downloads use temporary app cache; native PDF viewer may run outside the app. */
export default function SecureChatAttachment({scope,conversationId,messageId,token,name,mime,size}:Props){
 const [uri,setUri]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const player=useAudioPlayer(null);
 const playback=useAudioPlayerStatus(player);
 const cached=useRef<File|null>(null),active=useRef(false),pending=useRef(false),generation=useRef(0);
 const abort=useRef<AbortController|null>(null);
 const pdfPreview=useRef(false),wasBackgrounded=useRef(false);
 const cleanup=useCallback(()=>{
  // Release the native decoder's reference before deleting the private cache file.
  try{player.pause();player.replace(null);}catch{}
  abort.current?.abort();abort.current=null;
  const old=cached.current;cached.current=null;
  try{if(old?.exists)old.delete();}catch{}
 },[player]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  active.current=true;
  pending.current=false;setBusy(false);setError('');setUri(null);
  return ()=>{
   if(generation.current===version)generation.current++;
   active.current=false;setUri(null);
   // Do not remove a PDF handed to Android while its external viewer is opening.
   if(!pdfPreview.current)cleanup();
  };
 },[cleanup,scope,conversationId,messageId,token]));
 React.useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>{
   if(state==='background'||state==='inactive'){
    wasBackgrounded.current=true;
    // Voice messages must not continue playing after this chat is backgrounded.
    try{player.pause();}catch{}
   }
   if(state==='active'&&wasBackgrounded.current&&pdfPreview.current){
    pdfPreview.current=false;
    cleanup();
   }
  });
  return ()=>{subscription.remove();if(!pdfPreview.current)cleanup();};
 },[cleanup,player]);
 async function open(){
  if(isVoice(mime)&&uri){
   try{
    if(playback.playing)player.pause();
    else{
     if(playback.didJustFinish||playback.duration>0&&playback.currentTime>=playback.duration)
      await player.seekTo(0);
     player.play();
    }
   }catch{setError('Não foi possível reproduzir esta mensagem de voz.');}
   return;
  }
  if(pending.current||pdfPreview.current||!token||DEMO_MODE||!formats[mime||''])return;
  if(!Number.isFinite(size)||!size||size<=0||size>5*1024*1024){
   setError('Tamanho do anexo inválido.');return;
  }
  const version=generation.current;
  pending.current=true;setBusy(true);setError('');
  const controller=new AbortController();abort.current=controller;
  const timeout=setTimeout(()=>controller.abort(),20000);
  let file:File|null=null;
  try{
   const path=attachmentPath(scope,conversationId,messageId);
   const response=await expoFetch(API_BASE+path,{
    headers:{Authorization:'Bearer '+token,Accept:mime!},credentials:'omit',redirect:'error',
    signal:controller.signal
   });
   if(!response.ok)throw Error('Não foi possível abrir o anexo. Verifica as permissões.');
   const type=(response.headers.get('content-type')||'').split(';')[0]?.trim().toLowerCase()||'';
   if(type!==mime)throw Error('O formato recebido não corresponde ao anexo.');
   const declared=Number(response.headers.get('content-length'));
   if(declared>5*1024*1024)throw Error('O anexo ultrapassa 5 MB.');
   const bytes=await response.bytes();
   if(!bytes.length||bytes.length>5*1024*1024)throw Error('O tamanho do anexo é inválido.');
   if(!active.current||generation.current!==version||controller.signal.aborted)return;
   file=new File(Paths.cache,'jynlo-private-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+formats[mime!]);
   await file.write(bytes);
   if(!active.current||controller.signal.aborted)return;
   cached.current=file;file=null;
   if(mime==='application/pdf'){
    if(!await File.canPreview(cached.current,{mimeType:'application/pdf'})){
     throw Error('Não existe um visualizador de PDF disponível neste dispositivo.');
    }
    wasBackgrounded.current=false;
    pdfPreview.current=true;
    // Expo hands the file to the native viewer. Its promise does not wait for closing.
    await File.preview(cached.current,{mimeType:'application/pdf',title:'Documento privado'});
    if(active.current&&generation.current===version&&!wasBackgrounded.current&&cached.current){
     // iOS may display the viewer inside the app. Keep cache until user closes it.
     setUri(cached.current.uri);
    }
   }else if(active.current&&generation.current===version){
    if(isVoice(mime)){
     // Never give the player the authenticated URL: only an isolated local cache file.
     player.replace(cached.current.uri);
     player.play();
    }
    setUri(cached.current.uri);
   }
  }catch(e){
   if(generation.current===version){
    pdfPreview.current=false;cleanup();
    if(active.current)setError(e instanceof Error?e.message:'Não foi possível abrir o anexo.');
   }
  }finally{
   if(file?.exists)try{file.delete();}catch{}
   clearTimeout(timeout);
   if(abort.current===controller)abort.current=null;
   if(generation.current===version){pending.current=false;if(active.current)setBusy(false);}
  }
 }
 function close(){
  setUri(null);pdfPreview.current=false;wasBackgrounded.current=false;cleanup();
 }
 if(!formats[mime||''])return <Text style={styles.note}>Anexo privado: {name} (formato ainda sem visualizador)</Text>;
 return <View style={styles.container}>
  <Pressable accessibilityRole="button" disabled={busy||!token} onPress={()=>{void open();}} style={styles.button}>
   <Text style={styles.action}>{busy?'A abrir anexo…':isVoice(mime)?
     (uri?(playback.playing?'❚❚ Pausar voz':'▶ Reproduzir voz'):'▶ Ouvir mensagem de voz'):
     mime==='application/pdf'?'Abrir PDF · '+name:'Ver fotografia · '+name}</Text>
  </Pressable>
  {isVoice(mime)&&uri?<Text style={styles.note}>{Math.floor(playback.currentTime)}s / {Math.floor(playback.duration||0)}s</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {mime==='application/pdf'&&uri?<Pressable accessibilityRole="button" onPress={close} style={styles.button}><Text style={styles.action}>Limpar PDF temporário</Text></Pressable>:null}
  <Modal visible={!!uri&&!isVoice(mime)&&mime!=='application/pdf'} transparent animationType="fade" onRequestClose={close}>
   <View style={styles.overlay}>
    {uri?<Image source={{uri}} resizeMode="contain" style={styles.image}/>:null}
    <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
     <Text style={styles.action}>Fechar fotografia</Text>
    </Pressable>
   </View>
  </Modal>
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:5},note:{color:C.muted,fontSize:12},
 button:{padding:11,borderWidth:1,borderColor:C.border,borderRadius:12},
 action:{color:C.mint,fontWeight:'700'},error:{color:'#FF9898',fontSize:12},
 overlay:{flex:1,backgroundColor:'#080B0DEE',justifyContent:'center',padding:14,gap:16},
 image:{height:'78%',width:'100%'},close:{alignSelf:'center',padding:15}
});
