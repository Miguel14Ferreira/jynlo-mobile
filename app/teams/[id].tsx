import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {setSportsTeamFeatures,sportsTeamDetail,sportsTeamMembers,inviteSportsTeamMember,findSportsTeamPlayers,SportsTeam,SportsTeamMember,SportsTeamPlayerCandidate,sportsTeamHistory,type TeamCompetitionHistory} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';
import {sportsTeamCommunities,answerTeamCommunityMembership,removeTeamCommunityMembership,type TeamCommunityMembership} from '../../src/lib/team-community-memberships-api';

export default function TeamDetail(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 const [members,setMembers]=useState<SportsTeamMember[]>([]),[searchName,setSearchName]=useState('');
 const [candidates,setCandidates]=useState<SportsTeamPlayerCandidate[]>([]);
 const [communities,setCommunities]=useState<TeamCommunityMembership[]>([]),[membershipNote,setMembershipNote]=useState('');
 const [history,setHistory]=useState<TeamCompetitionHistory[]>([]),[historyError,setHistoryError]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const [details,roster]=await Promise.all([
   sportsTeamDetail(teamId,auth.token||undefined),sportsTeamMembers(teamId,auth.token||undefined)]);
   setTeam(details);setMembers(roster);
   try{setHistory(await sportsTeamHistory(teamId,auth.token||undefined));setHistoryError('');}
   catch{setHistory([]);setHistoryError('Não foi possível carregar o histórico oficial.');}
   if(auth.token)setCommunities(await sportsTeamCommunities(teamId,auth.token));else setCommunities([]);}
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
 const decideMembership=async(id:number,accept:boolean)=>{
  if(!auth.token||saving)return;
  setSaving(true);setError('');setMembershipNote('');
  try{
   await answerTeamCommunityMembership(id,accept,auth.token);
   setCommunities(await sportsTeamCommunities(teamId,auth.token));
   setMembershipNote(accept?'Convite aceite.':'Convite recusado.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível responder.');}
  finally{setSaving(false);}
 };
 const removeMembership=async(id:number)=>{
  if(!auth.token||saving)return;
  setSaving(true);setError('');setMembershipNote('');
  try{
   await removeTeamCommunityMembership(id,auth.token);
   setCommunities(await sportsTeamCommunities(teamId,auth.token));
   setMembershipNote('Equipa removida da comunidade.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível remover a equipa.');}
  finally{setSaving(false);}
 };
 const feature=async(field:'chatEnabled'|'feedEnabled')=>{
  if(!team||!auth.token||saving)return;
  setSaving(true);setError('');
  try{setTeam(await setSportsTeamFeatures(team.id,{[field]:!team[field]},auth.token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a configuração.');}
  finally{setSaving(false);}
 };
 const isOwner=!!auth.username&&members.some(m=>m.role==='OWNER'&&m.username===auth.username);
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
   <View style={styles.panel}><Text style={styles.heading}>🏆 Troféus ({history.filter(item=>item.champion).length})</Text>
    {historyError?<Text style={styles.note}>{historyError}</Text>:null}
    {!historyError&&!history.some(item=>item.champion)?<Text style={styles.note}>Ainda não existem troféus oficiais nesta equipa.</Text>:null}
    {history.filter(item=>item.champion).map(item=><View key={item.tournamentId} style={styles.candidate}>
      <Text style={styles.heading}>🏆 {item.tournamentName}</Text>
      <Text style={styles.note}>{item.communityName} · {item.sport||'Modalidade não indicada'}</Text>
      {item.completedAt?<Text style={styles.note}>{new Date(item.completedAt).toLocaleDateString('pt-PT')}</Text>:null}
    </View>)}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Histórico de torneios ({history.length})</Text>
    {!historyError&&!history.length?<Text style={styles.note}>Ainda não existem torneios associados a esta equipa.</Text>:null}
    {history.map(item=><Text key={item.tournamentId} style={styles.note}>
      {item.tournamentName} · {item.communityName} · {item.champion?'🏆 Campeão':item.archived?'Concluído':'Em curso'}
    </Text>)}
   </View>
   <View style={styles.panel}><Text style={styles.heading}>Competições</Text>
    <Button title="Encontrar competições para a equipa" onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})}/>
    <Text style={styles.note}>A participação em comunidades, sessões e torneios será ligada a esta identidade.</Text></View>
   <View style={styles.panel}><Text style={styles.heading}>Comunidades</Text>
    {communities.filter(m=>m.status==='ACTIVE').map(m=><View key={m.id} style={styles.candidate}>
      <Text style={styles.note}>{m.communityName}</Text>
      {isOwner?<Button title="Sair da comunidade" secondary disabled={saving} onPress={()=>void removeMembership(m.id)}/>:null}
    </View>)}
    {!communities.some(m=>m.status==='ACTIVE')?<Text style={styles.note}>Ainda não pertence a comunidades.</Text>:null}
    {isOwner?communities.filter(m=>m.status==='PENDING_TEAM').map(m=><View key={m.id} style={styles.candidate}>
      <Text style={styles.note}>Convite de {m.communityName}</Text>
      <Button title="Aceitar convite" disabled={saving} onPress={()=>void decideMembership(m.id,true)}/>
      <Button title="Recusar convite" secondary disabled={saving} onPress={()=>void decideMembership(m.id,false)}/>
    </View>):null}
    {isOwner?communities.filter(m=>m.status==='PENDING_COMMUNITY').map(m=>
      <Text key={m.id} style={styles.note}>Pedido a {m.communityName} · Em análise</Text>):null}
    {membershipNote?<Message>{membershipNote}</Message>:null}
    {isOwner?<Button title="Procurar comunidades" secondary onPress={()=>router.push('/(tabs)/communities')}/>:null}
   </View>
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
