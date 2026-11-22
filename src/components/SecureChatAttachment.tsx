import React,{Suspense,lazy,useCallback,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {AppState,Image,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {File,Paths} from 'expo-file-system';
import {fetch as expoFetch} from 'expo/fetch';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {useFocusEffect} from 'expo-router';
import {API_BASE,DEMO_MODE} from '../lib/api';
import {C} from '../lib/theme';

type Scope='direct'|'community'|'session'|'team'|'private';
type Props={scope:Scope;conversationId:string|number;messageId:number;token:string|null;
 name:string;mime:string|null|undefined;size:number|null|undefined;index?:number;autoPreview?:boolean;
 kind?:'chat'|'feed';onAuthorizationError?:(status:number)=>void};
const isVoice=(mime:string|null|undefined)=>typeof mime==='string'&&mime.startsWith('audio/');
const isVideo=(mime:string|null|undefined)=>mime==='video/mp4'||mime==='video/webm';
const ChatVideo=lazy(()=>import('./FeedVideo'));
const maxAttachmentSize=(mime:string|null|undefined)=>isVideo(mime)?20*1024*1024:isVoice(mime)?12*1024*1024:5*1024*1024;
const formats:Record<string,string>={
 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
 'application/pdf':'pdf','video/mp4':'mp4','video/webm':'webm',
 'audio/webm':'webm','audio/ogg':'ogg','audio/mpeg':'mp3',
 'audio/mp4':'m4a','audio/x-m4a':'m4a','audio/aac':'aac'
};
function attachmentPath(scope:Scope,id:string|number,messageId:number,index=0,kind:'chat'|'feed'='chat'):string{
 if(!Number.isSafeInteger(index)||index<0||index>3)throw Error(t('Índice de anexo inválido.'));
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error(t('Anexo inválido.'));
 if(scope==='direct'){
  const peer=String(id);
  if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error(t('Conversa inválida.'));
  return '/api/chat/me/'+encodeURIComponent(peer)+'/attachments/'+messageId+(index?'/'+index:'');
 }
 const numeric=Number(id);
 if(!Number.isSafeInteger(numeric)||numeric<=0||String(numeric)!==String(id))
  throw Error(t('Conversa inválida.'));
 if(scope==='team')return '/api/teams/'+numeric+'/'+kind+'/attachments/'+messageId+'/'+index;
 if(scope==='private')return '/api/private-groups/'+numeric+'/messages/'+messageId+'/attachments/'+index;
 return '/api/'+(scope==='community'?'communities':'sessions')+'/'+numeric+
  '/messages/attachments/'+messageId+(index?'/'+index:'');
}

/** Authenticated downloads use temporary app cache; native PDF viewer may run outside the app. */
export default function SecureChatAttachment({scope,conversationId,messageId,token,name,mime,size,index=0,autoPreview=false,kind='chat',onAuthorizationError}:Props){
 const [uri,setUri]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [expanded,setExpanded]=useState(false);
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
  pending.current=false;setBusy(false);setError('');setUri(null);setExpanded(false);
  return ()=>{
   if(generation.current===version)generation.current++;
   active.current=false;setUri(null);setExpanded(false);
   // Do not remove a PDF handed to Android while its external viewer is opening.
   if(!pdfPreview.current)cleanup();
  };
 },[cleanup,scope,conversationId,messageId,index,kind,token]));
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
 async function open(auto=false){
  if(uri&&!isVoice(mime)){if(!auto)setExpanded(true);return;}
  if(isVoice(mime)&&uri){
   try{
    if(playback.playing)player.pause();
    else{
     if(playback.didJustFinish||playback.duration>0&&playback.currentTime>=playback.duration)
      await player.seekTo(0);
     player.play();
    }
   }catch{setError(t('Não foi possível reproduzir esta mensagem de voz.'));}
   return;
  }
  if(pending.current||pdfPreview.current||!token||DEMO_MODE||!formats[mime||''])return;
  const maxBytes=maxAttachmentSize(mime);
  if(!Number.isFinite(size)||!size||size<=0||size>maxBytes){
   setError(t('Tamanho do anexo inválido.'));return;
  }
  const version=generation.current;
  pending.current=true;setBusy(true);setError('');
  const controller=new AbortController();abort.current=controller;
  const timeout=setTimeout(()=>controller.abort(),20000);
  let file:File|null=null;
  try{
   const path=attachmentPath(scope,conversationId,messageId,index,kind);
   const response=await expoFetch(API_BASE+path,{
    headers:{Authorization:'Bearer '+token,Accept:mime!},credentials:'omit',redirect:'error',
    signal:controller.signal
   });
   if(!response.ok){
    // A private team attachment is an authorization boundary too. Report a
    // revoked membership to its parent instead of leaving the chat visible.
    if([401,403,409].includes(response.status)&&active.current
      &&generation.current===version&&!controller.signal.aborted)
     onAuthorizationError?.(response.status);
    throw Error(t('Não foi possível abrir o anexo. Verifica as permissões.'));
   }
   const type=(response.headers.get('content-type')||'').split(';')[0]?.trim().toLowerCase()||'';
   if(type!==mime)throw Error(t('O formato recebido não corresponde ao anexo.'));
   const declared=Number(response.headers.get('content-length'));
   if(declared>maxBytes)throw Error(t('O anexo ultrapassa o limite permitido.'));
   const bytes=await response.bytes();
   if(!bytes.length||bytes.length>maxBytes)throw Error(t('O tamanho do anexo é inválido.'));
   if(!active.current||generation.current!==version||controller.signal.aborted)return;
   file=new File(Paths.cache,'jynlo-private-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+formats[mime!]);
   await file.write(bytes);
   // A file write may finish after the user switched team, feed or account.
   // Do not install the previous conversation's bytes in the new preview.
   if(!active.current||generation.current!==version||controller.signal.aborted)return;
   cached.current=file;file=null;
   if(mime==='application/pdf'){
    if(!await File.canPreview(cached.current,{mimeType:'application/pdf'})){
     throw Error(t('Não existe um visualizador de PDF disponível neste dispositivo.'));
    }
    if(!active.current||generation.current!==version||controller.signal.aborted)return;
    wasBackgrounded.current=false;
    pdfPreview.current=true;
    // Expo hands the file to the native viewer. Its promise does not wait for closing.
    await File.preview(cached.current,{mimeType:'application/pdf',title:t('Documento privado')});
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
    if(!auto&&!isVoice(mime))setExpanded(true);
   }
  }catch(e){
   if(generation.current===version){
    pdfPreview.current=false;cleanup();
    if(active.current)setError(e instanceof Error?e.message:t('Não foi possível abrir o anexo.'));
   }
  }finally{
   if(file?.exists)try{file.delete();}catch{}
   clearTimeout(timeout);
   if(abort.current===controller)abort.current=null;
   if(generation.current===version){pending.current=false;if(active.current)setBusy(false);}
  }
 }
 React.useEffect(()=>{
  if(!autoPreview||!token||!mime?.startsWith('image/')||!size||size>5*1024*1024)return;
  const timeout=setTimeout(()=>{if(active.current&&!pending.current)void open(true);},180);
  return ()=>clearTimeout(timeout);
 },[autoPreview,scope,conversationId,messageId,index,kind,token,mime,size]);
 function close(){
  setExpanded(false);setUri(null);pdfPreview.current=false;wasBackgrounded.current=false;cleanup();
 }
 if(!formats[mime||''])return <Text style={styles.note}>{t('Anexo privado: {a} (formato ainda sem visualizador)',{a:name})}</Text>;
 return <View style={styles.container}>
  {!(mime?.startsWith('image/')&&uri)?<Pressable accessibilityRole="button" disabled={busy||!token} onPress={()=>{void open();}} style={styles.button}>
   <Text style={styles.action}>{busy?t('A abrir anexo…'):isVoice(mime)?
     (uri?(playback.playing?t('❚❚ Pausar voz'):t('▶ Reproduzir voz')):t('▶ Ouvir mensagem de voz')):
     mime==='application/pdf'?t('Abrir PDF · {v}',{v:name}):isVideo(mime)?t('Ver vídeo · {v}',{v:name}):'Ver fotografia · '+name}</Text>
  </Pressable>:null}
  {mime?.startsWith('image/')&&uri?<Pressable accessibilityRole="button" accessibilityLabel={t('Ampliar fotografia recebida')} onPress={()=>setExpanded(true)}><Image source={{uri}} resizeMode="cover" style={styles.inlineImage}/></Pressable>:null}
  {isVideo(mime)&&uri&&expanded?<View style={{gap:8}}>
   <Suspense fallback={<Text style={styles.note}>{t('A preparar reprodução…')}</Text>}><ChatVideo uri={uri}/></Suspense>
   <Pressable accessibilityRole="button" onPress={()=>setExpanded(false)} style={styles.button}><Text style={styles.action}>{t('Fechar vídeo')}</Text></Pressable>
  </View>:null}
  {isVoice(mime)&&uri?<Text style={styles.note}>{Math.floor(playback.currentTime)}s / {Math.floor(playback.duration||0)}s</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {mime==='application/pdf'&&uri?<Pressable accessibilityRole="button" onPress={close} style={styles.button}><Text style={styles.action}>{t('Limpar PDF temporário')}</Text></Pressable>:null}
  <Modal visible={expanded&&!!uri&&!isVoice(mime)&&!isVideo(mime)&&mime!=='application/pdf'} transparent animationType="fade" onRequestClose={close}>
   <View style={styles.overlay}>
    {uri?<Image source={{uri}} resizeMode="contain" style={styles.image}/>:null}
    <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
     <Text style={styles.action}>{t('Fechar fotografia')}</Text>
    </Pressable>
   </View>
  </Modal>
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:5},inlineImage:{width:240,height:200,maxWidth:'100%',borderRadius:12,backgroundColor:C.surface},note:{color:C.muted,fontSize:12},
 button:{padding:11,borderWidth:1,borderColor:C.border,borderRadius:12},
 action:{color:C.mint,fontWeight:'700'},error:{color:'#FF9898',fontSize:12},
 overlay:{flex:1,backgroundColor:'#080B0DEE',justifyContent:'center',padding:14,gap:16},
 image:{height:'78%',width:'100%'},close:{alignSelf:'center',padding:15}
});
