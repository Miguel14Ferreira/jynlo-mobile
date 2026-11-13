import React,{useCallback,useRef,useState} from 'react';
import {Alert,AppState,Image,Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {ApiError,DEMO_MODE,cancelSession,inviteToSession,joinSession,leaveSession,removeSessionParticipant,recordSessionAttendance,openSessionRegistration,suggestSessionTeams,confirmSessionTeams,updateSessionMeetingPoint,updateSessionExternalConfirmations,sessionDetail,sessionParticipants,sessionPreview} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {confirmedSessionJoin} from '../../src/lib/session-join-receipt.cjs';
import {formatDate,money} from '../../src/lib/format.cjs';
import {sportIcon} from '../../src/lib/tournament-discovery-core.cjs';
import {resolveJynloMedia} from '../../src/lib/social-feed-api';
import {minimumPlayersProgress,rosterAttendanceLabel} from '../../src/lib/session-presentation.cjs';
import {SessionOfficialResultCard} from '../../src/components/SessionOfficialResultCard';
import {confirmedSessionTeams,sessionParticipationLabel} from '../../src/lib/session-teams-presentation.cjs';
import {canLeave,canViewRoster,isOrganizer,registrationAction,safeExactAddress,safeMeetingPoint} from '../../src/lib/session-state.cjs';
import type {SessionDetail,SessionParticipant,PublicSessionPreview,SessionTeamSuggestion,SessionTeamPlayer} from '../../src/lib/types';

function ParticipantAvatar({participant}:{participant:SessionParticipant}){
  const photo=resolveJynloMedia(participant.profilePicUrl);
  return <View style={styles.avatar}>
    {photo?<Image source={{uri:photo}} style={styles.avatarPhoto} accessibilityLabel={`Fotografia de ${participant.username}`}/>:
      <Text style={styles.avatarLetter}>{participant.username.slice(0,1).toUpperCase()||'J'}</Text>}
  </View>;
}

export default function SessionScreen(){
  const {id:rawId}=useLocalSearchParams<{id:string}>();
  const id=Number(rawId), router=useRouter(), auth=useAuth();
  const [preview,setPreview]=useState<PublicSessionPreview|null>(null);
  const detailRequestGeneration=useRef(0);
  const operationInFlight=useRef(false);
  const actionEpoch=useRef(0);
  const backgroundSyncInFlight=useRef(false);
  const foregroundLoadVersion=useRef<number|null>(null);
  const [detail,setDetail]=useState<SessionDetail|null>(null);
  const [participants,setParticipants]=useState<SessionParticipant[]>([]);
  const [rosterError,setRosterError]=useState('');
  const removalInFlight=useRef(false);
  const [removingParticipantId,setRemovingParticipantId]=useState<number|null>(null);
  const [rosterFeedback,setRosterFeedback]=useState('');
  const attendanceInFlight=useRef(false);
  const [attendanceParticipantId,setAttendanceParticipantId]=useState<number|null>(null);
  const [password,setPassword]=useState(''),[inviteUsername,setInviteUsername]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[feedback,setFeedback]=useState('');
  const [editMeetingPoint,setEditMeetingPoint]=useState(false),[meetingDraft,setMeetingDraft]=useState('');
  const [editExternalCount,setEditExternalCount]=useState(false),[externalDraft,setExternalDraft]=useState('');
  const [teamSource,setTeamSource]=useState<'FORM'|'EXCEL_POINTS'|'RANDOM'>('FORM');
  const [teamPreview,setTeamPreview]=useState<SessionTeamSuggestion|null>(null);
  const [teamsBusy,setTeamsBusy]=useState(false),[teamsError,setTeamsError]=useState('');
  const teamsInFlight=useRef(false),teamsOperation=useRef(0);
  const [teamsMessage,setTeamsMessage]=useState('');
  const owner=isOrganizer(detail,auth.username);

  const load=useCallback(async():Promise<SessionDetail|null>=>{
    const version=++detailRequestGeneration.current;
    foregroundLoadVersion.current=version;
    if(!Number.isSafeInteger(id)||id<=0){
      foregroundLoadVersion.current=null;
      setError('Identificador de sessão inválido.');setLoading(false);return null;
    }
    setError('');setRosterError('');setLoading(true);setDetail(null);setPreview(null);setParticipants([]);
    setTeamPreview(null);
    try {
      if(auth.token){
        // Private and community sessions may not have an anonymous preview.
        const full=await sessionDetail(id,auth.token,auth.username||undefined);
        if(version!==detailRequestGeneration.current)return null;
        setDetail(full);
        setMeetingDraft(full.meetingPointInstructions||'');
        setExternalDraft(String(full.externalConfirmedParticipants??0));
        try {
          const publicPreview=await sessionPreview(id);
          if(version!==detailRequestGeneration.current)return null;
          setPreview(publicPreview);
        }catch{
          if(version!==detailRequestGeneration.current)return null;
          setPreview(null);
        }
        if(canViewRoster(full,auth.username)){
          try {
            const roster=await sessionParticipants(id,auth.token);
            if(version!==detailRequestGeneration.current)return null;
            setParticipants(roster);
          }catch{
            if(version!==detailRequestGeneration.current)return null;
            setParticipants([]);
            setRosterError('Não foi possível carregar a lista de jogadores. Atualiza o estado da sessão para tentar novamente.');
          }
        }
        // The caller may display sensitive confirmed assignments only after
        // this authenticated refresh has verified organizer access.
        return version===detailRequestGeneration.current&&isOrganizer(full,auth.username)?full:null;
      }else{
        const publicPreview=await sessionPreview(id);
        if(version!==detailRequestGeneration.current)return null;
        setPreview(publicPreview);
        return null;
      }
    }catch(e){
      if(version===detailRequestGeneration.current)
        setError(e instanceof Error?e.message:'Não foi possível carregar a sessão.');
      return null;
    }finally{
      if(foregroundLoadVersion.current===version)foregroundLoadVersion.current=null;
      if(version===detailRequestGeneration.current)setLoading(false);
    }
  },[id,auth.token,auth.username]);
  // Read-only synchronization: a participant on another device may join,
  // cancel or move off the waitlist without this screen losing its drafts.
  const syncSession=useCallback(async(version:number,epoch:number)=>{
    if(backgroundSyncInFlight.current||foregroundLoadVersion.current!==null||
       operationInFlight.current||
       removalInFlight.current||attendanceInFlight.current||teamsInFlight.current||!auth.token||
       !Number.isSafeInteger(id)||id<=0)return;
    if(version!==detailRequestGeneration.current||epoch!==actionEpoch.current)return;
    backgroundSyncInFlight.current=true;
    try{
      const updated=await sessionDetail(id,auth.token,auth.username||undefined);
      if(version!==detailRequestGeneration.current||epoch!==actionEpoch.current||
         operationInFlight.current||removalInFlight.current||attendanceInFlight.current||teamsInFlight.current)return;
      // Resolve the roster before publishing the new snapshot. Unauthorized
      // viewers never retain the previous player's private roster.
      let roster:SessionParticipant[]=[];
      const rosterAllowed=canViewRoster(updated,auth.username);
      if(rosterAllowed){
        roster=await sessionParticipants(id,auth.token);
        if(version!==detailRequestGeneration.current||epoch!==actionEpoch.current||
           operationInFlight.current||removalInFlight.current||attendanceInFlight.current||teamsInFlight.current)return;
      }
      setDetail(updated);
      setParticipants(roster);
      setRosterError('');
      // Keep an ordinary draft intact, but never retain a proposed team
      // assignment after this account loses permission to view the roster.
      if(!rosterAllowed)setTeamPreview(null);
    }catch(e){
      if(version!==detailRequestGeneration.current||epoch!==actionEpoch.current)return;
      if(e instanceof ApiError&&[401,403,404,410].includes(e.status)){
        setDetail(null);setParticipants([]);setTeamPreview(null);
        setError('O acesso a esta sessão mudou. Atualiza para confirmar as permissões.');
      }
      // Network failures preserve the last visible data and draft; the user
      // can still request a full refresh manually.
    }finally{backgroundSyncInFlight.current=false;}
  },[id,auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{
    setBusy(false);
    // Keep pending team writes locked across a blur/refocus; otherwise the
    // same confirmation could be posted twice while its first POST is alive.
    setTeamsBusy(teamsInFlight.current);
    void load();
    const epoch=actionEpoch.current;
    const timer=setInterval(()=>{
      if(AppState.currentState==='active')
        void syncSession(detailRequestGeneration.current,epoch);
    },15000);
    const resume=AppState.addEventListener('change',state=>{
      if(state==='active')
        void syncSession(detailRequestGeneration.current,epoch);
    });
    // An old response must never restore restricted session details after
    // changing account, route, or leaving this screen.
    return ()=>{
      clearInterval(timer);resume.remove();
      detailRequestGeneration.current++;actionEpoch.current++;
      // Invalidate callbacks, but let the original request release its lock
      // in finally. A pending server write must never become repeatable here.
      teamsOperation.current++;
    };
  },[load,syncSession]));

  const perform=async(operation:()=>Promise<unknown>,success:string|((result:unknown)=>string))=>{
    // React state updates are asynchronous. A ref prevents two rapid taps
    // from issuing duplicate POST/PATCH requests before the button disables.
    if(operationInFlight.current||removalInFlight.current||attendanceInFlight.current||teamsInFlight.current)return;
    operationInFlight.current=true;
    const version=detailRequestGeneration.current;
    const epoch=actionEpoch.current;
    setBusy(true);setError('');setFeedback('');
    try {
      const result=await operation();
      // A response from the previous route/account must not update this screen.
      if(version!==detailRequestGeneration.current)return;
      setFeedback(typeof success==='function'?success(result):success);
      await load();
    }catch(e){
      if(version===detailRequestGeneration.current)
        setError((e instanceof Error?e.message:'Não foi possível concluir a ação.')+' Confirma o estado da sessão antes de repetir.');
    }finally{
      operationInFlight.current=false;
      if(epoch===actionEpoch.current)setBusy(false);
    }
  };
  const s=detail||preview,spots=Math.max(0,(s?.maxParticipants??0)-(s?.participantCount??0));
  const minimum=minimumPlayersProgress(detail);
  const confirmedTeams=confirmedSessionTeams(participants);
  const hasConfirmedTeams=confirmedTeams.A.length+confirmedTeams.B.length>0;
  const sessionPhoto=resolveJynloMedia(s?.gamePhoto);
  const action=registrationAction(detail,auth.username);
  const join=()=>{void perform(async()=>{
    if(!auth.token)throw new Error('Inicia sessão primeiro.');
    const result=await joinSession(id,auth.token,auth.username||undefined,password);
    const confirmed=confirmedSessionJoin(result);
    if(!confirmed)throw Error('O servidor respondeu, mas não confirmou a entrada no jogo. Verifica a lista de jogadores antes de repetir.');
    setPassword('');
    return confirmed;
  },(result)=>(result as {message:string}).message);};
  const leave=()=>{
    if(!auth.token||!detail||!canLeave(detail))return;
    const promptVersion=detailRequestGeneration.current,promptEpoch=actionEpoch.current;
    const actorToken=auth.token,actorUsername=auth.username;
    Alert.alert('Cancelar presença','Queres mesmo deixar esta sessão ou a lista de espera?',[
      {text:'Voltar',style:'cancel'},
      {text:'Confirmar',style:'destructive',onPress:()=>{
        if(promptVersion!==detailRequestGeneration.current||promptEpoch!==actionEpoch.current)return;
        void perform(()=>leaveSession(id,actorToken,actorUsername||undefined),'A tua presença foi cancelada.');
      }}
    ]);
  };
  const cancel=()=>{
    if(!auth.token||!detail||!owner)return;
    const promptVersion=detailRequestGeneration.current,promptEpoch=actionEpoch.current;
    const actorToken=auth.token,actorUsername=auth.username;
    Alert.alert('Cancelar sessão','Esta ação cancela a sessão para todos os jogadores. Confirmas?',[
      {text:'Manter sessão',style:'cancel'},
      {text:'Cancelar sessão',style:'destructive',onPress:()=>{
        if(promptVersion!==detailRequestGeneration.current||promptEpoch!==actionEpoch.current)return;
        void perform(()=>cancelSession(id,actorToken,actorUsername||undefined),'Sessão cancelada.');
      }}
    ]);
  };
  function confirmRemoveParticipant(participant:SessionParticipant){
    if(!auth.token||DEMO_MODE||!owner||!detail||loading||busy||removalInFlight.current||
       attendanceInFlight.current||operationInFlight.current||teamsInFlight.current)return;
    if(!['OPEN','FULL'].includes(detail.status)||
       !Number.isSafeInteger(participant.id)||participant.id<=0||
       participant.username.toLowerCase()===auth.username?.toLowerCase()||
       participant.username.toLowerCase()===detail.creatorUsername?.toLowerCase())return;
    const promptVersion=detailRequestGeneration.current,promptEpoch=actionEpoch.current;
    Alert.alert('Remover jogador da sessão?',
      'Remover '+participant.username+' desta sessão? A lista de espera pode ser atualizada e as equipas confirmadas podem ser anuladas.',
      [{text:'Manter jogador',style:'cancel'},
       {text:'Remover jogador',style:'destructive',onPress:()=>{
        if(removalInFlight.current||attendanceInFlight.current||operationInFlight.current||
           teamsInFlight.current||!auth.token||promptVersion!==detailRequestGeneration.current||
           promptEpoch!==actionEpoch.current)return;
        removalInFlight.current=true;
        const actionVersion=detailRequestGeneration.current,actionContext=actionEpoch.current;
        const actorToken=auth.token;
        setRemovingParticipantId(participant.id);setRosterError('');setRosterFeedback('');
        void removeSessionParticipant(id,participant.id,actorToken).then(async()=>{
          if(actionVersion!==detailRequestGeneration.current||actionContext!==actionEpoch.current)return;
          await load();
          if(actionContext===actionEpoch.current)
            setRosterFeedback('A remoção foi confirmada pelo servidor. A lista de participantes foi atualizada.');
        }).catch(e=>{
          if(actionContext!==actionEpoch.current)return;
          const message=e instanceof ApiError&&e.status===403?
            'O servidor não autorizou esta remoção.':
            e instanceof ApiError&&e.status===409?
            'A sessão já não permite remover participantes.':
            'Não foi possível confirmar a remoção. Atualiza a sessão e consulta a lista antes de tentares novamente.';
          setRosterError(message);
        }).finally(()=>{
          removalInFlight.current=false;
          if(actionContext===actionEpoch.current)setRemovingParticipantId(null);
        });
       }}]);
  }
  function confirmAttendance(participant:SessionParticipant,status:'ATTENDED'|'NO_SHOW'){
    if(!auth.token||DEMO_MODE||!owner||!detail||busy||loading||
       removalInFlight.current||attendanceInFlight.current||operationInFlight.current||teamsInFlight.current)return;
    if(detail.status==='CANCELLED'||!detail.gameDate||
       !Number.isFinite(Date.parse(detail.gameDate))||Date.parse(detail.gameDate)>Date.now()||
       !Number.isSafeInteger(participant.id)||participant.id<=0)return;
    const present=status==='ATTENDED';
    const promptVersion=detailRequestGeneration.current,promptEpoch=actionEpoch.current;
    Alert.alert(present?'Confirmar presença?':'Registar falta?',
      present?'Confirmas que '+participant.username+' compareceu à sessão?':
      'Confirmas que '+participant.username+' não compareceu? Esta marcação pode afetar o histórico de fiabilidade do jogador.',
      [{text:'Voltar',style:'cancel'},
       {text:present?'Confirmar presença':'Registar falta',style:present?'default':'destructive',onPress:()=>{
        if(attendanceInFlight.current||removalInFlight.current||operationInFlight.current||
           teamsInFlight.current||!auth.token||promptVersion!==detailRequestGeneration.current||
           promptEpoch!==actionEpoch.current)return;
        attendanceInFlight.current=true;
        const actionVersion=detailRequestGeneration.current,actionContext=actionEpoch.current;
        const actorToken=auth.token;
        setAttendanceParticipantId(participant.id);setRosterError('');setRosterFeedback('');
        void recordSessionAttendance(id,participant.id,actorToken,status)
          .then(async()=>{
            if(actionVersion!==detailRequestGeneration.current||actionContext!==actionEpoch.current)return;
            await load();
            if(actionContext===actionEpoch.current)
              setRosterFeedback(present?'Presença registada pelo servidor.':'Falta registada pelo servidor.');
          }).catch(e=>{
            if(actionContext!==actionEpoch.current)return;
            setRosterError(e instanceof ApiError&&e.status===403?
              'O servidor não autorizou a marcação de presença.':
              'Não foi possível confirmar a marcação. Atualiza a lista antes de tentar novamente; o servidor só permite registar presenças após o intervalo previsto.');
          }).finally(()=>{
            attendanceInFlight.current=false;
            if(actionContext===actionEpoch.current)setAttendanceParticipantId(null);
          });
       }}]);
  }
  const sendInvite=()=>{const invitee=inviteUsername.trim();if(!invitee||!auth.token)return;
    void perform(async()=>{await inviteToSession(id,invitee,auth.token!,auth.username||undefined);setInviteUsername('');},'Convite enviado. A outra pessoa tem de o aceitar.');};
  const share=()=>{
    if(DEMO_MODE){setFeedback('Não é possível partilhar uma sessão fictícia da demonstração.');return;}
    void Share.share({message:`Encontra esta sessão na Jynlo: https://d24sports.com/sessions/${id}`});
  };
  async function previewBalancedTeams(){
    if(!auth.token||!owner||!detail||teamsInFlight.current||operationInFlight.current||
       removalInFlight.current||attendanceInFlight.current)return;
    teamsInFlight.current=true;
    const request=++teamsOperation.current,epoch=actionEpoch.current;
    const version=detailRequestGeneration.current,actorToken=auth.token;
    const mode=!detail.teamBalanceSupported?'RANDOM':teamSource;
    setTeamsBusy(true);setTeamsError('');setTeamsMessage('');setTeamPreview(null);
    try{
      const suggestion=await suggestSessionTeams(id,actorToken,mode);
      if(request===teamsOperation.current&&epoch===actionEpoch.current&&
         version===detailRequestGeneration.current)setTeamPreview(suggestion);
    }catch(e){
      if(request===teamsOperation.current&&epoch===actionEpoch.current&&
         version===detailRequestGeneration.current)
        setTeamsError(e instanceof Error?e.message:'A sessão não permite gerar equipas neste momento.');
    }finally{
      // A focus change invalidates UI results, not the in-flight POST.
      // No newer team operation can start until this request has settled.
      teamsInFlight.current=false;
      setTeamsBusy(false);
    }
  }
  function persistBalancedTeams(){
    if(!auth.token||!owner||!detail||!teamPreview||teamsInFlight.current||
       operationInFlight.current||removalInFlight.current||attendanceInFlight.current)return;
    const actorToken=auth.token,selectedPreview=teamPreview;
    const mode=!detail.teamBalanceSupported?'RANDOM':teamSource;
    const version=detailRequestGeneration.current,epoch=actionEpoch.current;
    // The server remains authoritative and rejects stale roster assignments.
    Alert.alert('Confirmar equipas?',
      mode==='RANDOM'?'O servidor vai guardar exatamente as equipas sorteadas, se a lista de participantes não tiver mudado.':'O servidor voltará a calcular as equipas com os participantes atuais antes de guardar.',
      [{text:'Voltar',style:'cancel'},{text:'Confirmar equipas',onPress:()=>{
        if(teamsInFlight.current||operationInFlight.current||removalInFlight.current||
           attendanceInFlight.current||version!==detailRequestGeneration.current||
           epoch!==actionEpoch.current)return;
        teamsInFlight.current=true;
        const request=++teamsOperation.current;
        setTeamsBusy(true);setTeamsError('');setTeamsMessage('');
        void confirmSessionTeams(id,actorToken,mode,selectedPreview)
          .then(async result=>{
            if(request!==teamsOperation.current||epoch!==actionEpoch.current||
               version!==detailRequestGeneration.current)return;
            const refreshed=await load();
            if(request!==teamsOperation.current||epoch!==actionEpoch.current)return;
            if(refreshed&&isOrganizer(refreshed,auth.username)){
              setTeamPreview(result);
              setTeamsMessage('Equipas confirmadas pelo servidor.');
            }else{
              // The POST was acknowledged. A later refresh failure or changed
              // permission must not be presented as a failed confirmation.
              setTeamsMessage('O servidor confirmou as equipas, mas não foi possível validar a atualização da sessão. Atualiza o estado antes de fazer outra alteração.');
            }
          })
          .catch(()=>{
            if(request!==teamsOperation.current||epoch!==actionEpoch.current||
               version!==detailRequestGeneration.current)return;
            setTeamPreview(null);
            setTeamsError('Não foi possível confirmar o resultado. Atualiza a sessão antes de repetir.');
          })
          .finally(()=>{
            // The existing request owns the lock until it settles, even
            // if focus changed while the server was processing the POST.
            teamsInFlight.current=false;
            setTeamsBusy(false);
          });
      }}]);
  }
  const renderTeam=(title:string,players:SessionTeamPlayer[],score:number)=>
    <View style={styles.teamPanel}>
      <Text style={styles.teamHeading}>{title}{(teamSource==='RANDOM'||!detail?.teamBalanceSupported)?'':` · Pontuação estimada ${score.toFixed(2)}`}</Text>
      {players.map((p,index)=><Text key={p.username+':'+index} style={styles.hint}>
        {p.displayName||p.username}{p.statsAvailable?' · classificação disponível':''}
      </Text>)}
    </View>;
  const saveMeetingPoint=()=>{
    if(!auth.token||!owner||!detail||busy)return;
    if(meetingDraft.length>240||/[\\r\\n\\x00-\\x1f\\x7f]/.test(meetingDraft)){
      setError('As instruções devem ter uma única linha com até 240 caracteres.');return;
    }
    Alert.alert('Atualizar ponto de encontro?',
      'Esta alteração será visível aos participantes autorizados.',
      [{text:'Voltar',style:'cancel'},{text:'Guardar',onPress:()=>{
        void perform(()=>updateSessionMeetingPoint(id,auth.token!,meetingDraft),
          'Instruções do ponto de encontro atualizadas.');
        setEditMeetingPoint(false);
      }}]);
  };
  const saveExternalCount=()=>{
    if(!auth.token||!owner||!detail||busy)return;
    const raw=externalDraft.trim();
    if(!/^(0|[1-9]\\d?)$/.test(raw)||Number(raw)>99){
      setError('Indica um número inteiro de 0 a 99.');return;
    }
    Alert.alert('Atualizar confirmações externas?',
      'Confirma o número de jogadores já confirmados fora da aplicação.',
      [{text:'Voltar',style:'cancel'},{text:'Guardar',onPress:()=>{
        void perform(()=>updateSessionExternalConfirmations(id,auth.token!,Number(raw)),
          'Jogadores externos atualizados.');
        setEditExternalCount(false);
      }}]);
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
        {sessionPhoto?<Image source={{uri:sessionPhoto}} style={styles.sessionPhoto} accessibilityLabel="Fotografia da sessão"/>:null}
        <View style={styles.top}><Text style={styles.sportIcon}>{sportIcon(s.sport)}</Text>
          <Badge text={sessionParticipationLabel({...s,joined:detail?.joined===true,waitlisted:detail?.waitlisted===true})==='Aberta'?`${spots} vagas`:sessionParticipationLabel({...s,joined:detail?.joined===true,waitlisted:detail?.waitlisted===true})}/></View>
        <Text style={styles.title}>{s.sport||'Sessão desportiva'}</Text>
        <Text style={styles.city}>⌖ {s.city||'Local a confirmar'}</Text>
        {detail?.communityId&&Number.isSafeInteger(detail.communityId)&&detail.communityId>0?
          <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(detail.communityId)}})}>
            <Text style={styles.communityLink}>◎ Abrir comunidade associada ↗</Text>
          </Pressable>:null}
        {detail?.audience==='COMMUNITY_ONLY'?<Text style={styles.hint}>Sessão reservada a membros da comunidade.</Text>:null}
      </View>
      <View style={styles.infoGrid}>
        <View style={styles.info}><Text style={styles.label}>DATA E HORA</Text><Text style={styles.value}>{formatDate(s.gameDate)}</Text></View>
        <View style={styles.info}><Text style={styles.label}>VALOR</Text><Text style={styles.value}>{money(s.priceAmount)}</Text></View>
        <View style={styles.info}><Text style={styles.label}>PARTICIPANTES</Text><Text style={styles.value}>{s.participantCount??'—'}/{s.maxParticipants??'—'}</Text></View>
        <View style={styles.info}><Text style={styles.label}>ESTADO</Text><Text style={styles.value}>{s.status==='OPEN'?'Aberta':s.status==='FULL'?'Completa':s.status==='CANCELLED'?'Cancelada':s.status==='COMPLETED'?'Concluída':s.status||'—'}</Text></View>
      </View>
      {minimum?<View style={styles.panel}>
        <View style={styles.minimumHeading}>
          <Eyebrow>MÍNIMO DE JOGADORES</Eyebrow>
          <Text style={styles.minimumCount}>{minimum.count}/{minimum.required}</Text>
        </View>
        <View style={styles.minimumTrack}><View style={[styles.minimumFill,{width:`${minimum.percent}%` as `${number}%`}]}/></View>
        <Text style={styles.hint}>{minimum.missing===0?'Mínimo de jogadores atingido.':`Faltam ${minimum.missing} ${minimum.missing===1?'inscrição':'inscrições'} para atingir o mínimo.`}</Text>
        <Text style={styles.subtleHint}>O estado efetivo da sessão continua a ser determinado pelo servidor.</Text>
      </View>:null}
      <View style={styles.panel}>
        <Eyebrow>RECINTO E ENCONTRO</Eyebrow>
        {preview?.venueName?<Text style={styles.venueName}>{preview.venueName}</Text>:null}
        <Text style={styles.panelHeading}>{safeExactAddress(detail,auth.username)||'Morada exata reservada aos participantes autorizados'}</Text>
        {safeMeetingPoint(detail,auth.username)?<Text style={styles.hint}>{safeMeetingPoint(detail,auth.username)}</Text>:null}
        <Text style={styles.hint}>Os detalhes de localização são mostrados apenas quando a API autoriza.</Text>
      </View>
      {detail&&auth.token&&(owner||detail.joined)&&s.status!=='CANCELLED'&&
        typeof s.gameDate==='string'&&Number.isFinite(Date.parse(s.gameDate))&&Date.parse(s.gameDate)<=Date.now()?
        <SessionOfficialResultCard sessionId={id} token={auth.token}/>:null}
      {feedback?<Message>{feedback}</Message>:null}
      {auth.token&&detail&&(owner||detail.joined)&&
        s.status!=='CANCELLED'&&s.status!=='COMPLETED'&&
        typeof s.gameDate==='string'&&Number.isFinite(Date.parse(s.gameDate))&&Date.parse(s.gameDate)>Date.now()?
        <Button title="Abrir chat da sessão" onPress={()=>router.push({pathname:'/sessions/[id]/chat',params:{id:String(id)}})}/>:null}
      {detail?.joined&&!['CANCELLED','COMPLETED'].includes(s.status||'')&&Date.parse(s.gameDate||'')>Date.now()?<Message>✓ A tua inscrição está confirmada.</Message>:null}
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
        <Button title="Editar dados da sessão" secondary disabled={busy||loading}
          onPress={()=>router.push({pathname:'/sessions/[id]/edit',params:{id:String(id)}})}/>
        {detail.registrationOpeningMode==='MANUAL'?<Button secondary title="Abrir inscrições" disabled={busy} onPress={()=>{void perform(()=>openSessionRegistration(id,auth.token!),'Inscrições abertas.');}}/>:null}
        <Eyebrow>INSTRUÇÕES DE CHEGADA</Eyebrow>
        {!editMeetingPoint?<Button secondary title="Editar ponto de encontro" disabled={busy}
          onPress={()=>{setMeetingDraft(detail.meetingPointInstructions||'');setEditMeetingPoint(true);}}/>:
         <View style={styles.editor}>
          <Text style={styles.hint}>Nota de chegada para participantes autorizados (máximo 240 caracteres).</Text>
          <TextInput style={styles.input} value={meetingDraft} onChangeText={setMeetingDraft}
            maxLength={240} multiline={false} editable={!busy} accessibilityLabel="Instruções do ponto de encontro"
            placeholder="Porta, entrada ou referência para encontrar o grupo" placeholderTextColor={C.muted}/>
          <Button title="Guardar ponto de encontro" disabled={busy} onPress={saveMeetingPoint}/>
          <Button secondary title="Cancelar edição" disabled={busy} onPress={()=>setEditMeetingPoint(false)}/>
         </View>}
        <Eyebrow>JOGADORES JÁ CONFIRMADOS FORA DA APP</Eyebrow>
        <Text style={styles.hint}>Confirmados externos: {detail.externalConfirmedParticipants??0}</Text>
        {!editExternalCount?<Button secondary title="Atualizar jogadores externos" disabled={busy}
          onPress={()=>{setExternalDraft(String(detail.externalConfirmedParticipants??0));setEditExternalCount(true);}}/>:
         <View style={styles.editor}>
          <TextInput style={styles.input} value={externalDraft} onChangeText={setExternalDraft}
            maxLength={2} keyboardType="number-pad" editable={!busy}
            accessibilityLabel="Número de jogadores confirmados externamente"
            placeholder="0 a 99" placeholderTextColor={C.muted}/>
          <Button title="Guardar número de jogadores" disabled={busy} onPress={saveExternalCount}/>
          <Button secondary title="Cancelar edição" disabled={busy} onPress={()=>setEditExternalCount(false)}/>
         </View>}
        {detail.communityId?<View style={styles.editor}>
          <Eyebrow>FORMAR DUAS EQUIPAS</Eyebrow>
          <Text style={styles.hint}>Escolhe uma classificação para equilibrar equipas no servidor ou sorteia duas equipas sem classificação.</Text>
          {detail.teamBalanceSupported?<>
          <View style={styles.top}>
            <Button title="Classificação da comunidade" secondary={teamSource!=='FORM'} disabled={teamsBusy}
              onPress={()=>{setTeamSource('FORM');setTeamPreview(null);setTeamsMessage('');}}/>
          </View>
          <Button title="Classificação Excel" secondary={teamSource!=='EXCEL_POINTS'} disabled={teamsBusy}
            onPress={()=>{setTeamSource('EXCEL_POINTS');setTeamPreview(null);setTeamsMessage('');}}/>
          </>:null}
          <Button title="Equipas aleatórias" secondary={teamSource!=='RANDOM'} disabled={teamsBusy}
            onPress={()=>{setTeamSource('RANDOM');setTeamPreview(null);setTeamsMessage('');setTeamsError('');}}/>
          <Button title={teamsBusy?'A calcular…':(!detail.teamBalanceSupported||teamSource==='RANDOM')?'Sortear equipas':'Pré-visualizar equipas'} disabled={teamsBusy||busy}
            onPress={()=>{void previewBalancedTeams();}}/>
          {teamsError?<Message tone="error">{teamsError}</Message>:null}
          {teamsMessage?<Message>{teamsMessage}</Message>:null}
          {teamPreview?<View style={styles.editor}>
            <Text style={styles.hint}>{(teamSource==='RANDOM'||!detail.teamBalanceSupported)?'Sorteio sem classificação. Confirma para guardar estas equipas para todos os participantes.':`${teamPreview.playersWithStats} de ${teamPreview.totalPlayers} jogadores com estatísticas.`}</Text>
            {renderTeam('Equipa A',teamPreview.teamA,teamPreview.teamAScore)}
            {renderTeam('Equipa B',teamPreview.teamB,teamPreview.teamBScore)}
            {(teamSource==='RANDOM'||!detail.teamBalanceSupported)?<Button secondary title="Sortear novamente" disabled={teamsBusy||busy} onPress={()=>{void previewBalancedTeams();}}/>:null}
            <Button title="Confirmar distribuição de equipas" disabled={teamsBusy||busy} onPress={persistBalancedTeams}/>
          </View>:null}
        </View>:null}
        <Text style={styles.hint}>Convidar uma pessoa que já tem conta Jynlo:</Text>
        <TextInput style={styles.input} value={inviteUsername} onChangeText={setInviteUsername}
          autoCapitalize="none" autoCorrect={false} placeholder="Nome de utilizador" placeholderTextColor={C.muted}/>
        <Button title="Enviar convite" disabled={busy||!inviteUsername.trim()} onPress={sendInvite}/>
        <Button danger title="Cancelar esta sessão" disabled={busy} onPress={cancel}/>
      </View>:null}
      {detail?.communityId&&owner&&detail.status!=='CANCELLED'&&
        typeof detail.gameDate==='string'&&Number.isFinite(Date.parse(detail.gameDate))&&Date.parse(detail.gameDate)<Date.now()?
        <View style={styles.panel}>
          <Eyebrow>DEPOIS DO JOGO</Eyebrow>
          <Text style={styles.hint}>Regista o vencedor, empate e participantes para as classificações da comunidade. A administração da comunidade e o servidor validam a operação.</Text>
          <Button title="Registar resultado da sessão" secondary
            onPress={()=>router.push({pathname:'/sessions/[id]/result',params:{id:String(id),communityId:String(detail.communityId),sport:detail.sport}})}/>
        </View>:null}
      {detail&&canViewRoster(detail,auth.username)&&!rosterError&&hasConfirmedTeams?<View style={styles.panel}>
        <Eyebrow>EQUIPAS CONFIRMADAS</Eyebrow>
        <Text style={styles.hint}>Distribuição guardada no servidor. Todos os participantes autorizados podem consultar as equipas.</Text>
        {(['A','B'] as const).map(team=><View key={team} style={styles.confirmedTeamCard}>
          <Text style={styles.teamHeading}>Equipa {team} · {confirmedTeams[team].length} jogadores</Text>
          {confirmedTeams[team].length?confirmedTeams[team].map(player=><View key={player.id} style={styles.confirmedTeamPlayer}>
            <ParticipantAvatar participant={player}/><Text style={styles.confirmedTeamName}>{player.username}{player.username.toLowerCase()===auth.username?.toLowerCase()?' · Tu':''}</Text>
          </View>):<Text style={styles.hint}>Sem jogadores atribuídos.</Text>}
        </View>)}
        {confirmedTeams.unassigned.length>0?<Text style={styles.hint}>{confirmedTeams.unassigned.length} jogadores ainda sem equipa atribuída.</Text>:null}
      </View>:null}
      {detail&&canViewRoster(detail,auth.username)?<View style={{gap:11}}>
        <View style={styles.top}><Text style={styles.rosterTitle}>Quem vai</Text><Text style={styles.hint}>{participants.length} participantes visíveis</Text></View>
        {rosterError?<Text style={styles.rosterError}>{rosterError}</Text>:null}
        {rosterFeedback?<Message>{rosterFeedback}</Message>:null}
        {!rosterError&&participants.length===0?<Text style={styles.hint}>Ainda não existem participantes visíveis nesta lista.</Text>:null}
        {participants.map(p=>{
          const attendance=rosterAttendanceLabel(p.attendanceStatus,detail.status);
          return <View key={p.id} style={styles.member}>
            <ParticipantAvatar participant={p}/>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName} numberOfLines={1}>{p.username}</Text>
              {attendance?<Text style={styles.memberStatus}>{attendance}</Text>:null}
              {p.teamCode?<Text style={styles.memberStatus}>Equipa {p.teamCode}</Text>:null}
            </View>
            {p.username.toLowerCase()===auth.username?.toLowerCase()?<Text style={styles.memberYou}>Tu</Text>:null}
            {auth.token&&!DEMO_MODE&&owner&&detail.status!=='CANCELLED'&&
              detail.gameDate&&Number.isFinite(Date.parse(detail.gameDate))&&
              Date.parse(detail.gameDate)<=Date.now()?<View style={styles.attendanceActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={'Confirmar presença de '+p.username}
                  disabled={busy||loading||attendanceParticipantId!==null||removingParticipantId!==null}
                  style={styles.attendanceButton} onPress={()=>confirmAttendance(p,'ATTENDED')}>
                  <Text style={styles.attendancePresent}>Presente</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={'Registar falta de '+p.username}
                  disabled={busy||loading||attendanceParticipantId!==null||removingParticipantId!==null}
                  style={styles.attendanceButton} onPress={()=>confirmAttendance(p,'NO_SHOW')}>
                  <Text style={styles.attendanceAbsent}>Faltou</Text>
                </Pressable>
              </View>:null}
            {auth.token&&!DEMO_MODE&&owner&&['OPEN','FULL'].includes(detail.status)&&
              p.username.toLowerCase()!==detail.creatorUsername?.toLowerCase()&&
              p.username.toLowerCase()!==auth.username?.toLowerCase()?
              <Pressable accessibilityRole="button" accessibilityLabel={'Remover '+p.username+' da sessão'}
                disabled={busy||loading||removingParticipantId!==null} onPress={()=>confirmRemoveParticipant(p)}
                style={({pressed})=>[styles.removePlayerButton,{opacity:pressed||removingParticipantId!==null?0.6:1}]}>
                <Text style={styles.removePlayerLabel}>{removingParticipantId===p.id?'A remover…':'Remover'}</Text>
              </Pressable>:null}
          </View>;
        })}
      </View>:null}
      <Button title="Partilhar ligação pública" secondary onPress={share}/>
    </>:null}
    <Button title="Atualizar estado da sessão" secondary onPress={()=>{void load();}} disabled={loading||busy}/>
    <Pressable onPress={()=>router.back()}><Text style={styles.back}>← Voltar</Text></Pressable>
  </Page>;
}
const styles=StyleSheet.create({
  hero:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:24,padding:20,gap:10},
  sessionPhoto:{width:'100%',height:185,borderRadius:16,marginBottom:7},
  communityLink:{color:C.mint,fontSize:13,fontWeight:'800',paddingVertical:6},
  minimumHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  minimumCount:{color:C.white,fontSize:14,fontWeight:'900'},
  minimumTrack:{height:9,backgroundColor:C.surface2,borderRadius:8,overflow:'hidden'},
  minimumFill:{height:9,backgroundColor:C.mint,borderRadius:8},
  subtleHint:{color:C.muted,fontSize:10,lineHeight:16},
  venueName:{color:C.mint,fontSize:14,fontWeight:'800'},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  sportIcon:{fontSize:39},title:{fontSize:30,fontWeight:'900',color:C.white,letterSpacing:-0.7},
  city:{fontSize:14,color:C.muted},infoGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  info:{backgroundColor:C.surface,borderRadius:16,padding:14,width:'47%',minHeight:82,flexGrow:1},
  label:{fontSize:10,letterSpacing:1,color:C.muted,fontWeight:'800'},
  value:{fontSize:15,color:C.white,fontWeight:'800',marginTop:10},
  panel:{gap:12,padding:17,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
  editor:{gap:10},
  teamPanel:{padding:12,gap:7,borderColor:C.border,borderWidth:1,borderRadius:12},
  confirmedTeamCard:{gap:10,padding:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface2,borderRadius:14},
  confirmedTeamPlayer:{flexDirection:'row',alignItems:'center',gap:9,minHeight:40},confirmedTeamName:{color:C.white,fontSize:13,fontWeight:'700',flex:1},
  teamHeading:{fontSize:14,fontWeight:'800',color:C.white},
  panelHeading:{color:C.white,fontSize:16,fontWeight:'800',lineHeight:23},
  hint:{color:C.muted,fontSize:12,lineHeight:19},
  input:{backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,borderRadius:13,color:C.white,padding:14,minHeight:50},
  rosterTitle:{color:C.white,fontSize:21,fontWeight:'800'},
  rosterError:{color:'#FFB8B8',fontSize:12,lineHeight:19},
  member:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:C.surface,borderRadius:14,padding:11,borderWidth:1,borderColor:C.border},
  avatar:{height:36,width:36,borderRadius:18,backgroundColor:'#225048',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  avatarPhoto:{height:36,width:36,borderRadius:18},
  avatarLetter:{color:C.mint,fontWeight:'900',fontSize:14},
  memberInfo:{flex:1,gap:4},
  memberName:{color:C.white,fontSize:14,fontWeight:'700'},
  memberStatus:{color:C.muted,fontSize:11},
  memberYou:{color:C.mint,fontWeight:'800',fontSize:12},
  attendanceActions:{flexDirection:'row',gap:5,alignItems:'center'},
  attendanceButton:{borderColor:C.border,borderWidth:1,borderRadius:8,paddingHorizontal:7,paddingVertical:8},
  attendancePresent:{color:C.mint,fontSize:11,fontWeight:'700'},
  attendanceAbsent:{color:'#FFB8B8',fontSize:11,fontWeight:'700'},
  removePlayerButton:{paddingHorizontal:11,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:C.danger},
  removePlayerLabel:{color:'#FFB8B8',fontSize:12,fontWeight:'800'},
  back:{color:C.mint,textAlign:'center',padding:10,fontWeight:'700'}
});
