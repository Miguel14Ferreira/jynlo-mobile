import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
import {JynloIcon} from '../../../../src/components/JynloIcon';
import {CompetitionTeamSearch} from '../../../../src/components/CompetitionTeamSearch';
import {TeamCompetitionApplications} from '../../../../src/components/TeamCompetitionApplications';
import {DEMO_MODE} from '../../../../src/lib/api';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {createTournamentTeam,tournamentTeams} from '../../../../src/lib/team-api';
import type {JynloTournament,JynloTournamentTeam} from '../../../../src/lib/types';
export default function TeamsScreen(){
 const {communityId:rawCommunity,id:rawTournament}=useLocalSearchParams<{communityId:string;id:string}>();
 const cid=Number(rawCommunity),tid=Number(rawTournament),auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null),[items,setItems]=useState<JynloTournamentTeam[]>([]);
 const [newName,setNewName]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const generation=useRef(0),creatingRef=useRef(false);
 const load=useCallback(async(version=generation.current,silent=false)=>{
  if(!auth.token||!auth.username){if(version===generation.current)setLoading(false);return;}
  if(!Number.isSafeInteger(cid)||cid<=0||!Number.isSafeInteger(tid)||tid<=0){
   if(version===generation.current){setError('Torneio inválido.');setLoading(false);}
   return;
  }
  if(!silent)setLoading(true);
  setError('');
  try{
   const [details,teams]=await Promise.all([
    tournamentDetails(cid,tid,auth.token,auth.username),
    tournamentTeams(cid,tid,auth.token,auth.username)
   ]);
   if(version!==generation.current)return;
   if(details.entryType!=='TEAM'){
    setTournament(details);setItems([]);return;
   }
   setTournament(details);setItems(teams);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar as equipas.');}
  finally{if(version===generation.current&&!silent)setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setTournament(null);setItems([]);setNewName('');setError('');setMessage('');
  setBusy(creatingRef.current);setLoading(true);
  void load(version);
  return ()=>{generation.current++;};
 },[load]));
 async function create(){
  if(!auth.token||!auth.username||creatingRef.current||!tournament||tournament.entryType!=='TEAM'||tournament.status!=='DRAFT')return;
  const version=generation.current;
  creatingRef.current=true;setBusy(true);setError('');setMessage('');
  try{
   await createTournamentTeam(cid,tid,newName,auth.token,auth.username);
   if(version!==generation.current)return;
   setMessage('Equipa criada. Abre a página para convidares jogadores.');setNewName('');
   await load(version);
  }catch(e){
   if(version===generation.current)setError((e instanceof Error?e.message:'Não foi possível criar.')+
    ' Confirma as equipas antes de repetires para evitar duplicados.');
  }finally{
   creatingRef.current=false;
   if(version===generation.current)setBusy(false);
  }
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · EQUIPAS</Eyebrow>
  <View style={styles.hero}>
   <View style={styles.heroHead}><View style={styles.heroIcon}><JynloIcon name="tournament" color={C.mint} size={26}/></View>
     <Text style={styles.heroTag}>TORNEIO POR EQUIPAS</Text></View>
   <Text style={styles.title}>{tournament?.name||'Equipas do torneio'}</Text>
   <Text style={styles.heroSub}>Acompanha os plantéis, aceita convites e vê os jogos da competição.</Text>
   {tournament?.entryType==='TEAM'?<View style={styles.summary}>
    <Text style={styles.summaryCount}>{items.length}</Text>
    <Text style={styles.summaryLabel}>{items.length===1?'equipa inscrita':'equipas inscritas'}</Text>
   </View>:null}
  </View>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}{!!message?<Message>{message}</Message>:null}
  {tournament?.entryType!=='TEAM'&&tournament?<Message>Este torneio não é uma competição por equipas.</Message>:null}
  {!loading&&tournament?.entryType==='TEAM'&&items.length===0?<View style={styles.empty}>
    <JynloIcon name="community" color={C.mint} size={26}/>
    <Text style={styles.teamName}>Ainda sem equipas</Text>
    <Text style={styles.note}>Cria a primeira equipa ou convida uma já existente na Jynlo.</Text>
   </View>:null}
  {items.map(t=><View key={t.id} style={styles.team}>
   <View style={styles.teamTop}>
     <View style={styles.teamIcon}><JynloIcon name="community" color={C.mint} size={25}/></View>
     <View style={styles.teamCopy}><Text style={styles.teamName} numberOfLines={2}>{t.name}</Text>
       <Text style={styles.note}>{t.players.length} {t.players.length===1?'jogador confirmado':'jogadores confirmados'}{t.playersPerTeam!=null?' · limite '+t.playersPerTeam:''}</Text>
     </View>
   </View>
   {t.playersPerTeam!=null&&t.playersPerTeam>0?<View style={styles.progressTrack}>
      <View style={[styles.progressFill,{width:`${Math.min(100,Math.round(t.players.length/t.playersPerTeam*100))}%` as `${number}%`}]}/>
    </View>:null}
   <Button title="Ver plantel e jogos" secondary onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/teams/[teamId]',params:{communityId:String(cid),id:String(tid),teamId:String(t.id)}})}/>
  </View>)}
  {tournament?.entryType==='TEAM'&&tournament.status!=='DRAFT'?<Message>Este torneio já começou ou terminou. As equipas estão disponíveis apenas para consulta.</Message>:null}
  {tournament?.entryType==='TEAM'&&tournament.status==='DRAFT'?<View style={styles.team}>
   <Text style={styles.teamName}>Nova equipa</Text>
   <TextInput accessibilityLabel="Nome da equipa" value={newName} onChangeText={setNewName} style={styles.input} maxLength={100} placeholder="Nome da equipa" placeholderTextColor={C.muted}/>
   <Button title={busy?'A guardar…':'Criar equipa'} disabled={busy||newName.trim().length<2} onPress={()=>{void create();}}/>
   <Text style={styles.note}>Só a organização do torneio pode criar equipas.</Text>
  </View>:null}
  {tournament?.entryType==='TEAM'&&tournament.status==='DRAFT'&&auth.token?<CompetitionTeamSearch communityId={cid} competitionId={tid} type="TOURNAMENT" token={auth.token} onEnrolled={()=>{void load(generation.current,true);}}/>:null}
  {tournament?.entryType==='TEAM'&&tournament.status==='DRAFT'&&auth.token?<TeamCompetitionApplications communityId={cid} competitionId={tid} type="TOURNAMENT" token={auth.token} onEnrolled={()=>{void load(generation.current,true);}}/>:null}
  {DEMO_MODE?<Message>Modo de demonstração: as equipas são apenas locais e não ficam gravadas na Jynlo real.</Message>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:28,fontWeight:'900',letterSpacing:-.5,lineHeight:35},
 note:{color:C.muted,fontSize:12,lineHeight:19},
 hero:{backgroundColor:'#153A30',borderWidth:1,borderColor:'#326653',padding:21,borderRadius:23,gap:13},
 heroHead:{flexDirection:'row',alignItems:'center',gap:11},
 heroIcon:{width:48,height:48,borderRadius:15,backgroundColor:'#225243',alignItems:'center',justifyContent:'center'},
 heroTag:{fontSize:11,fontWeight:'900',letterSpacing:1.1,color:C.mint,flexShrink:1},
 heroSub:{fontSize:14,color:'#D6E6DD',lineHeight:21},
 summary:{flexDirection:'row',alignItems:'baseline',gap:8,paddingTop:6},
 summaryCount:{color:C.mint,fontSize:30,fontWeight:'900'},
 summaryLabel:{color:'#D6E6DD',fontSize:13,fontWeight:'700'},
 team:{padding:16,borderRadius:18,borderColor:C.border,borderWidth:1,backgroundColor:C.surface,gap:13},
 teamTop:{flexDirection:'row',alignItems:'center',gap:12},
 teamIcon:{width:49,height:49,backgroundColor:'#1D4538',borderRadius:14,alignItems:'center',justifyContent:'center'},
 teamCopy:{flex:1,gap:5},
 teamName:{color:C.white,fontSize:18,fontWeight:'900'},
 progressTrack:{height:5,backgroundColor:C.surface2,borderRadius:9,overflow:'hidden'},
 progressFill:{height:'100%',backgroundColor:C.mint,borderRadius:9},
 empty:{padding:24,borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:20,alignItems:'center',gap:12},
 input:{backgroundColor:C.surface2,color:C.white,padding:14,borderRadius:12,borderWidth:1,borderColor:C.border,minHeight:50}
});
