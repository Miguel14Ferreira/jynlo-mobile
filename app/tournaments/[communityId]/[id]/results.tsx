import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {performanceOverview} from '../../../../src/lib/performance-api';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {isPerformanceKind,label,classificationKind} from '../../../../src/lib/competition-core.cjs';
import {displayPerson,formatMetres,formatPoints,formatSeconds,sourceRounds,stageLabel,validatedRank} from '../../../../src/lib/performance-core.cjs';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,TournamentPerformanceOverview,PerformanceRound} from '../../../../src/lib/types';

function RankingRow({rank,name,main,sub}:{rank:number;name:string;main:string;sub:string}){
 return <View style={styles.ranking}>
  <Text style={styles.position}>{validatedRank(rank)}.</Text>
  <View style={styles.athlete}><Text style={styles.name}>{name}</Text><Text style={styles.note}>{sub}</Text></View>
  <Text style={styles.performance}>{main}</Text>
 </View>;
}
function EventRounds({rounds,title}:{rounds:PerformanceRound[];title:string}){
 const valid=sourceRounds(rounds);
 return <View style={styles.panel}><Text style={styles.heading}>{title}</Text>
  {valid.length===0?<Text style={styles.note}>Ainda não existem provas associadas.</Text>:valid.map(round=><View key={round.id} style={styles.round}>
   <Text style={styles.name}>{round.name||'Prova sem designação'}</Text>
   <Text style={styles.note}>{round.sport||'Modalidade não indicada'}{round.eventDiscipline?` · ${round.eventDiscipline}`:''}</Text>
  </View>)}
 </View>;
}
export default function TournamentResultsScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>();
 const cid=Number(params.communityId),tid=Number(params.id),router=useRouter(),auth=useAuth();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [overview,setOverview]=useState<TournamentPerformanceOverview|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0);
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){if(version===generation.current){setTournament(null);setOverview(null);setLoading(false);}return;}
  setLoading(true);setError('');setTournament(null);setOverview(null);
  try{
   const details=await tournamentDetails(cid,tid,auth.token,auth.username);
   if(version!==generation.current)return;
   setTournament(details);
   if(isPerformanceKind(classificationKind(details))){
    const result=await performanceOverview(cid,details,auth.token,auth.username);
    if(version===generation.current)setOverview(result);
   }
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar esta prova.');}
  finally{if(version===generation.current)setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  void load(version);
  return()=>{generation.current++;};
 },[load]));
 const kind=tournament?classificationKind(tournament):'UNSUPPORTED';
 return <Page><DemoBanner/><Eyebrow>RESULTADOS DA COMPETIÇÃO</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Resultados desportivos'}</Text>
  {tournament?<View style={styles.badges}><Badge text={tournament.sport||'Multidesporto'}/><Badge text={label(kind)}/></View>:null}
  {!auth.token?<Button title="Entrar para ver resultados" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&tournament&&!isPerformanceKind(kind)?<Message>Esta modalidade tem outro formato de competição. Consulta o ecrã principal do torneio.</Message>:null}
  {overview?.kind==='RACE'?<>
   <View style={styles.panel}><Text style={styles.heading}>Campeonato · pilotos</Text>
    <Text style={styles.note}>Pontuação por corrida atribuída pelo backend. Não calculamos posições nesta app.</Text>
    {overview.data.standings.length===0?<Message>Ainda não há classificações de corridas.</Message>:overview.data.standings.map((row,i)=><RankingRow key={`${row.playerId??'piloto'}-${i}`}
     rank={row.position} name={displayPerson(row.fullName,row.username)} main={formatPoints(row.championshipPoints)}
     sub={`${row.races} corridas · ${row.podiums} pódios${row.penaltyPoints?` · ${row.penaltyPoints} penalizações`:''}`}/>)}
   </View>
   <EventRounds title="Corridas incluídas" rounds={overview.data.linkedRaces}/>
   <Message>Os pontos por posição e as penalizações são aplicados pelo servidor. A app apenas apresenta os resultados existentes.</Message>
  </>:null}
  {overview?.kind==='TIMED'?<>
   <View style={styles.panel}><Text style={styles.heading}>Melhores tempos</Text>
    <Text style={styles.note}>{[overview.data.eventType,overview.data.eventDiscipline].filter(Boolean).join(' · ')||'Prova cronometrada'}</Text>
    {overview.data.standings.length===0?<Message>Ainda não há tempos válidos associados ao torneio.</Message>:overview.data.standings.map((row,i)=><RankingRow key={`${row.communityPlayerId??'atleta'}-${i}`}
     rank={row.position} name={displayPerson(row.fullName,row.username)} main={formatSeconds(row.bestSeconds)}
     sub={`${row.validAttempts} ${row.validAttempts===1?'tentativa válida':'tentativas válidas'}`}/>)}
   </View>
   <EventRounds title="Provas cronometradas incluídas" rounds={overview.data.linkedRounds}/>
   <Message>Classificação provisória pelo melhor tempo. Não substitui regras oficiais de desempate da modalidade.</Message>
  </>:null}
  {overview?.kind==='MEASURED'?<>
   <View style={styles.panel}><Text style={styles.heading}>Melhores marcas</Text>
    <Text style={styles.note}>{[overview.data.eventType,overview.data.eventDiscipline].filter(Boolean).join(' · ')||'Prova de marcas'}</Text>
    {overview.data.standings.length===0?<Message>Ainda não existem marcas válidas.</Message>:overview.data.standings.map((row,i)=><RankingRow key={`${row.communityPlayerId??'atleta'}-${i}`}
     rank={row.position} name={displayPerson(row.fullName,row.username)} main={formatMetres(row.bestMetres)}
     sub={`${row.validMarks} ${row.validMarks===1?'marca válida':'marcas válidas'}`}/>)}
   </View>
   <EventRounds title="Provas de marcas incluídas" rounds={overview.data.linkedRounds}/>
   <Message>O ranking é provisório e segue as marcas devolvidas pelo servidor, sem criar critérios oficiais de desempate.</Message>
  </>:null}
  {overview?.kind==='RELAY'?<>
   <View style={styles.panel}><Text style={styles.heading}>Estafetas · qualificação</Text>
    <Text style={styles.note}>{overview.data.eventDiscipline||'Disciplina não indicada'} · Tempos de equipa</Text>
    {(overview.data.qualifyingStandings||[]).length===0?<Message>Sem resultados de qualificação disponíveis.</Message>:
     overview.data.qualifyingStandings.map((row,i)=><RankingRow key={`${row.teamId}-${i}`}
      rank={row.position} name={row.teamName} main={formatSeconds(row.bestSeconds)}
      sub={`${row.recordedHeats} ${row.recordedHeats===1?'série registada':'séries registadas'}`}/>)}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Final</Text>
    {!overview.data.finalPublished?<Message>A final ainda não foi publicada pelo organizador.</Message>:
     overview.data.finalStandings.length===0?<Message>Final publicada, mas sem resultados classificados.</Message>:
      overview.data.finalStandings.map((row,i)=><RankingRow key={`final-${row.teamId}-${i}`}
       rank={row.position} name={row.teamName} main={formatSeconds(row.bestSeconds)}
       sub={`${row.recordedHeats} ${row.recordedHeats===1?'série':'séries'}`}/>)}
    <Text style={styles.note}>{overview.data.finalists?.length||0} finalistas registados pelo servidor.</Text>
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Séries registadas</Text>
    {overview.data.heats.length===0?<Text style={styles.note}>Ainda sem séries.</Text>:
     overview.data.heats.map(h=><View key={h.id} style={styles.round}>
      <Text style={styles.name}>{h.teamName} · {stageLabel(h.stage)} {h.heatNumber}</Text>
      <Text style={styles.note}>{h.decisionStatus==='DISQUALIFIED'?'Desqualificada':h.decisionStatus==='VALID'?formatSeconds(h.elapsedSeconds):'Estado por confirmar'}</Text>
     </View>)}
   </View>
   <Message>Finalistas, decisões e resultados da final vêm exclusivamente do backend; a app não promove equipas automaticamente.</Message>
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{color:C.white,fontSize:28,fontWeight:'900'},badges:{flexDirection:'row',flexWrap:'wrap',gap:8},panel:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,padding:16,borderRadius:18,gap:12},heading:{color:C.white,fontSize:18,fontWeight:'900'},
 ranking:{flexDirection:'row',alignItems:'center',borderTopColor:C.border,borderTopWidth:1,paddingTop:13,gap:8},position:{fontSize:17,fontWeight:'900',color:C.mint,minWidth:28},athlete:{flex:1,gap:3},name:{fontSize:14,color:C.white,fontWeight:'800'},performance:{fontSize:14,color:C.mint,fontWeight:'900'},note:{fontSize:12,color:C.muted,lineHeight:18},round:{paddingTop:12,borderTopWidth:1,borderTopColor:C.border,gap:5}});
