import React,{useCallback,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {discoverSportsTeams,type SportsTeam} from '../lib/sports-teams-api';
import {
 teamChallenges,issueTeamChallenge,answerTeamChallenge,cancelTeamChallenge,
 linkTeamChallengeSession,type TeamChallenge
} from '../lib/sports-team-challenges-api';
import {C} from '../lib/theme';

type Props={teamId:number;token:string|null;sport:string|null;isOwner:boolean};
const label={PENDING:'A aguardar',ACCEPTED:'Aceite',DECLINED:'Recusado',CANCELLED:'Cancelado'} as const;

/** Separate from the messages feed. Invitations must never auto-join a match. */
export default function SportsTeamChallengesPanel({teamId,token,sport,isOwner}:Props){
 const router=useRouter();
 const [items,setItems]=useState<TeamChallenge[]>([]);
 const [candidates,setCandidates]=useState<SportsTeam[]>([]);
 const [query,setQuery]=useState(''),[message,setMessage]=useState('');
 const [selectedId,setSelectedId]=useState<number|null>(null);
 const [sessionInputs,setSessionInputs]=useState<Record<number,string>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState(''),[feedback,setFeedback]=useState('');
 const generation=useRef(0),searchVersion=useRef(0),writing=useRef(false);
 const reload=useCallback(async()=>{
  const version=++generation.current;
  setLoading(true);setError('');
  if(!token){setItems([]);setLoading(false);return;}
  try{
   const found=await teamChallenges(teamId,token);
   if(version!==generation.current)return;
   setItems(found);
  }catch{
   if(version!==generation.current)return;
   setItems([]);setError('Não foi possível confirmar os desafios. Tenta novamente.');
  }finally{if(version===generation.current)setLoading(false);}
 },[teamId,token]);
 useFocusEffect(useCallback(()=>{
  void reload();
  return()=>{generation.current++;searchVersion.current++;writing.current=false;
   setItems([]);setCandidates([]);setSelectedId(null);setSessionInputs({});};
 },[reload]));
 const search=async()=>{
  if(!isOwner||!token||writing.current||query.trim().length<2)return;
  const version=++searchVersion.current;
  setSearching(true);setCandidates([]);setSelectedId(null);
  try{
   const found=await discoverSportsTeams(query,token);
   if(version!==searchVersion.current)return;
   setCandidates(found.filter(t=>t.id!==teamId
    &&(!sport||!t.sport||sport.toLowerCase()===t.sport.toLowerCase())));
  }catch{if(version===searchVersion.current)setError('Não foi possível pesquisar equipas.');}
  finally{if(version===searchVersion.current)setSearching(false);}
 };
 const mutate=async(run:()=>Promise<TeamChallenge>,success:string)=>{
  if(writing.current||!token)return;
  writing.current=true;setBusy(true);setFeedback('');setError('');
  const version=generation.current;
  try{
   await run();
   if(version!==generation.current)return;
   setFeedback(success);
   await reload();
  }catch{
   if(version!==generation.current)return;
   setError('Não foi possível confirmar a ação. Verifica o estado antes de tentares novamente.');
   await reload();
  }finally{
   if(version===generation.current){writing.current=false;setBusy(false);}
  }
 };
 const invite=()=>{
  if(!isOwner||!selectedId||!candidates.some(x=>x.id===selectedId))return;
  void mutate(()=>issueTeamChallenge(teamId,selectedId,message,token),
   'Convite enviado. A outra equipa terá de aceitar.');
 };
 const joinSession=(item:TeamChallenge)=>{
  const value=sessionInputs[item.id]||'';
  if(!/^[1-9][0-9]*$/.test(value)||!Number.isSafeInteger(Number(value)))return;
  void mutate(()=>linkTeamChallengeSession(item.id,Number(value),token),'Sessão associada ao desafio.');
 };
 if(!token)return <Text style={styles.hint}>Inicia sessão para acompanhar os desafios.</Text>;
 return <View style={styles.container}>
  <Text style={styles.eyebrow}>JYNLO · RIVALIDADES</Text>
  <Text style={styles.title}>Desafios entre equipas</Text>
  <Text style={styles.hint}>Aceita o desafio e depois associa uma sessão pública.
   A Jynlo não inscreve jogadores automaticamente.</Text>
  <Pressable style={styles.button} disabled={busy||loading} accessibilityRole="button"
   onPress={()=>void reload()}><Text style={styles.action}>Verificar desafios</Text></Pressable>
  {loading?<Text style={styles.hint}>A consultar desafios…</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {feedback?<Text style={styles.feedback}>{feedback}</Text>:null}
  {!loading&&!items.length?<Text style={styles.hint}>Ainda não há desafios desta equipa.</Text>:null}
  {items.map(item=><View key={item.id} style={styles.card}>
   <Text style={styles.versus}>{item.challengerTeamName} × {item.challengedTeamName}</Text>
   <Text style={styles.status}>{label[item.status]}</Text>
   {item.message?<Text style={styles.hint}>{item.message}</Text>:null}
   {isOwner&&item.status==='PENDING'&&item.challengedTeamId===teamId?
    <View style={styles.actions}>
     <Pressable disabled={busy} style={[styles.button,styles.primary]}
      onPress={()=>void mutate(()=>answerTeamChallenge(item.id,true,token),'Desafio aceite.')}>
      <Text style={styles.action}>Aceitar</Text></Pressable>
     <Pressable disabled={busy} style={styles.button}
      onPress={()=>void mutate(()=>answerTeamChallenge(item.id,false,token),'Desafio recusado.')}>
      <Text style={styles.action}>Recusar</Text></Pressable>
    </View>:null}
   {isOwner&&item.status==='PENDING'&&item.challengerTeamId===teamId?
    <Pressable disabled={busy} style={styles.button}
      onPress={()=>Alert.alert('Cancelar desafio?','A outra equipa já não poderá aceitar este convite.',[
       {text:'Manter',style:'cancel'},
       {text:'Cancelar desafio',style:'destructive',
        onPress:()=>void mutate(()=>cancelTeamChallenge(item.id,token),'Convite cancelado.')}
      ])}><Text style={styles.action}>Cancelar convite</Text></Pressable>:null}
   {isOwner&&item.status==='ACCEPTED'&&!item.sessionId?
    <View style={styles.link}>
     <Text style={styles.hint}>Cria uma sessão pública e indica aqui o seu número.</Text>
     <TextInput value={sessionInputs[item.id]||''} keyboardType="number-pad"
      onChangeText={value=>setSessionInputs(prev=>({...prev,[item.id]:value}))}
      placeholder="ID da sessão" placeholderTextColor={C.muted} style={styles.input}/>
     <Pressable disabled={busy||!/^[1-9][0-9]*$/.test(sessionInputs[item.id]||'')}
      onPress={()=>joinSession(item)} style={[styles.button,styles.primary]}>
      <Text style={styles.action}>Associar jogo</Text></Pressable>
    </View>:null}
   {item.sessionId?<Pressable accessibilityRole="link" style={styles.button}
    onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(item.sessionId)}})}>
    <Text style={styles.action}>Abrir jogo associado</Text></Pressable>:null}
  </View>)}
  {isOwner?<View style={styles.create}>
   <Text style={styles.subtitle}>Desafiar outra equipa</Text>
   <TextInput value={query} onChangeText={value=>{setQuery(value);setCandidates([]);setSelectedId(null);}}
    placeholder="Pesquisar adversário" placeholderTextColor={C.muted}
    maxLength={80} style={styles.input}/>
   <Pressable onPress={()=>void search()} disabled={busy||searching||query.trim().length<2}
    style={styles.button}><Text style={styles.action}>{searching?'A procurar…':'Pesquisar equipas'}</Text></Pressable>
   {candidates.map(team=><Pressable key={team.id}
    accessibilityRole="button" accessibilityState={{selected:selectedId===team.id}}
    onPress={()=>setSelectedId(team.id)}
    style={[styles.button,selectedId===team.id&&styles.selected]}>
    <Text style={styles.action}>{team.name} · {team.sport||'Multidesporto'}</Text></Pressable>)}
   <TextInput value={message} onChangeText={setMessage} maxLength={280} multiline
    placeholder="Mensagem opcional" placeholderTextColor={C.muted}
    style={[styles.input,styles.message]}/>
   <Pressable disabled={!selectedId||busy} onPress={invite}
    style={[styles.button,styles.primary]}><Text style={styles.action}>Enviar desafio</Text></Pressable>
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:12},eyebrow:{color:C.mint,fontSize:11,fontWeight:'900',letterSpacing:1},
 title:{color:C.white,fontSize:21,fontWeight:'900'},subtitle:{color:C.white,fontSize:16,fontWeight:'800'},
 hint:{color:C.muted,fontSize:13,lineHeight:19},
 card:{gap:10,padding:15,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 create:{gap:10,padding:15,borderRadius:14,borderWidth:1,borderColor:C.border},
 versus:{color:C.white,fontSize:16,fontWeight:'900'},status:{color:C.mint,fontSize:12,fontWeight:'800'},
 actions:{flexDirection:'row',gap:9,flexWrap:'wrap'},
 link:{gap:9},button:{borderRadius:11,paddingVertical:12,paddingHorizontal:14,borderWidth:1,
  borderColor:C.border,minHeight:44,justifyContent:'center'},
 primary:{backgroundColor:'#087F76',borderColor:'#18AD9A'},
 selected:{borderColor:C.mint,backgroundColor:'#195052'},
 action:{color:C.white,fontWeight:'800',fontSize:13},
 input:{minHeight:46,borderRadius:11,borderWidth:1,borderColor:C.border,color:C.white,padding:12},
 message:{minHeight:68,textAlignVertical:'top'},feedback:{color:C.mint},error:{color:'#FFB4B4'}
});
