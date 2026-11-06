import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import {useFocusEffect} from 'expo-router';
import {Button} from './UI';
import {C} from '../lib/theme';
import {checkPdfAsset,sendChatPdf} from '../lib/chat-pdf-attachment';
import type {PdfChatTarget} from '../lib/chat-pdf-attachment';

type Props={target:PdfChatTarget;token:string|null;enabled:boolean;
 replyId?:number|null;onSent:()=>Promise<void>};
export default function ChatPdfComposer({target,token,enabled,replyId,onSent}:Props){
 const [selected,setSelected]=useState<DocumentPicker.DocumentPickerAsset|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const busyRef=useRef(false),active=useRef(false),blocked=useRef(false);
 const generation=useRef(0);
 const selectedRef=useRef<DocumentPicker.DocumentPickerAsset|null>(null);
 const uploadingRef=useRef<DocumentPicker.DocumentPickerAsset|null>(null);
 const cleanup=useCallback((asset:DocumentPicker.DocumentPickerAsset|null)=>{
  if(!asset||uploadingRef.current===asset)return;
  try{
   const file=new File(asset.uri);
   if(file.exists)file.delete();
  }catch{}
 },[]);
 const reset=useCallback(()=>{
  const current=selectedRef.current;selectedRef.current=null;
  setSelected(null);cleanup(current);
 },[cleanup]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  active.current=true;blocked.current=false;
  // Busy/error flags belong to the previous chat; the old upload may still finish.
  setBusy(busyRef.current);setError('');
  return ()=>{
   if(generation.current===version)generation.current++;
   active.current=false;reset();
  };
 },[reset,target.scope,target.id,token]));
 async function choose(){
  if(!enabled||!token||busyRef.current)return;
  const version=generation.current;
  setError('');
  try{
   const picked=await DocumentPicker.getDocumentAsync({
    type:'application/pdf',copyToCacheDirectory:true,multiple:false
   });
   if(picked.canceled||!picked.assets?.[0])return;
   const asset=picked.assets[0];
   if(!active.current||generation.current!==version){cleanup(asset);return;}
   try{checkPdfAsset(asset);}
   catch(e){cleanup(asset);throw e;}
   reset();blocked.current=false;
   selectedRef.current=asset;
   if(active.current)setSelected(asset);
  }catch(e){
   if(active.current&&generation.current===version)
    setError(e instanceof Error?e.message:'Não foi possível selecionar o PDF.');
  }
 }
 async function send(){
  const asset=selectedRef.current;
  if(!asset||!enabled||!token||busyRef.current||blocked.current)return;
  const version=generation.current;
  busyRef.current=true;uploadingRef.current=asset;setBusy(true);setError('');
  try{
   await sendChatPdf(target,token,asset,replyId);
   if(!active.current||generation.current!==version)return;
   if(selectedRef.current===asset)reset();
   try{await onSent();}
   catch{
    if(active.current&&generation.current===version)
     setError('PDF enviado. Atualiza a conversa para veres o anexo.');
   }
  }catch(e){
   // The POST may have completed even if its result was lost. Never retry this file automatically.
   if(!active.current||generation.current!==version)return;
   blocked.current=true;
   setError((e instanceof Error?e.message:'Envio incerto.')+
     ' Verifica o histórico antes de escolher novamente o documento.');
  }finally{
   // An upload still needs its temporary bytes if navigation changes mid-request.
   uploadingRef.current=null;
   cleanup(asset);
   busyRef.current=false;
   if(active.current)setBusy(false);
  }
 }
 if(!enabled||!token)return null;
 return <View style={styles.panel}>
  <Button title="Selecionar PDF" secondary disabled={busy||busyRef.current} onPress={()=>{void choose();}}/>
  {selected?<View style={styles.details}>
   <Text style={styles.name}>{selected.name}</Text>
   <Text style={styles.note}>{Math.ceil((selected.size||0)/1024)} KB · O ficheiro só é enviado após confirmação.</Text>
   <Button title={busy?'A enviar…':'Confirmar envio do PDF'}
    disabled={busy||blocked.current} onPress={()=>{void send();}}/>
   <Button title="Cancelar PDF" secondary disabled={busy} onPress={()=>{reset();blocked.current=false;setError('');}}/>
  </View>:null}
  {!!error?<Text style={styles.error}>{error}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 panel:{gap:8,padding:12,borderRadius:14,backgroundColor:C.surface},
 details:{gap:8},name:{fontSize:14,fontWeight:'700',color:C.white},
 note:{fontSize:12,color:C.muted},error:{fontSize:12,color:'#FF9898'}
});
