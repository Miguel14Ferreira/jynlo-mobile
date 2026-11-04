import React,{useCallback,useRef,useState} from 'react';
import {Alert,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {DEMO_MODE} from '../../../../src/lib/api';
import {useAuth} from '../../../../src/lib/auth';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {communityDetails} from '../../../../src/lib/community-api';
import {performanceOverview} from '../../../../src/lib/performance-api';
import {canManageEvents,managedKind,roundCollections,validateRacePointsCsv} from '../../../../src/lib/tournament-events-core.cjs';
import {changeTournamentRound,updateTournamentRacePoints} from '../../../../src/lib/tournament-events-api';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,TournamentPerformanceOverview,PerformanceRound} from '../../../../src/lib/types';

const ACTIONS={link:'Associar',unlink:'Retirar'} as const;
export default function TournamentEventsScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>();
 const cid=Number(params.communityId),tid=Number(params.id),router=useRouter(),auth=useAuth();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [role,setRole]=useState<string|null>(null);
 const [overview,setOverview]=useState<TournamentPerformanceOverview|null>(null);
 const [points,setPoints]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const locked=useRef(false);
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setTournament(null);setOverview(null);setRole(null);setLoading(false);return;}
  setLoading(true);setError('');setNotice('');setTournament(null);setOverview(null);setRole(null);
  try{
   const [t,community]=await Promise.all([
    tournamentDetails(cid,tid,auth.token,auth.username),
    communityDetails(cid,auth.token,auth.username)
   ]);
   setTournament(t);setRole('myRole' in community?community.myRole||null:null);
   if(managedKind(t)){
    const results=await performanceOverview(cid,t,auth.token,auth.username);
    setOverview(results);
    if(results.kind==='RACE')setPoints(results.data.pointsByPlace.join(', '));
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar as provas.');}
  finally{setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const collections=roundCollections(overview);
 const editable=!!tournament&&canManageEvents(role,tournament)&&!DEMO_MODE;
 async function mutate(action:()=>Promise<void>,success:string){
  if(locked.current||!auth.token||!auth.username||!tournament)return;
  locked.current=true;setBusy(true);setError('');setNotice('');
  try{
   await action();
   const [t,results]=await Promise.all([
    tournamentDetails(cid,tid,auth.token,auth.username),
    performanceOverview(cid,tournament,auth.token,auth.username)
   ]);
   setTournament(t);setOverview(results);
   if(results.kind==='RACE')setPoints(results.data.pointsByPlace.join(', '));
   setNotice(success);
  }catch(e){
   const message=e instanceof Error?e.message:'Falha ao guardar.';
   setError(message+' Confirma o estado atual antes de repetir a operação.');
  }finally{locked.current=false;setBusy(false);}
 }
 function confirmRound(round:PerformanceRound,action:'link'|'unlink'){
  if(!editable||busy||!tournament||!auth.token||!auth.username)return;
  const name=round.name||'Jornada '+round.id;
  const text=action==='link'
   ?'A primeira prova associada inicia automaticamente o campeonato. Os resultados existentes serão usados pelo servidor.'
   :'Retirar a última prova pode devolver o campeonato ao estado de preparação. Os resultados originais da jornada não são apagados.';
  Alert.alert(ACTIONS[action]+' prova?',name+'. '+text,[
   {text:'Cancelar',style:'cancel'},
   {text:ACTIONS[action],style:action==='unlink'?'destructive':'default',
    onPress:()=>{void mutate(
     ()=>changeTournamentRound(cid,tournament,round.id,action,auth.token!,auth.username!,role),
     action==='link'?'Prova associada.':'Prova retirada.'
    );}}
  ]);
 }
 function confirmPoints(){
  if(!editable||busy||!tournament||overview?.kind!=='RACE'||collections.linked.length)return;
  let normalized:string;
  try{normalized=validateRacePointsCsv(points);}catch(e){setError(e instanceof Error?e.message:'Pontuação inválida.');return;}
  Alert.alert('Guardar pontuação?',normalized.replace(/,/g,' · ')+' pontos por posição. Fica fixa ao associar a primeira corrida.',[
   {text:'Cancelar',style:'cancel'},
   {text:'Guardar',onPress:()=>{void mutate(
    ()=>updateTournamentRacePoints(cid,tournament,normalized,auth.token!,auth.username!,role),
    'Pontuação atualizada.'
   );}}
  ]);
 }
 function roundCard(round:PerformanceRound,action:'link'|'unlink'){
  return <View key={round.id} style={styles.round}>
   <View style={styles.roundText}>
    <Text style={styles.roundName}>{round.name||'Prova '+round.id}</Text>
    <Text style={styles.note}>{[round.sport,round.eventDiscipline].filter(Boolean).join(' · ')||'Jornada da comunidade'}</Text>
   </View>
   {editable?<Button secondary={action==='link'} danger={action==='unlink'}
    title={busy?'A guardar…':ACTIONS[action]} disabled={busy}
    onPress={()=>confirmRound(round,action)}/>:null}
  </View>;
 }
 const kind=tournament?managedKind(tournament):null;
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · ORGANIZAÇÃO DE PROVAS</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Gerir provas da competição'}</Text>
  {!auth.token?<Button title="Entrar" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&tournament&&!kind?<Message>Esta competição não utiliza jornadas de corridas, tempos ou marcas associáveis. Consulta a gestão própria da modalidade.</Message>:null}
  {!loading&&tournament&&kind&&!canManageEvents(role,tournament)&&tournament.status!=='COMPLETED'
   ?<Message>Esta página é exclusiva de proprietários e administradores da comunidade.</Message>:null}
  {!loading&&overview&&kind?<>
   <View style={styles.badges}><Badge text={tournament?.sport||'Modalidade'}/>
    <Badge text={tournament?.status==='DRAFT'?'Em preparação':tournament?.status==='IN_PROGRESS'?'A decorrer':'Concluído'}/></View>
   <Message>A classificação é calculada pelo backend com os resultados oficiais das jornadas. A app não cria tempos, marcas ou posições.</Message>
   {DEMO_MODE?<Message>Esta é uma demonstração isolada: associar e retirar provas está desativado.</Message>:null}
   {tournament?.status==='COMPLETED'?<Message>O campeonato está concluído. As provas e resultados estão apenas para consulta.</Message>:null}
   {overview.kind==='RACE'&&tournament?.status==='DRAFT'&&collections.linked.length===0?<>
    <View style={styles.panel}>
     <Text style={styles.heading}>Pontuação por posição</Text>
     <Text style={styles.note}>Separa até 20 posições por vírgulas, em ordem decrescente. Valores de 0 a 1000.</Text>
     <TextInput style={styles.input} value={points} onChangeText={setPoints} maxLength={100}
      accessibilityLabel="Pontos por posição" placeholder="25, 18, 15, 12, 10" placeholderTextColor={C.muted}
      editable={editable&&!busy}/>
     <Button title="Guardar pontuação" disabled={!editable||busy} onPress={confirmPoints}/>
    </View>
   </>:null}
   <View style={styles.panel}>
    <Text style={styles.heading}>Provas associadas · {collections.linked.length}</Text>
    {collections.linked.length===0?<Text style={styles.note}>Ainda não há provas associadas a este campeonato.</Text>
     :collections.linked.map(r=>roundCard(r,'unlink'))}
   </View>
   <View style={styles.panel}>
    <Text style={styles.heading}>Provas disponíveis · {collections.available.length}</Text>
    {collections.available.length===0?<Text style={styles.note}>Não existem mais jornadas elegíveis devolvidas pelo servidor.</Text>
     :collections.available.map(r=>roundCard(r,'link'))}
   </View>
   <Button secondary title="Consultar resultados da competição"
    onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/results',
     params:{communityId:String(cid),id:String(tid)}})}/>
  </>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:28,fontWeight:'900',color:C.white},
 badges:{flexDirection:'row',gap:8,flexWrap:'wrap'},
 panel:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,padding:16,borderRadius:18,gap:12},
 heading:{color:C.white,fontSize:18,fontWeight:'900'},
 note:{fontSize:12,color:C.muted,lineHeight:18},
 input:{minHeight:48,borderRadius:12,borderColor:C.border,borderWidth:1,backgroundColor:C.surface2,color:C.white,padding:12,fontSize:15},
 round:{flexDirection:'row',gap:10,alignItems:'center',borderTopWidth:1,borderTopColor:C.border,paddingTop:13},
 roundText:{flex:1,gap:4},roundName:{fontSize:14,fontWeight:'800',color:C.white}
});
