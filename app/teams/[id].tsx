import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {setSportsTeamFeatures,sportsTeamDetail,sportsTeamMembers,inviteSportsTeamMember,findSportsTeamPlayers,SportsTeam,SportsTeamMember,SportsTeamPlayerCandidate,sportsTeamHistory,sportsTeamChampionshipHonours,type TeamCompetitionHistory,type TeamChampionshipHonour} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';
import {sportsTeamCommunities,answerTeamCommunityMembership,removeTeamCommunityMembership,type TeamCommunityMembership} from '../../src/lib/team-community-memberships-api';

export default function TeamDetail(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 const [activeTab,setActiveTab]=useState<'OVERVIEW'|'TROPHIES'>('OVERVIEW');
 const [members,setMembers]=useState<SportsTeamMember[]>([]),[searchName,setSearchName]=useState('');
 const [candidates,setCandidates]=useState<SportsTeamPlayerCandidate[]>([]);
 const [communities,setCommunities]=useState<TeamCommunityMembership[]>([]),[membershipNote,setMembershipNote]=useState('');
 const [history,setHistory]=useState<TeamCompetitionHistory[]>([]),[historyError,setHistoryError]=useState('');
 const [championshipHonours,setChampionshipHonours]=useState<TeamChampionshipHonour[]>([]),[honoursError,setHonoursError]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const requestVersion=useRef(0),searchVersion=useRef(0);
 const reading=useRef<number|null>(null),savingRef=useRef(false);
 useEffect(()=>{savingRef.current=saving;},[saving]);
 const load=useCallback(async(silent=false)=>{
  if(reading.current===requestVersion.current||savingRef.current)return;
  const version=++requestVersion.current;
  reading.current=version;
  if(!silent){setLoading(true);setError('');}
  if(!Number.isSafeInteger(teamId)||teamId<=0){
   if(reading.current===version)reading.current=null;
   setError('Equipa inválida.');setLoading(false);return;
  }
  const [details,roster,pastEvents,awards,linked]=await Promise.allSettled([
   sportsTeamDetail(teamId,auth.token||undefined),
   sportsTeamMembers(teamId,auth.token||undefined),
   sportsTeamHistory(teamId,auth.token||undefined),
   sportsTeamChampionshipHonours(teamId,auth.token||undefined),
   auth.token?sportsTeamCommunities(teamId,auth.token):Promise.resolve([])
  ]);
  if(reading.current===version)reading.current=null;
  if(version!==requestVersion.current)return;
  const failed:string[]=[];
  if(details.status==='fulfilled')setTeam(details.value);
  else {if(!silent)setTeam(null);failed.push('o perfil da equipa');}
  if(roster.status==='fulfilled')setMembers(roster.value);
  else failed.push('o plantel');
  if(pastEvents.status==='fulfilled'){setHistory(pastEvents.value);setHistoryError('');}
  else setHistoryError('Não foi possível atualizar o histórico oficial.');
  if(awards.status==='fulfilled'){setChampionshipHonours(awards.value);setHonoursError('');}
  else setHonoursError('Não foi possível atualizar os troféus.');
  if(linked.status==='fulfilled')setCommunities(linked.value);
  else failed.push('as comunidades');
  if(failed.length){
   if(!silent)setError('Não foi possível atualizar '+failed.join(', ')+'. As restantes secções continuam disponíveis.');
  }else if(!silent)setError('');
  if(!silent)setLoading(false);
 },[teamId,auth.token]);
 useFocusEffect(useCallback(()=>{
  void load();
  const timer=setInterval(()=>{
   if(AppState.currentState==='active'&&!savingRef.current)void load(true);
  },60000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&!savingRef.current)void load(true);
  });
  return ()=>{
   clearInterval(timer);resume.remove();
   requestVersion.current++;searchVersion.current++;
  };
 },[load]));
 const search=async()=>{
  if(!auth.token||searchName.trim().length<2||saving)return;
  const version=++searchVersion.current;
  setError('');
  try{
   const matches=await findSportsTeamPlayers(searchName.trim(),auth.token);
   if(version===searchVersion.current)setCandidates(matches);
  }catch(e){
   if(version===searchVersion.current)setError(e instanceof Error?e.message:'Não foi possível pesquisar jogadores.');
  }
 };
 const invite=async(profileId:number)=>{
  if(!auth.token||saving||!Number.isSafeInteger(profileId)||profileId<=0)return;
  setSaving(true);setError('');
  try{await inviteSportsTeamMember(teamId,profileId,auth.token);setCandidates([]);setSearchName('');searchVersion.current++;}
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
 const seasonTournamentIds=new Set(championshipHonours.filter(h=>h.tournamentId!==null).map(h=>h.tournamentId));
 const standaloneTrophies=history.filter(item=>item.champion&&!seasonTournamentIds.has(item.tournamentId));
 return <Page>
  <Button title="← Equipas" onPress={()=>router.push('/teams')}/>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {team?<><View style={styles.header}>
    <Text style={styles.eyebrow}>JYNLO · EQUIPA DESPORTIVA</Text>
    <View style={styles.heroIdentity}>
      <View style={styles.heroCrest}><Text style={styles.heroCrestText}>{(team.name||'E').charAt(0).toUpperCase()}</Text></View>
      <View style={styles.heroCopy}>
        <Text style={styles.title}>{team.name}</Text>
        <Text style={styles.heroSubtitle}>{team.sport||'Várias modalidades'} · {team.location||'Localização por definir'}</Text>
      </View>
    </View>
    {team.description?<Text style={styles.description}>{team.description}</Text>:null}
    <View style={styles.statsRow}>
      <View style={styles.statCard}><Text style={styles.statNumber}>{members.length}</Text><Text style={styles.statLabel}>Jogadores</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{communities.filter(m=>m.status==='ACTIVE').length}</Text><Text style={styles.statLabel}>Comunidades</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{standaloneTrophies.length+championshipHonours.length}</Text><Text style={styles.statLabel}>Troféus</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Encontrar competições para esta equipa"
      style={styles.heroAction}
      onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})}>
      <Text style={styles.heroActionLabel}>Explorar competições  →</Text>
    </Pressable>
   </View>
   <View style={styles.tabBar}>
    <Button title="Visão geral" secondary={activeTab!=='OVERVIEW'}
      onPress={()=>setActiveTab('OVERVIEW')}/>
    <Button title={'🏆 Troféus ('+(standaloneTrophies.length+championshipHonours.length)+')'}
      secondary={activeTab!=='TROPHIES'} onPress={()=>setActiveTab('TROPHIES')}/>
   </View>
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Plantel ({members.length})</Text>
    {members.length===0?<View style={styles.empty}><Text style={styles.note}>Ainda não há jogadores no plantel.</Text></View>:null}
    <View style={styles.roster}>
    {members.map(m=><View key={m.profileId} style={styles.playerCard}>
      <View style={styles.playerAvatar}><Text style={styles.playerAvatarText}>{(m.username||'J').charAt(0).toUpperCase()}</Text></View>
      <View style={styles.playerInfo}><Text style={styles.playerName}>@{m.username}</Text>
      <Text style={styles.note}>{m.role==='OWNER'?'Responsável':'Jogador'}</Text></View>
    </View>)}
    </View>
    <Text style={styles.note}>Os convites só dão acesso após a aceitação do jogador.</Text>
    {isOwner?<><TextInput style={styles.input} value={searchName} onChangeText={setSearchName}
      placeholder="Procurar jogador pelo nome" placeholderTextColor={C.muted}/>
    <Button title="Pesquisar jogadores" disabled={saving} onPress={()=>void search()}/>
    {candidates.map(p=><View key={p.profileId} style={styles.candidate}>
      <Text style={styles.note}>{p.fullName||p.username} · @{p.username}</Text>
      <Button title="Convidar" disabled={saving} onPress={()=>void invite(p.profileId)}/>
    </View>)}</>:null}
   </View>:null}
   {activeTab==='TROPHIES'?<View style={styles.panel}><Text style={styles.heading}>🏆 Troféus ({standaloneTrophies.length+championshipHonours.length})</Text>
    {historyError?<Text style={styles.note}>{historyError}</Text>:null}
    {honoursError?<Text style={styles.note}>{honoursError}</Text>:null}
    {!historyError&&!honoursError&&!standaloneTrophies.length&&!championshipHonours.length?
      <Text style={styles.note}>Ainda não existem troféus oficiais nesta equipa.</Text>:null}
    {championshipHonours.map(item=><View key={'season:'+item.championshipId+':'+(item.ownedEventId?'event:'+item.ownedEventId:'tournament:'+item.tournamentId)} style={styles.candidate}>
      <Text style={styles.heading}>🏆 {item.competitionName}</Text>
      <Text style={styles.note}>{item.format==='LEAGUE'?'Liga':item.format==='KNOCKOUT'?'Taça':item.format==='CHAMPIONSHIP'?'Campeonato':item.format} · {item.championshipName} · {item.seasonLabel}</Text>
      <Text style={styles.note}>{item.communityName} · {item.sport}</Text>
      <Text style={styles.note}>{new Date(item.awardedAt).toLocaleDateString('pt-PT')}</Text>
    </View>)}
    {standaloneTrophies.map(item=><View key={item.tournamentId} style={styles.candidate}>
      <Text style={styles.heading}>🏆 {item.tournamentName}</Text>
      <Text style={styles.note}>{item.communityName} · {item.sport||'Modalidade não indicada'}</Text>
      {item.completedAt?<Text style={styles.note}>{new Date(item.completedAt).toLocaleDateString('pt-PT')}</Text>:null}
    </View>)}
   </View>:null}
   {activeTab==='TROPHIES'?<View style={styles.panel}><Text style={styles.heading}>Histórico de torneios ({history.length})</Text>
    {!historyError&&!history.length?<Text style={styles.note}>Ainda não existem torneios associados a esta equipa.</Text>:null}
    {history.map(item=><Text key={item.tournamentId} style={styles.note}>
      {item.tournamentName} · {item.communityName} · {item.champion?'🏆 Campeão':item.archived?'Concluído':'Em curso'}
    </Text>)}
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Competições</Text>
    <Button title="Encontrar competições para a equipa" onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})}/>
    <Text style={styles.note}>A participação em comunidades, sessões e torneios será ligada a esta identidade.</Text></View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Comunidades</Text>
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
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Feed</Text>
    <Text style={styles.note}>{team.feedEnabled?'Ativado. Publicações de equipa ainda indisponíveis.':'Desativado'}</Text>
    {isOwner?<Button title={team.feedEnabled?'Desativar feed':'Ativar feed'} onPress={()=>void feature('feedEnabled')}/>:null}
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Chat</Text>
    <Text style={styles.note}>{team.chatEnabled?'Ativado. Mensagens de equipa ainda indisponíveis.':'Desativado'}</Text>
    {isOwner?<Button title={team.chatEnabled?'Desativar chat':'Ativar chat'} onPress={()=>void feature('chatEnabled')}/>:null}
   </View>:null}
  </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 header:{padding:20,backgroundColor:'#0A3340',borderColor:'#2A7A79',borderWidth:1,borderRadius:22,gap:13},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:C.mint},
 heroIdentity:{flexDirection:'row',alignItems:'center',gap:14},
 heroCrest:{width:74,height:74,borderRadius:19,backgroundColor:'#168D86',alignItems:'center',justifyContent:'center'},
 heroCrestText:{color:'#052C32',fontSize:32,fontWeight:'900'},
 heroCopy:{flex:1,gap:5},
 heroSubtitle:{color:'#A4EDDE',fontWeight:'700',fontSize:13},
 description:{color:'#D1E4E8',fontSize:13,lineHeight:20},
 statsRow:{flexDirection:'row',gap:8},
 statCard:{flex:1,alignItems:'center',paddingVertical:12,paddingHorizontal:5,backgroundColor:'#104655',borderWidth:1,borderColor:'#347C84',borderRadius:12,gap:3},
 statNumber:{color:C.white,fontSize:22,fontWeight:'900'},
 statLabel:{color:'#B5D7DB',fontSize:10,fontWeight:'700'},
 heroAction:{backgroundColor:C.mint,padding:13,borderRadius:12,alignItems:'center'},
 heroActionLabel:{color:'#053039',fontWeight:'900'},
 roster:{gap:8},
 playerCard:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,flexDirection:'row',alignItems:'center',gap:11},
 playerAvatar:{height:42,width:42,borderRadius:21,backgroundColor:'#167A7D',alignItems:'center',justifyContent:'center'},
 playerAvatarText:{color:C.white,fontWeight:'900',fontSize:17},
 playerInfo:{flex:1,gap:2},
 playerName:{color:C.white,fontSize:14,fontWeight:'800'},
 empty:{padding:16,alignItems:'center',borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:12},
 tabBar:{flexDirection:'row',flexWrap:'wrap',gap:10},
 title:{fontSize:27,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 panel:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:16,gap:10},
 input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,color:C.white,padding:12},
 candidate:{padding:10,borderColor:C.border,borderWidth:1,borderRadius:10,gap:5}
});
