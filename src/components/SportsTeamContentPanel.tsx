import React,{useCallback,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {C} from '../lib/theme';
import {teamContentHistory,sendTeamContent,type TeamContentEntry,type TeamContentKind} from '../lib/sports-team-content-api';

type Props={teamId:number;kind:TeamContentKind;token:string;username:string};
export default function SportsTeamContentPanel({teamId,kind,token,username}:Props){
 const [entries,setEntries]=useState<TeamContentEntry[]>([]);
 const [draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [syncWarning,setSyncWarning]=useState('');
 const version=useRef(0),reading=useRef(false),sendingNow=useRef(false);
 const refresh=useCallback(async(quiet=false,expected=version.current)=>{
  if(reading.current||sendingNow.current)return;
  reading.current=true;
  if(!quiet){setLoading(true);setError('');}
  try{
   const history=await teamContentHistory(teamId,kind,token);
   if(expected!==version.current)return;
   setEntries(history);setSyncWarning('');
  }catch(e){
   if(expected!==version.current)return;
   const message=e instanceof Error?e.message:'Não foi possível carregar as mensagens.';
   if(quiet)setSyncWarning('A sincronização falhou. As mensagens podem estar desatualizadas.');
   else setError(message);
  }finally{
   reading.current=false;
   if(!quiet&&expected===version.current)setLoading(false);
  }
 },[teamId,kind,token]);
 useFocusEffect(useCallback(()=>{
  const current=++version.current;
  setEntries([]);setDraft('');setError('');setSyncWarning('');
  void refresh(false,current);
  const timer=setInterval(()=>{
   if(AppState.currentState==='active')void refresh(true,current);
  },10000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active')void refresh(true,current);
  });
  return()=>{clearInterval(timer);resume.remove();version.current++;};
 },[refresh]));
 const send=async()=>{
  const message=draft.trim();
  if(!message||sendingNow.current||!token)return;
  sendingNow.current=true;setSending(true);setError('');
  const current=version.current;
  try{
   const saved=await sendTeamContent(teamId,kind,message,token);
   if(current!==version.current)return;
   setEntries(previous=>previous.some(item=>item.id===saved.id)?previous:[...previous,saved].sort((a,b)=>a.id-b.id));
   setDraft(previous=>previous===draft?'':previous);
  }catch(e){
   if(current===version.current)
    setError((e instanceof Error?e.message:'Envio não confirmado.')+
      ' Consulta o histórico antes de repetires a operação.');
  }finally{
   sendingNow.current=false;
   if(current===version.current){setSending(false);void refresh(true,current);}
  }
 };
 return <View style={styles.panel}>
  <Text style={styles.title}>{kind==='chat'?'Conversa da equipa':'Publicações da equipa'}</Text>
  <Text style={styles.sub}>Apenas o responsável e membros confirmados podem participar.</Text>
  {loading?<Text style={styles.sub}>A carregar…</Text>:null}
  {error?<Text style={styles.error} accessibilityRole="alert">{error}</Text>:null}
  {syncWarning?<Text style={styles.sub}>{syncWarning}</Text>:null}
  {!loading&&!entries.length?<Text style={styles.empty}>
   {kind==='chat'?'Ainda não existem mensagens. Começa a conversa!':'Ainda não há publicações nesta equipa.'}
  </Text>:null}
  {entries.map(item=><View key={item.id} style={[styles.entry,item.username===username&&styles.ownEntry]}>
   <Text style={styles.author}>@{item.username} · {new Date(item.createdAt).toLocaleString('pt-PT')}</Text>
   <Text style={styles.body}>{item.body}</Text>
  </View>)}
  <TextInput multiline style={styles.input} value={draft} onChangeText={setDraft}
   maxLength={2000} placeholder={kind==='chat'?'Escreve uma mensagem…':'Partilha uma novidade com o plantel…'}
   placeholderTextColor={C.muted} editable={!sending} accessibilityLabel="Texto da mensagem"/>
  <Pressable accessibilityRole="button" accessibilityState={{disabled:sending||!draft.trim()}}
   disabled={sending||!draft.trim()} onPress={()=>void send()} style={styles.button}>
   <Text style={styles.buttonText}>{sending?'A enviar…':kind==='chat'?'Enviar mensagem':'Publicar'}</Text>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 panel:{borderColor:C.border,borderWidth:1,borderRadius:16,padding:15,gap:10,backgroundColor:C.surface},
 title:{fontSize:18,color:C.white,fontWeight:'800'},sub:{fontSize:12,color:C.muted,lineHeight:18},
 empty:{padding:18,textAlign:'center',color:C.muted},error:{color:C.danger,fontSize:12},
 entry:{borderWidth:1,borderColor:C.border,borderRadius:11,padding:11,gap:5},
 ownEntry:{backgroundColor:'#103B43'},author:{fontSize:11,fontWeight:'800',color:C.mint},
 body:{fontSize:14,lineHeight:20,color:C.white},
 input:{minHeight:78,borderWidth:1,borderColor:C.border,borderRadius:11,padding:10,color:C.white,textAlignVertical:'top'},
 button:{backgroundColor:C.mint,borderRadius:11,padding:12,alignItems:'center'},
 buttonText:{color:'#062A30',fontWeight:'800'}
});