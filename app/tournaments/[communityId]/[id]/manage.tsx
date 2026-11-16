import React,{useCallback,useRef,useState} from 'react';
import {Alert,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {DEMO_MODE} from '../../../../src/lib/api';
import {communityDetails} from '../../../../src/lib/community-api';
import {tournamentDetails,tournamentTable} from '../../../../src/lib/competition-api';
import {teamTournamentMatches,teamTournamentGroups} from '../../../../src/lib/tournament-fixtures-api';
import {individualTournamentMatches} from '../../../../src/lib/performance-api';
import {canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,isOrganizer,organizerFixtureType,validateTournamentMatchScore} from '../../../../src/lib/tournament-organizer-core.cjs';
import {managedKind} from '../../../../src/lib/tournament-events-core.cjs';
import {finishTournamentLeague,publishTournamentSchedule,saveTournamentMatchResult} from '../../../../src/lib/tournament-organizer-api';
import {officialTournamentOutcome} from '../../../../src/lib/tournament-outcome-core.cjs';
import {reconcileVisibleFixtures,validateNextFixturePage} from '../../../../src/lib/tournament-organizer-pages.cjs';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,TournamentTeamMatch,TournamentIndividualMatch,TournamentTable,TournamentTeamGroups} from '../../../../src/lib/types';

type OrganizerMatch={id:number;roundNumber:number;home:string;away:string;status:'COMPLETED'|'SCHEDULED';homeScore:number|null;awayScore:number|null;groupNumber:number|null};
function mapTeam(m:TournamentTeamMatch):OrganizerMatch{return {id:m.id,roundNumber:m.roundNumber,home:m.homeTeamName,away:m.awayTeamName,status:m.status,homeScore:m.homeScore,awayScore:m.awayScore,groupNumber:m.groupNumber};}
function mapIndividual(m:TournamentIndividualMatch):OrganizerMatch{return {id:m.id,roundNumber:m.roundNumber,home:m.homeUsername,away:m.awayUsername,status:m.status,homeScore:m.homeScore,awayScore:m.awayScore,groupNumber:null};}
function ScoreEditor({match,tournament,busy,onSave}:{match:OrganizerMatch;tournament:JynloTournament;busy:boolean;onSave:(matchId:number,home:string,away:string)=>void}){
 const [home,setHome]=useState(match.homeScore==null?'':String(match.homeScore));
 const [away,setAway]=useState(match.awayScore==null?'':String(match.awayScore));
 let valid=true;try{validateTournamentMatchScore(tournament,match,home,away);}catch{valid=false;}
 return <View style={styles.editor}>
  <Text style={styles.helper}>Resultado · {match.home} / {match.away}</Text>
  {tournament.scoringMode==='CHESS_HALF_POINTS'?<Text style={styles.helper}>Xadrez: 1–0, 0–1 ou 0–0 (empate).</Text>:null}
  {tournament.entryType==='TEAM'&&(tournament.format==='KNOCKOUT'||(tournament.format==='GROUP_KNOCKOUT'&&match.groupNumber==null))?
   <Text style={styles.helper}>Eliminatória: indica o resultado após desempate. Não pode haver empate.</Text>:null}
  <View style={styles.scoreRow}>
   <TextInput style={styles.scoreInput} value={home} onChangeText={setHome} keyboardType="number-pad" maxLength={3} accessibilityLabel={`Pontos de ${match.home}`}/>
   <Text style={styles.dash}>—</Text>
   <TextInput style={styles.scoreInput} value={away} onChangeText={setAway} keyboardType="number-pad" maxLength={3} accessibilityLabel={`Pontos de ${match.away}`}/>
  </View>
  <Button secondary disabled={busy||!valid} title={match.status==='COMPLETED'?'Corrigir resultado':'Registar resultado'} onPress={()=>onSave(match.id,home,away)}/>
 </View>;
}
export default function TournamentManagerScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>(),cid=Number(params.communityId),tid=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null),[role,setRole]=useState<string|null>(null);
 const [matches,setMatches]=useState<OrganizerMatch[]>([]),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [standings,setStandings]=useState<TournamentTable|null>(null);
 const [groups,setGroups]=useState<TournamentTeamGroups|null>(null);
 const [standingsError,setStandingsError]=useState(''),[syncing,setSyncing]=useState(false);
 const [fixturesVerified,setFixturesVerified]=useState(false),[snapshotVerified,setSnapshotVerified]=useState(false);
 const generation=useRef(0),readVersion=useRef(0),pendingWrite=useRef(false),visiblePage=useRef(0);
 const load=useCallback(async(version=generation.current,silent=false):Promise<boolean>=>{
  const request=++readVersion.current;
  if(!auth.token||!auth.username){
   if(version===generation.current){setLoading(false);setTournament(null);setRole(null);}
   return false;
  }
  setFixturesVerified(false);setSnapshotVerified(false);
  setStandings(null);setGroups(null);
  setError('');
  if(silent)setSyncing(true);
  else{setLoading(true);setError('');setMatches([]);setHasMore(false);setPage(0);visiblePage.current=0;}
  setStandingsError('');
  try{
   const [info,community]=await Promise.all([
    tournamentDetails(cid,tid,auth.token,auth.username),
    communityDetails(cid,auth.token,auth.username)
   ]);
   if(version!==generation.current||request!==readVersion.current)return false;
   if(community.id!==cid)throw Error('Comunidade diferente da competição selecionada.');
   const currentRole='myRole' in community?community.myRole:null;
   setTournament(info);setRole(currentRole||null);
   const kind=organizerFixtureType(info);
   if(!isOrganizer(currentRole)||!kind||info.status==='DRAFT'){
    setStandings(null);setGroups(null);
    setSnapshotVerified(true);
    return true;
   }
   const [fixtures,table,groupState]=await Promise.allSettled([
    reconcileVisibleFixtures<TournamentTeamMatch|TournamentIndividualMatch>(
     requestedPage=>kind==='TEAM'?
      teamTournamentMatches(cid,tid,requestedPage,auth.token!,auth.username!):
      individualTournamentMatches(cid,tid,requestedPage,auth.token!,auth.username!),
     silent?visiblePage.current:0,
     ()=>version===generation.current&&request===readVersion.current
    ),
    tournamentTable(cid,info,auth.token,auth.username),
    kind==='TEAM'&&info.format==='GROUP_KNOCKOUT'?
     teamTournamentGroups(cid,tid,auth.token,auth.username):Promise.resolve(null)
   ]);
   if(version!==generation.current||request!==readVersion.current)return false;
   if(fixtures.status==='rejected')throw fixtures.reason;
   const response=fixtures.value;
   if(!response)return false;
   visiblePage.current=response.page;
   setFixturesVerified(true);setSnapshotVerified(true);
   setMatches(response.matches.map(m=>kind==='TEAM'?mapTeam(m as TournamentTeamMatch):mapIndividual(m as TournamentIndividualMatch)));
   setPage(response.page);setHasMore(response.hasMore);
   if(table.status==='fulfilled'){setStandings(table.value);}
   else{setStandings(null);setStandingsError('Não foi possível atualizar a classificação oficial.');}
   if(groupState.status==='fulfilled')setGroups(groupState.value);
   else{setGroups(null);setStandingsError(old=>[old,'Não foi possível confirmar a fase de grupos.'].filter(Boolean).join(' '));}
   return true;
  }catch(e){
   if(version===generation.current&&request===readVersion.current)
    setError((silent?'Não foi possível confirmar os dados atuais: ':'')+(e instanceof Error?e.message:'Não foi possível carregar a gestão do torneio.'));
   return false;
  }finally{
   if(version===generation.current&&request===readVersion.current){
    if(silent)setSyncing(false);
    else setLoading(false);
   }
  }
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  readVersion.current++;
  setTournament(null);setRole(null);setMatches([]);setPage(0);visiblePage.current=0;setHasMore(false);
  setStandings(null);setGroups(null);setStandingsError('');setSyncing(false);setFixturesVerified(false);setSnapshotVerified(false);
  setNotice('');setError('');setBusy(false);setLoading(true);
  void load(version);
  return ()=>{generation.current++;readVersion.current++;};
 },[load]));
 const type=tournament?organizerFixtureType(tournament):null;
 const officialOutcome=officialTournamentOutcome(tournament);
 const canPublish=snapshotVerified&&canGenerateSchedule(role,tournament)&&!DEMO_MODE;
 const canRecord=fixturesVerified&&canRecordTournamentResult(role,tournament)&&!DEMO_MODE;
 const canFinish=canCompleteTournament(role,tournament)&&!DEMO_MODE;
 const allVisibleFinished=fixturesVerified&&matches.length>0&&!hasMore&&matches.every(m=>m.status==='COMPLETED');
 async function act(run:()=>Promise<unknown>,success:string,expectedVersion:number,expectedReadVersion:number){
  if(expectedVersion!==generation.current||expectedReadVersion!==readVersion.current||busy||syncing||loading||pendingWrite.current)return;
  const version=generation.current;
  pendingWrite.current=true;setBusy(true);setError('');setNotice('');
  try{
   await run();
   if(version!==generation.current)return;
   const refreshed=await load(version,true);
   if(version===generation.current)setNotice(refreshed?success:success+' Não foi possível confirmar a atualização do calendário. Consulta novamente antes de repetir.');
  }
  catch(e){if(version===generation.current)setError((e instanceof Error?e.message:'Não foi possível concluir a ação.')+' Confirma o estado atual antes de repetir.');}
  finally{pendingWrite.current=false;if(version===generation.current)setBusy(false);}
 }
 function publish(){if(!tournament||!canPublish||!auth.token||!auth.username)return;
  const confirmationVersion=generation.current,confirmationReadVersion=readVersion.current;
  Alert.alert('Publicar calendário?','Esta ação inicia o torneio e fecha as inscrições. Confirma primeiro as equipas ou os participantes.',[
   {text:'Voltar',style:'cancel'},
   {text:'Publicar calendário',onPress:()=>{void act(()=>publishTournamentSchedule(cid,tournament,auth.token!,auth.username!),'Calendário publicado pelo servidor.',confirmationVersion,confirmationReadVersion);}}
  ]);
 }
 function save(id:number,home:string,away:string){if(!tournament||!canRecord||!auth.token||!auth.username)return;
  const match=matches.find(item=>item.id===id);
  try{validateTournamentMatchScore(tournament,match,home,away);}catch(e){setError(e instanceof Error?e.message:'Resultado inválido.');return;}
  const confirmationVersion=generation.current,confirmationReadVersion=readVersion.current;
  Alert.alert('Confirmar resultado?',`Registar ${home} — ${away}? A classificação será calculada pelo servidor.`,[
   {text:'Cancelar',style:'cancel'},
   {text:'Guardar',onPress:()=>{void act(()=>saveTournamentMatchResult(cid,tournament,id,home,away,auth.token!,auth.username!),'Resultado registado pelo servidor.',confirmationVersion,confirmationReadVersion);}}
  ]);
 }
 function finish(){if(!tournament||!canFinish||!allVisibleFinished||!auth.token||!auth.username)return;
  const confirmationVersion=generation.current,confirmationReadVersion=readVersion.current;
  Alert.alert('Encerrar a liga?','Esta ação fecha a competição e fixa o resultado oficial. Depois de concluída, não poderás alterar os jogos.',[
   {text:'Manter aberta',style:'cancel'},
   {text:'Encerrar liga',style:'destructive',onPress:()=>{void act(()=>finishTournamentLeague(cid,tournament,auth.token!,auth.username!),'Liga encerrada pelo servidor.',confirmationVersion,confirmationReadVersion);}}
  ]);
 }
 async function more(){if(!tournament||!type||!fixturesVerified||!auth.token||!auth.username||busy||syncing||pendingWrite.current||!hasMore)return;
  const version=generation.current,reading=readVersion.current;
  pendingWrite.current=true;setBusy(true);setError('');
  try{const next=page+1;
   const response=type==='TEAM'?await teamTournamentMatches(cid,tid,next,auth.token,auth.username):await individualTournamentMatches(cid,tid,next,auth.token,auth.username);
   const checked=validateNextFixturePage(response,next);
   if(version!==generation.current||reading!==readVersion.current)return;
   const items=checked.matches.map(m=>type==='TEAM'?mapTeam(m as TournamentTeamMatch):mapIndividual(m as TournamentIndividualMatch));
   if(version!==generation.current)return;
   setMatches(previous=>[...previous,...items.filter(m=>!previous.some(x=>x.id===m.id))]);
   visiblePage.current=checked.page;setPage(checked.page);setHasMore(checked.hasMore);
  }catch(e){if(version===generation.current&&reading===readVersion.current)setError(e instanceof Error?e.message:'Não foi possível carregar mais jogos.');}
  finally{pendingWrite.current=false;if(version===generation.current&&reading===readVersion.current)setBusy(false);}
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · ORGANIZAÇÃO</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Gestão do torneio'}</Text>
  {!auth.token?<Button title="Entrar" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{syncing?<Message>A sincronizar resultados e classificações oficiais…</Message>:null}
  {error?<Message tone="error">{error}</Message>:null}{notice?<Message>{notice}</Message>:null}
  {!loading&&!syncing&&!busy&&auth.token&&(error||!!tournament&&isOrganizer(role)&&type&&!fixturesVerified)?
   <Button secondary title="Voltar a sincronizar dados" onPress={()=>{void load(generation.current,!!tournament);}}/>:null}
  {!loading&&tournament&&!isOrganizer(role)?<Message>Este painel é exclusivo para proprietários e administradores da comunidade.</Message>:null}
  {!loading&&tournament&&isOrganizer(role)&&!type?<><Message>Esta modalidade utiliza regras próprias de resultados. Não aplicamos uma tabela de jogos genérica.</Message>
    {managedKind(tournament)?<Button secondary title="Gerir jornadas da competição"
     onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/events',
      params:{communityId:String(cid),id:String(tid)}})}/>:null}
   </>:null}
  {!loading&&tournament&&isOrganizer(role)&&type?<>
   <View style={styles.row}><Badge text={tournament.sport||'Modalidade'}/><Badge text={tournament.status==='DRAFT'?'Em preparação':tournament.status==='IN_PROGRESS'?'A decorrer':'Concluído'}/></View>
   {DEMO_MODE?<Message>Estás a utilizar dados de demonstração. As operações de organização estão bloqueadas para não simular alterações ao servidor real.</Message>:null}
   {standingsError?<Message tone="error">{standingsError}</Message>:null}
   {!loading&&!syncing&&!fixturesVerified&&tournament.status==='IN_PROGRESS'?<Message tone="error">Os jogos apresentados não estão confirmados pelo servidor. Para proteger a competição, o registo de resultados e o encerramento ficam bloqueados até uma nova sincronização.</Message>:null}
   {fixturesVerified&&standings?<View style={styles.panel}>
    <Text style={styles.heading}>Classificação oficial</Text>
    {standings.rows.length===0?<Text style={styles.helper}>Ainda não existem resultados classificados.</Text>:null}
    {standings.rows.map(row=>{
     const name='teamName' in row?row.teamName:(row.displayName||row.username);
     return <View key={'teamId' in row?'team-'+row.teamId:'player-'+row.profileId} style={styles.standing}>
      <Text style={styles.rank}>{row.position}.</Text>
      <Text style={styles.standingName}>{name}</Text>
      <Text style={styles.standingPoints}>{row.points} pts</Text>
     </View>;
    })}
    <Text style={styles.helper}>{standings.source}</Text>
   </View>:null}
   {fixturesVerified&&tournament.format==='GROUP_KNOCKOUT'&&type==='TEAM'&&groups?
    <View style={styles.panel}>
     <Text style={styles.heading}>Fases da competição</Text>
     <Text style={styles.helper}>{groups.knockoutStarted?'Eliminatórias iniciadas pelo servidor.':'Fase de grupos a decorrer.'}</Text>
     {groups.groups.map(group=><View key={group.groupNumber} style={styles.group}>
      <Text style={styles.round}>Grupo {group.groupNumber}</Text>
      {group.standings.map(row=><View key={row.teamId} style={styles.standing}>
       <Text style={styles.rank}>{row.position}.</Text><Text style={styles.standingName}>{row.teamName}</Text>
       <Text style={styles.standingPoints}>{row.points} pts</Text>
      </View>)}
     </View>)}
    </View>:null}
   {canPublish?<View style={styles.panel}>
    <Text style={styles.heading}>Preparação do torneio</Text>
    <Text style={styles.helper}>Confirma primeiro as inscrições e os plantéis. Publicar o calendário inicia o torneio.</Text>
    <Button title={busy?'A guardar…':'Publicar calendário e iniciar torneio'} disabled={busy||syncing} onPress={publish}/>
   </View>:null}
   {tournament.status!=='DRAFT'?<View style={styles.panel}>
    <Text style={styles.heading}>{tournament.status==='COMPLETED'?'Jogos e resultados finais':'Jogos e resultados'}</Text>
    <Text style={styles.helper}>{fixturesVerified?matches.length:0} jogos confirmados{fixturesVerified&&hasMore?' · existem mais páginas':''}. Os resultados nunca são calculados pelo telemóvel.</Text>
    {fixturesVerified&&matches.length===0?<Message>Ainda não existem jogos publicados neste torneio.</Message>:null}
    {fixturesVerified?matches.map(m=><View key={m.id} style={styles.match}>
      <View style={styles.row}><Text style={styles.round}>Jornada {m.roundNumber}</Text><Badge text={m.status==='COMPLETED'?'Terminado':'Por disputar'}/></View>
      <Text style={styles.matchName}>{m.home}  ·  {m.away}</Text>
      {m.status==='COMPLETED'?<Text style={styles.result}>{m.homeScore} — {m.awayScore}</Text>:null}
      {canRecord?<ScoreEditor key={`${m.id}-${m.status}-${m.homeScore}-${m.awayScore}`} match={m} tournament={tournament} busy={busy||syncing} onSave={save}/>:null}
    </View>):null}
    {fixturesVerified&&hasMore?<Button secondary title={busy?'A carregar…':'Carregar mais jogos'} disabled={busy||syncing} onPress={()=>{void more();}}/>:null}
   </View>:null}
   {canFinish?<View style={styles.panel}>
    <Text style={styles.heading}>Encerrar a liga</Text>
    <Text style={styles.helper}>Apenas quando todos os jogos estiverem concluídos. O backend valida a classificação e o campeão antes de fechar.</Text>
    <Button danger title={busy?'A processar…':'Encerrar liga'} disabled={busy||syncing||!allVisibleFinished} onPress={finish}/>
    {!allVisibleFinished?<Text style={styles.helper}>Conclui os jogos pendentes e carrega todas as páginas para desbloquear esta ação.</Text>:null}
   </View>:null}
   {officialOutcome?<View style={styles.panel}>
    <Text style={styles.heading}>{officialOutcome.title}</Text>
    <Text style={styles.helper}>{officialOutcome.detail}</Text>
    <Text style={styles.helper}>Os resultados finais estão disponíveis apenas para consulta.</Text>
   </View>:null}
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{fontSize:28,fontWeight:'900',color:C.white},row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 panel:{borderRadius:18,borderWidth:1,borderColor:C.border,padding:16,backgroundColor:C.surface,gap:13},
 heading:{fontSize:18,fontWeight:'900',color:C.white},helper:{fontSize:12,lineHeight:18,color:C.muted},round:{fontSize:12,fontWeight:'800',color:C.mint},
 match:{borderRadius:14,borderWidth:1,borderColor:C.border,padding:14,backgroundColor:C.surface2,gap:9},matchName:{fontSize:14,fontWeight:'800',color:C.white},result:{fontSize:18,fontWeight:'900',color:C.mint},
 standing:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderTopWidth:1,borderColor:C.border},
 rank:{minWidth:26,color:C.mint,fontWeight:'900'},standingName:{flex:1,color:C.white,fontWeight:'800',fontSize:13},
 standingPoints:{color:C.mint,fontWeight:'800',fontSize:13},group:{gap:8},
 editor:{gap:10},scoreRow:{flexDirection:'row',alignItems:'center',gap:10},scoreInput:{minWidth:76,minHeight:48,borderRadius:10,borderColor:C.border,borderWidth:1,color:C.white,backgroundColor:C.surface,padding:10,textAlign:'center',fontSize:17},dash:{fontSize:20,color:C.mint,fontWeight:'800'}
});
