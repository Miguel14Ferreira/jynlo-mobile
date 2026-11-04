import React,{useCallback,useState} from 'react';
import {Alert,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {DEMO_MODE} from '../../../../src/lib/api';
import {communityDetails} from '../../../../src/lib/community-api';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {teamTournamentMatches} from '../../../../src/lib/tournament-fixtures-api';
import {individualTournamentMatches} from '../../../../src/lib/performance-api';
import {canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,isOrganizer,organizerFixtureType,validateTournamentScore} from '../../../../src/lib/tournament-organizer-core.cjs';
import {managedKind} from '../../../../src/lib/tournament-events-core.cjs';
import {finishTournamentLeague,publishTournamentSchedule,saveTournamentMatchResult} from '../../../../src/lib/tournament-organizer-api';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,TournamentTeamMatch,TournamentIndividualMatch} from '../../../../src/lib/types';

type OrganizerMatch={id:number;roundNumber:number;home:string;away:string;status:'COMPLETED'|'SCHEDULED';homeScore:number|null;awayScore:number|null};
function mapTeam(m:TournamentTeamMatch):OrganizerMatch{return {id:m.id,roundNumber:m.roundNumber,home:m.homeTeamName,away:m.awayTeamName,status:m.status,homeScore:m.homeScore,awayScore:m.awayScore};}
function mapIndividual(m:TournamentIndividualMatch):OrganizerMatch{return {id:m.id,roundNumber:m.roundNumber,home:m.homeUsername,away:m.awayUsername,status:m.status,homeScore:m.homeScore,awayScore:m.awayScore};}
function ScoreEditor({match,busy,onSave}:{match:OrganizerMatch;busy:boolean;onSave:(matchId:number,home:string,away:string)=>void}){
 const [home,setHome]=useState(match.homeScore==null?'':String(match.homeScore));
 const [away,setAway]=useState(match.awayScore==null?'':String(match.awayScore));
 let valid=true;try{validateTournamentScore(home,away);}catch{valid=false;}
 return <View style={styles.editor}>
  <Text style={styles.helper}>Resultado · {match.home} / {match.away}</Text>
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
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setLoading(false);setTournament(null);setRole(null);return;}
  setLoading(true);setError('');setMatches([]);setHasMore(false);setPage(0);
  try{
   const [info,community]=await Promise.all([
    tournamentDetails(cid,tid,auth.token,auth.username),
    communityDetails(cid,auth.token,auth.username)
   ]);
   const currentRole='myRole' in community?community.myRole:null;
   setTournament(info);setRole(currentRole||null);
   const kind=organizerFixtureType(info);
   if(!isOrganizer(currentRole)||!kind||info.status==='DRAFT')return;
   const response=kind==='TEAM'?await teamTournamentMatches(cid,tid,0,auth.token,auth.username):await individualTournamentMatches(cid,tid,0,auth.token,auth.username);
   setMatches(response.matches.map(m=>kind==='TEAM'?mapTeam(m as TournamentTeamMatch):mapIndividual(m as TournamentIndividualMatch)));
   setPage(response.page);setHasMore(response.hasMore);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar a gestão do torneio.');}
  finally{setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const type=tournament?organizerFixtureType(tournament):null;
 const canPublish=canGenerateSchedule(role,tournament)&&!DEMO_MODE;
 const canRecord=canRecordTournamentResult(role,tournament)&&!DEMO_MODE;
 const canFinish=canCompleteTournament(role,tournament)&&!DEMO_MODE;
 const allVisibleFinished=matches.length>0&&!hasMore&&matches.every(m=>m.status==='COMPLETED');
 async function act(run:()=>Promise<unknown>,success:string){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{await run();await load();setNotice(success);}
  catch(e){setError((e instanceof Error?e.message:'Não foi possível concluir a ação.')+' Confirma o estado atual antes de repetir.');}
  finally{setBusy(false);}
 }
 function publish(){if(!tournament||!canPublish||!auth.token||!auth.username)return;
  Alert.alert('Publicar calendário?','Esta ação inicia o torneio e fecha as inscrições. Confirma primeiro as equipas ou os participantes.',[
   {text:'Voltar',style:'cancel'},
   {text:'Publicar calendário',onPress:()=>{void act(()=>publishTournamentSchedule(cid,tournament,auth.token!,auth.username!),'Calendário publicado pelo servidor.');}}
  ]);
 }
 function save(id:number,home:string,away:string){if(!tournament||!canRecord||!auth.token||!auth.username)return;
  try{validateTournamentScore(home,away);}catch(e){setError(e instanceof Error?e.message:'Resultado inválido.');return;}
  Alert.alert('Confirmar resultado?',`Registar ${home} — ${away}? A classificação será calculada pelo servidor.`,[
   {text:'Cancelar',style:'cancel'},
   {text:'Guardar',onPress:()=>{void act(()=>saveTournamentMatchResult(cid,tournament,id,home,away,auth.token!,auth.username!),'Resultado registado pelo servidor.');}}
  ]);
 }
 function finish(){if(!tournament||!canFinish||!allVisibleFinished||!auth.token||!auth.username)return;
  Alert.alert('Encerrar a liga?','Esta ação fecha a competição e fixa o resultado oficial. Depois de concluída, não poderás alterar os jogos.',[
   {text:'Manter aberta',style:'cancel'},
   {text:'Encerrar liga',style:'destructive',onPress:()=>{void act(()=>finishTournamentLeague(cid,tournament,auth.token!,auth.username!),'Liga encerrada pelo servidor.');}}
  ]);
 }
 async function more(){if(!tournament||!type||!auth.token||!auth.username||busy||!hasMore)return;
  setBusy(true);setError('');
  try{const next=page+1;
   const response=type==='TEAM'?await teamTournamentMatches(cid,tid,next,auth.token,auth.username):await individualTournamentMatches(cid,tid,next,auth.token,auth.username);
   const items=response.matches.map(m=>type==='TEAM'?mapTeam(m as TournamentTeamMatch):mapIndividual(m as TournamentIndividualMatch));
   setMatches(previous=>[...previous,...items.filter(m=>!previous.some(x=>x.id===m.id))]);setPage(response.page);setHasMore(response.hasMore);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar mais jogos.');}
  finally{setBusy(false);}
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · ORGANIZAÇÃO</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Gestão do torneio'}</Text>
  {!auth.token?<Button title="Entrar" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}{notice?<Message>{notice}</Message>:null}
  {!loading&&tournament&&!isOrganizer(role)?<Message>Este painel é exclusivo para proprietários e administradores da comunidade.</Message>:null}
  {!loading&&tournament&&isOrganizer(role)&&!type?<><Message>Esta modalidade utiliza regras próprias de resultados. Não aplicamos uma tabela de jogos genérica.</Message>
    {managedKind(tournament)?<Button secondary title="Gerir jornadas da competição"
     onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/events',
      params:{communityId:String(cid),id:String(tid)}})}/>:null}
   </>:null}
  {!loading&&tournament&&isOrganizer(role)&&type?<>
   <View style={styles.row}><Badge text={tournament.sport||'Modalidade'}/><Badge text={tournament.status==='DRAFT'?'Em preparação':tournament.status==='IN_PROGRESS'?'A decorrer':'Concluído'}/></View>
   {DEMO_MODE?<Message>Estás a utilizar dados de demonstração. As operações de organização estão bloqueadas para não simular alterações ao servidor real.</Message>:null}
   {canPublish?<View style={styles.panel}>
    <Text style={styles.heading}>Preparação do torneio</Text>
    <Text style={styles.helper}>Confirma primeiro as inscrições e os plantéis. Publicar o calendário inicia o torneio.</Text>
    <Button title={busy?'A guardar…':'Publicar calendário e iniciar torneio'} disabled={busy} onPress={publish}/>
   </View>:null}
   {tournament.status==='IN_PROGRESS'?<View style={styles.panel}>
    <Text style={styles.heading}>Jogos e resultados</Text>
    <Text style={styles.helper}>{matches.length} jogos carregados{hasMore?' · existem mais páginas':''}. Os resultados nunca são calculados pelo telemóvel.</Text>
    {matches.length===0?<Message>Ainda não existem jogos publicados neste torneio.</Message>:null}
    {matches.map(m=><View key={m.id} style={styles.match}>
      <View style={styles.row}><Text style={styles.round}>Jornada {m.roundNumber}</Text><Badge text={m.status==='COMPLETED'?'Terminado':'Por disputar'}/></View>
      <Text style={styles.matchName}>{m.home}  ·  {m.away}</Text>
      {m.status==='COMPLETED'?<Text style={styles.result}>{m.homeScore} — {m.awayScore}</Text>:null}
      {canRecord?<ScoreEditor key={`${m.id}-${m.status}-${m.homeScore}-${m.awayScore}`} match={m} busy={busy} onSave={save}/>:null}
    </View>)}
    {hasMore?<Button secondary title={busy?'A carregar…':'Carregar mais jogos'} disabled={busy} onPress={()=>{void more();}}/>:null}
   </View>:null}
   {canFinish?<View style={styles.panel}>
    <Text style={styles.heading}>Encerrar a liga</Text>
    <Text style={styles.helper}>Apenas quando todos os jogos estiverem concluídos. O backend valida a classificação e o campeão antes de fechar.</Text>
    <Button danger title={busy?'A processar…':'Encerrar liga'} disabled={busy||!allVisibleFinished} onPress={finish}/>
    {!allVisibleFinished?<Text style={styles.helper}>Conclui os jogos pendentes e carrega todas as páginas para desbloquear esta ação.</Text>:null}
   </View>:null}
   {tournament.status==='COMPLETED'?<Message>Torneio concluído. Os resultados estão disponíveis apenas para consulta.</Message>:null}
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{fontSize:28,fontWeight:'900',color:C.white},row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 panel:{borderRadius:18,borderWidth:1,borderColor:C.border,padding:16,backgroundColor:C.surface,gap:13},
 heading:{fontSize:18,fontWeight:'900',color:C.white},helper:{fontSize:12,lineHeight:18,color:C.muted},round:{fontSize:12,fontWeight:'800',color:C.mint},
 match:{borderRadius:14,borderWidth:1,borderColor:C.border,padding:14,backgroundColor:C.surface2,gap:9},matchName:{fontSize:14,fontWeight:'800',color:C.white},result:{fontSize:18,fontWeight:'900',color:C.mint},
 editor:{gap:10},scoreRow:{flexDirection:'row',alignItems:'center',gap:10},scoreInput:{minWidth:76,minHeight:48,borderRadius:10,borderColor:C.border,borderWidth:1,color:C.white,backgroundColor:C.surface,padding:10,textAlign:'center',fontSize:17},dash:{fontSize:20,color:C.mint,fontWeight:'800'}
});
