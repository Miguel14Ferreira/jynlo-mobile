import React,{useCallback,useRef,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
import {communityDetails} from '../../../../src/lib/community-api';
import {communityChampionships,getChampionshipTeams,type ChampionshipTeams} from '../../../../src/lib/championship-api';
import {
 listOwnedEvents,createOwnedEvent,deleteOwnedEvent,listOwnedEventTeams,registerOwnedEventTeam,removeOwnedEventTeam,
 listOwnedFixtures,scheduleOwnedLeague,drawOwnedCup,advanceOwnedCup,getOwnedLeagueStandings,
 recordOwnedFixtureScore,finishOwnedLeague,
 type OwnedEvent,type OwnedEventTeam,type OwnedFixture,type OwnedEventFormat,type OwnedLeagueStandings,
} from '../../../../src/lib/championship-owned-events-api';

type FixtureProps={fixture:OwnedFixture;editable:boolean;busy:boolean;onSave:(fixture:OwnedFixture,home:number,away:number)=>void};
function FixtureRow({fixture,editable,busy,onSave}:FixtureProps){
 const [home,setHome]=useState(fixture.homeScore==null?'':String(fixture.homeScore));
 const [away,setAway]=useState(fixture.awayScore==null?'':String(fixture.awayScore));
 const valid=/^\d{1,3}$/.test(home)&&/^\d{1,3}$/.test(away);
 const unchanged=valid&&Number(home)===fixture.homeScore&&Number(away)===fixture.awayScore;
 return <View style={styles.fixture}>
  <Text style={styles.note}>Jornada {fixture.round} · Jogo {fixture.match}</Text>
  <Text style={styles.teamName}>{fixture.homeTeamName} — {fixture.awayTeamName}</Text>
  {fixture.homeScore!=null&&fixture.awayScore!=null?<Text style={styles.score}>{fixture.homeScore} – {fixture.awayScore}</Text>:null}
  {editable?<View style={styles.row}>
   <TextInput style={styles.scoreInput} keyboardType="number-pad" maxLength={3} value={home} onChangeText={setHome} editable={!busy} accessibilityLabel={'Golos de '+fixture.homeTeamName}/>
   <Text style={styles.note}>–</Text>
   <TextInput style={styles.scoreInput} keyboardType="number-pad" maxLength={3} value={away} onChangeText={setAway} editable={!busy} accessibilityLabel={'Golos de '+fixture.awayTeamName}/>
   <Button secondary title="Guardar resultado" disabled={!valid||busy||unchanged} onPress={()=>onSave(fixture,Number(home),Number(away))}/>
  </View>:null}
 </View>;
}
export default function ChampionshipOwnedEventsScreen(){
 const {id,championshipId}=useLocalSearchParams<{id:string;championshipId:string}>();
 const cid=Number(id),chid=Number(championshipId),auth=useAuth(),router=useRouter();
 const [title,setTitle]=useState('Provas do campeonato'),[sport,setSport]=useState('');
 const [closed,setClosed]=useState(false),[organizer,setOrganizer]=useState(false);
 const [events,setEvents]=useState<OwnedEvent[]>([]),[teams,setTeams]=useState<ChampionshipTeams['teams']>([]);
 const [selected,setSelected]=useState<number|null>(null);
 const [registrations,setRegistrations]=useState<OwnedEventTeam[]>([]);
 const [fixtures,setFixtures]=useState<OwnedFixture[]>([]);
 const [standings,setStandings]=useState<OwnedLeagueStandings|null>(null);
 const [expandedRounds,setExpandedRounds]=useState<number[]>([]);
 const [name,setName]=useState(''),[format,setFormat]=useState<OwnedEventFormat>('LEAGUE');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [detailsRefresh,setDetailsRefresh]=useState(0);
 const [loadedEventId,setLoadedEventId]=useState<number|null>(null);
 const [detailsFailed,setDetailsFailed]=useState(false);
 const generation=useRef(0),pending=useRef(false),selectedRef=useRef<number|null>(null);
 selectedRef.current=selected;
 const activeEvent=events.find(item=>item.id===selected);
 const groupedFixtures=Array.from(new Set(fixtures.map(f=>f.round))).sort((a,b)=>a-b)
  .map(round=>({round,matches:fixtures.filter(f=>f.round===round)}));
 const canManage=organizer&&!closed&&!loading&&Boolean(auth.token);
 // Never show fixtures/registrations from the previously selected competition.
 const football=sport==='Futebol'||sport==='Futsal';
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username||!Number.isSafeInteger(cid)||cid<=0||!Number.isSafeInteger(chid)||chid<=0){
   if(version===generation.current){setError('Inicia sessão e seleciona um campeonato válido.');setLoading(false);}return;
  }
  // A failed membership/organizer refresh must never leave stale write rights.
  setLoading(true);setError('');setOrganizer(false);setClosed(true);setTeams([]);
  try{
   const [championships,group,owned]=await Promise.all([
    communityChampionships(cid,auth.token),
    communityDetails(cid,auth.token,auth.username),
    listOwnedEvents(cid,chid,auth.token)
   ]);
   if(version!==generation.current)return;
   const championship=championships.find(item=>item.id===chid);
   if(!championship||championship.communityId!==cid||group.id!==cid)throw Error('Campeonato não encontrado nesta comunidade.');
   const role='myRole' in group?group.myRole:null;
   if(!role)throw Error('É necessário pertencer à comunidade para consultar as provas.');
   const organizerRole=role==='OWNER'||role==='ADMIN';
   // Publish the role and season teams together. A failed team request cannot
   // accidentally re-enable writes using a half-loaded championship.
   let seasonTeams:ChampionshipTeams['teams']=[];
   if(organizerRole&&!championship.closedAt){
    const response=await getChampionshipTeams(cid,chid,auth.token);
    seasonTeams=response.teams;
   }
   if(version!==generation.current)return;
   setTitle(championship.name);setSport(championship.sport);setClosed(Boolean(championship.closedAt));
   setTeams(seasonTeams);setOrganizer(organizerRole);
   setEvents(owned);setSelected(current=>owned.some(item=>item.id===current)?current:owned[0]?.id??null);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar as provas.');}
  finally{if(version===generation.current)setLoading(false);}
 },[cid,chid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setEvents([]);setSelected(null);setRegistrations([]);setFixtures([]);setLoadedEventId(null);setDetailsFailed(false);setError('');setLoading(true);
  void load(version);
  return()=>{generation.current++;};
 },[load]));
 const eventId=activeEvent?.id??null;
 const detailsReady=eventId!==null&&loadedEventId===eventId;
 React.useEffect(()=>{setExpandedRounds([]);},[eventId]);
 useFocusEffect(useCallback(()=>{
  if(eventId==null||!auth.token)return;
  let active=true;const version=generation.current;
  setLoadedEventId(null);setDetailsFailed(false);setFixtures([]);setRegistrations([]);setStandings(null);
  void Promise.allSettled([
   listOwnedEventTeams(cid,chid,eventId,auth.token),
   listOwnedFixtures(cid,chid,eventId,auth.token),
   activeEvent?.format==='LEAGUE'?getOwnedLeagueStandings(cid,chid,eventId,auth.token):Promise.resolve(null)
  ]).then(([a,b,c])=>{
   if(!active||version!==generation.current)return;
   if(a.status==='fulfilled')setRegistrations(a.value);
   else setError(a.reason instanceof Error?a.reason.message:'Não foi possível carregar equipas.');
   if(b.status==='fulfilled')setFixtures(b.value);
   else setError(b.reason instanceof Error?b.reason.message:'Não foi possível carregar jornadas.');
   if(c.status==='fulfilled')setStandings(c.value);
   else setError(c.reason instanceof Error?c.reason.message:'Não foi possível carregar a classificação.');
   const complete=a.status==='fulfilled'&&b.status==='fulfilled'&&c.status==='fulfilled';
   setDetailsFailed(!complete);
   setLoadedEventId(complete?eventId:null);
  });
  return()=>{active=false;};
 },[cid,chid,eventId,auth.token,activeEvent?.format,detailsRefresh]));
 async function mutate(action:()=>Promise<unknown>){
  if(pending.current||!canManage||loading)return;
  const version=generation.current;
  pending.current=true;setBusy(true);setError('');
  try{
   await action();
   if(version!==generation.current)return;
   await load(version);
   if(version===generation.current)setDetailsRefresh(value=>value+1);
  }catch(e){
   if(version===generation.current){
    // A POST may have committed despite timeout. Invalidate organizer rights
    // and match data until both the season and its selected event are refetched.
    setOrganizer(false);setDetailsFailed(true);setLoadedEventId(null);
    setFixtures([]);setRegistrations([]);setStandings(null);
    setError((e instanceof Error?e.message:'A operação não foi concluída.')+
     ' O servidor pode ter guardado a alteração. Recarrega a prova antes de repetir.');
   }
  }finally{
   pending.current=false;
   if(version===generation.current)setBusy(false);
  }
 }
 function confirm(titleText:string,details:string,action:()=>Promise<unknown>){
  if(!canManage||pending.current)return;
  const version=generation.current,confirmedEventId=selected;
  Alert.alert(titleText,details,[
   {text:'Cancelar',style:'cancel'},
   {text:'Confirmar',onPress:()=>{
    if(version!==generation.current||confirmedEventId!==selectedRef.current)return;
    void mutate(action);
   }}
  ]);
 }
 function saveScore(fixture:OwnedFixture,home:number,away:number){
  if(!activeEvent||!detailsReady||busy||pending.current||!football||activeEvent.status!=='SCHEDULED'||
    !fixtures.some(item=>item.id===fixture.id&&item.homeTeamId===fixture.homeTeamId&&
      item.awayTeamId===fixture.awayTeamId))return;
  if(!Number.isSafeInteger(home)||!Number.isSafeInteger(away)||home<0||away<0||home>999||away>999)return;
  if(home===fixture.homeScore&&away===fixture.awayScore)return;
  if(activeEvent.format==='CUP'&&home===away){setError('Uma eliminatória precisa de vencedor.');return;}
  confirm('Guardar resultado?',fixture.homeTeamName+' '+home+' – '+away+' '+fixture.awayTeamName,
   ()=>recordOwnedFixtureScore(cid,chid,activeEvent.id,fixture.id,home,away,auth.token!));
 }
 const registeredIds=new Set(registrations.map(team=>team.championshipTeamId));
 const canSchedule=canManage&&detailsReady&&football&&activeEvent?.status==='DRAFT';
 const canScore=canManage&&detailsReady&&football&&activeEvent?.status==='SCHEDULED';
 const allDone=detailsReady&&fixtures.length>0&&fixtures.every(f=>f.homeScore!=null&&f.awayScore!=null);
 return <Page><DemoBanner/><Eyebrow>CAMPEONATOS · PROVAS</Eyebrow>
  <Text style={styles.heading}>{title}</Text>
  <Text style={styles.note}>Ligas e taças do campeonato. Resultados e classificações oficiais são calculados pelo servidor.</Text>
  {loading?<Loader/>:null}
  {!!error?<Message tone="error">{error}</Message>:null}
  {!!error?<Button secondary title="Voltar a carregar" onPress={()=>{
    setDetailsRefresh(value=>value+1);void load();
   }}/>:null}
  {!loading&&canManage?<View style={styles.card}>
   <Text style={styles.title}>Criar prova</Text>
   <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={120} placeholder="Nome da prova" placeholderTextColor={C.muted} editable={!busy}/>
   <View style={styles.row}>
    {(['LEAGUE','CUP'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{selected:format===value}}
      disabled={busy} style={[styles.chip,format===value&&styles.chipActive]} onPress={()=>setFormat(value)}>
      <Text style={styles.chipText}>{value==='LEAGUE'?'Liga':'Taça'}</Text></Pressable>)}
   </View>
   <Button title={busy?'A guardar…':'Criar prova'} disabled={busy||!name.trim()} onPress={()=>
    confirm('Criar prova?',name,async()=>{const created=await createOwnedEvent(cid,chid,auth.token!,name,format);setName('');setSelected(created.id);})}/>
  </View>:null}
  {!loading&&events.length===0?<Message>Este campeonato ainda não tem ligas nem taças próprias.</Message>:null}
  {events.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:selected===item.id}} disabled={busy||pending.current} onPress={()=>{selectedRef.current=item.id;setSelected(item.id);}}
   style={[styles.event,selected===item.id&&styles.eventActive]}>
   <Text style={styles.teamName}>{item.name}</Text>
   <Text style={styles.note}>{item.format==='LEAGUE'?'Liga':'Taça'} · {item.status==='DRAFT'?'Em preparação':item.status==='SCHEDULED'?'Em curso':'Concluída'}{item.winnerTeamName?' · Campeão: '+item.winnerTeamName:''}</Text>
  </Pressable>)}
  {activeEvent&&!detailsReady&&!detailsFailed?<Loader/>:null}
  {activeEvent&&detailsFailed?<Button secondary title="Tentar carregar equipas, jornadas e classificação novamente"
    disabled={busy} onPress={()=>setDetailsRefresh(value=>value+1)}/>:null}
  {activeEvent&&detailsReady?<View style={styles.card}>
   <Text style={styles.title}>{activeEvent.name}</Text>
   <Text style={styles.note}>Equipas inscritas: {registrations.length}</Text>
   {registrations.map(team=><View key={team.id} style={styles.row}>
    <Text style={styles.teamName}>• {team.name}</Text>
    {canManage&&activeEvent.status==='DRAFT'?<Button secondary title="Remover inscrição" disabled={busy}
     onPress={()=>confirm('Remover equipa?',team.name,()=>removeOwnedEventTeam(cid,chid,activeEvent.id,team.id,auth.token!))}/>:null}
   </View>)}
   {canManage&&activeEvent.status==='DRAFT'?teams.filter(team=>!registeredIds.has(team.id)).map(team=><Button key={team.id} secondary title={'Inscrever '+team.name}
    disabled={busy} onPress={()=>confirm('Inscrever equipa?',team.name,()=>registerOwnedEventTeam(cid,chid,activeEvent.id,team.id,auth.token!))}/>):null}
   {canManage&&activeEvent.status==='DRAFT'?<Button danger title="Eliminar prova em preparação" disabled={busy}
    onPress={()=>confirm('Eliminar esta prova?', 'A eliminação da prova em preparação é definitiva.',async()=>{
     await deleteOwnedEvent(cid,chid,activeEvent.id,auth.token!);setSelected(null);
    })}/>:null}
   {canSchedule?<View style={styles.card}>
    <Text style={styles.title}>{activeEvent.format==='LEAGUE'?'Gerar calendário':'Sortear eliminatórias'}</Text>
    {activeEvent.format==='LEAGUE'?<><Button secondary title="Gerar 1 volta" disabled={busy} onPress={()=>confirm('Gerar calendário?', 'Os jogos serão criados pelo servidor.',()=>scheduleOwnedLeague(cid,chid,activeEvent.id,1,auth.token!))}/>
      <Button secondary title="Gerar 2 voltas" disabled={busy} onPress={()=>confirm('Gerar duas voltas?', 'Os jogos serão criados pelo servidor.',()=>scheduleOwnedLeague(cid,chid,activeEvent.id,2,auth.token!))}/></>:
     <Button secondary title="Sortear Taça" disabled={busy} onPress={()=>confirm('Sortear Taça?', 'O sorteio será efetuado no servidor.',()=>drawOwnedCup(cid,chid,activeEvent.id,auth.token!))}/>}
   </View>:null}
   {activeEvent.format==='LEAGUE'&&standings?<View style={styles.card}>
    <Text style={styles.title}>Classificação da Liga</Text>
    <Text style={styles.note}>{standings.playedMatches} de {standings.totalMatches} jogos realizados{standings.firstPlaceTied?' · liderança empatada':''}</Text>
    {standings.standings.map(row=><View key={row.teamId} style={styles.standing}>
     <Text style={styles.teamName}>{row.position}. {row.teamName}</Text>
     <Text style={styles.note}>{row.points} pts · {row.played} J · {row.wins} V · {row.draws} E · {row.losses} D · {row.goalsFor}:{row.goalsAgainst} golos · DG {row.goalDifference}</Text>
    </View>)}
   </View>:null}
   <Text style={styles.title}>Jornadas e resultados ({fixtures.length})</Text>
   {fixtures.length===0?<Text style={styles.note}>Ainda não existem jogos nesta prova.</Text>:null}
   {groupedFixtures.length>1?<Button secondary title={expandedRounds.length===groupedFixtures.length?'Recolher todas as jornadas':'Expandir todas as jornadas'}
    onPress={()=>setExpandedRounds(expandedRounds.length===groupedFixtures.length?[]:groupedFixtures.map(group=>group.round))}/>:null}
   {groupedFixtures.map(group=><View key={group.round} style={styles.roundGroup}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:expandedRounds.includes(group.round)}}
     accessibilityLabel={'Jornada '+group.round+', '+group.matches.length+' jogos'}
     onPress={()=>setExpandedRounds(current=>current.includes(group.round)?current.filter(value=>value!==group.round):[...current,group.round])}
     style={styles.roundHeader}>
     <Text style={styles.teamName}>Jornada {group.round} · {group.matches.length} {group.matches.length===1?'jogo':'jogos'}</Text>
     <Text style={styles.note}>{expandedRounds.includes(group.round)?'Recolher ▲':'Expandir ▼'}</Text>
    </Pressable>
    {expandedRounds.includes(group.round)?group.matches.map(fixture=><View key={fixture.id} style={styles.fixture}>
     <FixtureRow key={fixture.id+'-'+fixture.homeScore+'-'+fixture.awayScore} fixture={fixture} editable={canScore} busy={busy} onSave={saveScore}/>
     <Button secondary title="Golos, cartões e jogadores" onPress={()=>router.push({
      pathname:'/communities/[id]/championships/fixture',
      params:{id:String(cid),championshipId:String(chid),eventId:String(activeEvent.id),fixtureId:String(fixture.id)}
     })}/>
    </View>):null}
   </View>)}
   {canScore&&activeEvent.format==='CUP'&&allDone?<Button title="Avançar eliminatória" disabled={busy} onPress={()=>confirm('Avançar Taça?', 'A próxima ronda será gerada após validar todos os resultados.',()=>advanceOwnedCup(cid,chid,activeEvent.id,auth.token!))}/>:null}
   {canScore&&activeEvent.format==='LEAGUE'&&allDone?<Button danger title="Finalizar liga" disabled={busy} onPress={()=>confirm('Finalizar liga?', 'A classificação e o vencedor serão fixados pelo servidor. A operação é definitiva.',()=>finishOwnedLeague(cid,chid,activeEvent.id,auth.token!))}/>:null}
   {!football?<Message>Para esta modalidade, os resultados necessitam de regras próprias. Não são utilizados resultados de futebol.</Message>:null}
  </View>:null}
  <Button secondary title="Voltar ao campeonato" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:25,fontWeight:'900',color:C.white},title:{fontSize:17,fontWeight:'800',color:C.white},
 card:{padding:13,gap:11,borderRadius:14,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 event:{padding:12,gap:6,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 roundGroup:{gap:8},roundHeader:{minHeight:48,padding:12,backgroundColor:C.surface2,borderRadius:12,borderWidth:1,borderColor:C.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 eventActive:{borderColor:C.mint},note:{fontSize:12,color:C.muted,lineHeight:18},teamName:{color:C.white,fontWeight:'700',fontSize:14},
 input:{borderWidth:1,borderColor:C.border,borderRadius:10,color:C.white,padding:11,minHeight:46},
 row:{flexDirection:'row',gap:10,alignItems:'center',flexWrap:'wrap'},chip:{padding:11,borderRadius:10,borderWidth:1,borderColor:C.border},chipActive:{borderColor:C.mint,backgroundColor:C.surface2},
 chipText:{color:C.white,fontWeight:'700'},fixture:{gap:9,padding:12,borderRadius:10,backgroundColor:C.surface2},
 standing:{gap:3,paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.border},
 score:{fontSize:19,fontWeight:'900',color:C.mint},scoreInput:{minWidth:58,minHeight:46,borderColor:C.border,borderWidth:1,borderRadius:8,textAlign:'center',color:C.white}
});
