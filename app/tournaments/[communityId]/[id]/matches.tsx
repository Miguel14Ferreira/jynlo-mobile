import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {individualTournamentMatches} from '../../../../src/lib/performance-api';
import {classificationKind} from '../../../../src/lib/competition-core.cjs';
import {validPage,matchRound,matchScore} from '../../../../src/lib/tournament-fixtures-core.cjs';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
import type {JynloTournament,TournamentIndividualMatch} from '../../../../src/lib/types';
export default function IndividualMatchesScreen(){
 const params=useLocalSearchParams<{communityId:string;id:string}>(),cid=Number(params.communityId),tid=Number(params.id);
 const router=useRouter(),auth=useAuth();
 const [tournament,setTournament]=useState<JynloTournament|null>(null);
 const [matches,setMatches]=useState<TournamentIndividualMatch[]>([]);
 const [page,setPage]=useState(0),[more,setMore]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setLoading(false);setTournament(null);setMatches([]);return;}
  setLoading(true);setError('');setTournament(null);setMatches([]);setMore(false);setPage(0);
  try{
   const info=await tournamentDetails(cid,tid,auth.token,auth.username);setTournament(info);
   if(['INDIVIDUAL','CHESS'].includes(classificationKind(info))){
    const result=await individualTournamentMatches(cid,tid,0,auth.token,auth.username);
    setMatches(result.matches);setPage(result.page);setMore(result.hasMore);
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os jogos.');}
  finally{setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const supported=tournament&&['INDIVIDUAL','CHESS'].includes(classificationKind(tournament));
 async function next(){if(!auth.token||!auth.username||busy||!more)return;
  setBusy(true);setError('');
  try{const p=validPage(page+1),data=await individualTournamentMatches(cid,tid,p,auth.token,auth.username);
   setMatches(existing=>[...existing,...data.matches.filter(m=>!existing.some(x=>x.id===m.id))]);setPage(data.page);setMore(data.hasMore);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar mais jogos.');}
  finally{setBusy(false);}
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIO · INDIVIDUAL</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Calendário individual'}</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&tournament&&!supported?<Message>Esta modalidade não utiliza o calendário de confrontos individuais. Consulta a sua classificação específica.</Message>:null}
  {!loading&&supported&&matches.length===0?<Message>Ainda não existem jogos individuais publicados.</Message>:null}
  {!loading&&supported?matches.map(m=><View key={m.id} style={styles.card}>
   <View style={styles.row}><Badge text={matchRound(m)}/><Badge text={m.status==='COMPLETED'?'Concluído':'Por disputar'}/></View>
   <View style={styles.match}><Text style={styles.player}>{m.homeUsername||'Jogador não indicado'}</Text>
    <Text style={styles.score}>{matchScore(m)}</Text>
    <Text style={styles.player}>{m.awayUsername||'Jogador não indicado'}</Text></View>
  </View>):null}
  {more?<Button secondary title={busy?'A carregar…':'Carregar mais jogos'} disabled={busy} onPress={()=>{void next();}}/>:null}
  <Message>Os confrontos e resultados são devolvidos pelo backend. Não calculamos vencedores, classificações nem rondas automaticamente.</Message>
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{color:C.white,fontSize:28,fontWeight:'900'},card:{backgroundColor:C.surface,padding:16,borderWidth:1,borderColor:C.border,borderRadius:17,gap:14},row:{flexDirection:'row',flexWrap:'wrap',gap:8},match:{gap:10,alignItems:'center'},player:{fontSize:15,fontWeight:'800',color:C.white},score:{fontSize:20,fontWeight:'900',color:C.mint}});
