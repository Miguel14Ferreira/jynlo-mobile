import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {setSportsTeamFeatures,sportsTeamDetail,sportsTeamMembers,inviteSportsTeamMember,findSportsTeamPlayers,SportsTeam,SportsTeamMember,SportsTeamPlayerCandidate,removeSportsTeamMember,sportsTeamHistory,sportsTeamChampionshipHonours,type TeamCompetitionHistory,type TeamChampionshipHonour} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';
import SportsTeamContentPanel from '../../src/components/SportsTeamContentPanel';
import {sportsTeamCommunities,answerTeamCommunityMembership,removeTeamCommunityMembership,type TeamCommunityMembership} from '../../src/lib/team-community-memberships-api';

export default function TeamDetail(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 const [activeTab,setActiveTab]=useState<'OVERVIEW'|'TROPHIES'|'FEED'|'CHAT'>('OVERVIEW');
 const [members,setMembers]=useState<SportsTeamMember[]>([]),[searchName,setSearchName]=useState('');
 const [candidates,setCandidates]=useState<SportsTeamPlayerCandidate[]>([]);
 const [communities,setCommunities]=useState<TeamCommunityMembership[]>([]),[membershipNote,setMembershipNote]=useState('');
 const [communitiesVerified,setCommunitiesVerified]=useState(false);
 const [history,setHistory]=useState<TeamCompetitionHistory[]>([]),[historyError,setHistoryError]=useState('');
 const [championshipHonours,setChampionshipHonours]=useState<TeamChampionshipHonour[]>([]),[honoursError,setHonoursError]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [notice,setNotice]=useState(''),[rosterVerified,setRosterVerified]=useState(false);
 const [searchComplete,setSearchComplete]=useState(false),[searching,setSearching]=useState(false);
 const requestVersion=useRef(0),searchVersion=useRef(0),actionRef=useRef(false);
 const reading=useRef<number|null>(null),savingRef=useRef(false);
 useEffect(()=>{savingRef.current=saving;},[saving]);
 const load=useCallback(async(silent=false,force=false)=>{
  if(!force&&(reading.current===requestVersion.current||savingRef.current))return;
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
  if(roster.status==='fulfilled'){setMembers(roster.value);setRosterVerified(true);}
  else{setRosterVerified(false);failed.push('o plantel');}
  if(pastEvents.status==='fulfilled'){setHistory(pastEvents.value);setHistoryError('');}
  else setHistoryError('Não foi possível atualizar o histórico oficial.');
  if(awards.status==='fulfilled'){setChampionshipHonours(awards.value);setHonoursError('');}
  else setHonoursError('Não foi possível atualizar os troféus.');
  if(linked.status==='fulfilled'){setCommunities(linked.value);setCommunitiesVerified(true);}
  else{setCommunitiesVerified(false);failed.push('as comunidades');}
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
  if(!auth.token||searchName.trim().length<2||searchName.trim().length>80||saving||searching)return;
  const version=++searchVersion.current;
  setError('');setSearchComplete(false);setSearching(true);setCandidates([]);
  try{
   const matches=await findSportsTeamPlayers(searchName.trim(),auth.token);
   if(version===searchVersion.current){setCandidates(matches);setSearchComplete(true);}
  }catch(e){
   if(version===searchVersion.current)setError(e instanceof Error?e.message:'Não foi possível pesquisar jogadores.');
  }finally{if(version===searchVersion.current)setSearching(false);}
 };
 const invite=async(profileId:number)=>{
  if(!auth.token||saving||actionRef.current||!rosterVerified||!Number.isSafeInteger(profileId)||profileId<=0)return;
  actionRef.current=true;setSaving(true);setError('');setNotice('');
  const version=requestVersion.current;
  try{
   await inviteSportsTeamMember(teamId,profileId,auth.token);
   if(version!==requestVersion.current)return;
   setCandidates([]);setSearchName('');setSearchComplete(false);searchVersion.current++;
   setNotice('Convite enviado. O jogador entra no plantel depois de aceitar.');
  }catch(e){
   if(version===requestVersion.current)setError((e instanceof Error?e.message:'Não foi possível confirmar o convite.')+' Verifica o estado antes de repetir.');
  }finally{actionRef.current=false;if(version===requestVersion.current)setSaving(false);}
 };
 const removePlayer=(member:SportsTeamMember)=>{
  if(!auth.token||saving||actionRef.current||!isOwner||!rosterVerified||member.role==='OWNER')return;
  const version=requestVersion.current;
  Alert.alert('Remover jogador?',`Remover @${member.username} do plantel? Esta ação não elimina o perfil do jogador.`,[
   {text:'Cancelar',style:'cancel'},
   {text:'Remover',style:'destructive',onPress:()=>{
    if(version!==requestVersion.current||actionRef.current)return;
    actionRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,member.profileId,auth.token!).then(()=>{
     if(version!==requestVersion.current)return;
     setMembers(current=>current.filter(item=>item.profileId!==member.profileId));
     setNotice('Jogador removido do plantel.');
     actionRef.current=false;setSaving(false);
     void load(true,true);
    }).catch(e=>{
     if(version===requestVersion.current){
      setRosterVerified(false);
      setError((e instanceof Error?e.message:'Não foi possível confirmar a remoção.')+' Atualiza o plantel antes de repetir.');
     }
    }).finally(()=>{actionRef.current=false;if(version===requestVersion.current)setSaving(false);});
   }}
  ]);
 };
 const decideMembership=async(id:number,accept:boolean)=>{
  if(!auth.token||saving||!communitiesVerified)return;
  const version=requestVersion.current;
  setSaving(true);setError('');setMembershipNote('');
  try{
   const decided=await answerTeamCommunityMembership(id,accept,auth.token);
   if(version!==requestVersion.current)return;
   setCommunities(current=>current.map(item=>item.id===id?decided:item));
   setMembershipNote(accept?'Convite aceite.':'Convite recusado.');
   try{
    const updated=await sportsTeamCommunities(teamId,auth.token);
    if(version===requestVersion.current)setCommunities(updated);
   }catch{
    if(version===requestVersion.current){
     setCommunitiesVerified(false);
     setError('O convite foi tratado, mas não foi possível confirmar as associações. Consulta os dados antes de repetir.');
    }
   }
  }catch(e){
   if(version===requestVersion.current){
    setCommunitiesVerified(false);
    setError((e instanceof Error?e.message:'Não foi possível confirmar a resposta.')+' Atualiza antes de tentar novamente.');
   }
  }finally{if(version===requestVersion.current)setSaving(false);}
 };
 const removeMembership=async(id:number)=>{
  if(!auth.token||saving||!communitiesVerified)return;
  setSaving(true);setError('');setMembershipNote('');
  const version=requestVersion.current;
  try{
   await removeTeamCommunityMembership(id,auth.token);
   if(version!==requestVersion.current)return;
   setCommunities(current=>current.filter(item=>item.id!==id));
   setMembershipNote('Equipa removida da comunidade.');
   try{
    const updated=await sportsTeamCommunities(teamId,auth.token);
    if(version===requestVersion.current)setCommunities(updated);
   }catch{
    if(version===requestVersion.current){
     setCommunitiesVerified(false);
     setError('A saída foi enviada, mas não foi possível confirmar a lista atual. Atualiza antes de repetir.');
    }
   }
  }catch(e){
   if(version===requestVersion.current){
    setCommunitiesVerified(false);
    setError((e instanceof Error?e.message:'Não foi possível confirmar a saída.')+' Consulta as comunidades antes de repetir.');
   }
  }finally{if(version===requestVersion.current)setSaving(false);}
 };
 const confirmLeaveCommunity=(membership:TeamCommunityMembership)=>{
  if(saving||!communitiesVerified)return;
  const version=requestVersion.current;
  Alert.alert('Sair da comunidade?',`A equipa deixa de estar associada a ${membership.communityName}. Continuar?`,[
   {text:'Cancelar',style:'cancel'},
   {text:'Sair da comunidade',style:'destructive',onPress:()=>{
    if(version===requestVersion.current)void removeMembership(membership.id);
   }}
  ]);
 };
 const leaveTeam=()=>{
  if(!auth.token||saving||actionRef.current||!rosterVerified||isOwner||!isMember)return;
  const player=members.find(item=>item.role==='PLAYER'&&
   item.username.toLowerCase()===auth.username?.toLowerCase());
  if(!player)return;
  const current=requestVersion.current;
  Alert.alert('Sair da equipa?','Deixarás de ter acesso ao chat e às publicações privadas.',[
   {text:'Cancelar',style:'cancel'},
   {text:'Sair da equipa',style:'destructive',onPress:()=>{
    if(current!==requestVersion.current||actionRef.current)return;
    actionRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,player.profileId,auth.token!).then(()=>{
     if(current!==requestVersion.current)return;
     setMembers(rows=>rows.filter(item=>item.profileId!==player.profileId));
     setActiveTab('OVERVIEW');
     setNotice('Saíste da equipa. O acesso às mensagens privadas foi retirado.');
     setSaving(false);
     void load(true,true);
    }).catch(e=>{
     if(current===requestVersion.current){
      setRosterVerified(false);setActiveTab('OVERVIEW');
      setError((e instanceof Error?e.message:'Saída não confirmada.')+
       ' Verifica o plantel antes de repetir.');
     }
    }).finally(()=>{
     actionRef.current=false;
     if(current===requestVersion.current)setSaving(false);
    });
   }}
  ]);
 };
 const feature=async(field:'chatEnabled'|'feedEnabled')=>{
  if(!team||!auth.token||saving)return;
  setSaving(true);setError('');
  try{setTeam(await setSportsTeamFeatures(team.id,{[field]:!team[field]},auth.token));}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a configuração.');}
  finally{setSaving(false);}
 };
 const isOwner=rosterVerified&&!!auth.username&&members.some(m=>m.role==='OWNER'&&m.username.toLowerCase()===auth.username!.toLowerCase());
 const isMember=rosterVerified&&!!auth.token&&!!auth.username&&members.some(m=>m.username.toLowerCase()===auth.username!.toLowerCase());
 const inviteCandidates=candidates.filter(p=>!members.some(m=>m.profileId===p.profileId));
 const seasonTournamentIds=new Set(championshipHonours.filter(h=>h.tournamentId!==null).map(h=>h.tournamentId));
 const standaloneTrophies=history.filter(item=>item.champion&&!seasonTournamentIds.has(item.tournamentId));
 return <Page>
  <Button title="← Equipas" onPress={()=>router.push('/teams')}/>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!loading&&!saving?<Button secondary title="Tentar novamente" onPress={()=>void load(false,true)}/>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&!team?<Message>Não foi possível confirmar esta equipa. Volta à lista e tenta novamente.</Message>:null}
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
      <View style={styles.statCard}><Text style={styles.statNumber}>{rosterVerified?members.length:'—'}</Text><Text style={styles.statLabel}>Jogadores</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{communitiesVerified?communities.filter(m=>m.status==='ACTIVE').length:'—'}</Text><Text style={styles.statLabel}>Comunidades</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{standaloneTrophies.length+championshipHonours.length}</Text><Text style={styles.statLabel}>Troféus</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Encontrar competições para esta equipa"
      style={styles.heroAction}
      onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})}>
      <Text style={styles.heroActionLabel}>Explorar competições  →</Text>
    </Pressable>
   </View>
   <View style={styles.tabBar}>
    {([{id:'OVERVIEW',label:'Plantel e clube'},{id:'TROPHIES',label:'🏆 Troféus'},{id:'FEED',label:'Publicações'},{id:'CHAT',label:'Mensagens'}] as const).map(tab=>
     <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{selected:activeTab===tab.id}}
      onPress={()=>setActiveTab(tab.id)} style={[styles.tab,activeTab===tab.id&&styles.tabSelected]}>
      <Text style={[styles.tabText,activeTab===tab.id&&styles.tabTextSelected]}>{tab.label}</Text>
     </Pressable>)}
   </View>
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Plantel ({rosterVerified?members.length:'—'})</Text>
    {!rosterVerified?<Text style={styles.note}>Plantel por confirmar. As opções de gestão estão temporariamente indisponíveis.</Text>:null}
    {rosterVerified&&members.length===0?<View style={styles.empty}><Text style={styles.note}>Ainda não há jogadores no plantel.</Text></View>:null}
    <View style={styles.roster}>
    {rosterVerified?members.map(m=><View key={m.profileId} style={styles.playerCard}>
      <View style={styles.playerAvatar}><Text style={styles.playerAvatarText}>{(m.username||'J').charAt(0).toUpperCase()}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de @${m.username}`} style={styles.playerInfo}
       onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}>
       <Text style={styles.playerName}>@{m.username}</Text>
       <Text style={styles.note}>{m.role==='OWNER'?'Responsável':'Jogador'} · Ver perfil</Text>
      </Pressable>
      {isOwner&&m.role!=='OWNER'?<Pressable accessibilityRole="button" accessibilityLabel={`Remover @${m.username} da equipa`}
       disabled={saving} onPress={()=>removePlayer(m)} style={styles.removeAction}>
       <Text style={styles.removeText}>Remover</Text>
      </Pressable>:null}
    </View>):null}
    </View>
    {rosterVerified&&isMember&&!isOwner?<Pressable accessibilityRole="button"
     accessibilityLabel="Sair desta equipa" disabled={saving} style={styles.removeAction}
     onPress={leaveTeam}><Text style={styles.removeText}>Sair da equipa</Text></Pressable>:null}
    <Text style={styles.note}>Os convites só dão acesso após a aceitação do jogador.</Text>
    {isOwner?<><TextInput style={styles.input} value={searchName} maxLength={80} onChangeText={value=>{setSearchName(value);setSearchComplete(false);setCandidates([]);searchVersion.current++;}}
      placeholder="Procurar jogador pelo nome" placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={()=>void search()}/>
    <Button title={searching?'A procurar…':'Pesquisar jogadores'} disabled={saving||searching||searchName.trim().length<2} onPress={()=>void search()}/>
    {searchComplete&&inviteCandidates.length===0?<Text style={styles.note}>Não encontrámos novos jogadores com essa pesquisa.</Text>:null}
    {inviteCandidates.map(p=><View key={p.profileId} style={styles.candidate}>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/social/[username]',params:{username:p.username}})}>
       <Text style={styles.playerName}>{p.fullName||p.username}</Text>
       <Text style={styles.note}>@{p.username} · Ver perfil →</Text>
      </Pressable>
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
    {history.map(item=><Pressable key={item.tournamentId} accessibilityRole="button" style={styles.historyLink}
      onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(item.communityId),id:String(item.tournamentId)}})}>
      <Text style={styles.playerName}>{item.tournamentName}</Text>
      <Text style={styles.note}>{item.communityName} · {item.champion?'🏆 Campeão':item.archived?'Concluído':'Em curso'} · Ver torneio →</Text>
    </Pressable>)}
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Competições da equipa</Text>
    <Text style={styles.note}>{history.length} torneios no histórico · {standaloneTrophies.length+championshipHonours.length} troféus oficiais</Text>
    <Button secondary title="Ver histórico e troféus" onPress={()=>setActiveTab('TROPHIES')}/>
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Comunidades</Text>
    {!communitiesVerified?<Text style={styles.note}>Associações por confirmar. Atualiza os dados para gerir comunidades.</Text>:null}
    {communitiesVerified?communities.filter(m=>m.status==='ACTIVE').map(m=><View key={m.id} style={styles.candidate}>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(m.communityId)}})}
       style={styles.communityLink}>
       <Text style={styles.playerName}>{m.communityName}</Text>
       <Text style={styles.note}>Ver comunidade →</Text>
      </Pressable>
      {isOwner?<Button title="Sair da comunidade" secondary disabled={saving} onPress={()=>confirmLeaveCommunity(m)}/>:null}
    </View>):null}
    {communitiesVerified&&!communities.some(m=>m.status==='ACTIVE')?<Text style={styles.note}>Ainda não pertence a comunidades.</Text>:null}
    {isOwner&&communitiesVerified?communities.filter(m=>m.status==='PENDING_TEAM').map(m=><View key={m.id} style={styles.candidate}>
      <Text style={styles.note}>Convite de {m.communityName}</Text>
      <Button title="Aceitar convite" disabled={saving} onPress={()=>void decideMembership(m.id,true)}/>
      <Button title="Recusar convite" secondary disabled={saving} onPress={()=>void decideMembership(m.id,false)}/>
    </View>):null}
    {isOwner&&communitiesVerified?communities.filter(m=>m.status==='PENDING_COMMUNITY').map(m=>
      <Text key={m.id} style={styles.note}>Pedido a {m.communityName} · Em análise</Text>):null}
    {membershipNote?<Message>{membershipNote}</Message>:null}
    {isOwner?<Button title="Procurar comunidades" secondary onPress={()=>router.push('/(tabs)/communities')}/>:null}
   </View>:null}
   {activeTab==='FEED'?<View style={styles.panel}><Text style={styles.heading}>Publicações da equipa</Text>
    {!team.feedEnabled?<Text style={styles.note}>O feed da equipa está desativado.</Text>:null}
    {isOwner?<Button title={team.feedEnabled?'Desativar feed':'Ativar feed'} disabled={saving} onPress={()=>void feature('feedEnabled')}/>:null}
    {team.feedEnabled&&isMember&&auth.token&&auth.username?
     <SportsTeamContentPanel teamId={teamId} kind="feed" token={auth.token} username={auth.username}/>:null}
    {team.feedEnabled&&!isMember?<Text style={styles.note}>Disponível apenas para membros confirmados.</Text>:null}
   </View>:null}
   {activeTab==='CHAT'?<View style={styles.panel}><Text style={styles.heading}>Mensagens da equipa</Text>
    {!team.chatEnabled?<Text style={styles.note}>O chat da equipa está desativado.</Text>:null}
    {isOwner?<Button title={team.chatEnabled?'Desativar chat':'Ativar chat'} disabled={saving} onPress={()=>void feature('chatEnabled')}/>:null}
    {team.chatEnabled&&isMember&&auth.token&&auth.username?
     <SportsTeamContentPanel teamId={teamId} kind="chat" token={auth.token} username={auth.username}/>:null}
    {team.chatEnabled&&!isMember?<Text style={styles.note}>Disponível apenas para membros confirmados.</Text>:null}
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
 tabBar:{flexDirection:'row',flexWrap:'wrap',gap:8},
 tab:{minHeight:45,minWidth:'47%',flexGrow:1,paddingHorizontal:10,paddingVertical:11,borderWidth:1,borderColor:C.border,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:C.surface},
 tabSelected:{borderColor:C.mint,backgroundColor:'#123C42'},tabText:{fontSize:12,fontWeight:'800',color:C.muted},tabTextSelected:{color:C.mint},
 communityLink:{flex:1,gap:3,minHeight:44,justifyContent:'center'},historyLink:{padding:12,borderRadius:11,borderWidth:1,borderColor:C.border,gap:4},
 removeAction:{minHeight:44,justifyContent:'center',paddingHorizontal:8,borderRadius:8,borderWidth:1,borderColor:C.border},removeText:{fontSize:11,fontWeight:'800',color:C.white},
 title:{fontSize:27,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 panel:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:16,gap:10},
 input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,color:C.white,padding:12},
 candidate:{padding:10,borderColor:C.border,borderWidth:1,borderRadius:10,gap:5}
});
