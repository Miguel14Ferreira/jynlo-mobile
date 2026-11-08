import React,{useCallback,useRef,useState} from 'react';
import {Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page,SessionCard} from '../../src/components/UI';
import {DEMO_MODE} from '../../src/lib/api';
import {
  acceptCommunityRequest,communityDetails,communitySessions,inviteCommunityMember,
  joinPublicCommunity,myPendingCommunityRequest,pendingCommunityRequests,requestCommunityMembership
} from '../../src/lib/community-api';
import {communityUrl,communitySports,describeCommunitySports} from '../../src/lib/community-core.cjs';
import {useAuth} from '../../src/lib/auth';
import {safeRedirect} from '../../src/lib/routes.cjs';
import {C} from '../../src/lib/theme';
import type {CommunityGroup,CommunityJoinRequest,CommunitySummary,SessionSummary} from '../../src/lib/types';
const isMember=(c:CommunityGroup|CommunitySummary):c is CommunityGroup=>
  'myRole' in c && Boolean((c as CommunityGroup).myRole);
export default function CommunityDetailScreen(){
  const params=useLocalSearchParams<{id:string;created?:string;returnTo?:string}>();const id=Number(params.id);
  const returnTo=safeRedirect(params.returnTo);
  const teamDestination=Number.isSafeInteger(id)&&id>0&&returnTo.startsWith('/tournaments/'+id+'/')?returnTo:null;
  const auth=useAuth(),router=useRouter();
  const [community,setCommunity]=useState<CommunityGroup|CommunitySummary|null>(null);
  const [sessions,setSessions]=useState<SessionSummary[]>([]);
  const [sessionsError,setSessionsError]=useState('');
  const [requests,setRequests]=useState<CommunityJoinRequest[]>([]);
  const [requestsError,setRequestsError]=useState('');
  const [myRequest,setMyRequest]=useState<CommunityJoinRequest|null>(null);
  const [inviteName,setInviteName]=useState('');const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const generation=useRef(0);
  const reload=useCallback(async(version=generation.current)=>{
    if(!Number.isSafeInteger(id)||id<=0){
      if(version===generation.current){setError('Comunidade inválida.');setLoading(false);}
      return;
    }
    setLoading(true);setError('');setCommunity(null);setMyRequest(null);setSessions([]);setSessionsError('');setRequests([]);setRequestsError('');
    try{
      const c=await communityDetails(id,auth.token,auth.username);
      if(version!==generation.current)return;
      setCommunity(c);
      if(auth.token&&auth.username&&isMember(c)){
        setMyRequest(null);
        try{
          const next=await communitySessions(id,auth.token,auth.username);
          if(version!==generation.current)return;
          setSessions(next);setSessionsError('');
        }catch{if(version===generation.current){setSessions([]);setSessionsError('Não foi possível carregar as sessões. Tenta novamente.');}}
        if(c.myRole==='OWNER'||c.myRole==='ADMIN'){
          try{
            const next=await pendingCommunityRequests(id,auth.token,auth.username);
            if(version!==generation.current)return;
            setRequests(next);setRequestsError('');
          }catch{if(version===generation.current){setRequests([]);setRequestsError('Não foi possível carregar os pedidos de adesão.');}}
        }else {setRequests([]);setRequestsError('');}
      }else{
        setSessions([]);setSessionsError('');setRequests([]);setRequestsError('');
        if(auth.token&&auth.username&&c.visibility==='PRIVATE'){
          try{
            const next=await myPendingCommunityRequest(id,auth.token,auth.username);
            if(version!==generation.current)return;
            setMyRequest(next);
          }catch{if(version===generation.current)setMyRequest(null);}
        }else setMyRequest(null);
      }
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível carregar a comunidade.');
    }finally{if(version===generation.current)setLoading(false);}
  },[id,auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{
    const version=++generation.current;
    // Never show another community or account while the new request is pending.
    setCommunity(null);setSessions([]);setSessionsError('');setRequests([]);setRequestsError('');setMyRequest(null);
    setError('');setNotice('');setBusy(false);
    void reload(version);
    return ()=>{generation.current++;};
  },[reload]));
  const role=community&&isMember(community)?community.myRole:null;
  const owner=role==='OWNER'||role==='ADMIN';
  async function take(action:'join'|'request'){
    if(!auth.token||!auth.username){router.push({pathname:'/login',params:{redirect:`/communities/${id}`}});return;}
    if(busy)return;
    const version=generation.current;
    setBusy(true);setError('');setNotice('');
    try{
      if(action==='join')await joinPublicCommunity(id,auth.token,auth.username);
      else await requestCommunityMembership(id,auth.token,auth.username);
      if(version!==generation.current)return;
      setNotice(action==='join'?'Já fazes parte desta comunidade!':'Pedido enviado. Aguarda a decisão do organizador.');
      if(action==='join'&&teamDestination){
        router.replace(teamDestination as any);
      }else await reload(version);
    }catch(e){
      if(version===generation.current)setError((e instanceof Error?e.message:'Operação não concluída.')+' Verifica o estado antes de repetir.');
    }finally{if(version===generation.current)setBusy(false);}
  }
  async function sendInvite(){
    if(!auth.token||!auth.username||busy)return;
    const version=generation.current;
    setBusy(true);setError('');setNotice('');
    try{
      await inviteCommunityMember(id,inviteName,auth.token,auth.username);
      if(version!==generation.current)return;
      setInviteName('');setNotice('Convite enviado! A pessoa poderá aceitá-lo em Comunidades → Convites.');
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível enviar o convite.');
    }finally{if(version===generation.current)setBusy(false);}
  }
  async function approve(requestId:number){
    if(!auth.token||!auth.username||busy)return;
    const version=generation.current;
    setBusy(true);setError('');
    try{
      await acceptCommunityRequest(id,requestId,auth.token,auth.username);
      if(version!==generation.current)return;
      setNotice('Pedido aprovado.');await reload(version);
    }catch(e){
      if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível aprovar o pedido.');
    }finally{if(version===generation.current)setBusy(false);}
  }
  async function share(){
    if(!owner||!community)return;
    if(DEMO_MODE){setNotice('Na demonstração, os convites funcionam entre Tiago e André, sem links para comunidades fictícias.');return;}
    const version=generation.current;
    try{await Share.share({message:`Junta-te à comunidade ${community.name} na Jynlo!\n${communityUrl(id)}`,url:communityUrl(id)});}
    catch{if(version===generation.current)setError('Não foi possível abrir a partilha.');}
  }
  return <Page><DemoBanner/>
    {params.created==='1'?<Message>Comunidade criada. Convida agora as pessoas com quem queres continuar a jogar.</Message>:null}
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {error&&!community&&!loading?<Button secondary title="Tentar carregar comunidade novamente" disabled={busy} onPress={()=>{void reload();}}/>:null}
    {!!notice?<Message>{notice}</Message>:null}
    {community?<>
      <Eyebrow>COMUNIDADE JYNLO</Eyebrow>
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>{communitySports(community)[0]==='Futebol'?'⚽':communitySports(community)[0]==='Karting'?'🏎️':communitySports(community)[0]==='Voleibol'?'🏐':'🤝'}</Text>
        <Text style={styles.bannerText}>{describeCommunitySports(community,3)} · {role?'Fazes parte deste grupo':'Descobre esta comunidade'}</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.heading}>{community.name}</Text>
        <Badge text={community.visibility==='PRIVATE'?'Privada':'Pública'}/>
      </View>
      <Text style={styles.subtitle}>{community.description||'Mais do que desporto, uma forma de encontrar pessoas.'}</Text>
      {communitySports(community).length>1?<View style={styles.sportList}>{communitySports(community).map(s=><View key={s} style={styles.sportPill}><Text style={styles.sportText}>{s}</Text></View>)}</View>:null}
      {!role&&auth.token&&community.visibility==='PUBLIC'?<Button title={busy?'A confirmar…':'Juntar-me à comunidade'} disabled={busy} onPress={()=>{void take('join');}}/>:null}
      {!role&&auth.token&&community.visibility==='PRIVATE'&&!myRequest?<Button title={busy?'A enviar…':'Pedir para entrar'} disabled={busy} onPress={()=>{void take('request');}}/>:null}
      {!role&&myRequest?<Message>O teu pedido de entrada está pendente de aprovação.</Message>:null}
      {!role&&!auth.token?<Button title="Iniciar sessão para participar" onPress={()=>router.push({pathname:'/login',params:{redirect:`/communities/${id}`}})}/>:null}
      {teamDestination&&role?<Button title="Continuar para a equipa do convite" onPress={()=>router.replace(teamDestination as any)}/>:null}
      {teamDestination&&!role&&myRequest?<Message>O pedido está pendente. Quando for aprovado, verifica novamente a adesão para continuares para a equipa.</Message>:null}
      {teamDestination&&!role&&auth.token&&!loading?<Button secondary title="Verificar aprovação da comunidade" disabled={busy} onPress={()=>{void reload();}}/>:null}
      {role?<View style={styles.section}>
        <View style={styles.header}><Text style={styles.sectionTitle}>Membros</Text><Badge text={`${(community as CommunityGroup).memberCount}`}/></View>
        {(community as CommunityGroup).members.map(m=><View key={m.profileId+':'+m.username} style={styles.member}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{m.username.charAt(0).toUpperCase()}</Text></View>
          <View style={{flex:1}}><Text style={styles.memberName}>{m.fullName||m.username}</Text>
            <Text style={styles.muted}>@{m.username}{m.role==='OWNER'?' · Organizador':m.role==='ADMIN'?' · Administrador':''}</Text></View>
        </View>)}
      </View>:null}
      {owner?<View style={styles.section}>
        <Eyebrow>FAZ A COMUNIDADE CRESCER</Eyebrow>
        <Text style={styles.sectionTitle}>Convidar pessoas</Text>
        <Text style={styles.muted}>Envia um convite a uma conta Jynlo existente. A adesão só acontece quando o destinatário aceitar.</Text>
        <TextInput style={styles.input} value={inviteName} onChangeText={setInviteName} autoCapitalize="none"
          placeholder={DEMO_MODE?'Experimenta: André':'Nome de utilizador'} placeholderTextColor={C.muted}
          accessibilityLabel="Nome de utilizador a convidar"/>
        <Button title={busy?'A enviar…':'Enviar convite'} disabled={busy||inviteName.trim().length<2} onPress={()=>{void sendInvite();}}/>
        <Button secondary title="Partilhar ligação da comunidade" onPress={()=>{void share();}}/>
      </View>:null}
      {owner&&requestsError?<View style={styles.section}><Message tone="error">{requestsError}</Message><Button secondary title="Tentar carregar pedidos novamente" disabled={loading||busy} onPress={()=>{void reload();}}/></View>:null}
      {owner&&requests.length>0?<View style={styles.section}>
        <Text style={styles.sectionTitle}>Pedidos para entrar</Text>
        {requests.map(r=><View key={r.id} style={styles.request}>
          <Text style={styles.memberName}>@{r.requesterUsername}</Text>
          <Button title={busy?'A aprovar…':'Aprovar'} disabled={busy} onPress={()=>{void approve(r.id);}}/>
        </View>)}
      </View>:null}
      {role?<View style={styles.section}>
        <Eyebrow>A CONVERSA CONTINUA</Eyebrow>
        <Text style={styles.sectionTitle}>Juntos, mesmo fora do campo</Text>
        <Button title="Abrir chat da comunidade" onPress={()=>router.push({pathname:"/communities/[id]/chat",params:{id:String(id)}})}/>
        <Button title="Criar sessão nesta comunidade" onPress={()=>router.push({pathname:'/sessions/create',params:{communityId:String(id)}})}/>
        <Button secondary title="Ver competições por modalidade" onPress={()=>router.push({pathname:'/communities/[id]/competitions',params:{id:String(id)}})}/>
        {owner?<Button secondary title="Criar torneio nesta comunidade" onPress={()=>router.push({pathname:"/tournaments/create",params:{communityId:String(id)}})}/>:null}
      </View>:null}
      {role?<View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximas sessões</Text>
        {sessionsError?<Message tone="error">{sessionsError}</Message>:null}
        {sessionsError?<Button secondary title="Tentar carregar sessões novamente" disabled={loading||busy} onPress={()=>{void reload();}}/>:null}
        {!sessionsError&&sessions.length===0?<Message>Esta comunidade ainda não tem sessões agendadas.</Message>:null}
        {sessions.map(s=><SessionCard key={s.id} session={s} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>)}
      </View>:null}
    </>:null}
  </Page>;
}
const styles=StyleSheet.create({
  sportList:{flexDirection:'row',flexWrap:'wrap',gap:7},
  sportPill:{paddingHorizontal:11,paddingVertical:7,borderRadius:11,backgroundColor:C.surface2,borderWidth:1,borderColor:C.border},
  sportText:{fontSize:12,color:C.mint,fontWeight:'700'},
  banner:{padding:20,backgroundColor:C.surface2,borderRadius:22,alignItems:'center',gap:9},
  bannerIcon:{fontSize:48},bannerText:{color:C.mint,fontWeight:'800',fontSize:13},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  heading:{flex:1,color:C.white,fontSize:27,fontWeight:'900'},subtitle:{color:C.muted,fontSize:14,lineHeight:21},
  section:{padding:18,borderRadius:20,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,gap:14},
  sectionTitle:{color:C.white,fontSize:20,fontWeight:'900'},member:{flexDirection:'row',gap:12,alignItems:'center'},
  avatar:{width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:C.surface2},
  avatarText:{fontSize:18,color:C.mint,fontWeight:'800'},memberName:{fontSize:15,color:C.white,fontWeight:'800'},
  muted:{fontSize:12,color:C.muted,lineHeight:19},input:{height:52,paddingHorizontal:14,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.background,color:C.white},
  request:{padding:12,backgroundColor:C.surface2,borderRadius:12,gap:12}
});
