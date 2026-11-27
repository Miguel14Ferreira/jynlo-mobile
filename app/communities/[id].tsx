import {CommunityMonthLeaders} from '../../src/components/PlayerHighlights';
import PostImageLightbox,{type ExpandedPostPhotos} from '../../src/components/PostImageLightbox';
import {t} from '../../src/lib/i18n';
import CommunityTeamsPanel from '../../src/components/CommunityTeamsPanel';
import React,{useCallback,useRef,useState} from 'react';
import {Alert,Image,Pressable,ScrollView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {resolveJynloMedia} from '../../src/lib/social-feed-api';
import {JynloIcon} from '../../src/components/JynloIcon';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page,SessionCard} from '../../src/components/UI';
import {DEMO_MODE} from '../../src/lib/api';
import {
  acceptCommunityRequest,communityDetails,communitySessions,communityFollowState,setCommunityFollow,inviteCommunityMember,
  joinPublicCommunity,myPendingCommunityRequest,pendingCommunityRequests,requestCommunityMembership,
  rejectCommunityRequest,leaveCommunity,removeCommunityMember,setCommunityMemberRole,transferCommunityOwnership
} from '../../src/lib/community-api';
import {communitySports,describeCommunitySports} from '../../src/lib/community-core.cjs';
import {communityShareUrl} from '../../src/lib/share-links.cjs';
import type {CommunityFollowState} from '../../src/lib/community-api';
import {setCommunitySessionAudience,setCommunityPostingPolicy,setCommunitySessionPolicy,setCommunityVisibility} from '../../src/lib/community-api';
import {canOpenToPublic,canRestrictToMembers} from '../../src/lib/community-session-audience.cjs';
import {useAuth} from '../../src/lib/auth';
import {safeRedirect} from '../../src/lib/routes.cjs';
import {C} from '../../src/lib/theme';
import {PublicShareCard} from '../../src/components/PublicShareCard';
import {AvailabilityPanel} from '../../src/components/AvailabilityPanel';
import {CommunityFeedPanel} from '../../src/components/CommunityFeedPanel';
import type {CommunityGroup,CommunityJoinRequest,CommunitySummary,SessionSummary} from '../../src/lib/types';
import {sportName} from '../../src/lib/sport-names.cjs';
const isMember=(c:CommunityGroup|CommunitySummary):c is CommunityGroup=>
  'myRole' in c && Boolean((c as CommunityGroup).myRole);
export default function CommunityDetailScreen(){
 const [zoomPhoto,setZoomPhoto]=useState<ExpandedPostPhotos|null>(null);
  const params=useLocalSearchParams<{id:string;created?:string;returnTo?:string}>();const id=Number(params.id);
  const returnTo=safeRedirect(params.returnTo);
  const teamDestination=Number.isSafeInteger(id)&&id>0&&returnTo.startsWith('/tournaments/'+id+'/')?returnTo:null;
  const auth=useAuth(),router=useRouter();
  const [community,setCommunity]=useState<CommunityGroup|CommunitySummary|null>(null);
  const [followState,setFollowState]=useState<CommunityFollowState|null>(null);
  const [followBusy,setFollowBusy]=useState(false);
  const [followError,setFollowError]=useState('');
  // The chat opens full screen, like a messaging app.
  const openChat=()=>router.push({pathname:'/communities/[id]/chat',params:{id:String(id)}});
  const [activeSection,setActiveSection]=useState<'OVERVIEW'|'FEED'|'SESSIONS'|'CHAT'|'MEMBERS'|'MANAGE'>('OVERVIEW');
  const [sessions,setSessions]=useState<SessionSummary[]>([]);
  const [sessionsError,setSessionsError]=useState('');
  const [audienceBusy,setAudienceBusy]=useState<number|null>(null),[audienceError,setAudienceError]=useState('');
  const [requests,setRequests]=useState<CommunityJoinRequest[]>([]);
  const [requestsError,setRequestsError]=useState('');
  const [myRequest,setMyRequest]=useState<CommunityJoinRequest|null>(null);
  const [myRequestError,setMyRequestError]=useState('');
  const [inviteName,setInviteName]=useState('');const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const generation=useRef(0);
  const reload=useCallback(async(version=generation.current)=>{
    if(!Number.isSafeInteger(id)||id<=0){
      if(version===generation.current){setError(t('Comunidade inválida.'));setLoading(false);}
      return;
    }
    setLoading(true);setError('');setCommunity(null);setFollowState(null);setFollowError('');setFollowBusy(false);setMyRequest(null);setMyRequestError('');setSessions([]);setSessionsError('');setRequests([]);setRequestsError('');
    try{
      const c=await communityDetails(id,auth.token,auth.username);
      if(version!==generation.current)return;
      setCommunity(c);
      if(c.visibility==='PUBLIC'&&auth.token&&auth.username){
        void communityFollowState(id,auth.token,auth.username).then(state=>{
          if(version===generation.current)setFollowState(state);
        }).catch(()=>{
          if(version===generation.current)setFollowError(t('Seguidores temporariamente indisponíveis.'));
        });
      }
      if(auth.token&&auth.username&&isMember(c)){
        setMyRequest(null);
        try{
          const next=await communitySessions(id,auth.token,auth.username);
          if(version!==generation.current)return;
          setSessions(next);setSessionsError('');
        }catch{if(version===generation.current){setSessions([]);setSessionsError(t('Não foi possível carregar as sessões. Tenta novamente.'));}}
        if(c.myRole==='OWNER'||c.myRole==='ADMIN'){
          try{
            const next=await pendingCommunityRequests(id,auth.token,auth.username);
            if(version!==generation.current)return;
            setRequests(next);setRequestsError('');
          }catch{if(version===generation.current){setRequests([]);setRequestsError(t('Não foi possível carregar os pedidos de adesão.'));}}
        }else {setRequests([]);setRequestsError('');}
      }else{
        setSessions([]);setSessionsError('');setRequests([]);setRequestsError('');
        if(auth.token&&auth.username&&c.visibility==='PRIVATE'){
          try{
            const next=await myPendingCommunityRequest(id,auth.token,auth.username);
            if(version!==generation.current)return;
            setMyRequest(next);setMyRequestError('');
          }catch{if(version===generation.current){setMyRequest(null);setMyRequestError(t('Não foi possível confirmar o estado do teu pedido de adesão.'));}}
        }else setMyRequest(null);
      }
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível carregar a comunidade.'));
    }finally{if(version===generation.current)setLoading(false);}
  },[id,auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{
    const version=++generation.current;
    // Never show another community or account while the new request is pending.
    setCommunity(null);setFollowState(null);setFollowError('');setFollowBusy(false);setSessions([]);setSessionsError('');setRequests([]);setRequestsError('');setMyRequest(null);setMyRequestError('');
    setError('');setNotice('');setBusy(false);setActiveSection('OVERVIEW');
    void reload(version);
    return ()=>{generation.current++;};
  },[reload]));
  const role=community&&isMember(community)?community.myRole:null;
  const owner=role==='OWNER'||role==='ADMIN';
  const [postingPolicyBusy,setPostingPolicyBusy]=useState(false);
  async function togglePostingPolicy(){
    if(!auth.token||!community||!owner||postingPolicyBusy)return;
    const version=generation.current;
    const next=(community as CommunityGroup).membersCanPost===false;
    setPostingPolicyBusy(true);setError('');setNotice('');
    try{
      const updated=await setCommunityPostingPolicy(id,next,auth.token);
      if(version!==generation.current)return;
      setCommunity(updated);setNotice(t('Configuração guardada.'));
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível guardar. Tenta novamente.'));
    }finally{if(version===generation.current)setPostingPolicyBusy(false);}
  }
  const [sessionPolicyBusy,setSessionPolicyBusy]=useState(false);
  async function toggleSessionPolicy(){
    if(!auth.token||!community||!owner||sessionPolicyBusy)return;
    const version=generation.current;
    const next=(community as CommunityGroup).membersCanCreateSessions===false;
    setSessionPolicyBusy(true);setError('');setNotice('');
    try{
      const updated=await setCommunitySessionPolicy(id,next,auth.token);
      if(version!==generation.current)return;
      setCommunity(updated);setNotice(t('Configuração guardada.'));
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível guardar. Tenta novamente.'));
    }finally{if(version===generation.current)setSessionPolicyBusy(false);}
  }
  const [visibilityBusy,setVisibilityBusy]=useState(false);
  async function toggleVisibility(){
    if(!auth.token||!community||role!=='OWNER'||visibilityBusy)return;
    const version=generation.current;
    const next=community.visibility==='PRIVATE'?'PUBLIC':'PRIVATE';
    setVisibilityBusy(true);setError('');setNotice('');
    try{
      const updated=await setCommunityVisibility(id,next,auth.token);
      if(version!==generation.current)return;
      setCommunity(updated);setNotice(t('Configuração guardada.'));
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível guardar. Tenta novamente.'));
    }finally{if(version===generation.current)setVisibilityBusy(false);}
  }
  const onlyOrganizersCreate=!!community&&'membersCanCreateSessions' in community&&(community as CommunityGroup).membersCanCreateSessions===false;
  const canCreateSession=owner||!onlyOrganizersCreate;
  async function toggleFollow(){
    if(!auth.token||!auth.username||!community||community.visibility!=='PUBLIC'||!followState||followBusy)return;
    const previous=followState,version=generation.current;
    setFollowBusy(true);setFollowError('');
    try{
      const next=await setCommunityFollow(id,auth.token,auth.username,!previous.following);
      if(version!==generation.current)return;
      setFollowState(next);
    }catch{
      if(version!==generation.current)return;
      setFollowState(null);setFollowError(t('Não foi possível confirmar. Verifica o estado antes de tentares novamente.'));
      try{
        const actual=await communityFollowState(id,auth.token,auth.username);
        if(version===generation.current)setFollowState(actual);
      }catch{/* Keep the last operation uncertain rather than guessing success. */}
    }finally{if(version===generation.current)setFollowBusy(false);}
  }
  async function take(action:'join'|'request'){
    if(!auth.token||!auth.username){router.push({pathname:'/login',params:{redirect:`/communities/${id}`}});return;}
    if(busy)return;
    const version=generation.current;
    setBusy(true);setError('');setNotice('');
    try{
      if(action==='join')await joinPublicCommunity(id,auth.token,auth.username);
      else await requestCommunityMembership(id,auth.token,auth.username);
      if(version!==generation.current)return;
      setNotice(action==='join'?t('Já fazes parte desta comunidade!'):t('Pedido enviado. Aguarda a decisão do organizador.'));
      if(action==='join'&&teamDestination){
        router.replace(teamDestination as any);
      }else await reload(version);
    }catch(e){
      if(version===generation.current)setError((e instanceof Error?e.message:t('Operação não concluída.'))+' '+t('Verifica o estado antes de repetir.'));
    }finally{if(version===generation.current)setBusy(false);}
  }
  async function sendInvite(){
    if(!auth.token||!auth.username||busy)return;
    const version=generation.current;
    setBusy(true);setError('');setNotice('');
    try{
      await inviteCommunityMember(id,inviteName,auth.token,auth.username);
      if(version!==generation.current)return;
      setInviteName('');setNotice(t('Convite enviado! A pessoa poderá aceitá-lo em Comunidades → Convites.'));
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível enviar o convite.'));
    }finally{if(version===generation.current)setBusy(false);}
  }
  async function approve(requestId:number){
    if(!auth.token||!auth.username||busy)return;
    const version=generation.current;
    setBusy(true);setError('');
    try{
      await acceptCommunityRequest(id,requestId,auth.token,auth.username);
      if(version!==generation.current)return;
      await reload(version);
      if(version===generation.current)setNotice(t('Pedido aprovado.'));
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível aprovar o pedido.'));
    }finally{if(version===generation.current)setBusy(false);}
  }
  /** Runs one member-management change, then reloads the community. */
  async function memberAction(run:()=>Promise<unknown>,done:string,fallback:string,afterLeave=false){
    if(!auth.token||!auth.username||busy)return;
    const version=generation.current;
    setBusy(true);setError('');
    try{
      await run();
      if(version!==generation.current)return;
      if(afterLeave){router.back();return;}
      await reload(version);
      if(version===generation.current)setNotice(done);
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:fallback);
    }finally{if(version===generation.current)setBusy(false);}
  }
  function rejectRequest(requestId:number,requester:string){
    Alert.alert(t('Recusar pedido?'),t('@{a} não vai entrar na comunidade.',{a:requester}),[
      {text:t('Cancelar'),style:'cancel'},
      {text:t('Recusar'),style:'destructive',onPress:()=>{void memberAction(()=>rejectCommunityRequest(id,requestId,auth.token!,auth.username!),t('Pedido recusado.'),t('Não foi possível recusar o pedido.'));}}
    ]);
  }
  function confirmLeave(){
    Alert.alert(t('Sair da comunidade?'),t('Deixas de ver as sessões e o chat desta comunidade. Podes voltar a pedir para entrar.'),[
      {text:t('Cancelar'),style:'cancel'},
      {text:t('Sair'),style:'destructive',onPress:()=>{void memberAction(()=>leaveCommunity(id,auth.token!,auth.username!),'',t('Não foi possível sair da comunidade.'),true);}}
    ]);
  }
  function manageMember(m:{username:string;role?:string|null}){
    if(!auth.token||!auth.username)return;
    const token=auth.token,me=auth.username,name='@'+m.username;
    const options:{text:string;style?:'cancel'|'destructive';onPress?:()=>void}[]=[];
    if(role==='OWNER'){
      if(m.role==='ADMIN')options.push({text:t('Tirar administrador'),onPress:()=>{void memberAction(()=>setCommunityMemberRole(id,m.username,'MEMBER',token,me),t('{a} já não é administrador.',{a:name}),t('Não foi possível alterar o papel.'));}});
      else options.push({text:t('Tornar administrador'),onPress:()=>{void memberAction(()=>setCommunityMemberRole(id,m.username,'ADMIN',token,me),t('{a} é agora administrador.',{a:name}),t('Não foi possível alterar o papel.'));}});
      options.push({text:t('Passar a organização'),onPress:()=>{
        Alert.alert(t('Passar a organização a {a}?',{a:name}),t('Passas a ser administrador e {a} fica como organizador da comunidade.',{a:name}),[
          {text:t('Cancelar'),style:'cancel'},
          {text:t('Passar'),style:'destructive',onPress:()=>{void memberAction(()=>transferCommunityOwnership(id,m.username,token,me),t('{a} é agora o organizador.',{a:name}),t('Não foi possível passar a organização.'));}}
        ]);
      }});
    }
    if(role==='OWNER'||(role==='ADMIN'&&m.role==='MEMBER'))options.push({text:t('Remover da comunidade'),style:'destructive',onPress:()=>{
      Alert.alert(t('Remover {a}?',{a:name}),t('Deixa de ter acesso às sessões e ao chat da comunidade.'),[
        {text:t('Cancelar'),style:'cancel'},
        {text:t('Remover'),style:'destructive',onPress:()=>{void memberAction(()=>removeCommunityMember(id,m.username,token,me),t('{a} foi removido.',{a:name}),t('Não foi possível remover o membro.'));}}
      ]);
    }});
    options.push({text:t('Cancelar'),style:'cancel'});
    Alert.alert(name,undefined,options);
  }
  async function share(){
    if(!owner||!community)return;
    if(DEMO_MODE){setNotice(t('Na demonstração, os convites funcionam entre Tiago e André, sem links para comunidades fictícias.'));return;}
    const version=generation.current;
    try{await Share.share({message:`Junta-te à comunidade ${community.name} na Jynlo!\n${communityShareUrl(id)}`,url:communityShareUrl(id)});}
    catch{if(version===generation.current)setError(t('Não foi possível abrir a partilha.'));}
  }
  return <Page><DemoBanner/>
    {params.created==='1'?<Message>{t('Comunidade criada. Convida agora as pessoas com quem queres continuar a jogar.')}</Message>:null}
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {error&&!community&&!loading?<Button secondary title={t('Tentar carregar comunidade novamente')} disabled={busy} onPress={()=>{void reload();}}/>:null}
    {!!notice?<Message>{notice}</Message>:null}
    {community?<>
      <View style={styles.identityCard}>
        <Eyebrow>{t('COMUNIDADE JYNLO')}</Eyebrow>
        <View style={styles.identityHeading}>
          <View style={styles.identityMark}>{community.photoUrl&&resolveJynloMedia(community.photoUrl)
            ?<><Pressable accessibilityRole="imagebutton" style={{width:'100%',height:'100%'}} accessibilityLabel={t('Ampliar fotografia')} onPress={()=>setZoomPhoto({uris:[resolveJynloMedia(community.photoUrl)!],index:0})}><Image source={{uri:resolveJynloMedia(community.photoUrl)!}} style={styles.identityPhoto} resizeMode="cover" accessibilityLabel={t('Fotografia da comunidade {v}',{v:community.name})}/></Pressable><PostImageLightbox photos={zoomPhoto} onClose={()=>setZoomPhoto(null)}/></>
            :<Text maxFontSizeMultiplier={1.3} style={styles.identityInitial}>{(community.name||'J').charAt(0).toUpperCase()}</Text>}</View>
          <View style={styles.identityCopy}>
            <Text style={styles.heading}>{community.name}</Text>
            <Text style={styles.identityStatus}>{role?t('Fazes parte desta comunidade'):t('Descobre esta comunidade')}</Text>
          </View>
          {owner?<Pressable accessibilityRole="button" accessibilityLabel={t('Gerir comunidade')} accessibilityState={{selected:activeSection==='MANAGE'}}
            onPress={()=>setActiveSection(activeSection==='MANAGE'?'OVERVIEW':'MANAGE')} hitSlop={6}
            style={[styles.manageButton,activeSection==='MANAGE'&&styles.manageButtonOn]}>
            <JynloIcon name="settings" size={22} color={activeSection==='MANAGE'?C.background:C.mint}/>
          </Pressable>:null}
        </View>
        <Text style={styles.subtitle}>{community.description||t('Mais do que desporto, uma forma de encontrar pessoas.')}</Text>
        <View style={styles.header}>
          <Text style={styles.identitySports}>{describeCommunitySports(community,3)}</Text>
          <Badge text={community.visibility==='PRIVATE'?t('Privada'):t('Pública')}/>
        </View>
        {communitySports(community).length>1?<View style={styles.sportList}>{communitySports(community).map(s=><View key={s} style={styles.sportPill}><Text style={styles.sportText}>{sportName(s)}</Text></View>)}</View>:null}
      </View>
      {community.visibility==='PUBLIC'&&auth.token&&followState?<View style={styles.section}>
        <Text style={styles.subtitle}>{followState.count} {followState.count===1?'seguidor':'seguidores'}</Text>
        <Button secondary title={followBusy?t('A atualizar…'):followState.following?t('A seguir ✓'):t('Seguir comunidade +')}
          disabled={followBusy} onPress={()=>{void toggleFollow();}}/>
        <Text style={styles.subtitle}>{t('Seguir não dá acesso ao chat reservado aos membros.')}</Text>
      </View>:null}
      {!!followError&&community.visibility==='PUBLIC'?<Message tone="error">{followError}</Message>:null}
      {!role&&auth.token&&community.visibility==='PUBLIC'?<Button title={busy?t('A confirmar…'):t('Juntar-me à comunidade')} disabled={busy} onPress={()=>{void take('join');}}/>:null}
      {!role&&myRequestError?<Message tone="error">{myRequestError}</Message>:null}
      {!role&&myRequestError?<Button secondary title={t('Verificar estado do pedido novamente')} disabled={busy||loading} onPress={()=>{void reload();}}/>:null}
      {!role&&auth.token&&community.visibility==='PRIVATE'&&!myRequest&&!myRequestError?<Button title={busy?t('A enviar…'):t('Pedir para entrar')} disabled={busy} onPress={()=>{void take('request');}}/>:null}
      {!role&&myRequest?<Message>{t('O teu pedido de entrada está pendente de aprovação.')}</Message>:null}
      {!role&&!auth.token?<Button title={t('Iniciar sessão para participar')} onPress={()=>router.push({pathname:'/login',params:{redirect:`/communities/${id}`}})}/>:null}
      {teamDestination&&role?<Button title={t('Continuar para a equipa do convite')} onPress={()=>router.replace(teamDestination as any)}/>:null}
      {teamDestination&&!role&&myRequest?<Message>{t('O pedido está pendente. Quando for aprovado, verifica novamente a adesão para continuares para a equipa.')}</Message>:null}
      {teamDestination&&!role&&auth.token&&!loading?<Button secondary title={t('Verificar aprovação da comunidade')} disabled={busy} onPress={()=>{void reload();}}/>:null}
      {role?<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionNav} contentContainerStyle={styles.sectionNavContent} accessibilityLabel={t('Secções da comunidade')}>
        {([{id:'OVERVIEW',label:t('Visão geral')},{id:'FEED',label:t('Feed')},{id:'SESSIONS',label:t('Sessões')},{id:'CHAT',label:t('Chat')},{id:'MEMBERS',label:t('Membros')}] as const).map(tab=><Pressable key={tab.id} accessibilityRole="tab"
         accessibilityState={{selected:activeSection===tab.id}} onPress={()=>{if(tab.id==='CHAT')openChat();else setActiveSection(tab.id);}}
         style={[styles.sectionTab,activeSection===tab.id&&styles.sectionTabSelected]}>
         <Text style={[styles.sectionTabText,activeSection===tab.id&&styles.sectionTabTextSelected]}>{tab.label}</Text>
        </Pressable>)}
      </ScrollView>:null}
      {owner&&activeSection==='MANAGE'?<Text style={styles.manageTitle}>{t('Gerir comunidade')}</Text>:null}
      {role&&activeSection==='OVERVIEW'?<View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('O espaço da comunidade')}</Text>
        <Text style={styles.muted}>{t('Encontra os próximos jogos, acompanha a conversa e organiza a tua comunidade.')}</Text>
        <View style={styles.quickLinks}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Ver próximas sessões da comunidade')} onPress={()=>setActiveSection('SESSIONS')} style={styles.quickLink}>
           <Text style={styles.quickLinkIcon}>◷</Text><Text style={styles.quickLinkTitle}>{t('Sessões')}</Text>
           <Text style={styles.quickLinkDescription}>{sessionsError?t('Por confirmar'):t('{n} agendadas',{n:sessions.length})}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir chat da comunidade')} onPress={openChat} style={styles.quickLink}>
           <Text style={styles.quickLinkIcon}>◉</Text><Text style={styles.quickLinkTitle}>{t('Chat')}</Text>
           <Text style={styles.quickLinkDescription}>{t('Conversar em tempo real')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Ver membros da comunidade')} onPress={()=>setActiveSection('MEMBERS')} style={styles.quickLink}>
           <Text style={styles.quickLinkIcon}>♙</Text><Text style={styles.quickLinkTitle}>{t('Membros')}</Text>
           <Text style={styles.quickLinkDescription}>{t('{a} jogadores',{a:(community as CommunityGroup).memberCount})}</Text>
          </Pressable>
        </View>
        {canCreateSession?<Button title={t('Criar sessão nesta comunidade')} onPress={()=>router.push({pathname:'/sessions/create',params:{communityId:String(id)}})}/>
         :<Text style={styles.muted}>{t('Nesta comunidade, só os organizadores criam sessões.')}</Text>}
        {auth.token?<AvailabilityPanel kind="community" targetId={id} token={auth.token} communityId={id}/>:null}
        <Button secondary title={t('Ver competições por modalidade')} onPress={()=>router.push({pathname:'/communities/[id]/competitions',params:{id:String(id)}})}/>
        {isMember(community)&&community.rankingsEnabled?<CommunityMonthLeaders communityId={id} token={auth.token} canManage={owner}/>:null}
        {isMember(community)&&community.rankingsEnabled?<Button secondary title={t('Resultados e classificações')} onPress={()=>router.push({pathname:'/communities/[id]/results',params:{id:String(id)}})}/>:null}
        {isMember(community)&&community.rankingsEnabled&&auth.token?<PublicShareCard target={{kind:'RANKING',communityId:id}}
          name={community.name} token={auth.token} canManage={owner}/>:null}
        {owner?<View style={styles.startCard}>
          <Text style={styles.startTitle}>📊 {t('Já tens o histórico num Excel?')}</Text>
          <Text style={styles.muted}>{t('Importa o ficheiro (Excel, CSV ou TSV). Revês tudo antes de confirmar e cada jogador fica com a sua classificação e estatísticas.')}</Text>
          <Button title={t('Importar histórico')} onPress={()=>router.push({pathname:'/communities/[id]/competition-settings',params:{id:String(id)}})}/>
        </View>:null}
        {owner?<Button secondary title={t('Criar torneio nesta comunidade')} onPress={()=>router.push({pathname:'/tournaments/create',params:{communityId:String(id)}})}/>:null}
      </View>:null}
      {role&&activeSection==='MEMBERS'?<View style={styles.section}>
        <View style={styles.header}><Text style={styles.sectionTitle}>{t('Membros')}</Text><Badge text={`${(community as CommunityGroup).memberCount}`}/></View>
        {(community as CommunityGroup).members.map(m=><View key={m.profileId+':'+m.username} style={styles.member}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir perfil de @{a}',{a:m.username})}
            onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}
            style={styles.avatar}><Text style={styles.avatarText}>{m.username.charAt(0).toUpperCase()}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir perfil de @{a}',{a:m.username})}
            onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})} style={{flex:1}}>
            <Text style={styles.memberName}>{m.fullName||m.username}</Text>
            <Text style={styles.muted}>@{m.username}{m.role==='OWNER'?' · '+t('Organizador'):m.role==='ADMIN'?' · '+t('Administrador'):''}</Text>
          </Pressable>
          {m.username!==auth.username&&m.role!=='OWNER'&&(role==='OWNER'||(role==='ADMIN'&&m.role==='MEMBER'))?
            <Pressable accessibilityRole="button" accessibilityLabel={t('Gerir @{a}',{a:m.username})} disabled={busy}
              onPress={()=>manageMember(m)} hitSlop={8} style={styles.memberMenu}><Text style={styles.memberMenuText}>⋯</Text></Pressable>:null}
        </View>)}
        {role==='OWNER'
          ?<Text style={styles.muted}>{t('Para saíres, passa primeiro a organização a outro membro (toca em ⋯ ao lado do nome).')}</Text>
          :<Button secondary title={busy?t('A sair…'):t('Sair da comunidade')} disabled={busy} onPress={confirmLeave}/>}
      </View>:null}
      {auth.token && (role ? activeSection==='OVERVIEW' : community.visibility==='PUBLIC')?
        <CommunityTeamsPanel communityId={id} isOrganizer={owner} token={auth.token}/>:null}
      {owner&&activeSection==='MANAGE'?<View style={styles.section}>
        <Eyebrow>{t('PERMISSÕES')}</Eyebrow>
        {role==='OWNER'?<>
          <Text style={styles.sectionTitle}>{t('Comunidade pública ou privada?')}</Text>
          <Text style={styles.muted}>{community.visibility==='PRIVATE'
            ?t('Privada: só entra quem for convidado ou aceite.')
            :t('Pública: qualquer pessoa a pode encontrar.')}</Text>
          <Button secondary disabled={visibilityBusy} title={visibilityBusy?t('A guardar…'):community.visibility==='PRIVATE'?t('Tornar pública'):t('Tornar privada')}
            onPress={()=>{void toggleVisibility();}}/>
        </>:null}
        <Text style={styles.sectionTitle}>{t('Quem pode criar sessões?')}</Text>
        <Text style={styles.muted}>{onlyOrganizersCreate?t('Só os organizadores'):t('Todos os membros')}</Text>
        <Button secondary disabled={sessionPolicyBusy} title={sessionPolicyBusy?t('A guardar…'):onlyOrganizersCreate?t('Deixar todos os membros criar sessões'):t('Só os organizadores criam sessões')}
          onPress={()=>{void toggleSessionPolicy();}}/>
        <Text style={styles.sectionTitle}>{t('Quem pode publicar?')}</Text>
        <Text style={styles.muted}>{(community as CommunityGroup|null)?.membersCanPost===false?t('Só os organizadores'):t('Todos os membros')}</Text>
        <Button secondary disabled={postingPolicyBusy} title={postingPolicyBusy?t('A guardar…'):(community as CommunityGroup|null)?.membersCanPost===false?t('Deixar todos os membros publicar'):t('Só os organizadores publicam')}
          onPress={()=>{void togglePostingPolicy();}}/>
      </View>:null}
      {owner&&activeSection==='MANAGE'?<View style={styles.section}>
        <Eyebrow>{t('FAZ A COMUNIDADE CRESCER')}</Eyebrow>
        <Text style={styles.sectionTitle}>{t('Convidar pessoas')}</Text>
        <Text style={styles.muted}>{t('Envia um convite a uma conta Jynlo existente. A adesão só acontece quando o destinatário aceitar.')}</Text>
        <TextInput style={styles.input} value={inviteName} onChangeText={setInviteName} autoCapitalize="none"
          placeholder={DEMO_MODE?t('Experimenta: André'):t('Nome de utilizador')} placeholderTextColor={C.muted}
          accessibilityLabel={t('Nome de utilizador a convidar')}/>
        <Button title={busy?t('A enviar…'):t('Enviar convite')} disabled={busy||inviteName.trim().length<2} onPress={()=>{void sendInvite();}}/>
        <Button secondary title={t('Partilhar ligação da comunidade')} onPress={()=>{void share();}}/>
      </View>:null}
      {owner&&activeSection==='MANAGE'&&requestsError?<View style={styles.section}><Message tone="error">{requestsError}</Message><Button secondary title={t('Tentar carregar pedidos novamente')} disabled={loading||busy} onPress={()=>{void reload();}}/></View>:null}
      {owner&&activeSection==='MANAGE'&&requests.length>0?<View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Pedidos para entrar')}</Text>
        {requests.map(r=><View key={r.id} style={styles.request}>
          <Text style={styles.memberName}>@{r.requesterUsername}</Text>
          <Button title={busy?t('A aprovar…'):t('Aprovar')} disabled={busy} onPress={()=>{void approve(r.id);}}/>
          <Button secondary title={t('Recusar')} disabled={busy} onPress={()=>rejectRequest(r.id,r.requesterUsername)}/>
        </View>)}
      </View>:null}
      {role&&activeSection==='OVERVIEW'?<View style={styles.section}>
        <Eyebrow>{t('TRANSMISSÕES EM DIRETO')}</Eyebrow>
        <Text style={styles.sectionTitle}>{t('Lives da comunidade')}</Text>
        <Text style={styles.muted}>{t('Assiste aos jogos e treinos em direto. O servidor confirma quem pode transmitir.')}</Text>
        <Button secondary title={t('Ver diretos da comunidade')} onPress={()=>router.push({pathname:'/communities/[id]/live',params:{id:String(id)}})}/>
      </View>:null}
      {role&&activeSection==='FEED'&&auth.token&&auth.username?<View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Feed da comunidade')}</Text>
        {owner?<View style={{gap:6}}>
          <Text style={styles.muted}>{t('Quem pode publicar no feed e em Stories: {v}',{v:(community as CommunityGroup|null)?.membersCanPost===false?t('só os organizadores'):t('todos os membros')})}</Text>
          <Button secondary disabled={postingPolicyBusy} title={postingPolicyBusy?t('A guardar…'):(community as CommunityGroup|null)?.membersCanPost===false?t('Deixar todos os membros publicar'):t('Só os organizadores publicam')}
            onPress={()=>{void togglePostingPolicy();}}/>
        </View>:community&&'membersCanPost' in community&&(community as CommunityGroup).membersCanPost===false?<Text style={styles.muted}>{t('Só os organizadores publicam no feed desta comunidade.')}</Text>:null}
        <CommunityFeedPanel communityId={id} token={auth.token} username={auth.username} canManage={owner}/>
      </View>:null}
      {role&&activeSection==='SESSIONS'?<View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Próximas sessões')}</Text>
        {canCreateSession?<Button title={t('Criar sessão nesta comunidade')} onPress={()=>router.push({pathname:'/sessions/create',params:{communityId:String(id)}})}/>
         :<Text style={styles.muted}>{t('Nesta comunidade, só os organizadores criam sessões.')}</Text>}
        {sessionsError?<Message tone="error">{sessionsError}</Message>:null}
        {sessionsError?<Button secondary title={t('Tentar carregar sessões novamente')} disabled={loading||busy} onPress={()=>{void reload();}}/>:null}
        {audienceError?<Message tone="error">{audienceError}</Message>:null}
        {!sessionsError&&sessions.length===0?<Message>{t('Esta comunidade ainda não tem sessões agendadas.')}</Message>:null}
        {sessions.map(s=><View key={s.id} style={styles.communitySessionRow}>
          <SessionCard session={s} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>
          {auth.token&&(canOpenToPublic(s,owner)||canRestrictToMembers(s,owner,id))?<View style={{gap:4}}>
           <Button secondary title={audienceBusy===s.id?t('A guardar…'):canOpenToPublic(s,owner)?t('Procurar jogadores fora da comunidade'):t('Só membros da comunidade')}
            disabled={audienceBusy!==null} onPress={()=>{
             const token=auth.token;if(!token||audienceBusy!==null)return;
             const toPublic=canOpenToPublic(s,owner);
             setAudienceBusy(s.id);setAudienceError('');
             setCommunitySessionAudience(id,s.id,toPublic,token)
              .then(updated=>setSessions(prev=>prev.map(item=>item.id===updated.id?{...item,...updated}:item)))
              .catch(()=>setAudienceError(toPublic?t('Não foi possível abrir a sessão a outros jogadores.'):t('Não foi possível restringir a sessão aos membros.')))
              .finally(()=>setAudienceBusy(null));
            }}/>
           <Text style={styles.audienceHint}>{canOpenToPublic(s,owner)
            ?t('Os membros continuam a poder juntar-se. A sessão passa também a aparecer a outros jogadores.')
            :t('Remove a sessão da pesquisa pública. Inscrições já confirmadas não são anuladas.')}</Text>
          </View>:null}
          {owner&&isMember(community)&&community.rankingsEnabled&&s.status!=='CANCELLED'&&Number.isFinite(Date.parse(s.gameDate))&&Date.parse(s.gameDate)<Date.now()?
           <Button secondary title={t('Registar resultado do jogo')}
            onPress={()=>router.push({pathname:'/sessions/[id]/result',params:{id:String(s.id),communityId:String(id),sport:s.sport}})}/>:null}
        </View>)}
      </View>:null}
    </>:null}
  </Page>;
}
const styles=StyleSheet.create({
  audienceHint:{color:C.muted,fontSize:12,lineHeight:17},
  identityCard:{backgroundColor:'#082D3A',borderWidth:1,borderColor:'#37CBB366',borderRadius:22,padding:19,gap:14,overflow:'hidden'},
  identityHeading:{flexDirection:'row',alignItems:'center',gap:14,minWidth:0},
  identityMark:{width:69,height:69,borderRadius:19,borderWidth:1,borderColor:'#4AE4C47F',backgroundColor:'#0F615F',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  identityInitial:{color:'#C5FFEE',fontSize:30,fontWeight:'900'},
  identityCopy:{flex:1,minWidth:0,gap:5},
  identityStatus:{fontSize:12,fontWeight:'700',color:'#90E9D4'},
  identitySports:{flex:1,minWidth:0,fontSize:13,color:'#A5EAD9',fontWeight:'700',lineHeight:20},
  sportList:{flexDirection:'row',flexWrap:'wrap',gap:7},
  sportPill:{paddingHorizontal:10,paddingVertical:8,borderRadius:11,backgroundColor:'#0E4B52',borderWidth:1,borderColor:'#49D1B655'},
  sportText:{fontSize:14,color:C.mint,fontWeight:'700'},
  banner:{padding:14,backgroundColor:C.surface2,borderRadius:18,alignItems:'center',gap:7},
  bannerIcon:{fontSize:32},bannerText:{color:C.mint,fontWeight:'800',fontSize:14,lineHeight:21,textAlign:'center'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  heading:{flexShrink:1,color:C.white,fontSize:25,fontWeight:'900',lineHeight:30},subtitle:{color:C.muted,fontSize:14,lineHeight:21},
  section:{padding:16,borderRadius:18,backgroundColor:'#092D3B',borderWidth:1,borderColor:'#3BC8B344',gap:13},
  sectionNav:{flexGrow:0,borderRadius:15,backgroundColor:'#061F2C',borderWidth:1,borderColor:C.border},sectionNavContent:{flexDirection:'row',gap:7,padding:6},
  manageButton:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:'#4AE4C47F',alignItems:'center',justifyContent:'center',alignSelf:'flex-start'},manageButtonOn:{backgroundColor:C.mint,borderColor:C.mint},
  startCard:{gap:8,padding:14,borderRadius:16,borderWidth:1,borderColor:'rgba(94,230,200,0.3)',backgroundColor:'rgba(20,70,76,0.45)'},
 startTitle:{color:'#fff',fontSize:16,fontWeight:'800'},
 manageTitle:{color:C.white,fontSize:18,fontWeight:'900'},identityPhoto:{width:'100%',height:'100%'},
  sectionTab:{minHeight:44,paddingHorizontal:12,justifyContent:'center',alignItems:'center',borderRadius:10,borderWidth:1,borderColor:'#235460',backgroundColor:'#092F3D'},
  sectionTabSelected:{backgroundColor:C.mint,borderColor:C.mint},
  sectionTabText:{fontSize:12,fontWeight:'800',color:'#C4E1DF'},sectionTabTextSelected:{color:'#052C30'},
  quickLinks:{flexDirection:'row',gap:9,flexWrap:'wrap'},
  quickLink:{flexGrow:1,flexBasis:'29%',minWidth:96,minHeight:114,padding:11,borderRadius:13,borderWidth:1,borderColor:'#3CC8B366',backgroundColor:'#0A3B43',gap:5},
  quickLinkIcon:{fontSize:22,color:C.mint,fontWeight:'900'},quickLinkTitle:{fontSize:13,color:C.white,fontWeight:'900'},
  quickLinkDescription:{fontSize:11,lineHeight:16,color:C.muted},
  communitySessionRow:{gap:9},
  sectionTitle:{color:C.white,fontSize:20,fontWeight:'900'},member:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#45B9AE24'},
  avatar:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:'#49D8BF66',alignItems:'center',justifyContent:'center',backgroundColor:'#105B5B'},
  avatarText:{fontSize:18,color:C.mint,fontWeight:'800'},memberName:{fontSize:15,color:C.white,fontWeight:'800'},
  muted:{fontSize:14,color:C.muted,lineHeight:21},input:{minHeight:52,paddingHorizontal:14,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.background,color:C.white,fontSize:15},
  memberMenu:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:C.surface2},memberMenuText:{color:C.white,fontSize:20,fontWeight:'900'},
  request:{padding:12,backgroundColor:C.surface2,borderRadius:12,gap:12}
});
