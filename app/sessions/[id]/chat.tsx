import React,{useCallback,useRef,useState} from 'react';
import {KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {ApiError} from '../../../src/lib/api';
import {sessionChatHistory,postSessionChat,markSessionChatRead} from '../../../src/lib/session-chat-api';
import type {SessionChatEntry} from '../../../src/lib/session-chat-api';
import {C} from '../../../src/lib/theme';
export default function SessionChat(){
 const params=useLocalSearchParams<{id:string}>(),id=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [entries,setEntries]=useState<SessionChatEntry[]>([]);
 const [draft,setDraft]=useState(''),[reply,setReply]=useState<SessionChatEntry|null>(null);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [closed,setClosed]=useState(false),[error,setError]=useState('');
 const refreshing=useRef(false),sendingNow=useRef(false);
 const refresh=useCallback(async(silent=false)=>{
  if(refreshing.current)return;
  refreshing.current=true;
  if(!auth.token||!Number.isSafeInteger(id)||id<=0){setEntries([]);setLoading(false);refreshing.current=false;return;}
  if(!silent)setLoading(true);
  setError('');
  try{
   const history=await sessionChatHistory(id,auth.token);
   setEntries(history);setClosed(false);
   const latest=history.reduce((n,m)=>Math.max(n,m.id),0);
   if(latest>0)void markSessionChatRead(id,latest,auth.token).catch(()=>{});
  }catch(e){
   // A transient background refresh must not erase messages or disable composing.
   if(!silent||(e instanceof ApiError&&[401,403,404,409,410].includes(e.status))){setClosed(true);setEntries([]);
    setError(e instanceof Error?e.message:'Chat indisponível.');}
  }finally{if(!silent)setLoading(false);refreshing.current=false;}
 },[auth.token,id]);
 useFocusEffect(useCallback(()=>{
  void refresh();
  // Read-only polling while focused; a send is never retried automatically.
  const timer=setInterval(()=>{if(!sendingNow.current)void refresh(true);},15000);
  return ()=>clearInterval(timer);
 },[refresh]));
 async function send(){
  if(sending||closed||!auth.token||!draft.trim())return;
  sendingNow.current=true;setSending(true);setError('');
  try{await postSessionChat(id,draft,auth.token,reply?.id);
   setDraft('');setReply(null);await refresh();
  }catch(e){setError((e instanceof Error?e.message:'Falha no envio.')+
   ' Consulta o histórico antes de voltares a tentar.');}
  finally{sendingNow.current=false;setSending(false);}
 }
 return <Page><Brand subtitle="SESSÃO"/><DemoBanner/><Eyebrow>CHAT DA SESSÃO</Eyebrow>
  <Text style={styles.title}>Conversa do jogo</Text>
  <Text style={styles.note}>Apenas o organizador e participantes confirmados. O chat encerra quando o jogo começa.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&!closed&&!entries.length?<Message>Sem mensagens. Inicia a conversa!</Message>:null}
  {entries.map(m=><Pressable key={m.id} disabled={!!m.deletedAt||closed} onPress={()=>setReply(m)}
    accessibilityRole="button" accessibilityLabel={'Responder a '+m.senderUsername}
    style={[styles.message,m.senderUsername.toLowerCase()===auth.username?.toLowerCase()&&styles.mine]}>
    <Text style={styles.sender}>{m.senderUsername}{m.senderGuest?' · Convidado':''}</Text>
    {m.replyToText?<Text style={styles.quote}>{m.replyToSender}: {m.replyToText}</Text>:null}
    <Text style={styles.body}>{m.deletedAt?'Mensagem removida':m.body||m.attachmentName||'Anexo'}</Text>
    {m.attachmentName&&!m.deletedAt?<Text style={styles.note}>Anexo: {m.attachmentName} (pré-visualização indisponível na app)</Text>:null}
    <Text style={styles.time}>{m.createdAt&&Number.isFinite(Date.parse(m.createdAt))?
     new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}):''}</Text>
  </Pressable>)}
  {auth.token&&!closed?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.editor}>
    {reply?<View style={styles.editor}><Text style={styles.note}>A responder a {reply.senderUsername}</Text>
     <Button title="Cancelar resposta" secondary onPress={()=>setReply(null)}/></View>:null}
    <View style={styles.composer}>
     <TextInput multiline value={draft} onChangeText={setDraft} maxLength={2000}
      accessibilityLabel="Mensagem da sessão" placeholder="Escreve uma mensagem"
      placeholderTextColor={C.muted} style={styles.input}/>
     <Button title={sending?'A enviar…':'Enviar'} disabled={sending||!draft.trim()} onPress={()=>{void send();}}/>
    </View>
  </KeyboardAvoidingView>:null}
  <Button title="Atualizar conversa" secondary disabled={loading||sending} onPress={()=>{void refresh();}}/>
  <Button title="Voltar à sessão" secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:26,fontWeight:'900',color:C.white},note:{fontSize:12,color:C.muted},
 message:{padding:14,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,gap:5},
 mine:{backgroundColor:'#19473E'},sender:{fontSize:12,fontWeight:'800',color:C.mint},
 quote:{color:C.muted,fontSize:12},body:{color:C.white,fontSize:15},time:{color:C.muted,fontSize:10,textAlign:'right'},
 editor:{gap:9},composer:{flexDirection:'row',gap:8,alignItems:'center'},
 input:{flex:1,minHeight:55,maxHeight:130,backgroundColor:C.surface,color:C.white,
  borderWidth:1,borderColor:C.border,borderRadius:14,padding:12}
});
