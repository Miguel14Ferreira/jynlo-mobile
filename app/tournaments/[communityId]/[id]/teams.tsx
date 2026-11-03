import React,{useCallback,useState} from 'react';
import {Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
import {DEMO_MODE} from '../../../../src/lib/api';
import {tournamentDetails} from '../../../../src/lib/competition-api';
import {acceptTeamPlace,createTournamentTeam,shareableTeamInvite,tournamentTeams} from '../../../../src/lib/team-api';
import type {JynloTournament,JynloTournamentTeam} from '../../../../src/lib/types';
export default function TeamsScreen(){
 const {communityId:rawCommunity,id:rawTournament}=useLocalSearchParams<{communityId:string;id:string}>();
 const cid=Number(rawCommunity),tid=Number(rawTournament),auth=useAuth(),router=useRouter();
 const [tournament,setTournament]=useState<JynloTournament|null>(null),[items,setItems]=useState<JynloTournamentTeam[]>([]);
 const [newName,setNewName]=useState('Futeboladas à Balda'),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setLoading(false);return;}
  setLoading(true);setError('');
  try{const [details,teams]=await Promise.all([tournamentDetails(cid,tid,auth.token,auth.username),tournamentTeams(cid,tid,auth.token,auth.username)]);
   setTournament(details);setItems(teams);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as equipas.');}
  finally{setLoading(false);}
 },[cid,tid,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 async function create(){if(!auth.token||!auth.username||busy)return;setBusy(true);setError('');setMessage('');
  try{await createTournamentTeam(cid,tid,newName,auth.token,auth.username);setMessage('Equipa criada. Podes convidar os jogadores pelo link.');await load();}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível criar.');}finally{setBusy(false);}}
 async function join(teamId:number){if(!auth.token||!auth.username||busy)return;setBusy(true);setError('');setMessage('');
  try{await acceptTeamPlace(cid,tid,teamId,auth.token,auth.username);setMessage('Entrada na equipa confirmada pelo servidor.');await load();}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.');}finally{setBusy(false);}}
 async function share(team:JynloTournamentTeam){
  const url=shareableTeamInvite(cid,tid,team.id);
  try{await Share.share({message:`🏆 Convite para ${team.name} — ${tournament?.name||'Torneio Jynlo'}\nEntra primeiro na comunidade, se necessário. A adesão depende da aprovação e das vagas.\n${url}`});}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível partilhar o convite.');}
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · EQUIPAS</Eyebrow>
  <Text style={styles.title}>{tournament?.name||'Equipas'}</Text>
  <Text style={styles.note}>Cada equipa tem a sua página e a sua lista de jogadores. O link não contorna as permissões da comunidade.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{!!error?<Message tone="error">{error}</Message>:null}{!!message?<Message>{message}</Message>:null}
  {tournament?.entryType!=='TEAM'&&tournament?<Message>Este torneio não é uma competição por equipas.</Message>:null}
  {items.map(t=><View key={t.id} style={styles.team}>
   <Text style={styles.teamName}>{t.name}</Text><Text style={styles.note}>{t.players.length}/{t.playersPerTeam??'∞'} jogadores</Text>
   <Text style={styles.players}>{t.players.map(p=>p.displayName).join(' · ')||'Ainda não tem jogadores'}</Text>
   <Button secondary title="Partilhar convite" onPress={()=>{void share(t);}}/>
   {!t.players.some(p=>p.username===auth.username)?<Button title="Aceitar lugar na equipa" onPress={()=>{void join(t.id);}} disabled={busy}/>:null}
  </View>)}
  {tournament?.entryType==='TEAM'?<View style={styles.team}>
   <Text style={styles.teamName}>Nova equipa</Text>
   <TextInput accessibilityLabel="Nome da equipa" value={newName} onChangeText={setNewName} style={styles.input} maxLength={100} placeholderTextColor={C.muted}/>
   <Button title={busy?'A guardar…':'Criar equipa'} disabled={busy||newName.trim().length<2} onPress={()=>{void create();}}/>
   <Text style={styles.note}>A criação exige permissões de organizador e é validada pelo backend.</Text>
  </View>:null}
  {DEMO_MODE?<Message>Modo de demonstração: as equipas são apenas locais e não ficam gravadas na Jynlo real.</Message>:null}
  <Button secondary title="Voltar ao torneio" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({title:{color:C.white,fontSize:28,fontWeight:'900'},note:{color:C.muted,fontSize:12,lineHeight:18},team:{padding:17,borderRadius:18,borderColor:C.border,borderWidth:1,backgroundColor:C.surface,gap:10},teamName:{color:C.white,fontSize:18,fontWeight:'900'},players:{color:C.mint,fontSize:13},input:{backgroundColor:C.surface2,color:C.white,padding:14,borderRadius:12,borderWidth:1,borderColor:C.border}});
