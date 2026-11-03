import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {communityMessages,sendCommunityMessage} from '../../../src/lib/chat-api';
import {communityDetails} from '../../../src/lib/community-api';
import {observeCommunityChat} from '../../../src/lib/community-realtime';
import {markCommunityRead} from '../../../src/lib/chat-api';
import {mergeMessages} from '../../../src/lib/realtime-core.cjs';
import {C} from '../../../src/lib/theme';
import type {CommunityChatEntry} from '../../../src/lib/types';
export default function CommunityChatScreen(){
 const {id:raw}=useLocalSearchParams<{id:string}>(),id=Number(raw);const auth=useAuth(),router=useRouter();
 const [messages,setMessages]=useState<CommunityChatEntry[]>([]);
 const [name,setName]=useState('Comunidade'),[draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState('');
 const [connection,setConnection]=useState<'connecting'|'online'|'offline'>('offline');
 useEffect(()=>{setMessages([]);setName('Comunidade');},[id,auth.username]);
 const refresh=useCallback(async()=>{
  if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0){setMessages([]);setLoading(false);return;}
  setLoading(true);setError('');
  try{const [chat,community]=await Promise.all([communityMessages(id,auth.token,auth.username),communityDetails(id,auth.token,auth.username)]);
    setMessages(old=>mergeMessages(old,chat));setName(community.name);
    const last=chat.at(-1)?.id;if(last)void markCommunityRead(id,last,auth.token,auth.username).catch(()=>{});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir o chat.');setMessages([]);}
  finally{setLoading(false);}
 },[id,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
   void refresh();
   if(!auth.token||!auth.username||!Number.isSafeInteger(id)||id<=0)return;
   return observeCommunityChat({id,token:auth.token,username:auth.username,onStatus:setConnection,
    onMessage:(msg)=>{setMessages(old=>mergeMessages(old,[msg]));
      if(msg.username!==auth.username)void markCommunityRead(id,msg.id,auth.token!,auth.username!).catch(()=>{});}
   });
 },[refresh,id,auth.token,auth.username]));
 async function send(){
  if(sending||!auth.token||!auth.username||!draft.trim())return;
  const message=draft.trim();setSending(true);setError('');
  try{await sendCommunityMessage(id,message,auth.token,auth.username);setDraft('');await refresh();}
  catch(e){setError((e instanceof Error?e.message:'Não foi possível enviar.')+' Verifica o histórico antes de repetir.');}
  finally{setSending(false);}
 }
 return <Page>
   <DemoBanner/><Eyebrow>CHAT DA COMUNIDADE</Eyebrow><Text style={styles.title}>{name}</Text>
   <Text style={styles.note}>Apenas os membros podem ler e enviar mensagens. · {connection==='online'?'● Ligado':connection==='connecting'?'○ A ligar':'○ Offline'}</Text>
   {!auth.token?<Button title="Entrar para conversar" onPress={()=>router.push('/login')}/>:null}
   {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}
   {!loading&&messages.length===0?<Message>Começa a conversa. A primeira mensagem pode ser tua!</Message>:null}
   {messages.map(m=><View key={m.id} style={[styles.message,m.username===auth.username&&styles.mine]}>
     <Text style={styles.sender}>{m.username}</Text><Text style={styles.body}>{m.deletedAt?'Mensagem removida':m.body}</Text>
     <Text style={styles.time}>{new Date(m.createdAt).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</Text>
   </View>)}
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
 composer:{flexDirection:'row',alignItems:'flex-end',gap:9},input:{flex:1,minHeight:55,maxHeight:145,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,color:C.white,padding:14,borderRadius:15},
 send:{backgroundColor:C.mint,borderRadius:13,padding:14,minHeight:53,justifyContent:'center'},sendText:{color:C.background,fontWeight:'900'}});
