import React,{useCallback,useRef,useState} from 'react';
import {Image,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {File,Paths} from 'expo-file-system';
import {fetch as expoFetch} from 'expo/fetch';
import {useFocusEffect} from 'expo-router';
import {API_BASE,DEMO_MODE} from '../lib/api';
import {C} from '../lib/theme';

type Scope='direct'|'community'|'session';
type Props={scope:Scope;conversationId:string|number;messageId:number;token:string|null;
 name:string;mime:string|null|undefined;size:number|null|undefined};
const formats:Record<string,string>={
 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'
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

/** Files are held in private app cache only while the authenticated chat is focused. */
export default function SecureChatAttachment({scope,conversationId,messageId,token,name,mime,size}:Props){
 const [uri,setUri]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cached=useRef<File|null>(null),active=useRef(false),pending=useRef(false);
 const abort=useRef<AbortController|null>(null);
 const cleanup=useCallback(()=>{
  abort.current?.abort();abort.current=null;
  const old=cached.current;cached.current=null;
  try{if(old?.exists)old.delete();}catch{}
 },[]);
 useFocusEffect(useCallback(()=>{
  active.current=true;
  return ()=>{active.current=false;cleanup();};
 },[cleanup,scope,conversationId,token]));
 async function open(){
  if(pending.current||!token||DEMO_MODE||!formats[mime||''])return;
  if(!Number.isFinite(size)||!size||size<=0||size>5*1024*1024){
   setError('Tamanho do anexo inválido.');return;
  }
  pending.current=true;setBusy(true);setError('');
  const controller=new AbortController();abort.current=controller;
  const timeout=setTimeout(()=>controller.abort(),20000);
  let file:File|null=null;
  try{
   const path=attachmentPath(scope,conversationId,messageId);
   const response=await expoFetch(API_BASE+path,{
    headers:{Authorization:'Bearer '+token,Accept:mime!},credentials:'omit',
    signal:controller.signal
   });
   if(!response.ok)throw Error('Não foi possível abrir o anexo. Verifica as permissões.');
   const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
   if(type!==mime)throw Error('O formato recebido não corresponde ao anexo.');
   const declared=Number(response.headers.get('content-length'));
   if(declared>5*1024*1024)throw Error('O anexo ultrapassa 5 MB.');
   const bytes=await response.bytes();
   if(!bytes.length||bytes.length>5*1024*1024)throw Error('O tamanho do anexo é inválido.');
   if(!active.current||controller.signal.aborted)return;
   file=new File(Paths.cache,'jynlo-private-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+formats[mime!]);
   await file.write(bytes);
   if(!active.current||controller.signal.aborted)return;
   cached.current=file;setUri(file.uri);file=null;
  }catch(e){
   if(active.current)setError(e instanceof Error?e.message:'Não foi possível abrir o anexo.');
  }finally{
   if(file?.exists)try{file.delete();}catch{}
   clearTimeout(timeout);
   if(abort.current===controller)abort.current=null;
   pending.current=false;
   if(active.current)setBusy(false);
  }
 }
 function close(){
  setUri(null);cleanup();
 }
 if(!formats[mime||''])return <Text style={styles.note}>Anexo privado: {name} (formato ainda sem visualizador)</Text>;
 return <View style={styles.container}>
  <Pressable accessibilityRole="button" disabled={busy||!token} onPress={()=>{void open();}} style={styles.button}>
   <Text style={styles.action}>{busy?'A abrir fotografia…':'Ver fotografia · '+name}</Text>
  </Pressable>
  {error?<Text style={styles.error}>{error}</Text>:null}
  <Modal visible={!!uri} transparent animationType="fade" onRequestClose={close}>
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
