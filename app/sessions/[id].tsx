import React,{useCallback,useEffect,useState} from 'react';
import {Alert,Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {DEMO_MODE,cancelSession,inviteToSession,joinSession,leaveSession,openSessionRegistration,sessionDetail,sessionParticipants,sessionPreview} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {formatDate,money} from '../../src/lib/format.cjs';
import {sportIcon} from '../../src/lib/tournament-discovery-core.cjs';
import {canLeave,canViewRoster,isOrganizer,registrationAction,safeExactAddress,safeMeetingPoint} from '../../src/lib/session-state.cjs';
import type {SessionDetail,SessionParticipant,PublicSessionPreview} from '../../src/lib/types';

export default function SessionScreen(){
  const {id:rawId}=useLocalSearchParams<{id:string}>();
  const id=Number(rawId), router=useRouter(), auth=useAuth();
  const [preview,setPreview]=useState<PublicSessionPreview|null>(null);
  const [detail,setDetail]=useState<SessionDetail|null>(null);
  const [participants,setParticipants]=useState<SessionParticipant[]>([]);
  const [password,setPassword]=useState(''),[inviteUsername,setInviteUsername]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[feedback,setFeedback]=useState('');
  const owner=isOrganizer(detail,auth.username);

  const load=useCallback(async()=>{
    if(!Number.isSafeInteger(id)||id<=0){setError('Identificador de sessão inválido.');setLoading(false);return;}
    setError('');setLoading(true);setDetail(null);setParticipants([]);
    try {
      // The anonymous route must not expose address or roster.
      const pub=await sessionPreview(id);setPreview(pub);
      if(auth.token){
        const full=await sessionDetail(id,auth.token,auth.username||undefined);
        setDetail(full);
        if(canViewRoster(full,auth.username)){
          try{setParticipants(await sessionParticipants(id,auth.token));}
          catch{setParticipants([]);}
        }
      }
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar a sessão.');}
    finally{setLoading(false);}
  },[id,auth.token,auth.username]);
  useEffect(()=>{void load();},[load]);

  const perform=async(operation:()=>Promise<unknown>,success:string|((result:unknown)=>string))=>{
    if(busy)return;
    setBusy(true);setError('');setFeedback('');
    try {const result=await operation();setFeedback(typeof success==='function'?success(result):success);await load();}
    catch(e){setError((e instanceof Error?e.message:'Não foi possível concluir a ação.')+' Confirma o estado da sessão antes de repetir.');}
    finally{setBusy(false);}
  };
  const s=detail||preview,spots=Math.max(0,(s?.maxParticipants??0)-(s?.participantCount??0));
  const action=registrationAction(detail,auth.username);
  const join=()=>{void perform(async()=>{
    if(!auth.token)throw new Error('Inicia sessão primeiro.');
    const result=await joinSession(id,auth.token,auth.username||undefined,password);
    setPassword('');
    // Preserve the actual server outcome rather than assuming every join is confirmed.
    return result;
  },(result)=>{const state=(result as {state?:string})?.state;return state==='WAITLISTED'?'Entraste na lista de espera.':'Presença confirmada pelo servidor.';});};
  const leave=()=>Alert.alert('Cancelar presença','Queres mesmo deixar esta sessão ou a lista de espera?',[
    {text:'Voltar',style:'cancel'},
    {text:'Confirmar',style:'destructive',onPress:()=>{if(auth.token)void perform(()=>leaveSession(id,auth.token!,auth.username||undefined),'A tua presença foi cancelada.');}}
  ]);
  const cancel=()=>Alert.alert('Cancelar sessão','Esta ação cancela a sessão para todos os jogadores. Confirmas?',[
    {text:'Manter sessão',style:'cancel'},
    {text:'Cancelar sessão',style:'destructive',onPress:()=>{if(auth.token)void perform(()=>cancelSession(id,auth.token!,auth.username||undefined),'Sessão cancelada.');}}
  ]);
  const sendInvite=()=>{const invitee=inviteUsername.trim();if(!invitee||!auth.token)return;
    void perform(async()=>{await inviteToSession(id,invitee,auth.token!,auth.username||undefined);setInviteUsername('');},'Convite enviado. A outra pessoa tem de o aceitar.');};
  const share=()=>{
    if(DEMO_MODE){setFeedback('Não é possível partilhar uma sessão fictícia da demonstração.');return;}
    void Share.share({message:`Encontra esta sessão na Jynlo: https://d24sports.com/sessions/${id}`});
  };
  const openAt=detail?.registrationOpensAt&&Number.isFinite(Date.parse(detail.registrationOpensAt))?
    formatDate(detail.registrationOpensAt):null;

  return <Page>
    <DemoBanner/>
    <Eyebrow>JYNLO · DETALHES DO JOGO</Eyebrow>
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {s&&!loading?<>
      <View style={styles.hero}>
        <View style={styles.top}><Text style={styles.sportIcon}>{sportIcon(s.sport)}</Text>
          <Badge text={detail?.joined?'Confirmado':detail?.waitlisted?'Lista de espera':s.status==='CANCELLED'?'Cancelada':s.status==='FULL'?'Completa':`${spots} vagas`}/></View>
        <Text style={styles.title}>{s.sport||'Sessão desportiva'}</Text>
        <Text style={styles.city}>⌖ {s.city||'Local a confirmar'}</Text>
        {detail?.audience==='COMMUNITY_ONLY'?<Text style={styles.hint}>Sessão reservada a membros da comunidade.</Text>:null}
      </View>
      <View style={styles.infoGrid}>
        <View style={styles.info}><Text style={styles.label}>DATA E HORA</Text><Text style={styles.value}>{formatDate(s.gameDate)}</Text></View>
        <View style={styles.info}><Text style={styles.label}>VALOR</Text><Text style={styles.value}>{money(s.priceAmount)}</Text></View>
        <View style={styles.info}><Text style={styles.label}>PARTICIPANTES</Text><Text style={styles.value}>{s.participantCount??'—'}/{s.maxParticipants??'—'}</Text></View>
        <View style={styles.info}><Text style={styles.label}>ESTADO</Text><Text style={styles.value}>{s.status==='OPEN'?'Aberta':s.status==='FULL'?'Completa':s.status==='CANCELLED'?'Cancelada':s.status==='COMPLETED'?'Concluída':s.status||'—'}</Text></View>
      </View>
      <View style={styles.panel}>
        <Eyebrow>RECINTO E ENCONTRO</Eyebrow>
        <Text style={styles.panelHeading}>{safeExactAddress(detail,auth.username)||'Morada exata reservada aos participantes autorizados'}</Text>
        {safeMeetingPoint(detail,auth.username)?<Text style={styles.hint}>{safeMeetingPoint(detail,auth.username)}</Text>:null}
        <Text style={styles.hint}>Os detalhes de localização são mostrados apenas quando a API autoriza.</Text>
      </View>
      {feedback?<Message>{feedback}</Message>:null}
      {detail?.joined?<Message>✓ A tua presença está confirmada.</Message>:null}
      {detail?.waitlisted?<Message>Estás na lista de espera{detail.waitlistPosition?` · posição ${detail.waitlistPosition}`:''}.</Message>:null}
      {!auth.token&&['OPEN','FULL'].includes(s.status||'')?<Button title="Entrar para participar" onPress={()=>router.push({pathname:'/login',params:{redirect:`/sessions/${id}`}})}/>:null}
      {!auth.token&&['CANCELLED','COMPLETED'].includes(s.status||'')?<Message>Esta sessão terminou ou foi cancelada. Podes continuar a explorar outras sessões públicas.</Message>:null}
      {auth.token&&detail&&['JOIN','WAITLIST','PASSWORD'].includes(action.kind)?<View style={styles.panel}>
        {detail.privateGame?<>
          <Text style={styles.hint}>Esta sessão exige palavra-passe. Não confundas sessão privada com sessão apenas para membros.</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
            style={styles.input} placeholder="Palavra-passe da sessão" placeholderTextColor={C.muted}/>
        </>:null}
        <Button title={busy?'A processar…':action.label} disabled={busy||loading||(detail.privateGame&&!password.trim())} onPress={join}/>
        {action.kind==='WAITLIST'?<Text style={styles.hint}>Não há vagas neste momento. O servidor confirma se é possível entrar em espera.</Text>:null}
        {detail.registrationOpeningMode==='MANUAL'?<Text style={styles.hint}>A abertura manual das inscrições é controlada pelo organizador.</Text>:null}
      </View>:null}
      {auth.token&&detail&&action.kind==='SCHEDULED'?<Message>Inscrições programadas{openAt?` para ${openAt}`:''}.</Message>:null}
      {auth.token&&detail&&action.kind==='CLOSED'&&!owner?<Message>Não é possível participar neste momento.</Message>:null}
      {auth.token&&detail&&canLeave(detail)?<Button danger title="Cancelar a minha presença" disabled={busy} onPress={leave}/>:null}
      {auth.token&&owner&&detail&&(detail.status==='OPEN'||detail.status==='FULL')?<View style={styles.panel}>
        <Eyebrow>FERRAMENTAS DO ORGANIZADOR</Eyebrow>
        {detail.registrationOpeningMode==='MANUAL'?<Button secondary title="Abrir inscrições" disabled={busy} onPress={()=>{void perform(()=>openSessionRegistration(id,auth.token!),'Inscrições abertas.');}}/>:null}
        <Text style={styles.hint}>Convidar uma pessoa que já tem conta Jynlo:</Text>
        <TextInput style={styles.input} value={inviteUsername} onChangeText={setInviteUsername}
          autoCapitalize="none" autoCorrect={false} placeholder="Nome de utilizador" placeholderTextColor={C.muted}/>
        <Button title="Enviar convite" disabled={busy||!inviteUsername.trim()} onPress={sendInvite}/>
        <Button danger title="Cancelar esta sessão" disabled={busy} onPress={cancel}/>
      </View>:null}
      {detail&&canViewRoster(detail,auth.username)?<View style={{gap:11}}>
        <View style={styles.top}><Text style={styles.rosterTitle}>Quem vai</Text><Text style={styles.hint}>{participants.length} participantes visíveis</Text></View>
        {participants.length===0?<Text style={styles.hint}>A lista ainda não está disponível.</Text>:participants.map(p=><View key={p.id} style={styles.member}>
          <View style={styles.avatar}><Text style={{color:C.mint,fontWeight:'900'}}>{p.username.slice(0,1).toUpperCase()}</Text></View>
          <Text style={styles.memberName}>{p.username}</Text>
          {p.username.toLowerCase()===auth.username?.toLowerCase()?<Text style={{color:C.mint,marginLeft:'auto'}}>Tu</Text>:null}
        </View>)}
      </View>:null}
      <Button title="Partilhar ligação pública" secondary onPress={share}/>
    </>:null}
    <Button title="Atualizar estado da sessão" secondary onPress={()=>{void load();}} disabled={loading||busy}/>
    <Pressable onPress={()=>router.back()}><Text style={styles.back}>← Voltar</Text></Pressable>
  </Page>;
}
const styles=StyleSheet.create({
  hero:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:24,padding:22,gap:10},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  sportIcon:{fontSize:39},title:{fontSize:30,fontWeight:'900',color:C.white,letterSpacing:-0.7},
  city:{fontSize:14,color:C.muted},infoGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  info:{backgroundColor:C.surface,borderRadius:16,padding:14,width:'47%',minHeight:82,flexGrow:1},
  label:{fontSize:10,letterSpacing:1,color:C.muted,fontWeight:'800'},
  value:{fontSize:15,color:C.white,fontWeight:'800',marginTop:10},
  panel:{gap:12,padding:17,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
  panelHeading:{color:C.white,fontSize:16,fontWeight:'800',lineHeight:23},
  hint:{color:C.muted,fontSize:12,lineHeight:19},
  input:{backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,borderRadius:13,color:C.white,padding:14,minHeight:50},
  rosterTitle:{color:C.white,fontSize:21,fontWeight:'800'},
  member:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.surface,borderRadius:14,padding:12},
  avatar:{height:35,width:35,borderRadius:18,backgroundColor:'#225048',alignItems:'center',justifyContent:'center'},
  memberName:{color:C.white,fontSize:14,fontWeight:'700'},back:{color:C.mint,textAlign:'center',padding:10,fontWeight:'700'}
});
