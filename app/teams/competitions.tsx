import React,{useCallback,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {mySportsTeams,type SportsTeam} from '../../src/lib/sports-teams-api';
import {applyTeamToCompetition,discoverTeamCompetitions,myTeamApplications,
 type OpenTeamCompetition,type TeamCompetitionApplication} from '../../src/lib/team-competition-applications-api';
import {C} from '../../src/lib/theme';

export default function TeamCompetitionDiscovery(){
 const auth=useAuth(),router=useRouter(),{teamId}=useLocalSearchParams<{teamId?:string}>();
 const [query,setQuery]=useState(''),[sport,setSport]=useState('');
 const [filters,setFilters]=useState({query:'',sport:''});
 const requestVersion=useRef(0),applyingRef=useRef(false);
 const [applicationsVerified,setApplicationsVerified]=useState(false);
 const [ownedVerified,setOwnedVerified]=useState(false);
 const [rows,setRows]=useState<OpenTeamCompetition[]>([]),[teams,setTeams]=useState<SportsTeam[]>([]);
 const [applications,setApplications]=useState<TeamCompetitionApplication[]>([]);
 const [chosen,setChosen]=useState<number|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  const version=++requestVersion.current;
  setLoading(true);setError('');
  const [competitions,owned,requests]=await Promise.allSettled([
    discoverTeamCompetitions(filters.query,filters.sport,auth.token||undefined),
    auth.token?mySportsTeams(auth.token):Promise.resolve([]),
    auth.token?myTeamApplications(auth.token):Promise.resolve([])
  ]);
  if(version!==requestVersion.current)return;
  const failed:string[]=[];
  if(competitions.status==='fulfilled')setRows(competitions.value);
  else failed.push('competições');
  if(owned.status==='fulfilled'){
    setOwnedVerified(true);setTeams(owned.value);
    const wanted=Number(teamId);
    setChosen(current=>{
      if(Number.isSafeInteger(wanted)&&owned.value.some(t=>t.id===wanted))return wanted;
      return current!==null&&owned.value.some(t=>t.id===current)?current:null;
    });
  }else{setOwnedVerified(false);setChosen(null);failed.push('as tuas equipas');}
  if(requests.status==='fulfilled'){setApplications(requests.value);setApplicationsVerified(true);}
  else{setApplicationsVerified(false);failed.push('candidaturas anteriores');}
  if(failed.length)setError('Não foi possível atualizar '+failed.join(', ')+'. Podes continuar a consultar as restantes secções.');
  setLoading(false);
 },[filters,auth.token,teamId]);
 const search=()=>{const next={query:query.trim(),sport:sport.trim()};
  if(next.query===filters.query&&next.sport===filters.sport)void load();
  else setFilters(next);
 };
 useFocusEffect(useCallback(()=>{
  void load();
  return ()=>{requestVersion.current++;};
 },[load]));
 const applicationStatus=(competition:OpenTeamCompetition,teamId:number|null)=>
  teamId===null?null:applications.find(a=>a.teamId===teamId&&a.competitionId===competition.id
   &&a.competitionType===competition.type)?.status||null;
 const applied=(competition:OpenTeamCompetition,teamId:number|null)=>
  applicationStatus(competition,teamId)!==null;
 const applicationLabel=(competition:OpenTeamCompetition,teamId:number|null)=>{
  const status=applicationStatus(competition,teamId);
  return status==='APPROVED'?'Candidatura aprovada':
   status==='DECLINED'?'Candidatura recusada':status==='PENDING'?'Pedido em análise':null;
 };
 const apply=async(competition:OpenTeamCompetition)=>{
  if(!auth.token||!chosen||busy||loading||applyingRef.current||!ownedVerified||!applicationsVerified
     ||!competition.applicationsOpen||!rows.some(item=>item.id===competition.id&&item.type===competition.type
       &&item.communityId===competition.communityId&&item.applicationsOpen)
     ||!teams.some(team=>team.id===chosen)
     ||applied(competition,chosen))return;
  const current=requestVersion.current,selectedTeamId=chosen;
  applyingRef.current=true;setBusy(true);setError('');setNotice('');
  try{
   const next=await applyTeamToCompetition(competition.communityId,competition.type,
     competition.id,selectedTeamId,auth.token);
   if(current!==requestVersion.current)return;
   setApplications(previous=>[next,...previous.filter(item=>item.id!==next.id)]);
   setNotice('Candidatura enviada. O organizador poderá aceitar ou recusar.');
  }catch(e){
   if(current===requestVersion.current){
    // A timed-out POST may already have been committed. Confirm on GET before retrying.
    setApplicationsVerified(false);
    setError((e instanceof Error?e.message:'Não foi possível enviar o pedido.')+
     ' O pedido pode ter sido recebido. Verifica novamente as candidaturas antes de repetir.');
   }
  }finally{applyingRef.current=false;if(current===requestVersion.current)setBusy(false);}
 };
 return <Page>
  <Brand subtitle="COMPETIÇÕES PARA EQUIPAS"/><DemoBanner/>
  <Button secondary title="← Equipas" onPress={()=>router.push('/teams')}/>
  <Text style={styles.title}>Encontrar competições</Text>
  <Text style={styles.note}>Torneios e campeonatos de comunidades públicas que aceitam candidaturas de equipas.</Text>
  <TextInput style={styles.input} placeholder="Nome da competição ou comunidade" placeholderTextColor={C.muted}
    value={query} onChangeText={setQuery} maxLength={80} returnKeyType="search" onSubmitEditing={search}/>
  <TextInput style={styles.input} placeholder="Modalidade" placeholderTextColor={C.muted}
    value={sport} onChangeText={setSport} maxLength={80} returnKeyType="search" onSubmitEditing={search}/>
  <Button title="Pesquisar competições" onPress={search} disabled={loading}/>
  {error?<Message tone="error">{error}</Message>:null}
  {(!applicationsVerified||!ownedVerified)&&auth.token&&!loading?<Button secondary
    title="Verificar novamente candidaturas e equipas" disabled={busy} onPress={()=>void load()}/>:null}
  {notice?<Message>{notice}</Message>:null}
  {loading?<Loader/>:null}
  {!loading&&teams.length===0&&!error?<Message>Cria uma equipa ou torna-te responsável por uma para poderes pedir participação.</Message>:null}
  {teams.length>0?<View style={styles.panel}>
   <Text style={styles.subtitle}>Escolher a minha equipa</Text>
   {teams.map(team=><Pressable key={team.id} accessibilityRole="radio"
     accessibilityState={{selected:chosen===team.id}} onPress={()=>setChosen(team.id)}
     style={[styles.choice,chosen===team.id&&styles.chosen]}>
    <Text style={styles.name}>{chosen===team.id?'●':'○'} {team.name}</Text>
   </Pressable>)}
  </View>:null}
  {applications.length>0?<View style={styles.panel}>
   <Text style={styles.subtitle}>Pedidos já enviados</Text>
   {applications.map(a=><Text key={a.id} style={styles.note}>{a.teamName} · {a.competitionType==='TOURNAMENT'?'Torneio':'Campeonato'} · {a.status==='PENDING'?'Em análise':a.status==='APPROVED'?'Aprovado':'Recusado'}</Text>)}
  </View>:null}
  {!loading&&rows.length===0&&!error?<Message>Não há competições a aceitar equipas com estes filtros.</Message>:null}
  {rows.map(item=><View key={item.type+'-'+item.id} style={styles.panel}>
    <Text style={styles.note}>{item.type==='TOURNAMENT'?'Torneio':'Campeonato'} · {item.communityName}</Text>
    <Text style={styles.subtitle}>{item.name}</Text>
    <Text style={styles.note}>{item.sport||'Modalidade não indicada'}</Text>
    {!item.applicationsOpen?<Text style={styles.note}>Candidaturas encerradas</Text>:null}
    <Button title={applicationLabel(item,chosen)|| (busy?'A enviar…':'Pedir participação')}
      disabled={!auth.token||!chosen||busy||loading||!ownedVerified||!applicationsVerified||!item.applicationsOpen||applied(item,chosen)}
      onPress={()=>void apply(item)}/>
   </View>)}
  <Text style={styles.note}>A aprovação não inscreve automaticamente o plantel; os jogadores são confirmados pelas regras da competição.</Text>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:28,fontWeight:'900',color:C.white},
 subtitle:{fontSize:17,fontWeight:'900',color:C.white},
 name:{fontSize:14,fontWeight:'700',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:19},
 input:{minHeight:48,padding:13,backgroundColor:C.surface,color:C.white,borderWidth:1,borderColor:C.border,borderRadius:13},
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:17,padding:15,gap:10},
 choice:{borderRadius:10,borderWidth:1,borderColor:C.border,padding:10},
 chosen:{borderColor:C.mint}
});
