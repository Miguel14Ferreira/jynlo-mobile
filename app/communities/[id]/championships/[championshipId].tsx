import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {communityChampionships,championshipStandings,type CommunityChampionship,type ChampionshipStandings} from '../../../../src/lib/championship-api';
import {C} from '../../../../src/lib/theme';

export default function ChampionshipDetail(){
 const {id,championshipId}=useLocalSearchParams<{id:string;championshipId:string}>();
 const communityId=Number(id),competitionId=Number(championshipId),auth=useAuth(),router=useRouter();
 const [championship,setChampionship]=useState<CommunityChampionship|null>(null);
 const [standings,setStandings]=useState<ChampionshipStandings|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[standingsError,setStandingsError]=useState('');
 const [retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=>{
  let active=true;
  const load=async()=>{
   setLoading(true);setError('');setStandingsError('');setChampionship(null);setStandings(null);
   try{
    if(!auth.token)throw Error('Inicia sessão para consultar campeonatos.');
    if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(competitionId)||competitionId<=0)throw Error('Campeonato inválido.');
    const championships=await communityChampionships(communityId,auth.token);
    if(!active)return;
    const selected=championships.find(item=>item.id===competitionId);
    if(!selected)throw Error('Campeonato não encontrado ou sem acesso.');
    setChampionship(selected);
    try{
     const table=await championshipStandings(communityId,competitionId,auth.token);
     if(active)setStandings(table);
    }catch(e){if(active)setStandingsError(e instanceof Error?e.message:'Não foi possível carregar a classificação.');}
   }catch(e){if(active)setError(e instanceof Error?e.message:'Não foi possível abrir o campeonato.');}
   finally{if(active)setLoading(false);}
  };
  void load();return()=>{active=false;};
 },[communityId,competitionId,auth.token,retry]));
 return <Page><DemoBanner/><Eyebrow>CAMPEONATO</Eyebrow>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error?<Button secondary title="Tentar novamente" onPress={()=>setRetry(value=>value+1)}/>:null}
  {championship?<View style={styles.card}>
   <Text style={styles.heading}>{championship.name}</Text>
   <Text style={styles.sub}>{championship.sport} · Época {championship.seasonLabel}</Text>
   <Text style={styles.title}>Provas do campeonato</Text>
   {championship.competitions.length===0?<Text style={styles.sub}>Ainda não há torneios associados.</Text>:null}
   {championship.competitions.map(item=><View key={item.id} style={styles.row}>
    <Text style={styles.name}>{item.name}</Text>
    <Text style={styles.sub}>{item.status} · {item.winnerConfirmed?'Vencedor confirmado':'Resultado pendente'}</Text>
    <Button secondary title="Ver torneio" onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(communityId),id:String(item.id)}})}/>
   </View>)}
   <Text style={styles.title}>Classificação geral</Text>
   {standingsError?<Message tone="error">{standingsError}</Message>:null}
   {standingsError?<Button secondary title="Recarregar classificação" onPress={()=>setRetry(value=>value+1)}/>:null}
   {standings?<Text style={styles.sub}>{standings.fullyScoredCompetitions} provas pontuadas · {standings.winnerOnlyCompetitions} só com vencedor · {standings.pendingCompetitions} pendentes</Text>:null}
   {standings&&standings.standings.length===0?<Text style={styles.sub}>Ainda não existem resultados confirmados para a classificação.</Text>:null}
   {standings?.standings.map((row,index)=><View key={row.entryType+':'+row.participantId} style={styles.standing}>
    <Text style={styles.name}>{index+1}. {row.name}</Text>
    <Text style={styles.sub}>{row.points} pontos · {row.victories} vitórias · {row.awardedCompetitions} provas</Text>
   </View>)}
  </View>:null}
  <Button secondary title="Voltar às competições" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 card:{padding:17,gap:13,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 heading:{fontSize:25,fontWeight:'900',color:C.white},
 title:{fontSize:18,fontWeight:'800',color:C.white,marginTop:8},
 name:{fontSize:15,fontWeight:'700',color:C.white},
 sub:{fontSize:13,lineHeight:19,color:C.muted},
 row:{gap:7,padding:12,backgroundColor:C.surface2,borderRadius:12},
 standing:{gap:4,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.border}
});
