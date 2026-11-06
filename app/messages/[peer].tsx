import React,{useCallback,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {directChatHistory,markDirectRead,sendDirectChat} from '../../src/lib/chat-api';
import type {DirectChatEntry} from '../../src/lib/chat-api';
import {C} from '../../src/lib/theme';

export default function DirectConversation(){
 const params=useLocalSearchParams<{peer:string}>();
 const peer=typeof params.peer==='string'?params.peer:'';
 const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<DirectChatEntry[]>([]);
 const [draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!auth.token||!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer)){
   setLoading(false);setMessages([]);return;
  }
  setLoading(true);setError('');
  try{
   const results=await directChatHistory(peer,auth.token);
   setMessages(results);
   const last=results.reduce((n,m)=>m.id>n?m.id:n,0);
   if(last>0)void markDirectRead(peer,last,auth.token).catch(()=>{});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir a conversa.');}
  finally{setLoading(false);}
 },[peer,auth.token]);
 useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
 async function send(){
  if(sending||!auth.token||!draft.trim())return;
  setSending(true);setError('');
  try{
   await sendDirectChat(peer,draft,auth.token);
   setDraft('');await refresh();
  }catch(e){
   setError((e instanceof Error?e.message:'Não foi possível enviar.')+
    ' Consulta o histórico antes de repetires o envio.');
  }finally{setSending(false);}
 }
 return <Page><DemoBanner/><Eyebrow>CHAT PRIVADO</Eyebrow>
  <Text style={styles.title}>{peer}</Text>
  <Text style={styles.note}>Conversas sincronizadas com a tua conta Jynlo. As permissões de amizade e bloqueio são verificadas pelo servidor.</Text>
  {!auth.token?<Button title="Entrar para conversar" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!loading&&!error&&messages.length===0?<Message>Ainda não existem mensagens nesta conversa.</Message>:null}
  {messages.map(m=><View key={m.id} style={[styles.message,m.username1.toLowerCase()===auth.username?.toLowerCase()&&styles.mine]}>
   <Text style={styles.sender}>{m.username1}</Text>
   {m.replyToText?<Text style={styles.quote}>{m.replyToSender}: {m.replyToText}</Text>:null}
   <Text style={styles.body}>{m.deletedAt?'Mensagem removida':m.text||'Mensagem sem texto'}</Text>
   <Text style={styles.time}>{m.date&&Number.isFinite(Date.parse(m.date))?
     new Date(m.date).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''}{m.editedAt?' · editada':''}</Text>
  </View>)}
  {auth.token?<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.composer}>
   <TextInput multiline style={styles.input} placeholder="Escreve uma mensagem privada…"
    placeholderTextColor={C.muted} value={draft} onChangeText={setDraft}
    maxLength={2000} accessibilityLabel="Mensagem privada para o contacto"/>
   <Pressable accessibilityRole="button" style={[styles.send,sending&&{opacity:0.5}]}
    disabled={sending||!draft.trim()} onPress={()=>{void send();}}>
    {sending?<ActivityIndicator color={C.background}/>:<Text style={styles.sendText}>Enviar</Text>}
   </Pressable>
  </KeyboardAvoidingView>:null}
  <Button secondary title="Atualizar conversa" onPress={()=>{void refresh();}} disabled={sending||loading}/>
  <Button secondary title="Voltar às mensagens" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:26,fontWeight:'900',color:C.white},
 note:{fontSize:12,color:C.muted,lineHeight:19},
 message:{padding:14,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,gap:6},
 mine:{backgroundColor:'#19473E',borderColor:'#347D62'},
 sender:{fontSize:11,color:C.mint,fontWeight:'800'},
 quote:{fontSize:12,color:C.muted,borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:8},
 body:{fontSize:15,color:C.white,lineHeight:21},
 time:{fontSize:10,color:C.muted,textAlign:'right'},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9},
 input:{flex:1,minHeight:55,maxHeight:145,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,color:C.white,padding:14,borderRadius:15},
 send:{backgroundColor:C.mint,borderRadius:13,padding:14,minHeight:53,justifyContent:'center'},
 sendText:{color:C.background,fontWeight:'900'}
});
