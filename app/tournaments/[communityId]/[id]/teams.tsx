import React,{useCallback,useRef,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
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
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){if(version===generation.current)setLoading(false);return;}
  if(!Number.isSafeInteger(cid)||cid<=0||!Number.isSafeInteger(tid)||tid<=0){
   if(version===generation.current){setError('Torneio inválido.');setLoading(false);}
   return;
  }
  setLoading(true);setError('');
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
  finally{if(version===generation.current)setLoading(false);}
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
  <Text style={styles.title}>{tournament?.name||'Equipas'}</Text>
  <Text style={styles.note}>Abre uma equipa para veres o plantel, os jogos e os convites. Assim evitamos uma lista interminável de jogadores neste ecrã.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}{!!message?<Message>{message}</Message>:null}
  {tournament?.entryType!=='TEAM'&&tournament?<Message>Este torneio não é uma competição por equipas.</Message>:null}
  {items.map(t=><View key={t.id} style={styles.team}>
   <Text style={styles.teamName}>{t.name}</Text>
   <Text style={styles.note}>{t.players.length}/{t.playersPerTeam??'Sem limite'} jogadores · Plantel e jogos na página da equipa</Text>
   <Button title="Abrir página da equipa" secondary onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]/teams/[teamId]',params:{communityId:String(cid),id:String(tid),teamId:String(t.id)}})}/>
  </View>)}
  {tournament?.entryType==='TEAM'&&tournament.status!=='DRAFT'?<Message>Este torneio já começou ou terminou. As equipas estão disponíveis apenas para consulta.</Message>:null}
  {tournament?.entryType==='TEAM'&&tournament.status==='DRAFT'?<View style={styles.team}>
   <Text style={styles.teamName}>Nova equipa</Text>
   <TextInput accessibilityLabel="Nome da equipa" value={newName} onChangeText={setNewName} style={styles.input} maxLength={100} placeholder="Nome da equipa" placeholderTextColor={C.muted}/>
   <Button title={busy?'A guardar…':'Criar equipa'} disabled={busy||newName.trim().length<2} onPress={()=>{void create();}}/>
   <Text style={styles.note}>A criação exige permissões de organizador e é validada pelo backend.</Text>
  </View>:null}
  {tournament?.entryType==='TEAM'&&tournament.status==='DRAFT'&&auth.token?<CompetitionTeamSearch communityId={cid} competitionId={tid} type="TOURNAMENT" token={auth.token}/>:null}
  {tournament?.entryType==='TEAM'&&tournament.status==='DRAFT'&&auth.token?<TeamCompetitionApplications communityId={cid} competitionId={tid} type="TOURNAMENT" token={auth.token}/>:null}
  {DEMO_MODE?<Message>Modo de demonstração: as equipas são apenas locais e não ficam gravadas na Jynlo real.</Message>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{color:C.white,fontSize:28,fontWeight:'900'},note:{color:C.muted,fontSize:12,lineHeight:18},team:{padding:17,borderRadius:18,borderColor:C.border,borderWidth:1,backgroundColor:C.surface,gap:10},teamName:{color:C.white,fontSize:18,fontWeight:'900'},players:{color:C.mint,fontSize:13},input:{backgroundColor:C.surface2,color:C.white,padding:14,borderRadius:12,borderWidth:1,borderColor:C.border}});
