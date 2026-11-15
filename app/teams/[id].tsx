import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {setSportsTeamFeatures,sportsTeamDetail,sportsTeamMembers,inviteSportsTeamMember,findSportsTeamPlayers,SportsTeam,SportsTeamMember,SportsTeamPlayerCandidate} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';

export default function TeamDetail(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 const [members,setMembers]=useState<SportsTeamMember[]>([]),[searchName,setSearchName]=useState('');
 const [candidates,setCandidates]=useState<SportsTeamPlayerCandidate[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const [details,roster]=await Promise.all([
   sportsTeamDetail(teamId,auth.token||undefined),sportsTeamMembers(teamId,auth.token||undefined)]);
   setTeam(details);setMembers(roster);}
  catch(e){setError(e instanceof Error?e.message:'Equipa não encontrada.');}
  finally{setLoading(false);}
 },[teamId,auth.token]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const search=async()=>{
  if(!auth.token||searchName.trim().length<2)return;
  setError('');
  try{setCandidates(await findSportsTeamPlayers(searchName,auth.token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível pesquisar jogadores.');}
 };
 const invite=async(profileId:number)=>{
  if(!auth.token||!Number.isSafeInteger(profileId)||profileId<=0)return;
  setSaving(true);setError('');
  try{await inviteSportsTeamMember(teamId,profileId,auth.token);setCandidates([]);setSearchName('');}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível convidar o jogador.');}
  finally{setSaving(false);}
 };
 const feature=async(field:'chatEnabled'|'feedEnabled')=>{
  if(!team||!auth.token||saving)return;
  setSaving(true);setError('');
  try{setTeam(await setSportsTeamFeatures(team.id,{[field]:!team[field]},auth.token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a configuração.');}
  finally{setSaving(false);}
 };
 return <Page>
  <Button title="← Equipas" onPress={()=>router.push('/teams')}/>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {team?<><View style={styles.header}>
    <Text style={styles.title}>{team.name}</Text>
    <Text style={styles.note}>{team.sport||'Várias modalidades'} · {team.location||'Localização não indicada'}</Text>
    {team.description?<Text style={styles.note}>{team.description}</Text>:null}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Plantel ({members.length})</Text>
    {members.map(m=><Text key={m.profileId} style={styles.note}>{m.username} · {m.role==='OWNER'?'Responsável':'Jogador'}</Text>)}
    <Text style={styles.note}>Os convites só dão acesso após a aceitação do jogador.</Text>
    {isOwner?<><TextInput style={styles.input} value={searchName} onChangeText={setSearchName}
      placeholder="Procurar jogador pelo nome" placeholderTextColor={C.muted}/>
    <Button title="Pesquisar jogadores" onPress={()=>void search()}/>
    {candidates.map(p=><View key={p.profileId} style={styles.candidate}>
      <Text style={styles.note}>{p.fullName||p.username} · @{p.username}</Text>
      <Button title="Convidar" onPress={()=>void invite(p.profileId)}/>
    </View>)}</>:null}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Competições</Text>
    <Text style={styles.note}>A participação em comunidades, sessões e torneios será ligada a esta identidade.</Text></View>
   <View style={styles.panel}><Text style={styles.heading}>Feed</Text>
    <Text style={styles.note}>{team.feedEnabled?'Ativado. Publicações de equipa ainda indisponíveis.':'Desativado'}</Text>
    {isOwner?<Button title={team.feedEnabled?'Desativar feed':'Ativar feed'} onPress={()=>void feature('feedEnabled')}/>:null}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Chat</Text>
    <Text style={styles.note}>{team.chatEnabled?'Ativado. Mensagens de equipa ainda indisponíveis.':'Desativado'}</Text>
    {isOwner?<Button title={team.chatEnabled?'Desativar chat':'Ativar chat'} onPress={()=>void feature('chatEnabled')}/>:null}
   </View>
  </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 header:{padding:20,backgroundColor:C.surface,borderRadius:16,gap:8},
 title:{fontSize:27,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 panel:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:16,gap:10},
 input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,color:C.white,padding:12},
 candidate:{padding:10,borderColor:C.border,borderWidth:1,borderRadius:10,gap:5}
});
