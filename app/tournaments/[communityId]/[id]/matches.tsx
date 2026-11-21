import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {individualTournamentMatches} from '../../../../src/lib/performance-api';
import {classificationKind} from '../../../../src/lib/competition-core.cjs';
import {validPage,matchRound,matchScore} from '../../../../src/lib/tournament-fixtures-core.cjs';
import {validateFirstFixturePage,validateNextFixturePage} from '../../../../src/lib/tournament-organizer-pages.cjs';
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
 const generation=useRef(0),paging=useRef(false);
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){if(version===generation.current){setLoading(false);setTournament(null);setMatches([]);setMore(false);setPage(0);setBusy(false);}return;}
  if(!Number.isSafeInteger(cid)||cid<=0||!Number.isSafeInteger(tid)||tid<=0){
   if(version===generation.current){setTournament(null);setMatches([]);setMore(false);setError('Competição inválida.');setLoading(false);}
   return;
  }
  setLoading(true);setError('');setTournament(null);setMatches([]);setMore(false);setPage(0);
  try{
   const info=await tournamentDetails(cid,tid,auth.token,auth.username);
   if(version!==generation.current)return;
   setTournament(info);
   if(['INDIVIDUAL','CHESS'].includes(classificationKind(info))){
    const result=await individualTournamentMatches(cid,tid,0,auth.token,auth.username);
    if(version!==generation.current)return;
    const verified=validateFirstFixturePage<TournamentIndividualMatch>(result);
    setMatches(verified.matches);setPage(verified.page);setMore(verified.hasMore);
   }
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar os jogos.');}
  finally{if(version===generation.current)setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  paging.current=false;setBusy(false);setTournament(null);setMatches([]);setMore(false);setPage(0);
  void load(version);
  return()=>{generation.current++;};
 },[load]));
 const supported=tournament&&['INDIVIDUAL','CHESS'].includes(classificationKind(tournament));
 async function next(){if(!auth.token||!auth.username||paging.current||busy||!more||loading)return;
  const version=generation.current;
  paging.current=true;setBusy(true);setError('');
  try{const p=validPage(page+1),response=await individualTournamentMatches(cid,tid,p,auth.token,auth.username);
   if(version!==generation.current)return;
   const data=validateNextFixturePage<TournamentIndividualMatch>(response,p);
   setMatches(existing=>[...existing,...data.matches.filter(m=>!existing.some(x=>x.id===m.id))]);setPage(data.page);setMore(data.hasMore);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar mais jogos.');}
  finally{if(version===generation.current){paging.current=false;setBusy(false);}}
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIO · INDIVIDUAL</Eyebrow>
  <View style={styles.hero}><Text style={styles.heroLabel}>CALENDÁRIO · INDIVIDUAL</Text><Text maxFontSizeMultiplier={1.3} style={styles.title}>{tournament?.name||'Calendário individual'}</Text>
   {tournament?<Text style={styles.heroSubtitle}>{tournament.sport||'Multidesporto'} · Jogos e resultados confirmados</Text>:null}
  </View>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&tournament&&!supported?<Message>Esta modalidade não utiliza o calendário de confrontos individuais. Consulta a sua classificação específica.</Message>:null}
  {!loading&&supported&&matches.length===0&&!error?<Message>Ainda não existem jogos individuais publicados.</Message>:null}
  {!loading&&supported?matches.map(m=><View key={m.id} style={styles.card}>
   <View style={styles.row}><Badge text={matchRound(m)}/><Badge text={m.status==='COMPLETED'?'Concluído':'Por disputar'}/></View>
   <View style={styles.match}>
    <Text style={styles.player} numberOfLines={2}>{m.homeUsername||'Jogador não indicado'}</Text>
    <View style={[styles.scoreBox,m.status==='COMPLETED'&&styles.scoreBoxFinal]}><Text style={styles.score}>{matchScore(m)}</Text></View>
    <Text style={[styles.player,styles.awayPlayer]} numberOfLines={2}>{m.awayUsername||'Jogador não indicado'}</Text>
   </View>
  </View>):null}
  {more?<Button secondary title={busy?'A carregar…':'Carregar mais jogos'} disabled={busy} onPress={()=>{void next();}}/>:null}
  <Message>Os confrontos e resultados aparecem aqui assim que forem registados pela organização.</Message>
  {supported?<Button secondary title="Participantes e inscrições" onPress={()=>router.push({pathname:"/tournaments/[communityId]/[id]/participants",params:{communityId:String(cid),id:String(tid)}})}/>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 hero:{padding:17,borderWidth:1,borderColor:'#37C8AF5A',backgroundColor:'#082D3C',borderRadius:19,gap:9},
 heroLabel:{fontSize:11,fontWeight:'900',letterSpacing:1.2,color:'#8AF3D9'},
 heroSubtitle:{fontSize:13,color:'#ACD7DB',lineHeight:19},
 title:{color:C.white,fontSize:27,lineHeight:33,fontWeight:'900',letterSpacing:-.5},
 card:{backgroundColor:'#0A3340',padding:15,borderWidth:1,borderColor:'#3DC4B04D',borderRadius:17,gap:13},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8},
 match:{flexDirection:'row',gap:8,alignItems:'center',minWidth:0},
 player:{flex:1,minWidth:0,fontSize:13,lineHeight:18,fontWeight:'800',color:C.white,textAlign:'right'},
 awayPlayer:{textAlign:'left'},
 scoreBox:{width:118,minHeight:51,paddingHorizontal:7,paddingVertical:9,justifyContent:'center',alignItems:'center',backgroundColor:'#153D48',borderWidth:1,borderColor:'#409CA054',borderRadius:12},
 scoreBoxFinal:{backgroundColor:'#115D55',borderColor:'#4CDAB66B'},
 score:{fontSize:14,lineHeight:19,textAlign:'center',fontWeight:'900',color:'#B4FFE7'}
});
