import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import * as ImagePicker from 'expo-image-picker';
import {Alert,AppState,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {sportsTeamFollowState,setSportsTeamFollow,type SportsTeamFollowState,teamPlayerAvatarUri,setSportsTeamKit,uploadSportsTeamLogo,removeSportsTeamLogo,safeTeamKitColor,setSportsTeamFeatures,sportsTeamDetail,sportsTeamMembers,inviteSportsTeamMember,findSportsTeamPlayers,SportsTeam,SportsTeamMember,SportsTeamPlayerCandidate,removeSportsTeamMember,deleteSportsTeam,sportsTeamHistory,sportsTeamChampionshipHonours,pendingSportsTeamPlayers,type TeamPendingPlayerInvitation,type TeamCompetitionHistory,type TeamChampionshipHonour} from '../../src/lib/sports-teams-api';
import {C} from '../../src/lib/theme';
import SportsTeamContentPanel from '../../src/components/SportsTeamContentPanel';
import {isConversationMuted,listConversationMutes,setConversationMuted} from '../../src/lib/conversation-mutes-api';
import TeamBrandAvatar from '../../src/components/TeamBrandAvatar';
import TeamKitPreview from '../../src/components/TeamKitPreview';
import TeamKitStudio from '../../src/components/TeamKitStudio';
import TeamCrestStudio from '../../src/components/TeamCrestStudio';
import type {TeamKitDesign,TeamKitVariant,GeneratedTeamCrestImage} from '../../src/lib/sports-teams-api';
import {JynloIcon} from '../../src/components/JynloIcon';
import SportsTeamChallengesPanel from '../../src/components/SportsTeamChallengesPanel';
import type {TeamKitPattern} from '../../src/lib/sports-teams-api';
import {sportsTeamCommunities,answerTeamCommunityMembership,removeTeamCommunityMembership,type TeamCommunityMembership} from '../../src/lib/team-community-memberships-api';

export default function TeamDetail(){
 const {id,tab}=useLocalSearchParams<{id:string;tab?:string}>(),router=useRouter(),auth=useAuth();
 const teamId=Number(id);const [team,setTeam]=useState<SportsTeam|null>(null);
 // Alerts and the Messages list open the team chat directly.
 const [activeTab,setActiveTab]=useState<'OVERVIEW'|'TROPHIES'|'FEED'|'CHAT'|'CHALLENGES'|'BRANDING'>(tab==='CHAT'?'CHAT':tab==='FEED'?'FEED':'OVERVIEW');
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
 const [followerState,setFollowerState]=useState<SportsTeamFollowState|null>(null);
 const [followBusy,setFollowBusy]=useState(false),[followError,setFollowError]=useState('');
 const followVersion=useRef(0);
 const loadFollowers=useCallback(async()=>{
  const version=++followVersion.current;
  if(!auth.token||!Number.isSafeInteger(teamId)||teamId<=0){setFollowerState(null);return;}
  try{
   const result=await sportsTeamFollowState(teamId,auth.token);
   if(version===followVersion.current)setFollowerState(result);
  }catch{
   if(version===followVersion.current){setFollowerState(null);setFollowError(t('Seguidores indisponíveis.'));}
  }
 },[teamId,auth.token]);
 async function toggleFollow(){
  if(!auth.token||!followerState||followBusy)return;
  const version=++followVersion.current;
  setFollowBusy(true);setFollowError('');
  try{
   const actual=await setSportsTeamFollow(teamId,auth.token,!followerState.following);
   if(version===followVersion.current)setFollowerState(actual);
  }catch{
   if(version===followVersion.current){
    setFollowerState(null);setFollowError(t('Não foi possível confirmar. Verifica o estado antes de tentares novamente.'));
    setFollowBusy(false);
    void loadFollowers();
   }
  }finally{if(version===followVersion.current)setFollowBusy(false);}
 }
 const [searchComplete,setSearchComplete]=useState(false),[searching,setSearching]=useState(false);
 const requestVersion=useRef(0),searchVersion=useRef(0),actionRef=useRef(false),actionGeneration=useRef(0);
 const reading=useRef<number|null>(null),savingRef=useRef(false);
 useEffect(()=>{savingRef.current=saving;},[saving]);
 // A new account or team must not inherit the previous team's private roster,
 // pending invitations, memberships, messages, or unsaved kit edits.
 useEffect(()=>{
  requestVersion.current++;searchVersion.current++;actionGeneration.current++;followVersion.current++;
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
  setFollowerState(null);setFollowError('');setFollowBusy(false);
  setNotice('');setMembershipNote('');setError('');setLoading(true);
 },[teamId,auth.token]);
 const load=useCallback(async(silent=false,force=false)=>{
  if(!force&&(reading.current===requestVersion.current||savingRef.current))return;
  const version=++requestVersion.current;
  reading.current=version;
  if(!silent){setLoading(true);setError('');}
  if(!Number.isSafeInteger(teamId)||teamId<=0){
   if(reading.current===version)reading.current=null;
   setError(t('Equipa inválida.'));setLoading(false);return;
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
  }else {setBrandingVerified(false);if(!silent)setTeam(null);failed.push(t('o perfil da equipa'));}
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
  }else{setMembers([]);setRosterVerified(false);setPendingVerified(false);setPendingPlayers([]);failed.push(t('o plantel'));}
  if(linked.status==='fulfilled'){setCommunities(linked.value);setCommunitiesVerified(true);}
  else{setCommunities([]);setCommunitiesVerified(false);failed.push(t('as comunidades'));}
  if(failed.length){
   if(!silent)setError(t('Não foi possível atualizar {v}. As restantes secções continuam disponíveis.',{v:failed.join(', ')}));
  }else if(!silent)setError('');
  if(!silent)setLoading(false);
 },[teamId,auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  void load();
  void loadFollowers();
  const timer=setInterval(()=>{
   if(AppState.currentState==='active'&&!savingRef.current)void load(true);
  },60000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&!savingRef.current){void load(true);void loadFollowers();}
  });
  return ()=>{
   clearInterval(timer);resume.remove();
   requestVersion.current++;searchVersion.current++;actionGeneration.current++;
   actionRef.current=false;savingRef.current=false;
  };
 },[load,loadFollowers]));
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
  else{setHistory([]);setHistoryError(t('Não foi possível carregar o histórico oficial.'));}
  if(awards.status==='fulfilled'){setChampionshipHonours(awards.value);setHonoursError('');}
  else{setChampionshipHonours([]);setHonoursError(t('Não foi possível carregar os troféus.'));}
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
   if(version===searchVersion.current)setError(e instanceof Error?e.message:t('Não foi possível pesquisar jogadores.'));
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
   setNotice(t('Convite enviado. O jogador entra no plantel depois de aceitar.'));
   setPendingVerified(false);
   releaseAction(action);void load(true,true);
  }catch(e){
   if(version===requestVersion.current){
    setPendingVerified(false);setCandidates([]);setSearchComplete(false);
    setError((e instanceof Error?e.message:t('Não foi possível confirmar o convite.'))+
     ' '+t('Verifica os convites pendentes antes de repetir.'));
   }
  }finally{releaseAction(action);}
 };
 const cancelPendingInvite=(invite:TeamPendingPlayerInvitation)=>{
  if(!auth.token||!isOwner||!pendingVerified||saving||actionRef.current||
   !pendingPlayers.some(item=>item.profileId===invite.profileId))return;
  const version=requestVersion.current;
  Alert.alert(t('Cancelar convite?'),t('Cancelar o convite para @{a}?',{a:invite.username}),[
   {text:t('Manter'),style:'cancel'},
   {text:t('Cancelar convite'),style:'destructive',onPress:()=>{
    if(version!==requestVersion.current||actionRef.current)return;
    const action=++actionGeneration.current;
    actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,invite.profileId,auth.token!).then(()=>{
     if(version!==requestVersion.current)return;
     setPendingVerified(false);
     setNotice(t('Convite cancelado.'));
     releaseAction(action);void load(true,true);
    }).catch(e=>{
     if(version===requestVersion.current){
      setPendingVerified(false);setPendingPlayers([]);
      setError((e instanceof Error?e.message:t('Não foi possível confirmar o cancelamento.'))+
       ' '+t('Verifica os convites antes de tentar novamente.'));
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
  Alert.alert(t('Eliminar equipa?'),
   t('Esta ação é definitiva. Só é possível eliminar uma equipa sem jogadores convidados, mensagens, competições ou histórico. O servidor protege todos esses dados.'),[
    {text:t('Manter equipa'),style:'cancel'},
    {text:t('Eliminar equipa'),style:'destructive',onPress:()=>{
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
         ?t('Não é possível eliminar esta equipa: existem jogadores, convites, mensagens ou ligações históricas que devem ser preservadas.')
         :t('Não foi possível confirmar a eliminação. Consulta a equipa antes de repetir.'));
      }).finally(()=>releaseAction(action));
    }}
   ]);
 };
 const removePlayer=(member:SportsTeamMember)=>{
  if(!auth.token||saving||actionRef.current||!isOwner||!rosterVerified||member.role==='OWNER')return;
  const version=requestVersion.current;
  Alert.alert(t('Remover jogador?'),t('Remover @{a} do plantel? Esta ação não elimina o perfil do jogador.',{a:member.username}),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Remover'),style:'destructive',onPress:()=>{
    if(version!==requestVersion.current||actionRef.current)return;
    const action=++actionGeneration.current;
    actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,member.profileId,auth.token!).then(()=>{
     if(version!==requestVersion.current)return;
     setMembers(current=>current.filter(item=>item.profileId!==member.profileId));
     setNotice(t('Jogador removido do plantel.'));
     releaseAction(action);
     void load(true,true);
    }).catch(e=>{
     if(version===requestVersion.current){
      setRosterVerified(false);
      setError((e instanceof Error?e.message:t('Não foi possível confirmar a remoção.'))+' '+t('Atualiza o plantel antes de repetir.'));
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
   setMembershipNote(accept?t('Convite aceite.'):t('Convite recusado.'));
   try{
    const updated=await sportsTeamCommunities(teamId,auth.token);
    if(version===requestVersion.current)setCommunities(updated);
   }catch{
    if(version===requestVersion.current){
     setCommunitiesVerified(false);
     setError(t('O convite foi tratado, mas não foi possível confirmar as associações. Consulta os dados antes de repetir.'));
    }
   }
  }catch(e){
   if(version===requestVersion.current){
    setCommunitiesVerified(false);
    setError((e instanceof Error?e.message:t('Não foi possível confirmar a resposta.'))+' '+t('Atualiza antes de tentar novamente.'));
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
   setMembershipNote(t('Equipa removida da comunidade.'));
   try{
    const updated=await sportsTeamCommunities(teamId,auth.token);
    if(version===requestVersion.current)setCommunities(updated);
   }catch{
    if(version===requestVersion.current){
     setCommunitiesVerified(false);
     setError(t('A saída foi enviada, mas não foi possível confirmar a lista atual. Atualiza antes de repetir.'));
    }
   }
  }catch(e){
   if(version===requestVersion.current){
    setCommunitiesVerified(false);
    setError((e instanceof Error?e.message:t('Não foi possível confirmar a saída.'))+' '+t('Consulta as comunidades antes de repetir.'));
   }
  }finally{releaseAction(action);}
 };
 const confirmLeaveCommunity=(membership:TeamCommunityMembership)=>{
  if(saving||!communitiesVerified)return;
  const version=requestVersion.current;
  Alert.alert(t('Sair da comunidade?'),t('A equipa deixa de estar associada a {a}. Continuar?',{a:membership.communityName}),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Sair da comunidade'),style:'destructive',onPress:()=>{
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
  Alert.alert(t('Sair da equipa?'),t('Deixarás de ter acesso ao chat e às publicações privadas.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Sair da equipa'),style:'destructive',onPress:()=>{
    if(current!==requestVersion.current||actionRef.current)return;
    const action=++actionGeneration.current;
    actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
    void removeSportsTeamMember(teamId,player.profileId,auth.token!).then(()=>{
     if(current!==requestVersion.current)return;
     setMembers(rows=>rows.filter(item=>item.profileId!==player.profileId));
     setActiveTab('OVERVIEW');
     setNotice(t('Saíste da equipa. O acesso às mensagens privadas foi retirado.'));
     setSaving(false);
     void load(true,true);
    }).catch(e=>{
     if(current===requestVersion.current){
      setRosterVerified(false);setActiveTab('OVERVIEW');
      setError((e instanceof Error?e.message:t('Saída não confirmada.'))+
       ' '+t('Verifica o plantel antes de repetir.'));
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
    setTeam(updated);setNotice(t('Configuração da equipa guardada.'));
   }
  }catch(e){
   if(version===requestVersion.current){
    setError((e instanceof Error?e.message:t('Não foi possível confirmar a configuração.'))+
     ' '+t('Confirma o estado atual antes de repetir.'));
    setBrandingVerified(false);
   }
  }finally{releaseAction(action);}
 };
 const kitPatterns:ReadonlyArray<{id:TeamKitPattern;label:string}>=[
   {id:'PLAIN',label:t('Lisa')},{id:'STRIPES',label:t('Riscas verticais')},{id:'DIAGONAL',label:t('Faixa diagonal')},
    {id:'HOOPS',label:t('Riscas horizontais')},{id:'HALVES',label:t('Metades')},{id:'CHEVRON',label:t('V frontal')}
  ];
 const kitOptions=['#19CBB6','#FFFFFF','#0E3A52','#2554D9','#E74855','#F6C94B','#101820','#EF7B2D'];
 const updateBranding=async(mode:'KIT'|'LOGO'|'REMOVE',
  asset?:ImagePicker.ImagePickerAsset|GeneratedTeamCrestImage,
  selectedKit?:{primary:TeamKitDesign;variants:TeamKitVariant[]},crestDesign?:string)=>{
  if(!auth.token||!team||!isOwner||!brandingVerified||saving||actionRef.current)return;
  const version=requestVersion.current;
  const action=++actionGeneration.current;
  actionRef.current=true;savingRef.current=true;setSaving(true);setError('');setNotice('');
  try{
   const result=mode==='KIT'
    ?await setSportsTeamKit(teamId,selectedKit?.primary.primary||kitPrimary,
       selectedKit?.primary.secondary||kitSecondary,auth.token,
       selectedKit?.primary.pattern||kitPattern,
       selectedKit?{garment:selectedKit.primary.garment,accent:selectedKit.primary.accent,
        playerName:selectedKit.primary.playerName,playerNumber:selectedKit.primary.playerNumber,
        variants:selectedKit.variants}:undefined)
    :mode==='REMOVE'
    ?await removeSportsTeamLogo(teamId,auth.token)
    :await uploadSportsTeamLogo(teamId,asset!,auth.token,crestDesign);
   if(version!==requestVersion.current)return;
   setTeam(result);setBrandingVerified(true);
   // Changing the crest must not silently discard unsaved kit choices.
   if(mode==='KIT'||!kitEditedRef.current){
    kitEditedRef.current=false;
    setKitPrimary(safeTeamKitColor(result.kitPrimary,'#19CBB6'));
    setKitSecondary(safeTeamKitColor(result.kitSecondary,'#F0FAFB'));
    setKitPattern(result.kitPattern||'PLAIN');
   }
   setNotice(mode==='KIT'?t('Equipamento guardado.'):mode==='REMOVE'?t('Logótipo removido.'):t('Logótipo atualizado.'));
  }catch(e){
   if(version===requestVersion.current){
    setBrandingVerified(false);kitEditedRef.current=false;
    setError((e instanceof Error?e.message:t('Não foi possível confirmar a alteração.'))+
     ' '+t('Volta a carregar a equipa antes de repetir.'));
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
   if(version===requestVersion.current)setError(t('Não foi possível abrir a galeria do dispositivo.'));
  }
 };
 const isOwner=rosterVerified&&!!auth.username&&members.some(m=>m.role==='OWNER'&&m.username.toLowerCase()===auth.username!.toLowerCase());
 const isMember=rosterVerified&&!!auth.token&&!!auth.username&&members.some(m=>m.username.toLowerCase()===auth.username!.toLowerCase());
 // Per-conversation mute for the team chat, like groups and communities.
 const [chatMuted,setChatMuted]=useState(false),[chatMuteBusy,setChatMuteBusy]=useState(false);
 useEffect(()=>{
  if(!auth.token||!Number.isSafeInteger(teamId)||teamId<=0)return;
  let active=true;
  listConversationMutes(auth.token).then(list=>{if(active)setChatMuted(isConversationMuted(list,'team',String(teamId)));}).catch(()=>{});
  return()=>{active=false;};
 },[auth.token,teamId]);
 async function toggleChatMute(){
  if(!auth.token||chatMuteBusy)return;
  setChatMuteBusy(true);
  try{await setConversationMuted('team',String(teamId),!chatMuted,auth.token);setChatMuted(!chatMuted);}
  catch{Alert.alert(t('Chat da equipa'),t('Não foi possível alterar o silêncio desta conversa.'));}
  finally{setChatMuteBusy(false);}
 }
 const inviteCandidates=candidates.filter(p=>!members.some(m=>m.profileId===p.profileId)&&
   !pendingPlayers.some(invite=>invite.profileId===p.profileId));
 const seasonTournamentIds=new Set(championshipHonours.filter(h=>h.tournamentId!==null).map(h=>h.tournamentId));
 const standaloneTrophies=history.filter(item=>item.champion&&!seasonTournamentIds.has(item.tournamentId));
 return <Page>
  <View style={styles.backRow}><Pressable accessibilityRole="button" accessibilityLabel={t('Voltar às equipas')} onPress={()=>router.push('/teams')} style={styles.backLink}><Text style={styles.backLabel}>{t('‹  Equipas')}</Text></Pressable><Text style={styles.backContext}>{t('PERFIL DA EQUIPA')}</Text></View>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {error&&!loading&&!saving?<Button secondary title={t('Tentar novamente')} onPress={()=>void load(false,true)}/>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&!team?<Message>{t('Não foi possível confirmar esta equipa. Volta à lista e tenta novamente.')}</Message>:null}
  {team?<><View style={styles.header}>
    <Text style={styles.eyebrow}>{t('JYNLO · EQUIPA DESPORTIVA')}</Text>
    <View style={styles.heroIdentity}>
      <TeamBrandAvatar team={team} size={94}/>
      <View style={styles.heroCopy}>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>{team.name}</Text>
        <Text style={styles.heroSubtitle}>{team.sport||t('Várias modalidades')} · {team.location||t('Localização por definir')}</Text>
      </View>
    </View>
    {team.description?<Text style={styles.description}>{team.description}</Text>:null}
    <View style={styles.kitPreview}>
      <TeamKitPreview primary={team.kitPrimary} secondary={team.kitSecondary} pattern={team.kitPattern} size={48}/>
      <Text style={styles.heroSubtitle}>{t('Equipamento · {a}',{a:kitPatterns.find(p=>p.id===(team.kitPattern||'PLAIN'))?.label||t('Lisa')})}</Text>
    </View>
    {auth.token?<View style={styles.followSection}>
      {followerState?<View style={styles.followRow}>
        <Text style={styles.followCount}>{followerState.count} {followerState.count===1?'seguidor':'seguidores'}</Text>
        <Button secondary title={followBusy?t('A atualizar…'):followerState.following?t('A seguir ✓'):t('Seguir equipa +')}
          disabled={followBusy} onPress={()=>{void toggleFollow();}}/>
      </View>:null}
      {followError?<Message tone="error">{followError}</Message>:null}
      {followError&&!followerState?<Button secondary title={t('Atualizar seguidores')} onPress={()=>{setFollowError('');void loadFollowers();}}/>:null}
    </View>:null}
    <View style={styles.statsRow}>
      <View style={styles.statCard}><Text style={styles.statNumber}>{rosterVerified?members.length:'—'}</Text><Text style={styles.statLabel}>{t('Jogadores')}</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{communitiesVerified?communities.filter(m=>m.status==='ACTIVE').length:'—'}</Text><Text style={styles.statLabel}>{t('Comunidades')}</Text></View>
      <View style={styles.statCard}><Text style={styles.statNumber}>{trophiesVerified?standaloneTrophies.length+championshipHonours.length:'—'}</Text><Text style={styles.statLabel}>{t('Troféus')}</Text></View>
    </View>
    <View style={styles.heroActions}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Encontrar competições para esta equipa')}
       style={[styles.heroAction,{flex:1}]}
       onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})}>
       <Text style={styles.heroActionLabel}>{t('Explorar competições →')}</Text>
     </Pressable>
     {isOwner?<Pressable accessibilityRole="button" accessibilityLabel={t('Publicar Story em nome da equipa')}
       onPress={()=>router.push({pathname:'/',params:{compose:'story',teamStory:String(teamId)}})}
       style={styles.heroSecondaryAction}>
       <Text style={styles.heroSecondaryText}>{t('Criar Story')}</Text>
     </Pressable>:null}
     {isOwner?<Pressable accessibilityRole="button" accessibilityLabel={t('Personalizar emblema e equipamento')}
       onPress={()=>setActiveTab('BRANDING')} style={styles.heroSecondaryAction}>
       <Text style={styles.heroSecondaryText}>{t('Personalizar')}</Text>
     </Pressable>:null}
    </View>
   </View>
   <ScrollView ref={tabRail} horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.tabBar} accessibilityLabel={t('Secções da equipa')}>
    {([...([{id:'OVERVIEW',label:t('Plantel'),icon:'community'},{id:'TROPHIES',label:t('Troféus'),icon:'tournament'},
      {id:'FEED',label:t('Publicações'),icon:'post'},{id:'CHAT',label:t('Chat'),icon:'messages'},
      {id:'CHALLENGES',label:t('Desafios'),icon:'championship'}] as const),
      ...(isOwner?[{id:'BRANDING' as const,label:t('Identidade'),icon:'settings' as const}]:[])]).map(tab=>
     <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label}
      accessibilityState={{selected:activeTab===tab.id}}
      onLayout={event=>{tabPositions.current[tab.id]=event.nativeEvent.layout.x;}}
      onPress={()=>setActiveTab(tab.id)} style={[styles.tab,activeTab===tab.id&&styles.tabSelected]}>
      <JynloIcon name={tab.icon} size={17} active={activeTab===tab.id}
       color={activeTab===tab.id?'#BCFFF0':'#B4D6DE'}/>
      <Text style={[styles.tabText,activeTab===tab.id&&styles.tabTextSelected]}>{tab.label}</Text>
     </Pressable>)}
   </ScrollView>
   {isOwner&&activeTab==='BRANDING'?<View style={styles.panel}>
    <Text style={styles.heading}>{t('Identidade da equipa')}</Text>
    <Text style={styles.note}>{t('Personaliza o emblema e o equipamento. As alterações aparecem na Web e na app.')}</Text>
    {!brandingVerified?<Text style={styles.note}>{t('Identidade por confirmar. Recarrega os dados antes de editar.')}</Text>:null}
    <TeamCrestStudio key={'crest-'+team.id} teamId={team.id} teamName={team.name}
      design={team.crestDesign} disabled={saving||!brandingVerified}
      onSave={(asset,design)=>void updateBranding('LOGO',asset,undefined,design)}/>
    <Button title={t('Escolher logótipo da galeria')} secondary disabled={saving||!brandingVerified} onPress={()=>void pickLogo()}/>
    {team.logoUrl?<Button title={t('Remover logótipo')} secondary disabled={saving||!brandingVerified}
      onPress={()=>Alert.alert(t('Remover logótipo?'),t('O emblema atual será removido da equipa.'),[
       {text:t('Cancelar'),style:'cancel'},
       {text:t('Remover'),style:'destructive',onPress:()=>void updateBranding('REMOVE')}
      ])}/>:null}
    <TeamKitStudio key={team.id} team={team} disabled={saving||!brandingVerified}
      onSave={(primary,variants)=>void updateBranding('KIT',undefined,{primary,variants})}/>
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}>
    <Text style={styles.heading}>{t('O espaço da equipa')}</Text>
    <Text style={styles.note}>{t('Acompanha as novidades, conversa com o plantel e consulta as conquistas.')}</Text>
    <View style={styles.quickLinks}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir publicações da equipa')} onPress={()=>setActiveTab('FEED')} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="post" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>{t('Publicações')}</Text>
      <Text style={styles.quickLinkMeta}>{team.feedEnabled?t('Novidades do plantel'):t('Feed desativado')}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir chat da equipa')} onPress={()=>setActiveTab('CHAT')} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="messages" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>{t('Chat')}</Text>
      <Text style={styles.quickLinkMeta}>{team.chatEnabled?t('Conversa da equipa'):t('Chat desativado')}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir troféus e histórico da equipa')} onPress={()=>setActiveTab('TROPHIES')} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="tournament" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>{t('Troféus')}</Text>
      <Text style={styles.quickLinkMeta}>{t('Títulos e histórico')}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Explorar competições para esta equipa')}
       onPress={()=>router.push({pathname:'/teams/competitions',params:{teamId:String(teamId)}})} style={styles.quickLink}>
      <View style={styles.quickLinkIcon}><JynloIcon name="championship" color={C.mint} size={23}/></View>
      <Text style={styles.quickLinkText}>{t('Competições')}</Text>
      <Text style={styles.quickLinkMeta}>{t('Procurar desafios')}</Text>
     </Pressable>
    </View>
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>{t('Plantel ({a})',{a:rosterVerified?members.length:'—'})}</Text>
    {!rosterVerified?<Text style={styles.note}>{t('Plantel por confirmar. As opções de gestão estão temporariamente indisponíveis.')}</Text>:null}
    {rosterVerified&&members.length===0?<View style={styles.empty}><Text style={styles.note}>{t('Ainda não há jogadores no plantel.')}</Text></View>:null}
    <View style={styles.roster}>
    {rosterVerified?members.map(m=><View key={m.profileId} style={styles.playerCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir perfil de @{a}',{a:m.username})}
       onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})} style={styles.playerAvatar}>
       {teamPlayerAvatarUri(m.profilePicUrl)&&!brokenAvatars[m.profileId]
        ?<Image source={{uri:teamPlayerAvatarUri(m.profilePicUrl)!}} style={{width:'100%',height:'100%',borderRadius:27}}
          onError={()=>setBrokenAvatars(previous=>({...previous,[m.profileId]:true}))}/>
        :<Text style={styles.playerAvatarText}>{(m.username||'J').charAt(0).toUpperCase()}</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir perfil de @{a}',{a:m.username})} style={styles.playerInfo}
       onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}>
       <Text numberOfLines={1} style={styles.playerName}>{m.fullName||m.username}</Text>
       <Text numberOfLines={1} style={styles.playerHandle}>@{m.username}</Text>
       {m.bio?<Text numberOfLines={2} style={styles.playerBio}>{m.bio}</Text>:null}
      </Pressable>
      <View style={styles.playerTrailing}>
       <Text style={[styles.playerRole,m.role==='OWNER'&&styles.playerOwner]}>{m.role==='OWNER'?t('Responsável'):t('Jogador')}</Text>
       <View style={styles.playerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Ver perfil de @{a}',{a:m.username})}
         onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}
         style={styles.playerProfileAction}><JynloIcon name="chevron-right" size={18} color={C.mint}/></Pressable>
        {isOwner&&m.role!=='OWNER'?<Pressable accessibilityRole="button" accessibilityLabel={`Remover @${m.username} da equipa`}
         disabled={saving} onPress={()=>removePlayer(m)} style={styles.playerRemoveAction}>
         <JynloIcon name="remove" size={17} color="#FFBFC6"/>
        </Pressable>:null}
       </View>
      </View>
    </View>):null}
    </View>
    {rosterVerified&&isMember&&!isOwner?<Pressable accessibilityRole="button"
     accessibilityLabel={t('Sair desta equipa')} disabled={saving} style={styles.removeAction}
     onPress={leaveTeam}><Text style={styles.removeText}>{t('Sair da equipa')}</Text></Pressable>:null}
    <Text style={styles.note}>{t('Os convites só dão acesso após a aceitação do jogador.')}</Text>
    {isOwner?<><Text style={styles.heading}>{t('Convites pendentes ({a})',{a:pendingVerified?pendingPlayers.length:'—'})}</Text>
    {!pendingVerified?<Text style={styles.note}>{t('Convites por confirmar. Novos envios bloqueados até à verificação.')}</Text>:null}
    <Button title={t('Verificar convites')} secondary disabled={saving} onPress={()=>void load(false,true)}/>
    {pendingVerified?pendingPlayers.map(invite=><View key={invite.profileId} style={styles.candidate}>
     <Text style={styles.playerName}>{t('@{a} · A aguardar resposta',{a:invite.username})}</Text>
     <Button title={t('Cancelar convite')} secondary disabled={saving}
      onPress={()=>cancelPendingInvite(invite)}/>
    </View>):null}
    <TextInput style={styles.input} value={searchName} maxLength={80} onChangeText={value=>{setSearchName(value);setSearchComplete(false);setCandidates([]);searchVersion.current++;}}
      placeholder={t('Procurar jogador pelo nome')} placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={()=>void search()}/>
    <Button title={searching?t('A procurar…'):t('Pesquisar jogadores')} disabled={saving||searching||searchName.trim().length<2} onPress={()=>void search()}/>
    {searchComplete&&inviteCandidates.length===0?<Text style={styles.note}>{t('Não encontrámos novos jogadores com essa pesquisa.')}</Text>:null}
    {inviteCandidates.map(p=><View key={p.profileId} style={styles.candidate}>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/social/[username]',params:{username:p.username}})}>
       <Text style={styles.playerName}>{p.fullName||p.username}</Text>
       <Text style={styles.note}>{t('@{a} · Ver perfil →',{a:p.username})}</Text>
      </Pressable>
      <Button title={t('Convidar')} disabled={saving||!pendingVerified} onPress={()=>void invite(p.profileId)}/>
    </View>)}</>:null}
   </View>:null}
   {activeTab==='TROPHIES'?<View style={styles.panel}><Text style={styles.heading}>{t('🏆 Troféus ({a})',{a:trophiesVerified?standaloneTrophies.length+championshipHonours.length:'—'})}</Text>
    {trophiesLoading?<Text style={styles.note}>{t('A carregar conquistas oficiais…')}</Text>:null}
    {!trophiesLoading&&(historyError||honoursError)?<Button secondary title={t('Tentar novamente')} onPress={()=>void loadTrophies(true)}/>:null}
    {historyError?<Text style={styles.note}>{historyError}</Text>:null}
    {honoursError?<Text style={styles.note}>{honoursError}</Text>:null}
    {trophiesVerified&&!standaloneTrophies.length&&!championshipHonours.length?
      <Text style={styles.note}>{t('Ainda não existem troféus oficiais nesta equipa.')}</Text>:null}
    {championshipHonours.map(item=><View key={'season:'+item.championshipId+':'+(item.ownedEventId?'event:'+item.ownedEventId:'tournament:'+item.tournamentId)} style={styles.candidate}>
      <Text style={styles.heading}>🏆 {item.competitionName}</Text>
      <Text style={styles.note}>{item.format==='LEAGUE'?t('Liga'):item.format==='KNOCKOUT'?t('Taça'):item.format==='CHAMPIONSHIP'?t('Campeonato'):item.format} · {item.championshipName} · {item.seasonLabel}</Text>
      <Text style={styles.note}>{item.communityName} · {item.sport}</Text>
      <Text style={styles.note}>{new Date(item.awardedAt).toLocaleDateString('pt-PT')}</Text>
    </View>)}
    {standaloneTrophies.map(item=><View key={item.tournamentId} style={styles.candidate}>
      <Text style={styles.heading}>🏆 {item.tournamentName}</Text>
      <Text style={styles.note}>{item.communityName} · {item.sport||t('Modalidade não indicada')}</Text>
      {item.completedAt?<Text style={styles.note}>{new Date(item.completedAt).toLocaleDateString('pt-PT')}</Text>:null}
    </View>)}
   </View>:null}
   {activeTab==='TROPHIES'?<View style={styles.panel}><Text style={styles.heading}>{t('Histórico de torneios ({a})',{a:trophiesVerified?history.length:'—'})}</Text>
    {trophiesVerified&&!history.length?<Text style={styles.note}>{t('Ainda não existem torneios associados a esta equipa.')}</Text>:null}
    {history.map(item=><Pressable key={item.tournamentId} accessibilityRole="button" style={styles.historyLink}
      onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(item.communityId),id:String(item.tournamentId)}})}>
      <Text style={styles.playerName}>{item.tournamentName}</Text>
      <Text style={styles.note}>{t('{a} · {b} · Ver torneio →',{a:item.communityName,b:item.champion?t('🏆 Campeão'):item.archived?t('Concluído'):t('Em curso')})}</Text>
    </Pressable>)}
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>{t('Competições da equipa')}</Text>
    <Text style={styles.note}>{trophiesVerified?t('{a} torneios no histórico · {b} troféus oficiais',{a:history.length,b:standaloneTrophies.length+championshipHonours.length}):t('Histórico e troféus disponíveis no separador próprio.')}</Text>
    <Button secondary title={t('Ver histórico e troféus')} onPress={()=>setActiveTab('TROPHIES')}/>
   </View>:null}
   {activeTab==='OVERVIEW'?<View style={styles.panel}><Text style={styles.heading}>{t('Comunidades')}</Text>
    {!communitiesVerified?<Text style={styles.note}>{t('Associações por confirmar. Atualiza os dados para gerir comunidades.')}</Text>:null}
    {communitiesVerified?communities.filter(m=>m.status==='ACTIVE').map(m=><View key={m.id} style={styles.candidate}>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(m.communityId)}})}
       style={styles.communityLink}>
       <Text style={styles.playerName}>{m.communityName}</Text>
       <Text style={styles.note}>{t('Ver comunidade →')}</Text>
      </Pressable>
      {isOwner?<Button title={t('Sair da comunidade')} secondary disabled={saving} onPress={()=>confirmLeaveCommunity(m)}/>:null}
    </View>):null}
    {communitiesVerified&&!communities.some(m=>m.status==='ACTIVE')?<Text style={styles.note}>{t('Ainda não pertence a comunidades.')}</Text>:null}
    {isOwner&&communitiesVerified?communities.filter(m=>m.status==='PENDING_TEAM').map(m=><View key={m.id} style={styles.candidate}>
      <Text style={styles.note}>{t('Convite de {a}',{a:m.communityName})}</Text>
      <Button title={t('Aceitar convite')} disabled={saving} onPress={()=>void decideMembership(m.id,true)}/>
      <Button title={t('Recusar convite')} secondary disabled={saving} onPress={()=>void decideMembership(m.id,false)}/>
    </View>):null}
    {isOwner&&communitiesVerified?communities.filter(m=>m.status==='PENDING_COMMUNITY').map(m=>
      <Text key={m.id} style={styles.note}>{t('Pedido a {a} · Em análise',{a:m.communityName})}</Text>):null}
    {membershipNote?<Message>{membershipNote}</Message>:null}
    {isOwner?<Button title={t('Procurar comunidades')} secondary onPress={()=>router.push('/communities')}/>:null}
   </View>:null}
   {activeTab==='OVERVIEW'&&isOwner?<View style={[styles.panel,{borderColor:'#A95D63',gap:10}]}>
    <Text style={styles.heading}>{t('Administração da equipa')}</Text>
    <Text style={styles.note}>{t('A eliminação é definitiva e apenas permitida a equipas sem jogadores convidados, mensagens, competições ou ligações históricas.')}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Eliminar definitivamente esta equipa')}
      accessibilityState={{disabled:saving||!rosterVerified||!brandingVerified}}
      disabled={saving||!rosterVerified||!brandingVerified} onPress={deleteTeam}
      style={[styles.removeAction,{alignSelf:'flex-start',minHeight:44,justifyContent:'center'}]}>
      <Text style={styles.removeText}>{saving?t('A processar…'):t('Eliminar equipa')}</Text>
    </Pressable>
   </View>:null}
   {activeTab==='FEED'?<View style={styles.panel}><Text style={styles.heading}>{t('Publicações da equipa')}</Text>
    {!team.feedEnabled?<Text style={styles.note}>{t('O feed da equipa está desativado.')}</Text>:null}
    {isOwner?<Button title={team.feedEnabled?t('Desativar feed'):t('Ativar feed')} disabled={saving} onPress={()=>void feature('feedEnabled')}/>:null}
    {team.feedEnabled&&isMember&&auth.token&&auth.username?
     <SportsTeamContentPanel teamId={teamId} kind="feed" token={auth.token} username={auth.username}/>:null}
    {team.feedEnabled&&!isMember?<Text style={styles.note}>{t('Disponível apenas para membros confirmados.')}</Text>:null}
   </View>:null}
   {activeTab==='CHALLENGES'&&team?<View style={styles.panel}>
    <SportsTeamChallengesPanel teamId={teamId} token={auth.token}
      isOwner={isOwner&&rosterVerified} sport={team.sport}/>
   </View>:null}
   {activeTab==='CHAT'?<View style={styles.panel}><Text style={styles.heading}>{t('Mensagens da equipa')}</Text>
    {team.chatEnabled&&isMember&&auth.token?<Pressable accessibilityRole="button" disabled={chatMuteBusy} onPress={()=>{void toggleChatMute();}}
     accessibilityLabel={chatMuted?t('Ativar avisos do chat da equipa'):t('Silenciar o chat da equipa')} style={styles.muteChip}>
     <Text style={styles.muteText}>{chatMuted?t('🔕 Ativar avisos'):t('🔔 Silenciar')}</Text></Pressable>:null}
    {!team.chatEnabled?<Text style={styles.note}>{t('O chat da equipa está desativado.')}</Text>:null}
    {isOwner?<Button title={team.chatEnabled?t('Desativar chat'):t('Ativar chat')} disabled={saving} onPress={()=>void feature('chatEnabled')}/>:null}
    {team.chatEnabled&&isMember&&auth.token&&auth.username?
     <SportsTeamContentPanel teamId={teamId} kind="chat" token={auth.token} username={auth.username}/>:null}
    {team.chatEnabled&&!isMember?<Text style={styles.note}>{t('Disponível apenas para membros confirmados.')}</Text>:null}
   </View>:null}
  </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 muteChip:{alignSelf:'flex-start',minHeight:44,justifyContent:'center',paddingHorizontal:14,borderRadius:999,borderWidth:1,borderColor:C.border},
 muteText:{color:C.white,fontWeight:'800'},
 header:{padding:22,backgroundColor:'#082D3B',borderColor:'#35BCA66A',borderWidth:1,borderRadius:23,gap:15,overflow:'hidden'},
 followSection:{gap:8},
 followRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12},
 followCount:{fontSize:14,fontWeight:'800',color:C.mint},
 backRow:{minHeight:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
 backLink:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 backLabel:{fontSize:14,color:C.mint,fontWeight:'900'},
 backContext:{fontSize:10,color:C.muted,fontWeight:'800',letterSpacing:1.2}, 
 kitPreview:{flexDirection:'row',alignItems:'center',gap:9},
 kitFocus:{alignItems:'center',justifyContent:'center',gap:8,paddingVertical:18,
  paddingHorizontal:12,borderRadius:18,borderWidth:1,borderColor:'#328d8f',
  backgroundColor:'#092A39'},
 kitFocusEyebrow:{color:C.mint,fontSize:11,letterSpacing:1.1,fontWeight:'800',textAlign:'center'},
 kitFocusTitle:{fontSize:17,color:C.white,fontWeight:'900'},
 kitFocusSubtitle:{fontSize:12,color:C.muted,textAlign:'center'},
 kitPatternRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
 kitPatternCard:{flexBasis:'46%',flexGrow:1,minWidth:0,minHeight:112,alignItems:'center',justifyContent:'center',padding:8,gap:7,borderWidth:1,
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
 playerCard:{backgroundColor:'#103B47',borderWidth:1,borderColor:'#398C8A75',borderRadius:16,padding:13,flexDirection:'row',alignItems:'center',gap:12,minHeight:98},
 playerAvatar:{height:54,width:54,borderRadius:27,backgroundColor:'#167A7D',borderWidth:2,borderColor:'#55D9BD7C',alignItems:'center',justifyContent:'center',overflow:'hidden'},
 playerAvatarPhoto:{width:42,height:42,borderRadius:21},
 playerAvatarText:{color:C.white,fontWeight:'900',fontSize:17},
 playerInfo:{flex:1,gap:2},
 playerName:{color:C.white,fontSize:15,fontWeight:'900'},
 playerHandle:{color:'#8EDACB',fontSize:12},
 playerBio:{color:'#BBD3D7',fontSize:12,lineHeight:17,marginTop:2},
 playerTrailing:{alignItems:'flex-end',justifyContent:'space-between',alignSelf:'stretch',gap:10},
 playerRole:{color:'#C6E5E7',fontSize:10,fontWeight:'800',borderRadius:20,overflow:'hidden',
  borderWidth:1,borderColor:'#3978847E',backgroundColor:'#184652',paddingHorizontal:8,paddingVertical:4},
 playerOwner:{backgroundColor:'#155B53',borderColor:'#46CBA6',color:'#BCFBEA'},
 playerActions:{flexDirection:'row',gap:6,alignItems:'center'},
 playerProfileAction:{height:38,width:38,borderRadius:10,alignItems:'center',justifyContent:'center',
  backgroundColor:'#164853',borderWidth:1,borderColor:'#3E797D'},
 playerRemoveAction:{height:38,width:38,borderRadius:10,alignItems:'center',justifyContent:'center',
  borderWidth:1,borderColor:'#9A6668',backgroundColor:'#3A2630'},
 empty:{padding:16,alignItems:'center',borderWidth:1,borderStyle:'dashed',borderColor:C.border,borderRadius:12},
 tabBar:{flexDirection:'row',alignItems:'center',gap:7,padding:8,borderWidth:1,borderColor:'#31CCC952',borderRadius:14,backgroundColor:'#082D3D'},
 tab:{minHeight:44,paddingHorizontal:14,paddingVertical:9,borderWidth:1,borderColor:'transparent',borderRadius:10,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,backgroundColor:'transparent'},
 tabSelected:{borderColor:'#27E7CCB0',backgroundColor:'#126D73'},tabText:{fontSize:13,fontWeight:'800',color:'#B4D6DE'},tabTextSelected:{color:'#BCFFF0'},
 communityLink:{flex:1,gap:3,minHeight:44,justifyContent:'center'},historyLink:{padding:12,borderRadius:11,borderWidth:1,borderColor:C.border,gap:4},
 removeAction:{minHeight:44,justifyContent:'center',paddingHorizontal:8,borderRadius:8,borderWidth:1,borderColor:C.border},removeText:{fontSize:13,fontWeight:'800',color:C.white},
 title:{fontSize:27,lineHeight:33,fontWeight:'900',color:C.white,letterSpacing:-.6},
 note:{fontSize:13,color:C.muted,lineHeight:20},
 heading:{fontSize:17,fontWeight:'800',color:C.white},
 panel:{padding:16,borderWidth:1,borderColor:'#3CBDA94D',backgroundColor:'#082C3B',borderRadius:17,gap:12},
 input:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:12,color:C.white,padding:12,minHeight:48,fontSize:15},
 candidate:{padding:10,borderColor:C.border,borderWidth:1,borderRadius:10,gap:5}
});
