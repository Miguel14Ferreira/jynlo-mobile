import React,{useCallback,useEffect,useRef,useState} from 'react';
import * as ImagePicker from 'expo-image-picker';
import {Alert,AppState,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {teamPlayerAvatarUri,setSportsTeamKit,uploadSportsTeamLogo,removeSportsTeamLogo,safeTeamKitColor,setSportsTeamFeatures,sportsTeamDetail,sportsTeamMembers,inviteSportsTeamMember,findSportsTeamPlayers,SportsTeam,SportsTeamMember,SportsTeamPlayerCandidate,removeSportsTeamMember,deleteSportsTeam,sportsTeamHistory,sportsTeamChampionshipHonours,pendingSportsTeamPlayers,type TeamPendingPlayerInvitation,type TeamCompetitionHistory,type TeamChampionshipHonour} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';
import SportsTeamContentPanel from '../../src/components/SportsTeamContentPanel';
import TeamBrandAvatar from '../../src/components/TeamBrandAvatar';
import TeamKitPreview from '../../src/components/TeamKitPreview';
import {JynloIcon} from '../../src/components/JynloIcon';
import SportsTeamChallengesPanel from '../../src/components/SportsTeamChallengesPanel';
import type {TeamKitPattern} from '../../src/lib/sports-teams-api';
import {sportsTeamCommunities,answerTeamCommunityMembership,removeTeamCommunityMembership,type TeamCommunityMembership} from '../../src/lib/team-community-memberships-api';

export default function TeamDetail(){
 const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 const [activeTab,setActiveTab]=useState<'OVERVIEW'|'TROPHIES'|'FEED'|'CHAT'|'CHALLENGES'|'BRANDING'>('OVERVIEW');
 const tabRail=useRef<React.ElementRef<typeof ScrollView>|null>(null),tabPositions=useRef<Record<string,number>>({});
 // Quick links can select a tab outside the visible horizontal rail.
 useEffect(()=>{
  const position=tabPositions.current[activeTab];
  if(typeof position==='number')tabRail.current?.scrollTo({x:Math.max(0,position-22),animated:true});
 },[activeTab]);
 const [members,setMembers]=useState<SportsTeamMember[]>([]),[searchName,setSearchName]=useState('');
 const [brokenAvatars,setBrokenAvatars]=useState<Record<number,boolean>>({});
 const [candidates,setCandidates]=useState<SportsTeamPlayerCandidate[]>([]);
 const [pendingPlayers,setPendingPlayers]=useState<TeamPendingPlayerInvitation[]>([]),[pendingVerified,setPendingVerified]=useState(false);
 const [communities,setCommunities]=useState<TeamCommunityMembership[]>([]),[membershipNote,setMembershipNote]=useState('');
 const [communitiesVerified,setCommunitiesVerified]=useState(false);
 const [history,setHistory]=useState<TeamCompetitionHistory[]>([]),[historyError,setHistoryError]=useState('');
 const [trophiesLoading,setTrophiesLoading]=useState(false),[trophiesVerified,setTrophiesVerified]=useState(false);
 const trophiesVersion=useRef(0),trophiesRequested=useRef(false);
 const [championshipHonours,setChampionshipHonours]=useState<TeamChampionshipHonour[]>([]),[honoursError,setHonoursError]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [kitPrimary,setKitPrimary]=useState('#19CBB6'),[kitSecondary,setKitSecondary]=useState('#F0FAFB');
 const [kitPattern,setKitPattern]=useState<TeamKitPattern>('PLAIN');
 const [brandingVerified,setBrandingVerified]=useState(false);
 const kitEditedRef=useRef(false);
 const [notice,setNotice]=useState(''),[rosterVerified,setRosterVerified]=useState(false);
 const [searchComplete,setSearchComplete]=useState(false),[searching,setSearching]=useState(false);
 const requestVersion=useRef(0),searchVersion=useRef(0),actionRef=useRef(false),actionGeneration=useRef(0);
 const reading=useRef<number|null>(null),savingRef=useRef(false);
 useEffect(()=>{savingRef.current=saving;},[saving]);
 // A new account or team must not inherit the previous team's private roster,
 // pending invitations, memberships, messages, or unsaved kit edits.
 useEffect(()=>{
  requestVersion.current++;searchVersion.current++;actionGeneration.current++;
  actionRef.current=false;savingRef.current=false;setSaving(false);
  reading.current=null;kitEditedRef.current=false;
  setTeam(null);setMembers([]);setBrokenAvatars({});setPendingPlayers([]);setCommunities([]);
  setCandidates([]);setSearchName('');setSearchComplete(false);setSearching(false);
  trophiesVersion.current++;trophiesRequested.current=false;
  setTrophiesLoading(false);setTrophiesVerified(false);
  setHistory([]);setChampionshipHonours([]);setHistoryError('');setHonoursError('');
  setRosterVerified(false);setPendingVerified(false);setCommunitiesVerified(false);
  setBrandingVerified(false);setActiveTab('OVERVIEW');
  setKitPrimary('#19CBB6');setKitSecondary('#F0FAFB');setKitPattern('PLAIN');
  setNotice('');setMembershipNote('');setError('');setLoading(true);
 },[teamId,auth.token]);
 const load=useCallback(async(silent=false,force=false)=>{
  if(!force&&(reading.current===requestVersion.current||savingRef.current))return;
  const version=++requestVersion.current;
  reading.current=version;
  if(!silent){setLoading(true);setError('');}
  if(!Number.isSafeInteger(teamId)||teamId<=0){
   if(reading.current===version)reading.current=null;
   setError('Equipa inválida.');setLoading(false);return;
  }
  // The team identity is public. Render it as soon as the detail request
  // succeeds, rather than waiting for history, honours and memberships.
  const detailsRequest=sportsTeamDetail(teamId,auth.token||undefined);
  void detailsRequest.then(identity=>{
   if(version!==requestVersion.current)return;
   setTeam(identity);setBrandingVerified(true);
   if(!kitEditedRef.current){
    setKitPrimary(safeTeamKitColor(identity.kitPrimary,'#19CBB6'));
    setKitSecondary(safeTeamKitColor(identity.kitSecondary,'#F0FAFB'));
    setKitPattern(identity.kitPattern||'PLAIN');
   }
   if(!silent)setLoading(false);
  }).catch(()=>{});
  const [details,roster,linked]=await Promise.allSettled([
   detailsRequest,
   sportsTeamMembers(teamId,auth.token||undefined),
   auth.token?sportsTeamCommunities(teamId,auth.token):Promise.resolve([])
  ]);
  if(reading.current===version)reading.current=null;
  if(version!==requestVersion.current)return;
  const failed:string[]=[];
  if(details.status==='fulfilled'){
   setTeam(details.value);setBrandingVerified(true);
   if(!kitEditedRef.current){
    setKitPrimary(safeTeamKitColor(details.value.kitPrimary,'#19CBB6'));
    setKitSecondary(safeTeamKitColor(details.value.kitSecondary,'#F0FAFB'));
    setKitPattern(details.value.kitPattern||'PLAIN');
   }
  }else {setBrandingVerified(false);if(!silent)setTeam(null);failed.push('o perfil da equipa');}
  if(roster.status==='fulfilled'){
   setMembers(roster.value);setRosterVerified(true);
   const isOwnerNow=!!auth.token&&!!auth.username&&roster.value.some(m=>
    m.role==='OWNER'&&m.username.toLowerCase()===auth.username!.toLowerCase());
   if(isOwnerNow){
    setPendingVerified(false);
    void pendingSportsTeamPlayers(teamId,auth.token!).then(rows=>{
     if(version===requestVersion.current){setPendingPlayers(rows);setPendingVerified(true);}
    }).catch(()=>{
     if(version===requestVersion.current){setPendingPlayers([]);setPendingVerified(false);}
    });
   }else{setPendingPlayers([]);setPendingVerified(false);}
  }else{setMembers([]);setRosterVerified(false);setPendingVerified(false);setPendingPlayers([]);failed.push('o plantel');}
  if(linked.status==='fulfilled'){setCommunities(linked.value);setCommunitiesVerified(true);}
  else{setCommunities([]);setCommunitiesVerified(false);failed.push('as comunidades');}
  if(failed.length){
   if(!silent)setError('Não foi possível atualizar '+failed.join(', ')+'. As restantes secções continuam disponíveis.');
  }else if(!silent)setError('');
  if(!silent)setLoading(false);
 },[teamId,auth.token,auth.username]);
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
   requestVersion.current++;searchVersion.current++;actionGeneration.current++;
   actionRef.current=false;savingRef.current=false;
  };
 },[load]));
 const loadTrophies=useCallback(async(force=false)=>{
  if(!Number.isSafeInteger(teamId)||teamId<=0)return;
  if(trophiesRequested.current&&!force)return;
  trophiesRequested.current=true;
  const current=++trophiesVersion.current;
  setTrophiesLoading(true);setTrophiesVerified(false);
  setHistoryError('');setHonoursError('');
  const [pastEvents,awards]=await Promise.allSettled([
   sportsTeamHistory(teamId,auth.token||undefined),
   sportsTeamChampionshipHonours(teamId,auth.token||undefined)
  ]);
  if(current!==trophiesVersion.current)return;
  if(pastEvents.status==='fulfilled'){setHistory(pastEvents.value);setHistoryError('');}
  else{setHistory([]);setHistoryError('Não foi possível carregar o histórico oficial.');}
  if(awards.status==='fulfilled'){setChampionshipHonours(awards.value);setHonoursError('');}
  else{setChampionshipHonours([]);setHonoursError('Não foi possível carregar os troféus.');}
  setTrophiesVerified(pastEvents.status==='fulfilled'&&awards.status==='fulfilled');
  setTrophiesLoading(false);
 },[teamId,auth.token]);
 useEffect(()=>{
  if(activeTab==='TROPHIES')void loadTrophies();
 },[activeTab,loadTrophies]);
 const releaseAction=(action:number)=>{
  // A request belonging to an old account/team must not unlock a new action.
  if(action!==actionGeneration.current)return;
  actionRef.current=false;savingRef.current=false;setSaving(false);
 };
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
  if(!auth.token||saving||actionRef.current||!rosterVerified||!pendingVerified||!isOwner||
    pendingPlayers.some(p=>p.profileId===profileId)||!candidates.some(p=>p.profileId===profileId)||
    !Number.isSafeInteger(profileId)||profileId<=0)return;
  const action=++actionGeneration.current;
  actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
  const version=requestVersion.current;
  try{
   await inviteSportsTeamMember(teamId,profileId,auth.token);
   if(version!==requestVersion.current)return;
   setCandidates([]);setSearchName('');setSearchComplete(false);searchVersion.current++;
   setNotice('Convite enviado. O jogador entra no plantel depois de aceitar.');
   setPendingVerified(false);
   releaseAction(action);void load(true,true);
  }catch(e){
   if(version===requestVersion.current){
    setPendingVerified(false);setCandidates([]);setSearchComplete(false);
    setError((e instanceof Error?e.message:'Não foi possível confirmar o convite.')+
     ' Verifica os convites pendentes antes de repetir.');
   }
  }finally{releaseAction(action);}
 };
 const cancelPendingInvite=(invite:TeamPendingPlayerInvitation)=>{
  if(!auth.token||!isOwner||!pendingVerified||saving||actionRef.current||
   !pendingPlayers.some(item=>item.profileId===invite.profileId))return;
  const version=requestVersion.current;
  Alert.alert('Cancelar convite?',`Cancelar o convite para @${invite.username}?`,[
   {text:'Manter',style:'cancel'},
   {text:'Cancelar convite',style:'destructive',onPress:()=>{
    if(version!==requestVersion.current||actionRef.current)return;
    const action=++actionGeneration.current;
    actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,invite.profileId,auth.token!).then(()=>{
     if(version!==requestVersion.current)return;
     setPendingVerified(false);
     setNotice('Convite cancelado.');
     releaseAction(action);void load(true,true);
    }).catch(e=>{
     if(version===requestVersion.current){
      setPendingVerified(false);setPendingPlayers([]);
      setError((e instanceof Error?e.message:'Não foi possível confirmar o cancelamento.')+
       ' Verifica os convites antes de tentar novamente.');
     }
    }).finally(()=>releaseAction(action));
   }}
  ]);
 };
 const deleteTeam=()=>{
  if(!auth.token||!team||!isOwner||!rosterVerified||!brandingVerified||
     savingRef.current||actionRef.current)return;
  const identity=teamId+'|'+auth.token;
  const version=requestVersion.current;
  Alert.alert('Eliminar equipa?',
   'Esta ação é definitiva. Só é possível eliminar uma equipa sem jogadores convidados, mensagens, competições ou histórico. O servidor protege todos esses dados.',[
    {text:'Manter equipa',style:'cancel'},
    {text:'Eliminar equipa',style:'destructive',onPress:()=>{
      if(version!==requestVersion.current||identity!==teamId+'|'+auth.token||
         actionRef.current||savingRef.current)return;
      const action=++actionGeneration.current;
      actionRef.current=true;savingRef.current=true;setSaving(true);
      setError('');setNotice('');
      void deleteSportsTeam(teamId,auth.token!).then(()=>{
        if(version!==requestVersion.current||action!==actionGeneration.current)return;
        router.replace('/teams');
      }).catch(error=>{
        if(version!==requestVersion.current||action!==actionGeneration.current)return;
        const message=error instanceof Error?error.message:'';
        setError(/409|histórico|ligações|conflict/i.test(message)
         ?'Não é possível eliminar esta equipa: existem jogadores, convites, mensagens ou ligações históricas que devem ser preservadas.'
         :'Não foi possível confirmar a eliminação. Consulta a equipa antes de repetir.');
      }).finally(()=>releaseAction(action));
    }}
   ]);
 };
 const removePlayer=(member:SportsTeamMember)=>{
  if(!auth.token||saving||actionRef.current||!isOwner||!rosterVerified||member.role==='OWNER')return;
  const version=requestVersion.current;
  Alert.alert('Remover jogador?',`Remover @${member.username} do plantel? Esta ação não elimina o perfil do jogador.`,[
   {text:'Cancelar',style:'cancel'},
   {text:'Remover',style:'destructive',onPress:()=>{
    if(version!==requestVersion.current||actionRef.current)return;
    const action=++actionGeneration.current;
    actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,member.profileId,auth.token!).then(()=>{
     if(version!==requestVersion.current)return;
     setMembers(current=>current.filter(item=>item.profileId!==member.profileId));
     setNotice('Jogador removido do plantel.');
     releaseAction(action);
     void load(true,true);
    }).catch(e=>{
     if(version===requestVersion.current){
      setRosterVerified(false);
      setError((e instanceof Error?e.message:'Não foi possível confirmar a remoção.')+' Atualiza o plantel antes de repetir.');
     }
    }).finally(()=>releaseAction(action));
   }}
  ]);
 };
 const decideMembership=async(id:number,accept:boolean)=>{
  if(!auth.token||savingRef.current||actionRef.current||!communitiesVerified||
     !communities.some(item=>item.id===id))return;
  const version=requestVersion.current;
  const action=++actionGeneration.current;
  actionRef.current=true;savingRef.current=true;
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
  }finally{releaseAction(action);}
 };
 const removeMembership=async(id:number)=>{
  if(!auth.token||savingRef.current||actionRef.current||!communitiesVerified||
     !communities.some(item=>item.id===id))return;
  const version=requestVersion.current;
  const action=++actionGeneration.current;
  actionRef.current=true;savingRef.current=true;
  setSaving(true);setError('');setMembershipNote('');
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
  }finally{releaseAction(action);}
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
    const action=++actionGeneration.current;
    actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
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
    }).finally(()=>releaseAction(action));
   }}
  ]);
 };
 const feature=async(field:'chatEnabled'|'feedEnabled')=>{
  if(!team||!auth.token||!isOwner||!brandingVerified||savingRef.current||actionRef.current)return;
  const version=requestVersion.current;
  const action=++actionGeneration.current;
  actionRef.current=true;savingRef.current=true;
  setSaving(true);setError('');setNotice('');
  try{
   const updated=await setSportsTeamFeatures(team.id,{[field]:!team[field]},auth.token);
   if(version===requestVersion.current&&updated.id===team.id){
    setTeam(updated);setNotice('Configuração da equipa guardada.');
   }
  }catch(e){
   if(version===requestVersion.current){
    setError((e instanceof Error?e.message:'Não foi possível confirmar a configuração.')+
     ' Confirma o estado atual antes de repetir.');
    setBrandingVerified(false);
   }
  }finally{releaseAction(action);}
 };
 const kitPatterns:ReadonlyArray<{id:TeamKitPattern;label:string}>=[
   {id:'PLAIN',label:'Lisa'},{id:'STRIPES',label:'Riscas'},{id:'DIAGONAL',label:'Faixa diagonal'}
  ];
 const kitOptions=['#19CBB6','#FFFFFF','#0E3A52','#2554D9','#E74855','#F6C94B','#101820','#EF7B2D'];
 const updateBranding=async(mode:'KIT'|'LOGO'|'REMOVE',asset?:ImagePicker.ImagePickerAsset)=>{
  if(!auth.token||!team||!isOwner||!brandingVerified||saving||actionRef.current)return;
  const version=requestVersion.current;
  const action=++actionGeneration.current;
  actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
  try{
   const result=mode==='KIT'
    ?await setSportsTeamKit(teamId,kitPrimary,kitSecondary,auth.token,kitPattern)
    :mode==='REMOVE'
    ?await removeSportsTeamLogo(teamId,auth.token)
    :await uploadSportsTeamLogo(teamId,asset!,auth.token);
   if(version!==requestVersion.current)return;
   setTeam(result);setBrandingVerified(true);
   // Changing the crest must not silently discard unsaved kit choices.
   if(mode==='KIT'||!kitEditedRef.current){
    kitEditedRef.current=false;
    setKitPrimary(safeTeamKitColor(result.kitPrimary,'#19CBB6'));
    setKitSecondary(safeTeamKitColor(result.kitSecondary,'#F0FAFB'));
    setKitPattern(result.kitPattern||'PLAIN');
   }
   setNotice(mode==='KIT'?'Equipamento guardado.':mode==='REMOVE'?'Logótipo removido.':'Logótipo atualizado.');
  }catch(e){
   if(version===requestVersion.current){
    setBrandingVerified(false);kitEditedRef.current=false;
    setError((e instanceof Error?e.message:'Não foi possível confirmar a alteração.')+
     ' Volta a carregar a equipa antes de repetir.');
   }
  }finally{releaseAction(action);}
 };
 const pickLogo=async()=>{
  if(!auth.token||!team||!isOwner||!brandingVerified||saving||actionRef.current)return;
  const version=requestVersion.current;
  try{
   const result=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:['images'],allowsEditing:false,quality:1
   });
   if(result.canceled||version!==requestVersion.current)return;
   if(result.assets?.[0])void updateBranding('LOGO',result.assets[0]);
  }catch{
   if(version===requestVersion.current)setError('Não foi possível abrir a galeria do dispositivo.');
  }
 };
 const isOwner=rosterVerified&&!!auth.username&&members.some(m=>m.role==='OWNER'&&m.username.toLowerCase()===auth.username!.toLowerCase());
 const isMember=rosterVerified&&!!auth.token&&!!auth.username&&members.some(m=>m.username.toLowerCase()===auth.username!.toLowerCase());
 const inviteCandidates=candidates.filter(p=>!members.some(m=>m.profileId===p.profileId)&&
   !pendingPlayers.some(invite=>invite.profileId===p.profileId));
 const seasonTournamentIds=new Set(championshipHonours.filter(h=>h.tournamentId!==null).map(h=>h.tournamentId));
 const standaloneTrophies=history.filter(item=>item.champion&&!seasonTournamentIds.has(item.tournamentId));
 return <Page>
  <View style={styles.backRow}><Pressable accessibilityRole="button" accessibilityLabel="Voltar às equipas" onPress={()=>router.push('/teams')} style={styles.backLink}><Text style={styles.backLabel}>‹  Equipas</Text></Pressable><Text style={styles.backContext}>PERFIL DA EQUIPA</Text></View>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!loading&&!saving?<Button secondary title="Tentar novamente" onPress={()=>void load(false,true)}/>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&!team?<Message>Não foi possível confirmar esta equipa. Volta à lista e tenta novamente.</Message>:null}
  {team?<><View style={styles.header}>
    <Text style={styles.eyebrow}>JYNLO · EQUIPA DESPORTIVA</Text>
    <View style={styles.heroIdentity}>
      <TeamBrandAvatar team={team} size={94}/>
      <View style={styles.heroCopy}>
        <Text style={styles.title}>{team.name}</Text>
        <Text style={styles.heroSubtitle}>{team.sport||'Várias modalidades'} · {team.location||'Localização por definir'}</Text>
      </View>
    </View>
    {team.description?<Text style={styles.description}>{team.description}</Text>:null}
    <View style={styles.kitPreview}>
      <TeamKitPreview primary={team.kitPrimary} secondary={team.kitSecondary} pattern={team.kitPattern} size={48}/>
      <Text style={styles.heroSubtitle}>Equipamento · {kitPatterns.find(p=>p.id===(team.kitPattern||'PLAIN'))?.label||'Lisa'}</Text>
    </View>
    <View style={styles.statsRow}>
      <View style={styles.statCard}><Text style={styles.statNumber}>{rosterVerified?members.length:'—'}</Text><Text style={styles.statLabel}>Jogadores</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{communitiesVerified?communities.filter(m=>m.status==='ACTIVE').length:'—'}</Text><Text style={styles.statLabel}>Comunidades</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{trophiesVerified?standaloneTrophies.length+championshipHonours.length:'—'}</Text><Text style={styles.statLabel}>Troféus</Text></View>
    </View>
    <View style={styles.heroActions}>
     <Pressable accessibilityRole="button" accessibilityLabel="Encontrar competições para esta equipa"
       style={[styles.heroAction,{flex:1}]}
       onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})}>
       <Text style={styles.heroActionLabel}>Explorar competições →</Text>
     </Pressable>
     {isOwner?<Pressable accessibilityRole="button" accessibilityLabel="Personalizar emblema e equipamento"
       onPress={()=>setActiveTab('BRANDING')} style={styles.heroSecondaryAction}>
       <Text style={styles.heroSecondaryText}>Personalizar</Text>
     </Pressable>:null}
    </View>
   </View>
   <ScrollView ref={tabRail} horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.tabBar} accessibilityLabel="Secções da equipa">
    {([...([{id:'OVERVIEW',label:'Plantel',icon:'community'},{id:'TROPHIES',label:'Troféus',icon:'tournament'},
      {id:'FEED',label:'Publicações',icon:'post'},{id:'CHAT',label:'Chat',icon:'messages'},
      {id:'CHALLENGES',label:'Desafios',icon:'championship'}] as const),
      ...(isOwner?[{id:'BRANDING' as const,label:'Identidade',icon:'settings' as const}]:[])]).map(tab=>
     <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label}
      accessibilityState={{selected:activeTab===tab.id}}
      onLayout={event=>{tabPositions.current[tab.id]=event.nativeEvent.layout.x;}}
      onPress={()=>setActiveTab(tab.id)} style={[styles.tab,activeTab===tab.id&&styles.tabSelected]}>
      <JynloIcon name={tab.icon} size={17} active={activeTab===tab.id}
       color={activeTab===tab.id?'#052D32':'#C1DADF'}/>
      <Text style={[styles.tabText,activeTab===tab.id&&styles.tabTextSelected]}>{tab.label}</Text>
     </Pressable>)}
   </ScrollView>
   {isOwner&&activeTab==='BRANDING'?<View style={styles.panel}>
    <Text style={styles.heading}>Identidade da equipa</Text>
    <Text style={styles.note}>Personaliza o emblema e o equipamento. As alterações aparecem na Web e na app.</Text>
    {!brandingVerified?<Text style={styles.note}>Identidade por confirmar. Recarrega os dados antes de editar.</Text>:null}
    <Button title="Escolher logótipo da galeria" secondary disabled={saving||!brandingVerified} onPress={()=>void pickLogo()}/>
    {team.logoUrl?<Button title="Remover logótipo" secondary disabled={saving||!brandingVerified}
      onPress={()=>Alert.alert('Remover logótipo?','O emblema atual será removido da equipa.',[
       {text:'Cancelar',style:'cancel'},
       {text:'Remover',style:'destructive',onPress:()=>void updateBranding('REMOVE')}
      ])}/>:null}
    <Text style={styles.kitLabel}>Desenho da camisola</Text>
    <View style={styles.kitPatternRow}>{kitPatterns.map(option=><Pressable key={option.id}
      accessibilityRole="button" accessibilityLabel={'Modelo '+option.label}
      accessibilityState={{selected:kitPattern===option.id}}
      disabled={saving||!brandingVerified}
      onPress={()=>{kitEditedRef.current=true;setKitPattern(option.id);}}
      style={[styles.kitPatternCard,kitPattern===option.id&&styles.kitPatternSelected]}>
      <TeamKitPreview primary={kitPrimary} secondary={kitSecondary} pattern={option.id} size={56}/>
      <Text style={styles.kitPatternText}>{option.label}</Text>
    </Pressable>)}</View>
    <Text style={styles.kitLabel}>Cor principal</Text>
    <View style={styles.swatchRow}>{kitOptions.map(color=><Pressable key={'primary'+color}
      accessibilityRole="button" accessibilityLabel={'Cor principal '+color}
      accessibilityState={{selected:kitPrimary===color}}
      disabled={saving||!brandingVerified} onPress={()=>{kitEditedRef.current=true;setKitPrimary(color);}}
      style={[styles.swatch,{backgroundColor:color},kitPrimary===color&&styles.swatchSelected]}/>)}</View>
    <Text style={styles.kitLabel}>Cor secundária</Text>
    <View style={styles.swatchRow}>{kitOptions.map(color=><Pressable key={'secondary'+color}
      accessibilityRole="button" accessibilityLabel={'Cor secundária '+color}
      accessibilityState={{selected:kitSecondary===color}}
      disabled={saving||!brandingVerified} onPress={()=>{kitEditedRef.current=true;setKitSecondary(color);}}
      style={[styles.swatch,{backgroundColor:color},kitSecondary===color&&styles.swatchSelected]}/>)}</View>
    <Button title={saving?'A guardar…':'Guardar equipamento'} disabled={saving||!brandingVerified}
      onPress={()=>void updateBranding('KIT')}/>
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}>
    <Text style={styles.heading}>O espaço da equipa</Text>
    <Text style={styles.note}>Acompanha as novidades, conversa com o plantel e consulta as conquistas.</Text>
    <View style={styles.quickLinks}>
     <Pressable accessibilityRole="button" accessibilityLabel="Abrir publicações da equipa" onPress={()=>setActiveTab('FEED')} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="post" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>Publicações</Text>
      <Text style={styles.quickLinkMeta}>{team.feedEnabled?'Novidades do plantel':'Feed desativado'}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="Abrir chat da equipa" onPress={()=>setActiveTab('CHAT')} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="messages" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>Chat</Text>
      <Text style={styles.quickLinkMeta}>{team.chatEnabled?'Conversa da equipa':'Chat desativado'}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="Abrir troféus e histórico da equipa" onPress={()=>setActiveTab('TROPHIES')} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="tournament" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>Troféus</Text>
      <Text style={styles.quickLinkMeta}>Títulos e histórico</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="Explorar competições para esta equipa"
       onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="championship" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>Competições</Text>
      <Text style={styles.quickLinkMeta}>Procurar desafios</Text>
     </Pressable>
    </View>
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Plantel ({rosterVerified?members.length:'—'})</Text>
    {!rosterVerified?<Text style={styles.note}>Plantel por confirmar. As opções de gestão estão temporariamente indisponíveis.</Text>:null}
    {rosterVerified&&members.length===0?<View style={styles.empty}><Text style={styles.note}>Ainda não há jogadores no plantel.</Text></View>:null}
    <View style={styles.roster}>
    {rosterVerified?members.map(m=><View key={m.profileId} style={styles.playerCard}>
      <View style={styles.playerAvatar}>
       {teamPlayerAvatarUri(m.profilePicUrl)&&!brokenAvatars[m.profileId]
        ?<Image source={{uri:teamPlayerAvatarUri(m.profilePicUrl)!}} style={styles.playerAvatarPhoto}
          onError={()=>setBrokenAvatars(previous=>({...previous,[m.profileId]:true}))}/>
        :<Text style={styles.playerAvatarText}>{(m.username||'J').charAt(0).toUpperCase()}</Text>}
      </View>
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
    {isOwner?<><Text style={styles.heading}>Convites pendentes ({pendingVerified?pendingPlayers.length:'—'})</Text>
    {!pendingVerified?<Text style={styles.note}>Convites por confirmar. Novos envios bloqueados até à verificação.</Text>:null}
    <Button title="Verificar convites" secondary disabled={saving} onPress={()=>void load(false,true)}/>
    {pendingVerified?pendingPlayers.map(invite=><View key={invite.profileId} style={styles.candidate}>
     <Text style={styles.playerName}>@{invite.username} · A aguardar resposta</Text>
     <Button title="Cancelar convite" secondary disabled={saving}
      onPress={()=>cancelPendingInvite(invite)}/>
    </View>):null}
    <TextInput style={styles.input} value={searchName} maxLength={80} onChangeText={value=>{setSearchName(value);setSearchComplete(false);setCandidates([]);searchVersion.current++;}}
      placeholder="Procurar jogador pelo nome" placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={()=>void search()}/>
    <Button title={searching?'A procurar…':'Pesquisar jogadores'} disabled={saving||searching||searchName.trim().length<2} onPress={()=>void search()}/>
    {searchComplete&&inviteCandidates.length===0?<Text style={styles.note}>Não encontrámos novos jogadores com essa pesquisa.</Text>:null}
    {inviteCandidates.map(p=><View key={p.profileId} style={styles.candidate}>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/social/[username]',params:{username:p.username}})}>
       <Text style={styles.playerName}>{p.fullName||p.username}</Text>
       <Text style={styles.note}>@{p.username} · Ver perfil →</Text>
      </Pressable>
      <Button title="Convidar" disabled={saving||!pendingVerified} onPress={()=>void invite(p.profileId)}/>
    </View>)}</>:null}
   </View>:null}
   {activeTab==='TROPHIES'?<View style={styles.panel}><Text style={styles.heading}>🏆 Troféus ({trophiesVerified?standaloneTrophies.length+championshipHonours.length:'—'})</Text>
    {trophiesLoading?<Text style={styles.note}>A carregar conquistas oficiais…</Text>:null}
    {!trophiesLoading&&(historyError||honoursError)?<Button secondary title="Tentar novamente" onPress={()=>void loadTrophies(true)}/>:null}
    {historyError?<Text style={styles.note}>{historyError}</Text>:null}
    {honoursError?<Text style={styles.note}>{honoursError}</Text>:null}
    {trophiesVerified&&!standaloneTrophies.length&&!championshipHonours.length?
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
   {activeTab==='TROPHIES'?<View style={styles.panel}><Text style={styles.heading}>Histórico de torneios ({trophiesVerified?history.length:'—'})</Text>
    {trophiesVerified&&!history.length?<Text style={styles.note}>Ainda não existem torneios associados a esta equipa.</Text>:null}
    {history.map(item=><Pressable key={item.tournamentId} accessibilityRole="button" style={styles.historyLink}
      onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(item.communityId),id:String(item.tournamentId)}})}>
      <Text style={styles.playerName}>{item.tournamentName}</Text>
      <Text style={styles.note}>{item.communityName} · {item.champion?'🏆 Campeão':item.archived?'Concluído':'Em curso'} · Ver torneio →</Text>
    </Pressable>)}
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>Competições da equipa</Text>
    <Text style={styles.note}>{trophiesVerified?`${history.length} torneios no histórico · ${standaloneTrophies.length+championshipHonours.length} troféus oficiais`:'Histórico e troféus disponíveis no separador próprio.'}</Text>
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
   {activeTab==='OVERVIEW'&&isOwner?<View style={[styles.panel,{borderColor:'#A95D63',gap:10}]}>
    <Text style={styles.heading}>Administração da equipa</Text>
    <Text style={styles.note}>A eliminação é definitiva e apenas permitida a equipas sem jogadores convidados, mensagens, competições ou ligações históricas.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Eliminar definitivamente esta equipa"
      accessibilityState={{disabled:saving||!rosterVerified||!brandingVerified}}
      disabled={saving||!rosterVerified||!brandingVerified} onPress={deleteTeam}
      style={[styles.removeAction,{alignSelf:'flex-start',minHeight:44,justifyContent:'center'}]}>
      <Text style={styles.removeText}>{saving?'A processar…':'Eliminar equipa'}</Text>
    </Pressable>
   </View>:null}
   {activeTab==='FEED'?<View style={styles.panel}><Text style={styles.heading}>Publicações da equipa</Text>
    {!team.feedEnabled?<Text style={styles.note}>O feed da equipa está desativado.</Text>:null}
    {isOwner?<Button title={team.feedEnabled?'Desativar feed':'Ativar feed'} disabled={saving} onPress={()=>void feature('feedEnabled')}/>:null}
    {team.feedEnabled&&isMember&&auth.token&&auth.username?
     <SportsTeamContentPanel teamId={teamId} kind="feed" token={auth.token} username={auth.username}/>:null}
    {team.feedEnabled&&!isMember?<Text style={styles.note}>Disponível apenas para membros confirmados.</Text>:null}
   </View>:null}
   {activeTab==='CHALLENGES'&&team?<View style={styles.panel}>
    <SportsTeamChallengesPanel teamId={teamId} token={auth.token}
      isOwner={isOwner&&rosterVerified} sport={team.sport}/>
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
 header:{padding:22,backgroundColor:'#082D3B',borderColor:'#35BCA66A',borderWidth:1,borderRadius:23,gap:15,overflow:'hidden'},
 backRow:{minHeight:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
 backLink:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 backLabel:{fontSize:14,color:C.mint,fontWeight:'900'},
 backContext:{fontSize:10,color:C.muted,fontWeight:'800',letterSpacing:1.2}, 
 kitPreview:{flexDirection:'row',alignItems:'center',gap:9},
 kitPatternRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
 kitPatternCard:{flex:1,minWidth:90,minHeight:94,alignItems:'center',justifyContent:'center',padding:8,gap:7,borderWidth:1,
  borderColor:C.border,borderRadius:14,backgroundColor:C.surface},
 kitPatternSelected:{borderColor:C.mint,borderWidth:2,backgroundColor:'#123C42'},
 kitPatternText:{fontSize:13,fontWeight:'800',color:C.white,textAlign:'center'},
 kitCircle:{height:19,width:19,borderWidth:4,borderRadius:10},
 kitLabel:{fontSize:13,fontWeight:'800',color:C.white,marginTop:4},
 swatchRow:{flexDirection:'row',flexWrap:'wrap',gap:10},
 swatch:{width:44,height:44,borderWidth:2,borderColor:'#578891',borderRadius:12},
 swatchSelected:{borderWidth:4,borderColor:C.mint},

 eyebrow:{fontSize:12,fontWeight:'900',letterSpacing:1.1,color:C.mint},
 heroIdentity:{flexDirection:'row',alignItems:'center',gap:17,paddingVertical:10,paddingHorizontal:2},
 heroCrest:{width:74,height:74,borderRadius:19,backgroundColor:'#168D86',alignItems:'center',justifyContent:'center'},
 heroCrestText:{color:'#052C32',fontSize:32,fontWeight:'900'},
 heroCopy:{flex:1,gap:5},
 heroSubtitle:{color:'#C5F4E9',fontWeight:'700',fontSize:14,lineHeight:21},
 description:{color:'#D1E4E8',fontSize:14,lineHeight:21},
 statsRow:{flexDirection:'row',flexWrap:'nowrap',gap:8},
 statCard:{flex:1,minWidth:0,alignItems:'center',paddingVertical:12,paddingHorizontal:5,backgroundColor:'#0A3640',borderWidth:1,borderColor:'#3CC8AC55',borderRadius:14,gap:4},
 statNumber:{color:C.white,fontSize:22,fontWeight:'900'},
 statLabel:{color:'#C9E4E8',fontSize:12,fontWeight:'700',textAlign:'center'},
 heroActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:9},
 heroAction:{backgroundColor:C.mint,padding:13,borderRadius:12,alignItems:'center',justifyContent:'center',minHeight:46},
 heroSecondaryAction:{minHeight:46,justifyContent:'center',alignItems:'center',paddingHorizontal:15,borderRadius:12,borderColor:'#5CE6D3',borderWidth:1,backgroundColor:'#0B3943'},
 heroSecondaryText:{color:'#B2FFE8',fontSize:13,fontWeight:'900'},
 heroActionLabel:{color:'#053039',fontWeight:'900'},
 quickLinks:{flexDirection:'row',flexWrap:'wrap',gap:9},
 quickLink:{flexGrow:1,flexBasis:'42%',minWidth:132,minHeight:122,padding:13,borderRadius:14,borderColor:'#49CEBA66',borderWidth:1,backgroundColor:'#0D3A43',gap:6},
 quickLinkIcon:{width:38,height:38,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#14514D'},
 quickLinkSymbol:{fontSize:23,color:C.mint,fontWeight:'900'},
 quickLinkText:{fontSize:13,color:C.white,fontWeight:'900'},
 quickLinkMeta:{fontSize:11,lineHeight:16,color:'#B8D9DB'},
 roster:{gap:8},
 playerCard:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,padding:10,flexDirection:'row',alignItems:'center',gap:11},
 playerAvatar:{height:42,width:42,borderRadius:21,backgroundColor:'#167A7D',alignItems:'center',justifyContent:'center',overflow:'hidden'},
 playerAvatarPhoto:{width:42,height:42,borderRadius:21},
 playerAvatarText:{color:C.white,fontWeight:'900',fontSize:17},
 playerInfo:{flex:1,gap:2},
 playerName:{color:C.white,fontSize:14,fontWeight:'800'},
 empty:{padding:16,alignItems:'center',borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:12},
 tabBar:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:6,paddingRight:12},
 tab:{minHeight:44,paddingHorizontal:15,paddingVertical:11,borderWidth:1,borderColor:'#317C80',borderRadius:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,backgroundColor:'#092D3B'},
 tabSelected:{borderColor:C.mint,backgroundColor:'#1BCFB6'},tabText:{fontSize:13,fontWeight:'800',color:'#C1DADF'},tabTextSelected:{color:'#052D32'},
 communityLink:{flex:1,gap:3,minHeight:44,justifyContent:'center'},historyLink:{padding:12,borderRadius:11,borderWidth:1,borderColor:C.border,gap:4},
 removeAction:{minHeight:44,justifyContent:'center',paddingHorizontal:8,borderRadius:8,borderWidth:1,borderColor:C.border},removeText:{fontSize:13,fontWeight:'800',color:C.white},
 title:{fontSize:27,lineHeight:33,fontWeight:'900',color:C.white,letterSpacing:-.6},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 panel:{padding:16,borderWidth:1,borderColor:'#3CBDA94D',backgroundColor:'#082C3B',borderRadius:17,gap:12},
 input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,color:C.white,padding:12,minHeight:48,fontSize:15},
 candidate:{padding:10,borderColor:C.border,borderWidth:1,borderRadius:10,gap:5}
});
