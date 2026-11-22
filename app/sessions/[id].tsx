import React,{useCallback,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Alert,AppState,Image,Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {request,ApiError,DEMO_MODE,cancelSession,inviteToSession,joinSession,leaveSession,removeSessionParticipant,recordSessionAttendance,openSessionRegistration,suggestSessionTeams,confirmSessionTeams,updateSessionMeetingPoint,updateSessionSkillLevel,reportSessionProblem,updateSessionExternalConfirmations,issueSessionGuestLink,sessionDetail,sessionParticipants,sessionPreview} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {confirmedSessionJoin} from '../../src/lib/session-join-receipt.cjs';
import {cancellationNotice} from '../../src/lib/session-cancellation-notice.cjs';
import {formatDate,money} from '../../src/lib/format.cjs';
import {sportIcon} from '../../src/lib/tournament-discovery-core.cjs';
import {resolveJynloMedia} from '../../src/lib/social-feed-api';
import {minimumPlayersProgress,rosterAttendanceLabel} from '../../src/lib/session-presentation.cjs';
import {SessionOfficialResultCard} from '../../src/components/SessionOfficialResultCard';
import {PostGameCommunities} from '../../src/components/PostGameCommunities';
import {FutureExclusionSheet} from '../../src/components/FutureExclusionSheet';
import {canManage as canManageFutureExclusion} from '../../src/lib/future-exclusion.cjs';
import GuestSessionRSVP from '../../src/components/GuestSessionRSVP';
import {JynloIcon} from '../../src/components/JynloIcon';
import SessionChatPanel from '../../src/components/SessionChatPanel';
import SessionMemoriesPanel from '../../src/components/SessionMemoriesPanel';
import SessionLocationPanel from '../../src/components/SessionLocationPanel';
import SessionPaymentsPanel from '../../src/components/SessionPaymentsPanel';
import PreviousUnpaidWarning from '../../src/components/PreviousUnpaidWarning';
import {confirmedSessionTeams,sessionParticipationLabel} from '../../src/lib/session-teams-presentation.cjs';
import {canLeave,canViewRoster,isOrganizer,registrationAction,safeExactAddress,safeMeetingPoint} from '../../src/lib/session-state.cjs';
import type {SessionDetail,SessionParticipant,PublicSessionPreview,SessionTeamSuggestion,SessionTeamPlayer} from '../../src/lib/types';
import {sessionChoices,levelLabel} from '../../src/lib/session-level-core.cjs';
import {AddToCalendarButton} from '../../src/components/AddToCalendarButton';
import {sportName} from '../../src/lib/sport-names.cjs';

function ParticipantAvatar({participant}:{participant:SessionParticipant}){
  const photo=resolveJynloMedia(participant.profilePicUrl);
  return <View style={styles.avatar}>
    {photo?<Image source={{uri:photo}} style={styles.avatarPhoto} accessibilityLabel={t('Fotografia de {user}',{user:participant.username})}/>:
      <Text style={styles.avatarLetter}>{participant.username.slice(0,1).toUpperCase()||'J'}</Text>}
  </View>;
}

const PROBLEM_LABELS:Record<'NOT_OCCURRED'|'VENUE_PROBLEM'|'OTHER',string>={NOT_OCCURRED:'O jogo não aconteceu',VENUE_PROBLEM:'Problema com o recinto',OTHER:'Outro problema'};
export default function SessionScreen(){
  const {id:rawId,guest:rawGuest}=useLocalSearchParams<{id:string;guest?:string}>();
  const id=Number(rawId), router=useRouter(), auth=useAuth();
  const guestToken=typeof rawGuest==='string'&&/^[A-Za-z0-9_-]{43}$/.test(rawGuest)?rawGuest:null;
  const [preview,setPreview]=useState<PublicSessionPreview|null>(null);
  const detailRequestGeneration=useRef(0);
  const operationInFlight=useRef(false);
  const actionEpoch=useRef(0);
  // A returning view may have a newer focus epoch while the same write is pending.
  const focusedSessionIdentity=useRef('');
  const lastSessionIdentity=useRef('');
  const backgroundSyncInFlight=useRef(false);
  const foregroundLoadVersion=useRef<number|null>(null);
  const [detail,setDetail]=useState<SessionDetail|null>(null);
  const [participants,setParticipants]=useState<SessionParticipant[]>([]);
  const [rosterError,setRosterError]=useState('');
  const removalInFlight=useRef(false);
  const [removingParticipantId,setRemovingParticipantId]=useState<number|null>(null);
  const [rosterFeedback,setRosterFeedback]=useState('');
  const attendanceInFlight=useRef(false);
  const [exclusionFor,setExclusionFor]=useState<SessionParticipant|null>(null);
  const [attendanceParticipantId,setAttendanceParticipantId]=useState<number|null>(null);
  const [password,setPassword]=useState(''),[inviteUsername,setInviteUsername]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[feedback,setFeedback]=useState('');
  const [editMeetingPoint,setEditMeetingPoint]=useState(false),[meetingDraft,setMeetingDraft]=useState('');
  const [editExternalCount,setEditExternalCount]=useState(false),[externalDraft,setExternalDraft]=useState('');
  const [adminToolsOpen,setAdminToolsOpen]=useState(false);
  const [problemType,setProblemType]=useState<'NOT_OCCURRED'|'VENUE_PROBLEM'|'OTHER'|null>(null);
  const [problemNote,setProblemNote]=useState('');
  const [showSessionChat,setShowSessionChat]=useState(false);
  const [showParticipantRoster,setShowParticipantRoster]=useState(true);
  const [teamSource,setTeamSource]=useState<'AUTO'|'RANDOM'>('AUTO');
  const [teamPreview,setTeamPreview]=useState<SessionTeamSuggestion|null>(null);
  const [teamsBusy,setTeamsBusy]=useState(false),[teamsError,setTeamsError]=useState('');
  const teamsInFlight=useRef(false),teamsOperation=useRef(0);
  const [teamsMessage,setTeamsMessage]=useState('');
  const owner=isOrganizer(detail,auth.username);
  // A verified cancelled session always offers a reusable public-only notice.
  // Private meeting details, access codes and exact coordinates are excluded.
  const cancelledShareText=owner&&detail?.status==='CANCELLED'&&detail.id===id?
    cancellationNotice(detail):null;

  const load=useCallback(async():Promise<SessionDetail|null>=>{
    const version=++detailRequestGeneration.current;
    foregroundLoadVersion.current=version;
    if(!Number.isSafeInteger(id)||id<=0){
      foregroundLoadVersion.current=null;
      setError(t('Identificador de sessão inválido.'));setLoading(false);return null;
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
            setRosterError(t('Não foi possível carregar a lista de jogadores. Atualiza o estado da sessão para tentar novamente.'));
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
        setError(e instanceof Error?e.message:t('Não foi possível carregar a sessão.'));
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
        setError(t('O acesso a esta sessão mudou. Atualiza para confirmar as permissões.'));
      }
      // Network failures preserve the last visible data and draft; the user
      // can still request a full refresh manually.
    }finally{backgroundSyncInFlight.current=false;}
  },[id,auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{
    const focusIdentity=id+'|'+auth.username+'|'+auth.token;
    const switchedSessionOrAccount=lastSessionIdentity.current!==focusIdentity;
    lastSessionIdentity.current=focusIdentity;
    focusedSessionIdentity.current=focusIdentity;
    if(switchedSessionOrAccount){
      // Do not leak drafts or organizer edits across sessions and accounts.
      setPassword('');setInviteUsername('');
      setEditMeetingPoint(false);setEditExternalCount(false);
      setMeetingDraft('');setExternalDraft('');
      setFeedback('');setRosterFeedback('');setTeamsMessage('');
      setShowSessionChat(false);setShowParticipantRoster(true);
    }
    // A write may still be pending when returning to this screen.
    setBusy(operationInFlight.current||removalInFlight.current||attendanceInFlight.current);
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
      if(focusedSessionIdentity.current===focusIdentity)focusedSessionIdentity.current='';
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
    const identity=id+'|'+auth.username+'|'+auth.token;
    setBusy(true);setError('');setFeedback('');
    try {
      const result=await operation();
      // A response from the previous route/account must not update this screen.
      if(version!==detailRequestGeneration.current)return;
      setFeedback(typeof success==='function'?success(result):success);
      await load();
    }catch(e){
      if(version===detailRequestGeneration.current)
        setError((e instanceof Error?e.message:t('Não foi possível concluir a ação.'))+' '+t('Confirma o estado da sessão antes de repetir.'));
    }finally{
      operationInFlight.current=false;
      // Refocusing this exact session keeps the pending lock visible.
      // Release it on settlement, even when the focus epoch has changed.
      if(focusedSessionIdentity.current===identity){
        setBusy(false);
        if(epoch!==actionEpoch.current)void load();
      }
    }
  };
  const s=detail||preview,spots=Math.max(0,(s?.maxParticipants??0)-(s?.participantCount??0));
  const minimum=minimumPlayersProgress(detail);
  const confirmedTeams=confirmedSessionTeams(participants);
  const hasConfirmedTeams=confirmedTeams.A.length+confirmedTeams.B.length>0;
  const sessionPhoto=resolveJynloMedia(s?.gamePhoto);
  const action=registrationAction(detail,auth.username);
  const join=()=>{void perform(async()=>{
    if(!auth.token)throw new Error(t('Inicia sessão primeiro.'));
    const actorToken=auth.token,actorUsername=auth.username,submittedPassword=password;
    const operationVersion=detailRequestGeneration.current,operationEpoch=actionEpoch.current;
    const result=await joinSession(id,actorToken,actorUsername||undefined,submittedPassword);
    const confirmed=confirmedSessionJoin(result);
    if(!confirmed)throw Error(t('O servidor respondeu, mas não confirmou a entrada no jogo. Verifica a lista de jogadores antes de repetir.'));
    if(operationVersion===detailRequestGeneration.current&&operationEpoch===actionEpoch.current)
      setPassword(current=>current===submittedPassword?'':current);
    return confirmed;
  },(result)=>(result as {message:string}).message);};
  const joinWithGuestInvitation=()=>{void perform(async()=>{
    if(!auth.token||!guestToken)throw Error(t('Inicia sessão para confirmar o convite.'));
    // The invitation establishes access; the JWT identifies the user.
    // Never create an anonymous guest seat for an authenticated account.
    const presence=await request<{status:string;canCancel:boolean}>(`/api/sessions/${id}/guest-member-presence`,{
      token:auth.token,method:'POST',body:{token:guestToken}
    });
    if(presence.status==='PARTICIPANT'||presence.status==='ORGANIZER')
      return {message:t('Já tens presença confirmada nesta sessão.')};
    if(presence.status==='WAITLISTED')
      return {message:t('Já estás na lista de espera desta sessão.')};
    if(presence.status!=='NONE')throw Error(t('Não foi possível verificar o teu estado de participação.'));
    const result=await request<Awaited<ReturnType<typeof joinSession>>>(`/api/sessions/${id}/guest-join-account`,{
      token:auth.token,method:'POST',body:{token:guestToken}
    });
    if(!confirmedSessionJoin(result))
      throw Error(t('O servidor não confirmou a participação. Verifica a lista de jogadores antes de repetir.'));
    return result;
  },result=>(result as {message?:string}).message||t('Convite confirmado.'));};
  const leave=()=>{
    if(!auth.token||!detail||!canLeave(detail))return;
    const promptVersion=detailRequestGeneration.current,promptEpoch=actionEpoch.current;
    const actorToken=auth.token,actorUsername=auth.username;
    Alert.alert(t('Cancelar presença'),t('Queres mesmo deixar esta sessão ou a lista de espera?'),[
      {text:t('Voltar'),style:'cancel'},
      {text:t('Confirmar'),style:'destructive',onPress:()=>{
        if(promptVersion!==detailRequestGeneration.current||promptEpoch!==actionEpoch.current)return;
        void perform(()=>leaveSession(id,actorToken,actorUsername||undefined),t('A tua presença foi cancelada.'));
      }}
    ]);
  };
  const cancel=()=>{
    if(!auth.token||!detail||!owner)return;
    const promptVersion=detailRequestGeneration.current,promptEpoch=actionEpoch.current;
    const actorToken=auth.token,actorUsername=auth.username;
    Alert.alert(t('Cancelar sessão'),t('Esta ação cancela a sessão para todos os jogadores. Confirmas?'),[
      {text:t('Manter sessão'),style:'cancel'},
      {text:t('Cancelar sessão'),style:'destructive',onPress:()=>{
        if(promptVersion!==detailRequestGeneration.current||promptEpoch!==actionEpoch.current)return;
        void perform(()=>cancelSession(id,actorToken,actorUsername||undefined),
          t('Sessão cancelada. Os inscritos serão avisados na Jynlo; partilha também com convidados externos.'));
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
    Alert.alert(t('Remover jogador da sessão?'),
      t('Remover {user} desta sessão? A lista de espera pode ser atualizada e as equipas confirmadas podem ser anuladas.',{user:participant.username}),
      [{text:t('Manter jogador'),style:'cancel'},
       {text:t('Remover jogador'),style:'destructive',onPress:()=>{
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
            setRosterFeedback(t('A remoção foi confirmada pelo servidor. A lista de participantes foi atualizada.'));
        }).catch(e=>{
          if(actionContext!==actionEpoch.current)return;
          const message=e instanceof ApiError&&e.status===403?
            t('O servidor não autorizou esta remoção.'):
            e instanceof ApiError&&e.status===409?
            t('A sessão já não permite remover participantes.'):
            t('Não foi possível confirmar a remoção. Atualiza a sessão e consulta a lista antes de tentares novamente.');
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
    Alert.alert(present?t('Confirmar presença?'):t('Registar falta?'),
      present?t('Confirmas que {user} compareceu à sessão?',{user:participant.username}):
      t('Confirmas que {user} não compareceu? Esta marcação pode afetar o histórico de fiabilidade do jogador.',{user:participant.username}),
      [{text:t('Voltar'),style:'cancel'},
       {text:present?t('Confirmar presença'):t('Registar falta'),style:present?'default':'destructive',onPress:()=>{
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
              setRosterFeedback(present?t('Presença registada pelo servidor.'):t('Falta registada pelo servidor.'));
          }).catch(e=>{
            if(actionContext!==actionEpoch.current)return;
            setRosterError(e instanceof ApiError&&e.status===403?
              t('O servidor não autorizou a marcação de presença.'):
              t('Não foi possível confirmar a marcação. Atualiza a lista antes de tentar novamente; o servidor só permite registar presenças após o intervalo previsto.'));
          }).finally(()=>{
            attendanceInFlight.current=false;
            if(actionContext===actionEpoch.current)setAttendanceParticipantId(null);
          });
       }}]);
  }
  const sendInvite=()=>{const invitee=inviteUsername.trim();if(!invitee||!auth.token)return;
    const actorToken=auth.token,actorUsername=auth.username;
    const operationVersion=detailRequestGeneration.current,operationEpoch=actionEpoch.current;
    void perform(async()=>{
      await inviteToSession(id,invitee,actorToken,actorUsername||undefined);
      if(operationVersion===detailRequestGeneration.current&&operationEpoch===actionEpoch.current)
        setInviteUsername(current=>current.trim()===invitee?'':current);
    },t('Convite enviado. A outra pessoa tem de o aceitar.'));};
  const share=()=>{
    if(DEMO_MODE){setFeedback(t('Não é possível partilhar uma sessão fictícia da demonstração.'));return;}
    const send=(url:string)=>Share.share({
      message:`🏟️ ${t('{sport} na Jynlo',{sport:sportName(s?.sport)||t('Sessão desportiva')})}\n${s?.gameDate?formatDate(s.gameDate)+'\n':''}${t('Consulta a sessão e confirma a presença: {url}',{url})}`,
      url
    }).catch(()=>setFeedback(t('Não foi possível abrir a partilha. Tenta novamente.')));
    const publicUrl=`https://d24sports.com/sessions/${id}`;
    if(!owner||!auth.token||!detail){void send(publicUrl);return;}
    Alert.alert(t('Partilhar sessão'),
      t('A ligação normal não altera convites existentes. Um convite sem conta permite confirmar presença como convidado, mas criar um novo invalida os convites anteriores.'),
      [
        {text:t('Cancelar'),style:'cancel'},
        {text:t('Ligação normal'),onPress:()=>{if(!operationInFlight.current)void send(publicUrl);}},
        {text:t('Convite sem conta'),onPress:()=>{
          if(operationInFlight.current)return;
          // The organizer explicitly chose to replace the previous guest link.
          operationInFlight.current=true;setBusy(true);setError('');
          void issueSessionGuestLink(id,auth.token!).then(url=>send(url)).catch(e=>{
            setError(e instanceof Error?e.message:t('Não foi possível criar um convite válido.'));
          }).finally(()=>{operationInFlight.current=false;setBusy(false);});
        }}
      ]);
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
        setTeamsError(e instanceof Error?e.message:t('A sessão não permite gerar equipas neste momento.'));
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
    Alert.alert(t('Confirmar equipas?'),
      mode==='RANDOM'?t('O servidor vai guardar exatamente as equipas sorteadas, se a lista de participantes não tiver mudado.'):t('O servidor voltará a calcular as equipas com os participantes atuais antes de guardar.'),
      [{text:t('Voltar'),style:'cancel'},{text:t('Confirmar equipas'),onPress:()=>{
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
              setTeamsMessage(t('Equipas confirmadas pelo servidor.'));
            }else{
              // The POST was acknowledged. A later refresh failure or changed
              // permission must not be presented as a failed confirmation.
              setTeamsMessage(t('O servidor confirmou as equipas, mas não foi possível validar a atualização da sessão. Atualiza o estado antes de fazer outra alteração.'));
            }
          })
          .catch(()=>{
            if(request!==teamsOperation.current||epoch!==actionEpoch.current||
               version!==detailRequestGeneration.current)return;
            setTeamPreview(null);
            setTeamsError(t('Não foi possível confirmar o resultado. Atualiza a sessão antes de repetir.'));
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
      <Text style={styles.teamHeading}>{title}{(teamSource==='RANDOM'||!detail?.teamBalanceSupported)?'':' · '+t('Pontuação estimada {score}',{score:score.toFixed(2)})}</Text>
      {players.map((p,index)=><Text key={p.username+':'+index} style={styles.hint}>
        {p.displayName||p.username}{p.statsAvailable?' · '+t('classificação disponível'):''}
      </Text>)}
    </View>;
  const saveMeetingPoint=()=>{
    if(!auth.token||!owner||!detail||busy)return;
    if(meetingDraft.length>240||/[\\r\\n\\x00-\\x1f\\x7f]/.test(meetingDraft)){
      setError(t('As instruções devem ter uma única linha com até 240 caracteres.'));return;
    }
    Alert.alert(t('Atualizar ponto de encontro?'),
      t('Esta alteração será visível aos participantes autorizados.'),
      [{text:t('Voltar'),style:'cancel'},{text:t('Guardar'),onPress:()=>{
        void perform(()=>updateSessionMeetingPoint(id,auth.token!,meetingDraft),
          t('Instruções do ponto de encontro atualizadas.'));
        setEditMeetingPoint(false);
      }}]);
  };
  const saveExternalCount=()=>{
    if(!auth.token||!owner||!detail||busy)return;
    const raw=externalDraft.trim();
    if(!/^(0|[1-9]\\d?)$/.test(raw)||Number(raw)>99){
      setError(t('Indica um número inteiro de 0 a 99.'));return;
    }
    Alert.alert(t('Atualizar confirmações externas?'),
      t('Confirma o número de jogadores já confirmados fora da aplicação.'),
      [{text:t('Voltar'),style:'cancel'},{text:t('Guardar'),onPress:()=>{
        void perform(()=>updateSessionExternalConfirmations(id,auth.token!,Number(raw)),
          t('Jogadores externos atualizados.'));
        setEditExternalCount(false);
      }}]);
  };
  const openAt=detail?.registrationOpensAt&&Number.isFinite(Date.parse(detail.registrationOpensAt))?
    formatDate(detail.registrationOpensAt):null;

  return <Page>
    <DemoBanner/>
    <Eyebrow>{t('JYNLO · DETALHES DO JOGO')}</Eyebrow>
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
     {guestToken?<View style={styles.guestInvitePanel}>
       <Text style={styles.panelHeading}>{t('Convite de participação recebido')}</Text>
       <Text style={styles.hint}>{t('O convite mantém-se associado a esta sessão. Se não tens conta Jynlo, podes confirmar diretamente abaixo, ou continuar no browser pela ligação original.')}</Text>
       <Button secondary title={t('Continuar no browser')} onPress={()=>{
         const url=`https://d24sports.com/sessions/${id}?guest=${encodeURIComponent(guestToken)}`;
         void import('expo-web-browser').then(browser=>browser.openBrowserAsync(url)).catch(()=>Alert.alert(t('Convite'),t('Não foi possível abrir a ligação no browser.')));
       }}/>
       <Button secondary title={t('Partilhar ligação de confirmação')} onPress={()=>{
         const url=`https://d24sports.com/sessions/${id}?guest=${encodeURIComponent(guestToken)}`;
         void Share.share({message:url,url}).catch(()=>Alert.alert(t('Convite'),t('Não foi possível partilhar a ligação.')));
       }}/>
     </View>:null}
    {guestToken&&auth.token&&!loading&&Number.isSafeInteger(id)&&id>0?<Button title={t('Confirmar com a minha conta Jynlo')} disabled={busy||Boolean(detail?.joined||detail?.waitlisted||owner)} onPress={joinWithGuestInvitation}/>:null}
    {guestToken&&!auth.token&&!loading&&Number.isSafeInteger(id)&&id>0?<GuestSessionRSVP sessionId={id} guestToken={guestToken} onConfirmed={()=>void load()}/>:null}
    {s&&!loading?<>
      <View style={styles.hero}>
        {sessionPhoto?<Image source={{uri:sessionPhoto}} style={styles.sessionPhoto} accessibilityLabel={t('Fotografia da sessão')}/>:null}
        <View style={styles.top}><Text maxFontSizeMultiplier={1.3} style={styles.sportIcon}>{sportIcon(s.sport)}</Text>
          <Badge text={sessionParticipationLabel({...s,status:s.status||'UNKNOWN',joined:detail?.joined===true,waitlisted:detail?.waitlisted===true})==='Aberta'?t('{n} vagas',{n:spots}):t(sessionParticipationLabel({...s,status:s.status||'UNKNOWN',joined:detail?.joined===true,waitlisted:detail?.waitlisted===true}))}/></View>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>{sportName(s.sport)||t('Sessão desportiva')}</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:5}}><JynloIcon name="location" color={C.muted} size={16}/><Text style={styles.city}>{s.city||t('Local a confirmar')}</Text></View>
        {detail?<Text style={styles.levelLine}>🎯 {levelLabel(detail.skillLevel)}</Text>:null}
        {detail?.communityId&&Number.isSafeInteger(detail.communityId)&&detail.communityId>0?
          <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(detail.communityId)}})}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}><JynloIcon name="community" size={17} color={C.mint}/><Text style={styles.communityLink}>{t('Abrir comunidade associada')}</Text><JynloIcon name="chevron-right" size={16} color={C.mint}/></View>
          </Pressable>:null}
        {detail?.audience==='COMMUNITY_ONLY'?<Text style={styles.hint}>{t('Sessão reservada a membros da comunidade.')}</Text>:null}
      </View>
      <View style={styles.infoGrid}>
        <View style={styles.info}><Text style={styles.label}>{t('DATA E HORA')}</Text><Text style={styles.value}>{formatDate(s.gameDate)}</Text></View>
        <View style={styles.info}><Text style={styles.label}>{t('VALOR')}</Text><Text style={styles.value}>{money(s.priceAmount)}</Text></View>
        <View style={styles.info}><Text style={styles.label}>{t('PARTICIPANTES')}</Text><Text style={styles.value}>{s.participantCount??'—'}/{s.maxParticipants??'—'}</Text></View>
        <View style={styles.info}><Text style={styles.label}>{t('ESTADO')}</Text><Text style={styles.value}>{sessionParticipationLabel({status:s.status||'UNKNOWN',gameDate:s.gameDate,joined:false,waitlisted:false})}</Text></View>
      </View>
      {minimum?<View style={styles.panel}>
        <View style={styles.minimumHeading}>
          <Eyebrow>{t('MÍNIMO DE JOGADORES')}</Eyebrow>
          <Text style={styles.minimumCount}>{minimum.count}/{minimum.required}</Text>
        </View>
        <View style={styles.minimumTrack}><View style={[styles.minimumFill,{width:`${minimum.percent}%` as `${number}%`}]}/></View>
        <Text style={styles.hint}>{minimum.missing===0?t('Mínimo de jogadores atingido.'):(minimum.missing===1?t('Falta 1 inscrição para atingir o mínimo.'):t('Faltam {n} inscrições para atingir o mínimo.',{n:minimum.missing}))}</Text>
        <Text style={styles.subtleHint}>{t('O estado efetivo da sessão continua a ser determinado pelo servidor.')}</Text>
      </View>:null}
      {auth.token&&detail&&(owner||detail.joined)&&
        s.status!=='CANCELLED'&&s.status!=='COMPLETED'&&
        typeof s.gameDate==='string'&&Number.isFinite(Date.parse(s.gameDate))&&Date.parse(s.gameDate)>Date.now()?
        <View style={styles.panel}>
         <Pressable accessibilityRole="button" accessibilityLabel={showSessionChat?t('Fechar chat da sessão'):t('Abrir chat da sessão')}
           accessibilityState={{expanded:showSessionChat}} onPress={()=>setShowSessionChat(open=>!open)}
           style={styles.chatDisclosure}>
          <View style={{flex:1,gap:4}}>
           <Text style={styles.panelHeading}>{t('Chat da sessão')}</Text>
           <Text style={styles.hint}>{t('Mensagens dos participantes confirmados · atualização em tempo real')}</Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.chatDisclosureSymbol}>{showSessionChat?'−':'+'}</Text>
         </Pressable>
         {showSessionChat?<SessionChatPanel embedded/>:null}
        </View>:null}
      {detail?<SessionLocationPanel session={detail} token={auth.token}
         canEdit={owner} onSaved={updated=>{setDetail(updated);setFeedback(t('Localização Google Maps atualizada.'));}}/>:null}
      {detail&&auth.token&&(owner||detail.joined)&&s.status!=='CANCELLED'&&
        typeof s.gameDate==='string'&&Number.isFinite(Date.parse(s.gameDate))&&Date.parse(s.gameDate)<=Date.now()?
        <SessionOfficialResultCard sessionId={id} token={auth.token} game={detail}/>:null}
      {detail&&detail.status==='COMPLETED'&&detail.joined&&auth.token&&auth.username?
        <PostGameCommunities sessionId={id} token={auth.token} username={auth.username}/>:null}
      {detail&&auth.token&&detail.canSharePublicly===true?
        <SessionMemoriesPanel sessionId={id} token={auth.token}
          canSharePublicly={true} completed={detail.status==='COMPLETED'}
          canPublish={owner||detail.joined}/>:null}
      {feedback?<Message>{feedback}</Message>:null}
      {detail?.status==='CANCELLED'?<View style={styles.panel}>
        <Text style={styles.cancelledHeading}>{t('×  Sessão cancelada')}</Text>
        <Text style={styles.hint}>{t('A sessão foi cancelada e já não aceita novas inscrições.')}</Text>
        {owner?<Text style={styles.hint}>{t('A Jynlo envia automaticamente o aviso aos participantes inscritos e em lista de espera, conforme as suas preferências. Convidados externos devem ser informados pelo canal utilizado.')}</Text>:null}
        {cancelledShareText?<View style={{gap:10}}>
          <Text selectable style={styles.hint}>{cancelledShareText}</Text>
          <Button secondary title={t('Partilhar aviso de cancelamento')}
            onPress={()=>{void Share.share({message:cancelledShareText}).catch(()=>
              setFeedback(t('Não foi possível partilhar o aviso. Podes copiar o texto apresentado.')));}}/>
        </View>:null}
      </View>:null}

      {detail?.joined&&!['CANCELLED','COMPLETED'].includes(s.status||'')&&Date.parse(s.gameDate||'')>Date.now()?<Message>{t('✓ A tua inscrição está confirmada.')}</Message>:null}
      {auth.token&&detail&&(owner||detail.joined)&&Number(s.priceAmount)>0&&Number.isSafeInteger(id)&&id>0
       ?<SessionPaymentsPanel sessionId={id} token={auth.token}/>:null}
      {detail?.waitlisted?<Message>{detail.waitlistPosition?t('Estás na lista de espera · posição {n}.',{n:detail.waitlistPosition}):t('Estás na lista de espera.')}</Message>:null}
      {!auth.token&&['OPEN','FULL'].includes(s.status||'')?<Button title={t('Entrar para participar')} onPress={()=>router.push({pathname:'/login',params:{redirect:`/sessions/${id}`}})}/>:null}
      {!auth.token&&['CANCELLED','COMPLETED'].includes(s.status||'')?<Message>{t('Esta sessão terminou ou foi cancelada. Podes continuar a explorar outras sessões públicas.')}</Message>:null}
      {auth.token&&detail&&['JOIN','WAITLIST','PASSWORD'].includes(action.kind)?<View style={styles.panel}>
        {detail.privateGame?<>
          <Text style={styles.hint}>{t('Esta sessão exige palavra-passe. Não confundas sessão privada com sessão apenas para membros.')}</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
            style={styles.input} placeholder={t('Palavra-passe da sessão')} placeholderTextColor={C.muted}/>
        </>:null}
        <Button title={busy?t('A processar…'):action.label} disabled={busy||loading||(detail.privateGame&&!password.trim())} onPress={join}/>
        {action.kind==='WAITLIST'?<Text style={styles.hint}>{t('Não há vagas neste momento. O servidor confirma se é possível entrar em espera.')}</Text>:null}
        {detail.registrationOpeningMode==='MANUAL'?<Text style={styles.hint}>{t('A abertura manual das inscrições é controlada pelo organizador.')}</Text>:null}
      </View>:null}
      {auth.token&&detail&&action.kind==='SCHEDULED'?<Message>{openAt?t('Inscrições programadas para {when}.',{when:openAt}):t('Inscrições programadas.')}</Message>:null}
      {auth.token&&detail&&action.kind==='CLOSED'&&!owner?<Message>{t('Não é possível participar neste momento.')}</Message>:null}
      {auth.token&&detail&&canLeave(detail)?<Button danger title={t('Cancelar a minha presença')} disabled={busy} onPress={leave}/>:null}
      {auth.token&&owner&&detail?.problemType?<Message>{t('Problema já reportado:')} {t(PROBLEM_LABELS[detail.problemType])}{detail.problemDetails?' · '+detail.problemDetails:''}</Message>:null}
      {auth.token&&owner&&detail&&!detail.problemType&&(detail.status==='OPEN'||detail.status==='FULL')
        &&Number.isFinite(Date.parse(detail.gameDate))&&Date.parse(detail.gameDate)<=Date.now()?<View style={styles.panel}>
        <Eyebrow>{t('CORREU ALGUMA COISA MAL?')}</Eyebrow>
        <Text style={styles.hint}>{t('Só o organizador vê isto. Se o jogo não aconteceu, a sessão é cancelada e não conta para presenças nem classificações.')}</Text>
        <View style={styles.levelRow}>
         {(['NOT_OCCURRED','VENUE_PROBLEM','OTHER'] as const).map(type=><Pressable key={type} accessibilityRole="radio"
           accessibilityState={{checked:problemType===type,disabled:busy}} disabled={busy} onPress={()=>setProblemType(type)}
           style={[styles.levelChip,problemType===type&&styles.levelChipSelected]}>
           <Text style={[styles.levelChipText,problemType===type&&styles.levelChipTextSelected]}>{t(PROBLEM_LABELS[type])}</Text>
          </Pressable>)}
        </View>
        {problemType?<TextInput style={styles.input} value={problemNote} onChangeText={setProblemNote} maxLength={500} editable={!busy}
          placeholder={problemType==='OTHER'?t('Explica o que aconteceu (obrigatório)'):t('Detalhes (opcional)')} placeholderTextColor={C.muted}
          accessibilityLabel={t('Detalhes do problema')}/>:null}
        {problemType?<Button danger={problemType==='NOT_OCCURRED'} title={busy?t('A enviar…'):problemType==='NOT_OCCURRED'?t('Confirmar que o jogo não aconteceu'):t('Reportar problema')}
          disabled={busy} onPress={()=>{
           const type=problemType,note=problemNote,token=auth.token!;
           const send=()=>{void perform(async()=>{await reportSessionProblem(id,token,type,note);setProblemType(null);setProblemNote('');},
             type==='NOT_OCCURRED'?t('Registado: o jogo não aconteceu. A sessão foi cancelada.'):t('Problema reportado.'));};
           if(type!=='NOT_OCCURRED'){send();return;}
           Alert.alert(t('O jogo não aconteceu?'),t('A sessão é cancelada e não conta para presenças nem classificações. Não dá para desfazer.'),[
            {text:t('Voltar'),style:'cancel'},{text:t('Confirmar'),style:'destructive',onPress:send}]);
          }}/>:null}
      </View>:null}
      {auth.token&&owner&&detail&&detail.status==='COMPLETED'?<View style={styles.panel}>
        <Eyebrow>{t('DEPOIS DO JOGO')}</Eyebrow>
        <Text style={styles.hint}>{t('Correu bem? Marca o próximo com as mesmas definições e convida os mesmos jogadores.')}</Text>
        <Button title={t('Jogar outra vez')} disabled={busy||loading}
          onPress={()=>router.push({pathname:'/sessions/create',params:{repeatFrom:String(id),...(detail.communityId?{communityId:String(detail.communityId)}:{})}})}/>
      </View>:null}
      {auth.token&&owner&&detail&&(detail.status==='OPEN'||detail.status==='FULL')?<View style={styles.panel}>
        <Eyebrow>{t('FERRAMENTAS DO ORGANIZADOR')}</Eyebrow>
        <Button title={t('Editar dados da sessão')} secondary disabled={busy||loading}
          onPress={()=>router.push({pathname:'/sessions/[id]/edit',params:{id:String(id)}})}/>
        <Button title={t('Partilhar convite da sessão')} secondary onPress={share}/>
        <Button title={t('Jogar outra vez (copiar e convidar os mesmos)')} secondary disabled={busy||loading}
          onPress={()=>router.push({pathname:'/sessions/create',params:{repeatFrom:String(id),...(detail.communityId?{communityId:String(detail.communityId)}:{})}})}/>
        <Button title={adminToolsOpen?t('Ocultar ferramentas avançadas'):t('Mostrar ferramentas avançadas')} secondary onPress={()=>setAdminToolsOpen(open=>!open)}/>
        {adminToolsOpen?<View style={styles.editor}>
        {detail.registrationOpeningMode==='MANUAL'&&Number.isSafeInteger(id)&&id>0?<PreviousUnpaidWarning sessionId={id} token={auth.token}/>:null}
        {detail.registrationOpeningMode==='MANUAL'?<Button secondary title={t('Abrir inscrições')} disabled={busy} onPress={()=>{void perform(()=>openSessionRegistration(id,auth.token!),t('Inscrições abertas.'));}}/>:null}
        <Eyebrow>{t('NÍVEL DA SESSÃO')}</Eyebrow>
        <View style={styles.levelRow}>
         {sessionChoices().map(choice=>{const selected=(detail.skillLevel||'')===choice.value;
          return <Pressable key={choice.value||'all'} accessibilityRole="radio" accessibilityState={{checked:selected,disabled:busy}}
           disabled={busy||selected} style={[styles.levelChip,selected&&styles.levelChipSelected]}
           onPress={()=>{void perform(()=>updateSessionSkillLevel(id,auth.token!,choice.value||null),t('Nível atualizado: {level}.',{level:choice.label}));}}>
           <Text style={[styles.levelChipText,selected&&styles.levelChipTextSelected]}>{choice.label}</Text>
          </Pressable>;})}
        </View>
        <Eyebrow>{t('INSTRUÇÕES DE CHEGADA')}</Eyebrow>
        {!editMeetingPoint?<Button secondary title={t('Editar ponto de encontro')} disabled={busy}
          onPress={()=>{setMeetingDraft(detail.meetingPointInstructions||'');setEditMeetingPoint(true);}}/>:
         <View style={styles.editor}>
          <Text style={styles.hint}>{t('Nota de chegada para participantes autorizados (máximo 240 caracteres).')}</Text>
          <TextInput style={styles.input} value={meetingDraft} onChangeText={setMeetingDraft}
            maxLength={240} multiline={false} editable={!busy} accessibilityLabel={t('Instruções do ponto de encontro')}
            placeholder={t('Porta, entrada ou referência para encontrar o grupo')} placeholderTextColor={C.muted}/>
          <Button title={t('Guardar ponto de encontro')} disabled={busy} onPress={saveMeetingPoint}/>
          <Button secondary title={t('Cancelar edição')} disabled={busy} onPress={()=>setEditMeetingPoint(false)}/>
         </View>}
        <Eyebrow>{t('JOGADORES JÁ CONFIRMADOS FORA DA APP')}</Eyebrow>
        <Text style={styles.hint}>{t('Confirmados externos: {n}',{n:detail.externalConfirmedParticipants??0})}</Text>
        {!editExternalCount?<Button secondary title={t('Atualizar jogadores externos')} disabled={busy}
          onPress={()=>{setExternalDraft(String(detail.externalConfirmedParticipants??0));setEditExternalCount(true);}}/>:
         <View style={styles.editor}>
          <TextInput style={styles.input} value={externalDraft} onChangeText={setExternalDraft}
            maxLength={2} keyboardType="number-pad" editable={!busy}
            accessibilityLabel={t('Número de jogadores confirmados externamente')}
            placeholder={t('0 a 99')} placeholderTextColor={C.muted}/>
          <Button title={t('Guardar número de jogadores')} disabled={busy} onPress={saveExternalCount}/>
          <Button secondary title={t('Cancelar edição')} disabled={busy} onPress={()=>setEditExternalCount(false)}/>
         </View>}
        {(detail.communityId || (
          detail.playFormat !== 'INDIVIDUAL' &&
          ['Andebol','Basebol','Basquetebol','Basquetebol 3x3','Corfebol','Cricket','Curling',
           'Flag Football','Futebol','Futebol Americano','Futsal','Hóquei','Hóquei em Campo',
           'Hóquei em Patins','Hóquei no Gelo','Lacrosse','Polo Aquático','Rugby',
           'Rugby Sevens','Softbol','Voleibol','Voleibol de Praia'].includes(detail.sport) &&
          detail.maxParticipants >= 4 && detail.maxParticipants % 2 === 0 &&
          (detail.sport !== 'Basquetebol 3x3' || detail.maxParticipants === 6) &&
          (detail.sport !== 'Rugby Sevens' || detail.maxParticipants === 14) &&
          (detail.sport !== 'Voleibol de Praia' || detail.maxParticipants === 4)
        ))?<View style={styles.editor}>
          <Eyebrow>{t('FORMAR DUAS EQUIPAS')}</Eyebrow>
          <Text style={styles.hint}>{t('As equipas equilibradas usam automaticamente a classificação da época ativa da comunidade. Se só existir classificação importada, será reutilizada sem pedir outro Excel.')}</Text>
          {detail.teamBalanceSupported?
          <Button title={t('Equipas equilibradas')} secondary={teamSource!=='AUTO'} disabled={teamsBusy}
            onPress={()=>{setTeamSource('AUTO');setTeamPreview(null);setTeamsMessage('');setTeamsError('');}}/>:null}
          <Button title={t('Equipas aleatórias')} secondary={teamSource!=='RANDOM'} disabled={teamsBusy}
            onPress={()=>{setTeamSource('RANDOM');setTeamPreview(null);setTeamsMessage('');setTeamsError('');}}/>
          <Button title={teamsBusy?t('A calcular…'):(!detail.teamBalanceSupported||teamSource==='RANDOM')?t('Sortear equipas'):t('Pré-visualizar equipas')} disabled={teamsBusy||busy}
            onPress={()=>{void previewBalancedTeams();}}/>
          {teamsError?<Message tone="error">{teamsError}</Message>:null}
          {teamsMessage?<Message>{teamsMessage}</Message>:null}
          {teamPreview?<View style={styles.editor}>
            <Text style={styles.hint}>{(teamSource==='RANDOM'||!detail.teamBalanceSupported)?t('Sorteio sem classificação. Confirma para guardar estas equipas para todos os participantes.'):t('{n} de {total} jogadores com estatísticas.',{n:teamPreview.playersWithStats,total:teamPreview.totalPlayers})}</Text>
            {renderTeam(t('Equipa A'),teamPreview.teamA,teamPreview.teamAScore)}
            {renderTeam(t('Equipa B'),teamPreview.teamB,teamPreview.teamBScore)}
            {(teamSource==='RANDOM'||!detail.teamBalanceSupported)?<Button secondary title={t('Sortear novamente')} disabled={teamsBusy||busy} onPress={()=>{void previewBalancedTeams();}}/>:null}
            <Button title={t('Confirmar distribuição de equipas')} disabled={teamsBusy||busy} onPress={persistBalancedTeams}/>
          </View>:null}
        </View>:null}
        <Text style={styles.hint}>{t('Convidar participantes')}</Text>
        <Text style={styles.hint}>{t('Partilha a ligação com quem ainda não tem a aplicação. O acesso e a confirmação de presença seguem as regras da sessão na web.')}</Text>
        <Text style={styles.hint}>{t('Ou convida diretamente alguém com conta Jynlo:')}</Text>
        <TextInput style={styles.input} value={inviteUsername} onChangeText={setInviteUsername}
          autoCapitalize="none" autoCorrect={false} placeholder={t('Nome de utilizador')} placeholderTextColor={C.muted}/>
        <Button title={t('Enviar convite')} disabled={busy||!inviteUsername.trim()} onPress={sendInvite}/>
        <Button danger title={t('Cancelar esta sessão')} disabled={busy} onPress={cancel}/>
        </View>:null}
      </View>:null}
      {detail?.communityId&&owner&&detail.status!=='CANCELLED'&&
        typeof detail.gameDate==='string'&&Number.isFinite(Date.parse(detail.gameDate))&&Date.parse(detail.gameDate)<Date.now()?
        <View style={styles.panel}>
          <Eyebrow>{t('DEPOIS DO JOGO')}</Eyebrow>
          <Text style={styles.hint}>{t('Regista o vencedor, empate e participantes para as classificações da comunidade. A administração da comunidade e o servidor validam a operação.')}</Text>
          <Button title={t('Registar resultado da sessão')} secondary
            onPress={()=>router.push({pathname:'/sessions/[id]/result',params:{id:String(id),communityId:String(detail.communityId),sport:detail.sport}})}/>
        </View>:null}
      {detail&&canViewRoster(detail,auth.username)&&!rosterError&&hasConfirmedTeams?<View style={styles.panel}>
        <Eyebrow>{t('EQUIPAS CONFIRMADAS')}</Eyebrow>
        <Text style={styles.hint}>{t('Distribuição guardada no servidor. Todos os participantes autorizados podem consultar as equipas.')}</Text>
        {(['A','B'] as const).map(team=><View key={team} style={styles.confirmedTeamCard}>
          <Text style={styles.teamHeading}>{t('Equipa {team} · {n} jogadores',{team,n:confirmedTeams[team].length})}</Text>
          {confirmedTeams[team].length?confirmedTeams[team].map(player=><View key={player.id} style={styles.confirmedTeamPlayer}>
            <ParticipantAvatar participant={player}/><Text style={styles.confirmedTeamName}>{player.username}{player.username.toLowerCase()===auth.username?.toLowerCase()?' · '+t('Tu'):''}</Text>
          </View>):<Text style={styles.hint}>{t('Sem jogadores atribuídos.')}</Text>}
        </View>)}
        {confirmedTeams.unassigned.length>0?<Text style={styles.hint}>{t('{n} jogadores ainda sem equipa atribuída.',{n:confirmedTeams.unassigned.length})}</Text>:null}
      </View>:null}
      {detail&&canViewRoster(detail,auth.username)?<View style={styles.panel}>
        <Pressable accessibilityRole="button" accessibilityLabel={showParticipantRoster?t('Ocultar participantes da sessão'):t('Mostrar participantes da sessão')}
          accessibilityState={{expanded:showParticipantRoster}} onPress={()=>setShowParticipantRoster(open=>!open)} style={styles.rosterDisclosure}>
          <View style={{flex:1,gap:3}}>
           <Text style={styles.rosterTitle}>{t('Quem vai')}</Text>
           <Text style={styles.hint}>{rosterError?t('Lista por confirmar'):t('{count} participantes visíveis',{count:participants.length})}</Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.chatDisclosureSymbol}>{showParticipantRoster?'−':'+'}</Text>
        </Pressable>
        {showParticipantRoster?<>
        {rosterError?<Text style={styles.rosterError}>{rosterError}</Text>:null}
        {rosterFeedback?<Message>{rosterFeedback}</Message>:null}
        {!rosterError&&participants.length===0?<Text style={styles.hint}>{t('Ainda não existem participantes visíveis nesta lista.')}</Text>:null}
        {participants.map(p=>{
          const attendance=rosterAttendanceLabel(p.attendanceStatus,detail.status);
          return <View key={p.id} style={styles.member}>
            <ParticipantAvatar participant={p}/>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName} numberOfLines={1}>{p.username}</Text>
              {attendance?<Text style={styles.memberStatus}>{attendance}</Text>:null}
              {p.teamCode?<Text style={styles.memberStatus}>{t('Equipa {team}',{team:p.teamCode})}</Text>:null}
            </View>
            {p.username.toLowerCase()===auth.username?.toLowerCase()?<Text style={styles.memberYou}>{t('Tu')}</Text>:null}
            {auth.token&&!DEMO_MODE&&owner&&detail.status!=='CANCELLED'&&
              detail.gameDate&&Number.isFinite(Date.parse(detail.gameDate))&&
              Date.parse(detail.gameDate)<=Date.now()?<View style={styles.attendanceActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={t('Confirmar presença de {user}',{user:p.username})}
                  disabled={busy||loading||attendanceParticipantId!==null||removingParticipantId!==null}
                  style={styles.attendanceButton} onPress={()=>confirmAttendance(p,'ATTENDED')}>
                  <Text style={styles.attendancePresent}>{t('Presente')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t('Registar falta de {user}',{user:p.username})}
                  disabled={busy||loading||attendanceParticipantId!==null||removingParticipantId!==null}
                  style={styles.attendanceButton} onPress={()=>confirmAttendance(p,'NO_SHOW')}>
                  <Text style={styles.attendanceAbsent}>{t('Faltou')}</Text>
                </Pressable>
              </View>:null}
            {auth.token&&!DEMO_MODE&&owner&&['OPEN','FULL'].includes(detail.status)&&
              p.username.toLowerCase()!==detail.creatorUsername?.toLowerCase()&&
              p.username.toLowerCase()!==auth.username?.toLowerCase()?
              <Pressable accessibilityRole="button" accessibilityLabel={t('Remover {user} da sessão',{user:p.username})}
                disabled={busy||loading||removingParticipantId!==null} onPress={()=>confirmRemoveParticipant(p)}
                style={({pressed})=>[styles.removePlayerButton,{opacity:pressed||removingParticipantId!==null?0.6:1}]}>
                <Text style={styles.removePlayerLabel}>{removingParticipantId===p.id?t('A remover…'):t('Remover')}</Text>
              </Pressable>:null}
            {auth.token&&!DEMO_MODE&&canManageFutureExclusion(auth.username,detail.creatorUsername,p.username)?
              <Pressable accessibilityRole="button" accessibilityLabel={t('Inscrições futuras de {user}',{user:p.username})}
                disabled={busy||loading} onPress={()=>setExclusionFor(p)} style={styles.futureButton}>
                <Text style={styles.futureLabel}>{t('Futuras')}</Text>
              </Pressable>:null}
          </View>;
        })}
        </>:null}
      </View>:null}
      {(detail?.joined||owner)&&detail&&detail.status!=='CANCELLED'?
        <AddToCalendarButton session={detail} exactAddress={safeExactAddress(detail,auth.username)} onError={setFeedback}/>:null}
      <Button title={t('Partilhar esta sessão')} secondary onPress={share}/>
    </>:null}

    {auth.token&&owner?<FutureExclusionSheet sessionId={id} participant={exclusionFor} token={auth.token} onClose={()=>setExclusionFor(null)}/>:null}
    <Pressable onPress={()=>router.back()}><Text style={styles.back}>{t('← Voltar')}</Text></Pressable>
  </Page>;
}
const styles=StyleSheet.create({
 levelLine:{color:C.mint,fontSize:13,fontWeight:'800'},
 levelRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
 levelChip:{minHeight:40,paddingHorizontal:14,justifyContent:'center',borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:C.surface2},
 levelChipSelected:{borderColor:C.mint,backgroundColor:C.mint},
 levelChipText:{color:C.white,fontWeight:'800',fontSize:13},levelChipTextSelected:{color:C.background},
 cancelledHeading:{color:'#ffb2bf',fontSize:17,fontWeight:'800'},
  guestInvitePanel:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:C.mint,backgroundColor:C.surface},
   hero:{backgroundColor:'#092F3B',borderWidth:1,borderColor:'#2C7C79',borderRadius:24,padding:21,gap:13},
  sessionPhoto:{width:'100%',height:220,borderRadius:18,marginBottom:5},
  communityLink:{color:C.mint,fontSize:13,fontWeight:'800',paddingVertical:6},
  minimumHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  minimumCount:{color:C.white,fontSize:14,fontWeight:'900'},
  minimumTrack:{height:9,backgroundColor:C.surface2,borderRadius:8,overflow:'hidden'},
  minimumFill:{height:9,backgroundColor:C.mint,borderRadius:8},
  subtleHint:{color:C.muted,fontSize:12,lineHeight:19},
  venueName:{color:C.mint,fontSize:14,fontWeight:'800'},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  sportIcon:{fontSize:43},title:{fontSize:30,lineHeight:37,fontWeight:'900',color:C.white,letterSpacing:-0.7},
  city:{fontSize:14,color:C.muted},infoGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  info:{backgroundColor:'#0D3542',borderWidth:1,borderColor:'#245866',borderRadius:17,padding:15,width:'47%',minHeight:96,flexGrow:1,gap:5},
  label:{fontSize:12,letterSpacing:.5,color:C.muted,fontWeight:'800',lineHeight:18},
  value:{fontSize:17,color:C.white,fontWeight:'900',lineHeight:24,marginTop:5},
  panel:{gap:12,padding:17,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
  chatDisclosure:{minHeight:60,flexDirection:'row',alignItems:'center',gap:12},
  chatDisclosureSymbol:{fontSize:26,fontWeight:'900',color:C.mint,minWidth:30,textAlign:'center'},
  rosterDisclosure:{minHeight:54,flexDirection:'row',alignItems:'center',gap:12},
  editor:{gap:10},
  teamPanel:{padding:12,gap:7,borderColor:C.border,borderWidth:1,borderRadius:12},
  confirmedTeamCard:{gap:10,padding:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface2,borderRadius:14},
  confirmedTeamPlayer:{flexDirection:'row',alignItems:'center',gap:9,minHeight:44},confirmedTeamName:{color:C.white,fontSize:13,fontWeight:'700',flex:1},
  teamHeading:{fontSize:14,fontWeight:'800',color:C.white},
  panelHeading:{color:C.white,fontSize:16,fontWeight:'800',lineHeight:23},
  hint:{color:C.muted,fontSize:13,lineHeight:20},
  input:{backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,borderRadius:13,color:C.white,padding:14,minHeight:50},
  rosterTitle:{color:C.white,fontSize:21,fontWeight:'800'},
  rosterError:{color:'#FFB8B8',fontSize:12,lineHeight:19},
  member:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:C.surface,borderRadius:14,padding:11,borderWidth:1,borderColor:C.border},
  avatar:{height:36,width:36,borderRadius:18,backgroundColor:'#225048',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  avatarPhoto:{height:36,width:36,borderRadius:18},
  avatarLetter:{color:C.mint,fontWeight:'900',fontSize:14},
  memberInfo:{flex:1,gap:4},
  memberName:{color:C.white,fontSize:14,fontWeight:'700'},
  memberStatus:{color:C.muted,fontSize:13,lineHeight:18},
  memberYou:{color:C.mint,fontWeight:'800',fontSize:12},
  attendanceActions:{flexDirection:'row',gap:5,alignItems:'center'},
  attendanceButton:{borderColor:C.border,borderWidth:1,borderRadius:8,paddingHorizontal:11,minHeight:44,alignItems:'center',justifyContent:'center'},
  attendancePresent:{color:C.mint,fontSize:13,fontWeight:'700'},
  attendanceAbsent:{color:'#FFB8B8',fontSize:13,fontWeight:'700'},
  removePlayerButton:{paddingHorizontal:11,minHeight:44,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.danger},
  removePlayerLabel:{color:'#FFB8B8',fontSize:12,fontWeight:'800'},
  futureButton:{paddingHorizontal:10,minHeight:44,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.border},
  futureLabel:{color:C.muted,fontSize:12,fontWeight:'800'},
  back:{color:C.mint,textAlign:'center',padding:10,fontWeight:'700'}
});
