import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {mySportsTeams,type SportsTeam} from '../../src/lib/sports-teams-api';
import {applyTeamToCompetition,discoverTeamCompetitions,myTeamApplications,
 type OpenTeamCompetition,type TeamCompetitionApplication} from '../../src/lib/team-competition-applications-api';
import {C} from '../../src/lib/theme';
import TeamBrandAvatar from '../../src/components/TeamBrandAvatar';
import TeamKitPreview from '../../src/components/TeamKitPreview';
import {JynloIcon} from '../../src/components/JynloIcon';

export default function TeamCompetitionDiscovery(){
 const auth=useAuth(),router=useRouter(),{teamId}=useLocalSearchParams<{teamId?:string}>();
 const [query,setQuery]=useState(''),[sport,setSport]=useState('');
 const [filters,setFilters]=useState({query:'',sport:''});
 const requestVersion=useRef(0),applyingRef=useRef(false),applyGeneration=useRef(0);
 const [applicationsVerified,setApplicationsVerified]=useState(false);
 const [ownedVerified,setOwnedVerified]=useState(false);
 const [rows,setRows]=useState<OpenTeamCompetition[]>([]),[teams,setTeams]=useState<SportsTeam[]>([]);
 const [applications,setApplications]=useState<TeamCompetitionApplication[]>([]);
 const [chosen,setChosen]=useState<number|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 // Clear private records before loading under another account, including on logout.
 useEffect(()=>{
  requestVersion.current++;applyGeneration.current++;applyingRef.current=false;
  setApplications([]);setTeams([]);setChosen(null);
  setApplicationsVerified(false);setOwnedVerified(false);
  setRows([]);setNotice('');setError('');setBusy(false);setLoading(true);
 },[auth.token]);
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
  else{setRows([]);failed.push('competições');}
  if(owned.status==='fulfilled'&&auth.token){
    setOwnedVerified(true);setTeams(owned.value);
    const wanted=Number(teamId);
    setChosen(current=>{
      if(Number.isSafeInteger(wanted)&&owned.value.some(t=>t.id===wanted))return wanted;
      return current!==null&&owned.value.some(t=>t.id===current)?current:null;
    });
  }else{
    setOwnedVerified(false);setTeams([]);setChosen(null);
    if(auth.token)failed.push('as tuas equipas');
  }
  if(requests.status==='fulfilled'&&auth.token){
    setApplications(requests.value);setApplicationsVerified(true);
  }else{
    setApplications([]);setApplicationsVerified(false);
    if(auth.token)failed.push('candidaturas anteriores');
  }
  if(failed.length)setError('Não foi possível atualizar '+failed.join(', ')+'. Podes continuar a consultar as restantes secções.');
  setLoading(false);
 },[filters,auth.token,teamId]);
 const search=()=>{const next={query:query.trim(),sport:sport.trim()};
  if(next.query===filters.query&&next.sport===filters.sport)void load();
  else setFilters(next);
 };
 useFocusEffect(useCallback(()=>{
  // A previous screen or account may still have a timed-out application pending.
  // Restore the new screen's controls before checking current server state.
  setBusy(false);
  void load();
  return ()=>{requestVersion.current++;applyGeneration.current++;applyingRef.current=false;};
 },[load]));
 const applicationStatus=(competition:OpenTeamCompetition,teamId:number|null)=>
  teamId===null?null:applications.find(a=>a.teamId===teamId&&a.communityId===competition.communityId
   &&a.competitionId===competition.id&&a.competitionType===competition.type)?.status||null;
 const applied=(competition:OpenTeamCompetition,teamId:number|null)=>
  applicationStatus(competition,teamId)!==null;
 const applicationLabel=(competition:OpenTeamCompetition,teamId:number|null)=>{
  const status=applicationStatus(competition,teamId);
  return status==='APPROVED'?'Aprovada · inscrição por confirmar':
   status==='DECLINED'?'Candidatura recusada':status==='PENDING'?'Pedido em análise':null;
 };
 const apply=async(competition:OpenTeamCompetition)=>{
  if(!auth.token||!chosen||busy||loading||applyingRef.current||!ownedVerified||!applicationsVerified
     ||!competition.applicationsOpen||!rows.some(item=>item.id===competition.id&&item.type===competition.type
       &&item.communityId===competition.communityId&&item.applicationsOpen)
     ||!teams.some(team=>team.id===chosen)
     ||applied(competition,chosen))return;
  const current=requestVersion.current,selectedTeamId=chosen,action=++applyGeneration.current;
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
  }finally{
   // An old account's pending POST must not unlock a new account's request.
   if(action===applyGeneration.current){
    applyingRef.current=false;
    if(current===requestVersion.current)setBusy(false);
   }
  }
 };
 return <Page>
  <DemoBanner/>
  <Pressable accessibilityRole="button" accessibilityLabel="Voltar às equipas" onPress={()=>router.push('/teams')} style={styles.backAction}>
   <JynloIcon name="back" size={19} color={C.mint}/><Text style={styles.backActionText}>As tuas equipas</Text>
  </Pressable>
  <View style={styles.intro}>
   <Text style={styles.introLabel}>COMPETIÇÕES · EQUIPAS</Text>
   <Text maxFontSizeMultiplier={1.3} style={styles.title}>Encontrar competições</Text>
   <Text style={styles.note}>Descobre torneios e campeonatos que aceitam candidaturas. Escolhe a tua equipa antes de participar.</Text>
  </View>
  <View style={styles.searchPanel}>
  <TextInput style={styles.input} placeholder="Nome da competição ou comunidade" placeholderTextColor={C.muted}
    value={query} onChangeText={setQuery} maxLength={80} returnKeyType="search" onSubmitEditing={search}/>
  <TextInput style={styles.input} placeholder="Modalidade" placeholderTextColor={C.muted}
    value={sport} onChangeText={setSport} maxLength={80} returnKeyType="search" onSubmitEditing={search}/>
  <Button title="Pesquisar competições" onPress={search} disabled={loading}/>
  </View>
  {error?<Message tone="error">{error}</Message>:null}
  {(!applicationsVerified||!ownedVerified)&&auth.token&&!loading?<Button secondary
    title="Verificar novamente candidaturas e equipas" disabled={busy} onPress={()=>void load()}/>:null}
  {notice?<Message>{notice}</Message>:null}
  {loading?<Loader/>:null}
  {!auth.token&&!loading?<Message>Inicia sessão para escolher uma equipa, consultar candidaturas e pedir participação.</Message>:null}
  {!loading&&!!auth.token&&teams.length===0&&!error?<Message>Cria uma equipa ou torna-te responsável por uma para poderes pedir participação.</Message>:null}
  {teams.length>0?<View style={styles.panel}>
   <View style={styles.selectionHeading}><Text style={styles.subtitle}>Escolher a minha equipa</Text>
    <Text style={styles.selectionCount}>{teams.length} {teams.length===1?'equipa':'equipas'}</Text></View>
   <Text style={styles.note}>Seleciona o plantel que queres inscrever. Só as equipas que administras aparecem aqui.</Text>
   {teams.map(team=><Pressable key={team.id} accessibilityRole="radio"
     accessibilityLabel={'Candidatar a equipa '+team.name}
     accessibilityState={{selected:chosen===team.id}} disabled={busy}
     onPress={()=>setChosen(team.id)}
     style={[styles.choice,chosen===team.id&&styles.chosen]}>
    <View style={styles.teamIdentity}>
     <TeamBrandAvatar team={team} size={52}/>
     <View style={styles.teamNameBlock}>
      <Text style={styles.name} numberOfLines={2}>{team.name}</Text>
      <Text style={styles.note} numberOfLines={1}>{team.sport||'Várias modalidades'}</Text>
     </View>
     <TeamKitPreview primary={team.kitPrimary} secondary={team.kitSecondary}
       pattern={team.kitPattern} size={44}/>
     <View style={[styles.choiceCheck,chosen===team.id&&styles.choiceCheckActive]}>
      {chosen===team.id?<JynloIcon name="check" active size={21} color={C.mint}/>:null}
     </View>
    </View>
   </Pressable>)}
  </View>:null}
  {applications.length>0?<View style={styles.panel}>
   <Text style={styles.subtitle}>Pedidos já enviados</Text>
   {applications.map(a=><View key={a.id} style={styles.applicationRow}>
    <Text style={styles.applicationTeam} numberOfLines={2}>{a.teamName}</Text>
    <Text style={styles.applicationStatus}>{a.competitionType==='TOURNAMENT'?'Torneio':'Campeonato'} · {a.status==='PENDING'?'Em análise':a.status==='APPROVED'?'Aprovado · inscrição por confirmar':'Recusado'}</Text>
   </View>)}
  </View>:null}
  {!loading&&rows.length===0&&!error?<Message>Não há competições a aceitar equipas com estes filtros.</Message>:null}
  {rows.length>0?<View style={styles.resultHeading}>
    <Text style={styles.subtitle}>Competições disponíveis</Text><Text style={styles.selectionCount}>{rows.length}</Text>
   </View>:null}
  {rows.map(item=><View key={item.communityId+'-'+item.type+'-'+item.id} style={styles.competitionCard}>
    <View style={styles.competitionTop}>
     <Text style={styles.competitionType}>{item.type==='TOURNAMENT'?'TORNEIO':'CAMPEONATO'}</Text>
     <Text style={[styles.competitionStatus,!item.applicationsOpen&&styles.competitionStatusClosed]}>{item.applicationsOpen?'Candidaturas abertas':'Encerradas'}</Text>
    </View>
    <Text style={styles.competitionTitle}>{item.name}</Text>
    <Text style={styles.competitionCommunity} numberOfLines={2}>{item.communityName} · {item.sport||'Modalidade não indicada'}</Text>
    {!chosen&&auth.token?<Text style={styles.selectionHint}>Escolhe uma equipa acima para pedir participação.</Text>:null}
    <Button title={applicationLabel(item,chosen)|| (busy?'A enviar…':'Pedir participação')}
      disabled={!auth.token||!chosen||busy||loading||!ownedVerified||!applicationsVerified||!item.applicationsOpen||applied(item,chosen)}
      onPress={()=>void apply(item)}/>
   </View>)}
  <Text style={styles.note}>A aprovação não inscreve automaticamente o plantel; os jogadores são confirmados pelas regras da competição.</Text>
 </Page>;
}
const styles=StyleSheet.create({
 backAction:{alignSelf:'flex-start',minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:12},
 backActionText:{color:C.mint,fontWeight:'800',fontSize:13},
 selectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
 selectionCount:{color:C.mint,fontWeight:'900',fontSize:12},
 resultHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:9},
 selectionHint:{fontSize:12,color:'#B3D3DB',lineHeight:19},
 choiceCheck:{height:27,width:27,borderRadius:14,borderWidth:1,borderColor:'#58848A',alignItems:'center',justifyContent:'center'},
 choiceCheckActive:{borderColor:C.mint,backgroundColor:'#0D5752'},
 intro:{padding:17,borderWidth:1,borderColor:'#3AC7B34A',borderRadius:18,backgroundColor:'#092C3A',gap:8},
 introLabel:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:'#6DEED3'},
 searchPanel:{padding:15,borderWidth:1,borderColor:'#38BDA74A',backgroundColor:'#072733',borderRadius:17,gap:11},
 title:{fontSize:27,fontWeight:'900',color:C.white,lineHeight:33},
 subtitle:{fontSize:17,fontWeight:'900',color:C.white},
 name:{fontSize:14,fontWeight:'700',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:19},
 input:{minHeight:48,padding:13,backgroundColor:C.surface,color:C.white,borderWidth:1,borderColor:C.border,borderRadius:13},
 panel:{backgroundColor:'#092D3B',borderWidth:1,borderColor:'#3CC7B44A',borderRadius:17,padding:16,gap:12},
 competitionCard:{backgroundColor:'#0A303E',borderWidth:1,borderColor:'#3FC4B552',borderRadius:18,padding:17,gap:12},
 competitionTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8},
 competitionType:{fontSize:11,fontWeight:'900',letterSpacing:1,color:'#80F4DD'},
 competitionStatus:{fontSize:11,fontWeight:'800',color:'#07362D',backgroundColor:'#56E3C0',overflow:'hidden',borderRadius:20,paddingVertical:6,paddingHorizontal:10},
 competitionStatusClosed:{backgroundColor:'#31434C',color:'#D2DFE4'},
 competitionTitle:{fontSize:18,fontWeight:'900',color:C.white,lineHeight:24},
 competitionCommunity:{color:'#B3D3DB',fontSize:13,lineHeight:20},
 applicationRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#4CBCA532',gap:4},
 applicationTeam:{fontWeight:'800',fontSize:14,color:C.white},
 applicationStatus:{color:'#9FE8D5',fontSize:12,lineHeight:19},
 choice:{borderRadius:14,borderWidth:1,borderColor:'#3FC4B54D',padding:12,backgroundColor:'#0D3542',minHeight:72},
 choiceState:{fontSize:22,fontWeight:'900',color:C.mint}, 
 teamIdentity:{flexDirection:'row',gap:11,alignItems:'center'},
 teamNameBlock:{flex:1,minWidth:0,gap:3},
 chosen:{borderColor:C.mint,backgroundColor:'#0C4A4D'}
});
