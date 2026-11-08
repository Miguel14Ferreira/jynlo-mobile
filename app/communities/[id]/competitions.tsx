import React,{useCallback,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {communityDetails} from '../../../src/lib/community-api';
import {tournamentsForCommunity} from '../../../src/lib/competition-api';
import {communityChampionships,type CommunityChampionship} from '../../../src/lib/championship-api';
import {canCreateTournamentForSport,groupCommunityTournaments} from '../../../src/lib/community-competition-core.cjs';
import {label} from '../../../src/lib/competition-core.cjs';
import {sportIcon} from '../../../src/lib/tournament-discovery-core.cjs';
import {C} from '../../../src/lib/theme';
import type {CommunityGroup,CommunitySummary,JynloTournament} from '../../../src/lib/types';

export default function CommunityCompetitions(){
 const params=useLocalSearchParams<{id:string}>(),id=Number(params.id);
 const router=useRouter(),auth=useAuth();
 const [community,setCommunity]=useState<CommunityGroup|CommunitySummary|null>(null);
 const [tournaments,setTournaments]=useState<JynloTournament[]>([]);
 const [championships,setChampionships]=useState<CommunityChampionship[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [retryCount,setRetryCount]=useState(0);
 const [championshipError,setChampionshipError]=useState('');
 useFocusEffect(useCallback(()=>{
  let active=true;
  const load=async()=>{
   if(!auth.token||!auth.username){if(active){setLoading(false);setError('');setCommunity(null);setTournaments([]);setChampionships([]);setChampionshipError('');}return;}
   if(!Number.isSafeInteger(id)||id<=0){if(active){setLoading(false);setCommunity(null);setTournaments([]);setChampionships([]);setChampionshipError('');setError('Comunidade inválida.');}return;}
   setLoading(true);setError('');setChampionshipError('');setCommunity(null);setTournaments([]);setChampionships([]);
   try{
    const c=await communityDetails(id,auth.token,auth.username);
    if(!active)return;
    setCommunity(c);
    if(!('myRole' in c)||!c.myRole){setTournaments([]);return;}
    const [data,championshipData]=await Promise.allSettled([tournamentsForCommunity(id,auth.token,auth.username),communityChampionships(id,auth.token)]);
    if(!active)return;
    if(data.status==='fulfilled')setTournaments(data.value);
    else throw data.reason;
    if(championshipData.status==='fulfilled')setChampionships(championshipData.value);
    else setChampionshipError(championshipData.reason instanceof Error?championshipData.reason.message:'Não foi possível carregar campeonatos.');
   }catch(e){if(active)setError(e instanceof Error?e.message:'Não foi possível carregar as competições.');}
   finally{if(active)setLoading(false);}
  };
  void load();
  return()=>{active=false;};
 },[id,auth.token,auth.username,retryCount]));
 const sections=useMemo(()=>groupCommunityTournaments(community,tournaments),[community,tournaments]);
 const role=community&&'myRole' in community?community.myRole:null;
 const organizer=role==='OWNER'||role==='ADMIN';
 return <Page><DemoBanner/><Eyebrow>COMPETIÇÕES POR MODALIDADE</Eyebrow>
  <Text style={styles.heading}>Competições da comunidade</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&auth.token?<Button secondary title="Tentar carregar competições novamente" onPress={()=>setRetryCount(current=>current+1)}/>:null}
  {community?<Text style={styles.sub}>{community.name} · Cada torneio mantém a sua própria classificação e regras de resultados.</Text>:null}
  {community&&!role?<Message>Entra na comunidade para veres os seus torneios e respetivas classificações.</Message>:null}
  {!loading&&!error&&!!role?<View style={styles.section}>
   <Text style={styles.sectionTitle}>Campeonatos</Text>
   <Text style={styles.small}>Um campeonato reúne vários torneios e as respetivas classificações.</Text>
   {championshipError?<Message tone="error">{championshipError}</Message>:null}
   {championshipError?<Button secondary title="Tentar carregar campeonatos novamente" onPress={()=>setRetryCount(value=>value+1)}/>:null}
   {!championshipError&&championships.length===0?<Text style={styles.small}>Ainda não existem campeonatos nesta comunidade.</Text>:null}
   {championships.map(championship=><Pressable key={championship.id} accessibilityRole="button" accessibilityLabel={'Abrir campeonato '+championship.name} style={styles.tournament}
    onPress={()=>router.push({pathname:'/communities/[id]/championships/[championshipId]',params:{id:String(id),championshipId:String(championship.id)}})}>
    <View style={{flex:1,gap:5}}><Text style={styles.tournamentTitle}>{championship.name}</Text>
     <Text style={styles.classification}>{championship.sport} · {championship.seasonLabel}</Text>
     <Text style={styles.small}>{championship.competitions.length} {championship.competitions.length===1?'torneio':'torneios'} associados</Text></View>
    <Text style={styles.chevron}>›</Text>
   </Pressable>)}
  </View>:null}
  {!loading&&!error&&!!role&&sections.length===0?<Message>Esta comunidade ainda não tem modalidades configuradas.</Message>:null}
  {!loading&&!error&&!!role?sections.map(section=><View key={section.sport} style={styles.section}>
   <View style={styles.header}>
    <Text style={styles.icon}>{sportIcon(section.sport)}</Text>
    <View style={{flex:1,gap:4}}>
     <Text style={styles.sectionTitle}>{section.sport}</Text>
     <Text style={styles.small}>{section.tournaments.length} {section.tournaments.length===1?'torneio':'torneios'}</Text>
    </View>
    {!section.selected?<Badge text="Histórico"/>:null}
   </View>
   {section.tournaments.length===0?<Text style={styles.small}>Ainda não existem torneios nesta modalidade.</Text>:null}
   {section.tournaments.map(tournament=><Pressable
     key={tournament.id} accessibilityRole="button"
     accessibilityLabel={'Abrir torneio '+tournament.name}
     style={styles.tournament}
     onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(id),id:String(tournament.id)}})}>
     <View style={{flex:1,gap:5}}>
      <Text style={styles.tournamentTitle}>{tournament.name}</Text>
      <Text style={styles.classification}>{label(tournament.kind)}</Text>
      <Text style={styles.small}>{tournament.status==='DRAFT'?'Em preparação':tournament.status==='IN_PROGRESS'?'A decorrer':'Concluído'}</Text>
     </View>
     <Text style={styles.chevron}>›</Text>
   </Pressable>)}
   {organizer&&section.selected&&community&&canCreateTournamentForSport(community,section.sport)?
     <Button secondary title={'Criar torneio de '+section.sport} onPress={()=>router.push({pathname:'/tournaments/create',params:{communityId:String(id),sport:section.sport}})}/>:null}
   {organizer&&section.selected&&community&&!canCreateTournamentForSport(community,section.sport)?
     <Text style={styles.small}>A criação nativa para esta modalidade ainda precisa de um formato de resultados validado. Os torneios existentes continuam acessíveis.</Text>:null}
  </View>):null}
  <Button secondary title="Voltar à comunidade" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:28,fontWeight:'900',color:C.white},sub:{fontSize:13,lineHeight:19,color:C.muted},
 section:{padding:17,gap:13,borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 header:{flexDirection:'row',alignItems:'center',gap:12},
 icon:{fontSize:28},sectionTitle:{fontSize:18,color:C.white,fontWeight:'900'},
 small:{fontSize:12,color:C.muted,lineHeight:18},
 tournament:{flexDirection:'row',alignItems:'center',gap:10,padding:13,backgroundColor:C.surface2,borderRadius:13},
 tournamentTitle:{color:C.white,fontSize:15,fontWeight:'800'},classification:{color:C.mint,fontSize:12,fontWeight:'700'},
 chevron:{fontSize:26,color:C.mint}
});
