import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {C} from '../lib/theme';
import {directChatHistory,sendDirectChat,type DirectChatEntry} from '../lib/chat-api';
import {ApiError} from '../lib/api';
import {confirmedDirectChatSend} from '../lib/chat-send-receipt.cjs';
import {uncertainChatSend} from '../lib/chat-send-uncertainty.cjs';
import {observeDirectChat} from '../lib/direct-chat-realtime';

/** This panel shares the authenticated DM history and never creates a parallel
 * call-only conversation. The video room remains mounted while it is shown.
 */
export default function CallChatSidePanel({peer,self,token,visible,wide}:{
 peer:string;self:string;token:string;visible:boolean;wide:boolean
}){
 const [messages,setMessages]=useState<DirectChatEntry[]>([]);
 const [draft,setDraft]=useState(''),[sending,setSending]=useState(false);
 const [uncertainSend,setUncertainSend]=useState<{identity:string;body:string}|null>(null);
 const uncertainSendRef=useRef<{identity:string;body:string}|null>(null);
 const pendingSend=useRef<{identity:string;request:number}|null>(null),sendEpoch=useRef(0);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const [syncWarning,setSyncWarning]=useState(''),[accessRevoked,setAccessRevoked]=useState(false);
 const identity=peer+'|'+self+'|'+token;
 const generation=useRef(0),owner=useRef(''),busy=useRef(false),queued=useRef(false),sendLock=useRef(false);
 // Preserve an acknowledged POST only until the server GET includes it (or 45s).
 const recentlyConfirmed=useRef(new Map<number,{message:DirectChatEntry;at:number}>());
 const readOwner=useRef('');
 const list=useRef<ScrollView|null>(null);
 const load=useCallback(async(version:number,silent=true)=>{
  if(!visible||!token||!peer||accessRevoked)return;
  if(busy.current){queued.current=true;return;}
  busy.current=true;
  readOwner.current=identity+'|'+version;
  if(!silent)setLoading(true);
  try{
   const rows=await directChatHistory(peer,token);
   if(generation.current!==version||owner.current!==identity)return;
   if(!Array.isArray(rows))throw Error('Histórico da conversa inválido.');
   setMessages(()=>{
    // The API is authoritative for deletes, edits and moderation.
    // Only a newly acknowledged POST may survive a lagging GET.
    const byId=new Map<number,DirectChatEntry>();
    const serverIds=new Set<number>();
    for(const row of rows)if(Number.isSafeInteger(row.id)&&row.id>0){
     byId.set(row.id,row);serverIds.add(row.id);
    }
    const now=Date.now();
    for(const [id,entry] of recentlyConfirmed.current){
     if(serverIds.has(id)||now-entry.at>45_000){recentlyConfirmed.current.delete(id);continue;}
     byId.set(id,entry.message);
    }
    return [...byId.values()].sort((a,b)=>a.id-b.id).slice(-60);
   });
   setSyncWarning('');setAccessRevoked(false);
  }catch(e){
   if(generation.current===version&&owner.current===identity){
    if(e instanceof ApiError&&[401,403,404,410].includes(e.status)){
     setMessages([]);setDraft('');recentlyConfirmed.current.clear();setAccessRevoked(true);
     setError('Já não tens acesso ao chat deste contacto.');
    }else setSyncWarning('Sem ligação ao histórico. As mensagens apresentadas podem estar desatualizadas.');
   }
  }finally{
   if(readOwner.current!==identity+'|'+version)return;
   busy.current=false;readOwner.current='';
   if(generation.current===version&&owner.current===identity){
    setLoading(false);
    if(queued.current){queued.current=false;void load(version,true);}
   }
  }
 },[peer,token,identity,visible,accessRevoked]);
 useEffect(()=>{
  if(owner.current!==identity){
   owner.current=identity;generation.current++;
   setMessages([]);setDraft('');setError('');setSyncWarning('');setAccessRevoked(false);
   recentlyConfirmed.current.clear();readOwner.current='';busy.current=false;
   sendLock.current=false;setSending(false);queued.current=false;
   uncertainSendRef.current=null;setUncertainSend(null);
  }
  if(!visible){
   // Closing the panel does not cancel an in-flight server POST. Keep the
   // same conversation locked until its result is known, even after reopening.
   sendLock.current=pendingSend.current?.identity===identity;
   setSending(sendLock.current);
   return;
  }
  const version=++generation.current;
  sendLock.current=pendingSend.current?.identity===identity;
  setSending(sendLock.current);
  let active=true;
  void load(version,false);
  const stop=observeDirectChat({peer,self,token,onInvalidated:()=>{
   if(active&&generation.current===version&&AppState.currentState==='active')void load(version,true);
  }});
  // Socket notifications are hints, and this read-only fallback works offline.
  const timer=setInterval(()=>{
   if(active&&generation.current===version&&AppState.currentState==='active'&&!sendLock.current)
    void load(version,true);
  },12000);
  const resume=AppState.addEventListener('change',state=>{
   if(active&&state==='active'&&generation.current===version)void load(version,true);
  });
  return()=>{active=false;generation.current++;stop();clearInterval(timer);resume.remove();queued.current=false;readOwner.current='';busy.current=false;};
 },[identity,visible,peer,self,token,load]);
 async function send(){
  if(!visible||accessRevoked||sendLock.current||pendingSend.current?.identity===identity||!token||!draft.trim())return;
  const body=draft.trim(),actor=owner.current;
  if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===body)return;
  const request=++sendEpoch.current;
  pendingSend.current={identity,request};
  sendLock.current=true;setSending(true);setError('');
  try{
   const confirmed=await sendDirectChat(peer,body,token);
   if(!confirmedDirectChatSend(confirmed,self,peer,body))
    throw Error('O servidor não confirmou a mensagem. Consulta o histórico antes de repetir.');
   if(owner.current!==actor)return;
   if(uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===body){
    uncertainSendRef.current=null;setUncertainSend(null);
   }
   recentlyConfirmed.current.set(confirmed.id,{message:confirmed,at:Date.now()});
   setMessages(current=>current.some(m=>m.id===confirmed.id)?current:
    [...current,confirmed].sort((a,b)=>a.id-b.id).slice(-60));
   setDraft(current=>current.trim()===body?'':current);
   void load(generation.current,true);
  }catch(e){
   if(owner.current===actor){
    if(uncertainChatSend(e)){
     const uncertain={identity,body};uncertainSendRef.current=uncertain;setUncertainSend(uncertain);
    }
    setError((e instanceof Error?e.message:'Não foi possível enviar a mensagem.')+' Verifica o histórico antes de repetir.');
   }
  }finally{
   if(pendingSend.current?.request===request)pendingSend.current=null;
   if(owner.current===actor){sendLock.current=false;setSending(false);}
  }
 }
 if(!visible)return null;
 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}
  style={[styles.container,wide?styles.wide:styles.narrow]} accessibilityLabel="Chat da chamada">
  <View style={styles.header}>
   <View style={styles.avatar}><Text style={styles.avatarLetter}>{peer.slice(0,1).toUpperCase()}</Text></View>
   <View style={{flex:1}}><Text style={styles.title}>Chat da chamada</Text>
    <Text style={styles.subtitle}>Conversa privada com @{peer} · histórico Jynlo</Text></View>
   <View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveLabel}>Na chamada</Text></View>
  </View>
  {loading?<ActivityIndicator color={C.mint}/>:null}
  {syncWarning?<Text style={styles.warning}>{syncWarning}</Text>:null}
  <ScrollView ref={list} style={styles.history} contentContainerStyle={styles.historyContent}
   keyboardShouldPersistTaps="handled" nestedScrollEnabled
   onContentSizeChange={()=>list.current?.scrollToEnd({animated:false})}>
   {!loading&&messages.length===0?<Text style={styles.empty}>Ainda não há mensagens nesta conversa.</Text>:null}
   {messages.map(message=>{
    const mine=message.username1.toLowerCase()===self.toLowerCase();
    return <View key={message.id} style={[styles.bubble,mine?styles.mine:styles.theirs]}>
     <Text style={styles.sender}>{mine?'Tu':'@'+peer}</Text>
     {message.replyToText?<Text style={styles.reply}>↳ {message.replyToText}</Text>:null}
     <Text style={styles.body}>{message.deletedAt?'Mensagem removida':
      message.text||message.attachmentName||(message.attachments?.length?'Anexo partilhado':'Mensagem')}</Text>
     <Text style={styles.time}>{message.date&&Number.isFinite(Date.parse(message.date))?
      new Date(message.date).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):''}</Text>
    </View>;
   })}
  </ScrollView>
  {error?<Text accessibilityRole="alert" style={styles.warning}>{error}</Text>:null}
  {uncertainSend?.identity===identity&&uncertainSend.body===draft.trim()?<View style={styles.retryNotice}>
   <Text accessibilityRole="alert" style={styles.warning}>Este envio não foi confirmado. Consulta o histórico antes de repetir a mensagem.</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Já confirmei no histórico, permitir novo envio na chamada"
    onPress={()=>{uncertainSendRef.current=null;setUncertainSend(null);setError('');}}>
    <Text style={styles.retryText}>Já confirmei no histórico · Permitir novo envio</Text>
   </Pressable>
  </View>:null}
  <View style={styles.composer}>
   <TextInput value={draft} onChangeText={setDraft} editable={!sending&&!accessRevoked}
    placeholder="Mensagem para o chat…" placeholderTextColor={C.muted}
    multiline maxLength={2000} style={styles.input} accessibilityLabel="Escrever mensagem na chamada"/>
   <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem durante a chamada"
    disabled={sending||accessRevoked||!draft.trim()||(uncertainSend?.identity===identity&&uncertainSend.body===draft.trim())} onPress={()=>{void send();}}
    style={[styles.send,(sending||accessRevoked||!draft.trim()||(uncertainSend?.identity===identity&&uncertainSend.body===draft.trim()))&&styles.disabled]}>
    <Text style={styles.sendText}>{sending?'…':'Enviar'}</Text>
   </Pressable>
  </View>
 </KeyboardAvoidingView>;
}
const styles=StyleSheet.create({
 container:{gap:10,borderRadius:16,borderColor:C.border,borderWidth:1,backgroundColor:C.surface,padding:12,minWidth:0},
 wide:{width:312,minHeight:340,maxHeight:600},
 narrow:{minHeight:320,maxHeight:480},
 header:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},
 liveBadge:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:8,paddingVertical:6,borderRadius:12,backgroundColor:'#123D3B'},
 liveDot:{width:7,height:7,borderRadius:4,backgroundColor:C.mint},
 liveLabel:{color:C.mint,fontSize:10,fontWeight:'800'},
 avatar:{height:38,width:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:C.surface2,borderWidth:1,borderColor:C.mint},
 avatarLetter:{color:C.mint,fontWeight:'900',fontSize:17},
 title:{color:C.white,fontSize:15,fontWeight:'900'},
 subtitle:{color:C.muted,fontSize:11,lineHeight:16},
 history:{flexGrow:1,minHeight:160},
 historyContent:{gap:8,paddingVertical:5},
 empty:{color:C.muted,fontSize:12,textAlign:'center',padding:12},
 bubble:{maxWidth:'89%',paddingHorizontal:11,paddingVertical:8,borderRadius:13,gap:3},
 mine:{backgroundColor:'#0E5458',alignSelf:'flex-end'},theirs:{backgroundColor:C.surface2,alignSelf:'flex-start'},
 sender:{color:C.mint,fontSize:10,fontWeight:'800'},
 body:{color:C.white,fontSize:13,lineHeight:19},
 reply:{color:C.muted,fontSize:11,borderLeftWidth:2,borderLeftColor:C.mint,paddingLeft:6},
 time:{color:C.muted,fontSize:10,textAlign:'right'},
 warning:{color:'#FFC3C3',fontSize:11,lineHeight:17},
 retryNotice:{gap:6,padding:9,borderRadius:10,backgroundColor:C.surface2,borderWidth:1,borderColor:C.border},
 retryText:{color:C.mint,fontSize:12,fontWeight:'800'},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:8},
 input:{flex:1,minHeight:44,maxHeight:110,borderRadius:11,borderWidth:1,borderColor:C.border,
  color:C.white,backgroundColor:C.surface2,paddingHorizontal:11,paddingVertical:9,fontSize:13},
 send:{minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:11,borderRadius:11,backgroundColor:C.mint},
 sendText:{color:'#082B31',fontWeight:'900',fontSize:12},
 disabled:{opacity:.45}
});
