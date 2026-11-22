import React,{useCallback,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {discoverSportsTeams,type SportsTeam} from '../lib/sports-teams-api';
import {
 teamChallenges,issueTeamChallenge,answerTeamChallenge,cancelTeamChallenge,
 linkTeamChallengeSession,type TeamChallenge
} from '../lib/sports-team-challenges-api';
import {C} from '../lib/theme';
import {request} from '../lib/api';
import type {MySessions,SessionSummary} from '../lib/types';

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
 const [ownSessions,setOwnSessions]=useState<SessionSummary[]>([]);
 const [ownSessionsError,setOwnSessionsError]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState(''),[feedback,setFeedback]=useState('');
 const generation=useRef(0),searchVersion=useRef(0),writing=useRef(false);
 const reload=useCallback(async(silent=false)=>{
  const version=++generation.current;
  if(!silent)setLoading(true);
  setError('');
  if(!token){setItems([]);setLoading(false);return;}
  try{
   const found=await teamChallenges(teamId,token);
   if(version!==generation.current)return;
   setItems(found);
   if(isOwner&&found.some(challenge=>challenge.status==='ACCEPTED'&&!challenge.sessionId)){
    try{
     const mine=await request<MySessions>('/api/sessions/mine',{token});
     if(version!==generation.current)return;
     setOwnSessions(mine.created.filter(game=>!game.privateGame&&game.audience!=='COMMUNITY_ONLY'
       &&game.status!=='CANCELLED'
       &&(!sport||!game.sport||game.sport.toLowerCase()===sport.toLowerCase())));
     setOwnSessionsError('');
    }catch{
     if(version===generation.current){setOwnSessions([]);setOwnSessionsError(t('Não foi possível consultar as tuas sessões.'));}
    }
   }
  }catch{
   if(version!==generation.current)return;
   setItems([]);setError(t('Não foi possível confirmar os desafios. Tenta novamente.'));
  }finally{if(version===generation.current&&!silent)setLoading(false);}
 },[teamId,token,isOwner,sport]);
 useFocusEffect(useCallback(()=>{
  if(isOwner)void reload();
  // Challenges refresh while this screen is focused, without a manual update button.
  // Avoid starting a second fetch during a write or while the tab is inactive.
  const interval=isOwner?setInterval(()=>{if(!writing.current)void reload(true);},30000):null;
  return()=>{if(interval)clearInterval(interval);generation.current++;searchVersion.current++;writing.current=false;
   setItems([]);setCandidates([]);setSelectedId(null);setSessionInputs({});setOwnSessions([]);};
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
  }catch{if(version===searchVersion.current)setError(t('Não foi possível pesquisar equipas.'));}
  finally{if(version===searchVersion.current)setSearching(false);}
 };
 const mutate=async(run:()=>Promise<TeamChallenge>,success:string)=>{
  if(writing.current||!token)return;
  writing.current=true;setBusy(true);setFeedback('');setError('');
  const version=generation.current;
  let confirmed=false;
  try{
   await run();
   if(version!==generation.current)return;
   confirmed=true;
   setFeedback(success);
  }catch{
   if(version!==generation.current)return;
   setError(t('Não foi possível confirmar a ação. Verifica o estado antes de tentares novamente.'));
  }finally{
   if(version===generation.current){
    writing.current=false;setBusy(false);
    // Refresh only after releasing the mutation guard. A refresh increments
    // generation and must not strand the composer in its busy state.
    if(confirmed)void reload();
   }
  }
 };
 const invite=()=>{
  if(!isOwner||!selectedId||!candidates.some(x=>x.id===selectedId))return;
  void mutate(()=>issueTeamChallenge(teamId,selectedId,message,token),
   t('Convite enviado. A outra equipa terá de aceitar.'));
 };
 const joinSession=(item:TeamChallenge)=>{
  const value=sessionInputs[item.id]||'';
  if(!/^[1-9][0-9]*$/.test(value)||!Number.isSafeInteger(Number(value)))return;
  void mutate(()=>linkTeamChallengeSession(item.id,Number(value),token),t('Sessão associada ao desafio.'));
 };
 if(!token)return <Text style={styles.hint}>{t('Inicia sessão para acompanhar os desafios.')}</Text>;
 return <View style={styles.container}>
  <Text style={styles.eyebrow}>{t('JYNLO · RIVALIDADES')}</Text>
  <Text style={styles.title}>{t('Desafios entre equipas')}</Text>
  <Text style={styles.hint}>{t('Aceita o desafio e depois associa uma sessão pública. A Jynlo não inscreve jogadores automaticamente.')}</Text>
  {!isOwner?<Text style={styles.hint}>{t('Os convites e respostas são privados dos responsáveis das equipas.')}</Text>:null}
  {isOwner&&loading?<Text style={styles.hint}>{t('A consultar desafios…')}</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {feedback?<Text style={styles.feedback}>{feedback}</Text>:null}
  {isOwner&&!loading&&!items.length?<Text style={styles.hint}>{t('Ainda não há desafios desta equipa.')}</Text>:null}
  {items.map(item=><View key={item.id} style={styles.card}>
   <Text style={styles.versus}>{item.challengerTeamName} × {item.challengedTeamName}</Text>
   <Text style={styles.status}>{t(label[item.status])}</Text>
   {item.message?<Text style={styles.hint}>{item.message}</Text>:null}
   {isOwner&&item.status==='PENDING'&&item.challengedTeamId===teamId?
    <View style={styles.actions}>
     <Pressable disabled={busy} style={[styles.button,styles.primary]}
      onPress={()=>void mutate(()=>answerTeamChallenge(item.id,true,token),t('Desafio aceite.'))}>
      <Text style={styles.action}>{t('Aceitar')}</Text></Pressable>
     <Pressable disabled={busy} style={styles.button}
      onPress={()=>void mutate(()=>answerTeamChallenge(item.id,false,token),t('Desafio recusado.'))}>
      <Text style={styles.action}>{t('Recusar')}</Text></Pressable>
    </View>:null}
   {isOwner&&item.status==='PENDING'&&item.challengerTeamId===teamId?
    <Pressable disabled={busy} style={styles.button}
      onPress={()=>Alert.alert(t('Cancelar desafio?'),t('A outra equipa já não poderá aceitar este convite.'),[
       {text:t('Manter'),style:'cancel'},
       {text:t('Cancelar desafio'),style:'destructive',
        onPress:()=>void mutate(()=>cancelTeamChallenge(item.id,token),t('Convite cancelado.'))}
      ])}><Text style={styles.action}>{t('Cancelar convite')}</Text></Pressable>:null}
   {isOwner&&item.status==='ACCEPTED'&&!item.sessionId?
    <View style={styles.link}>
     <Text style={styles.hint}>{t('Escolhe uma sessão pública criada por ti para este desafio.')}</Text>
     {ownSessions.map(game=><Pressable key={game.id}
      accessibilityRole="button"
      accessibilityState={{selected:sessionInputs[item.id]===String(game.id)}}
      style={[styles.button,sessionInputs[item.id]===String(game.id)&&styles.selected]}
      onPress={()=>setSessionInputs(prev=>({...prev,[item.id]:String(game.id)}))}>
      <Text style={styles.action}>{game.sport} · {game.city} · {game.gameDate.slice(0,10)}</Text>
     </Pressable>)}
     {ownSessionsError?<Text style={styles.error}>{ownSessionsError}</Text>:null}
     {!ownSessions.length?<Text style={styles.hint}>{t('Ainda não tens uma sessão pública elegível.')}</Text>:null}
     <Pressable accessibilityRole="button" onPress={()=>router.push('/(tabs)/create')}
       style={styles.button}><Text style={styles.action}>{t('Criar sessão')}</Text></Pressable>
     <Pressable disabled={busy||!ownSessions.some(game=>String(game.id)===sessionInputs[item.id])}
      onPress={()=>joinSession(item)} style={[styles.button,styles.primary]}>
      <Text style={styles.action}>{t('Associar jogo')}</Text></Pressable>
    </View>:null}
   {item.sessionId?<Pressable accessibilityRole="link" style={styles.button}
    onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(item.sessionId)}})}>
    <Text style={styles.action}>{t('Abrir jogo associado')}</Text></Pressable>:null}
  </View>)}
  {isOwner?<View style={styles.create}>
   <Text style={styles.subtitle}>{t('Desafiar outra equipa')}</Text>
   <TextInput value={query} onChangeText={value=>{searchVersion.current++;setQuery(value);setCandidates([]);setSelectedId(null);}}
    placeholder={t('Pesquisar adversário')} placeholderTextColor={C.muted}
    maxLength={80} style={styles.input}/>
   <Pressable onPress={()=>void search()} disabled={busy||searching||query.trim().length<2}
    style={styles.button}><Text style={styles.action}>{searching?t('A procurar…'):t('Pesquisar equipas')}</Text></Pressable>
   {candidates.map(team=><Pressable key={team.id}
    accessibilityRole="button" accessibilityState={{selected:selectedId===team.id}}
    onPress={()=>setSelectedId(team.id)}
    style={[styles.button,selectedId===team.id&&styles.selected]}>
    <Text style={styles.action}>{team.name} · {team.sport||'Multidesporto'}</Text></Pressable>)}
   <TextInput value={message} onChangeText={setMessage} maxLength={280} multiline
    placeholder={t('Mensagem opcional')} placeholderTextColor={C.muted}
    style={[styles.input,styles.message]}/>
   <Pressable disabled={!selectedId||busy} onPress={invite}
    style={[styles.button,styles.primary]}><Text style={styles.action}>{t('Enviar desafio')}</Text></Pressable>
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
