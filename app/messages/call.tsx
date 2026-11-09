import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {AudioSession,LiveKitRoom,VideoTrack,isTrackReference,registerGlobals,useRoomContext,useTracks} from '@livekit/react-native';
import {Track} from 'livekit-client';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {ApiError} from '../../src/lib/api';
import {C} from '../../src/lib/theme';
import {
 directCallAvailability,pendingDirectCall,startDirectCall,acceptDirectCall,declineDirectCall,endDirectCall,directCallMembers,
 type DirectCallSession,type DirectCallInvitation,type DirectCallMedia
} from '../../src/lib/direct-call-api';

// Must run before the native WebRTC media engine connects.
registerGlobals();

const PEER=/^[a-zA-Z0-9_.@-]{1,128}$/;
function MediaControls({media,onHangup}:{media:DirectCallMedia;onHangup:()=>void}){
 const room=useRoomContext();
 const tracks=useTracks([Track.Source.Camera]);
 const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(media==='voice');
 const [changing,setChanging]=useState(false),[error,setError]=useState('');
 async function toggle(kind:'microphone'|'camera'){
  if(changing)return;
  setChanging(true);setError('');
  try{
   if(kind==='microphone'){
    await room.localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
   }else{
    await room.localParticipant.setCameraEnabled(cameraOff);
    setCameraOff(!cameraOff);
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar o dispositivo.');}
  finally{setChanging(false);}
 }
 return <View style={styles.mediaPanel}>
  <Text style={styles.heading}>Chamada {media==='video'?'de vídeo':'de voz'}</Text>
  {media==='video'?<View style={styles.videos}>
   {tracks.filter(isTrackReference).map(track=><View key={track.participant.identity+'-'+track.source} style={styles.videoCard}>
    <VideoTrack trackRef={track} style={styles.video}/>
    <Text style={styles.note}>{track.participant.isLocal?'Tu':'Participante'}</Text>
   </View>)}
   {tracks.every(track=>!isTrackReference(track))?<Text style={styles.note}>A aguardar vídeo dos participantes…</Text>:null}
  </View>:<Text style={styles.note}>A ligação de áudio utiliza o LiveKit. Verifica o som do dispositivo.</Text>}
  {error?<Message tone="error">{error}</Message>:null}
  <Text style={styles.note}>Microfone {muted?'desligado':'ligado'}{media==='video'? ' · Câmara '+(cameraOff?'desligada':'ligada'):''}</Text>
  <Button title={muted?'Ligar microfone':'Desligar microfone'} secondary disabled={changing} onPress={()=>{void toggle('microphone');}}/>
  {media==='video'?<Button title={cameraOff?'Ligar câmara':'Desligar câmara'} secondary disabled={changing} onPress={()=>{void toggle('camera');}}/>:null}
  <Button title="Terminar chamada" danger onPress={onHangup}/>
 </View>;
}
export default function DirectCallScreen(){
 const params=useLocalSearchParams<{peer?:string}>();
 const peer=typeof params.peer==='string'?params.peer:'';
 const auth=useAuth(),router=useRouter();
 const [available,setAvailable]=useState(false),[providerStatus,setProviderStatus]=useState('');
 const [pending,setPending]=useState<DirectCallInvitation|null>(null);
 const [session,setSession]=useState<DirectCallSession|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [audioReady,setAudioReady]=useState(false),[connectedToPeer,setConnectedToPeer]=useState(false);
 const generation=useRef(0),operation=useRef(false),sessionRef=useRef<DirectCallSession|null>(null),ending=useRef(false);
 // Session ownership is updated synchronously in start/accept/end handlers.
 // A delayed React effect must never resurrect an already closed server session.
 const refresh=useCallback(async(version:number)=>{
  if(!auth.token||!PEER.test(peer))return;
  try{
   const [status,invitation]=await Promise.all([directCallAvailability(auth.token),pendingDirectCall(auth.token)]);
   if(version!==generation.current)return;
   setAvailable(status.enabled&&status.status==='ready');setProviderStatus(status.status);
   setPending(invitation&&invitation.caller.toLowerCase()===peer.toLowerCase()?invitation:null);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível consultar as chamadas.');}
  finally{if(version===generation.current)setLoading(false);}
 },[auth.token,peer]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setLoading(true);setError('');setPending(null);setProviderStatus('');setAvailable(false);
  void refresh(version);
  const timer=setInterval(()=>{if(AppState.currentState==='active'&&!operation.current&&!sessionRef.current)void refresh(version);},10000);
  return()=>{
   clearInterval(timer);generation.current++;
   const orphan=sessionRef.current;
   if(orphan){
    sessionRef.current=null;setSession(null);setConnectedToPeer(false);setAudioReady(false);
    if(auth.token)void endDirectCall(orphan.callId,auth.token).catch(()=>{});
   }
  };
 },[refresh]));
 useEffect(()=>{
  if(!session){setAudioReady(false);return;}
  let active=true;
  setAudioReady(false);
  void AudioSession.startAudioSession().then(()=>{
   if(!active){void AudioSession.stopAudioSession();return;}
   setAudioReady(true);
  }).catch(e=>{
   if(!active)return;
   setError((e instanceof Error?e.message:'Não foi possível iniciar o áudio.')+' A chamada foi terminada.');
   const failedSession=sessionRef.current;
   if(failedSession?.callId===session.callId){
    sessionRef.current=null;
    setSession(null);
    if(auth.token)void endDirectCall(failedSession.callId,auth.token).catch(()=>{});
   }
  });
  return()=>{active=false;void AudioSession.stopAudioSession();};
 },[session?.callId,auth.token]);
 useEffect(()=>{
  if(!session||!auth.token){setConnectedToPeer(false);return;}
  let active=true;
  const callId=session.callId;
  let inspectInFlight=false;
  const inspect=async()=>{
   if(inspectInFlight)return;
   inspectInFlight=true;
   try{
    const members=await directCallMembers(callId,auth.token!);
    if(active&&sessionRef.current?.callId===callId)setConnectedToPeer(members.participants.length>=2);
   }catch(e){
    if(!active||sessionRef.current?.callId!==callId)return;
    // Ringing calls return 403 until the recipient accepts; don't call this a failure.
    if(e instanceof ApiError&&e.status===403)return;
    if(e instanceof ApiError&&[404,410].includes(e.status)){
     sessionRef.current=null;setSession(null);setConnectedToPeer(false);
     setError('A chamada terminou ou o convite expirou.');
    }
   }finally{inspectInFlight=false;}
  };
  void inspect();
  const timer=setInterval(()=>{if(AppState.currentState==='active')void inspect();},8000);
  return()=>{active=false;clearInterval(timer);};
 },[session?.callId,auth.token]);
 async function create(media:DirectCallMedia){
  if(operation.current||!auth.token||!available||!PEER.test(peer))return;
  const version=generation.current;operation.current=true;setBusy(true);setError('');
  try{
   const result=await startDirectCall(peer,media,auth.token);
   if(version!==generation.current){void endDirectCall(result.callId,auth.token).catch(()=>{});return;}
   setPending(null);setConnectedToPeer(false);ending.current=false;sessionRef.current=result;setSession(result);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível iniciar a chamada.');}
  finally{operation.current=false;if(version===generation.current)setBusy(false);}
 }
 async function answer(accept:boolean){
  if(operation.current||!auth.token||!pending)return;
  const version=generation.current,invitation=pending;
  operation.current=true;setBusy(true);setError('');
  try{
   if(accept){
    const result=await acceptDirectCall(invitation.callId,auth.token);
    if(version!==generation.current){void endDirectCall(result.callId,auth.token).catch(()=>{});return;}
    setConnectedToPeer(true);ending.current=false;sessionRef.current=result;setSession(result);
   }else await declineDirectCall(invitation.callId,auth.token);
   if(version===generation.current)setPending(null);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível responder à chamada.');}
  finally{operation.current=false;if(version===generation.current)setBusy(false);}
 }
 const hangup=useCallback(async()=>{
  if(ending.current||!sessionRef.current||!auth.token)return;
  ending.current=true;
  const activeSession=sessionRef.current;
  sessionRef.current=null;setSession(null);
  try{await endDirectCall(activeSession.callId,auth.token);}
  catch{setError('A ligação terminou neste dispositivo, mas não foi possível confirmar o fim da chamada no servidor.');}
  finally{ending.current=false;}
 },[auth.token]);
 if(!auth.token||!PEER.test(peer))return <Page><Message tone="error">Inicia sessão e escolhe um contacto válido para realizar chamadas.</Message><Button title="Voltar" secondary onPress={()=>router.back()}/></Page>;
 return <Page><DemoBanner/><Eyebrow>CHAMADAS PRIVADAS</Eyebrow>
  <Text style={styles.heading}>Chamada com {peer}</Text>
  {!session?<Text style={styles.note}>Para receberes um convite, abre este ecrã. As chamadas em segundo plano e os avisos globais ainda precisam de integração nativa.</Text>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {session&&!audioReady?<View style={styles.mediaPanel}><ActivityIndicator color={C.mint}/><Text style={styles.note}>A preparar o áudio da chamada…</Text><Button title="Terminar chamada" danger onPress={()=>{void hangup();}}/></View>:null}
  {session&&!connectedToPeer?<Text style={styles.note}>À espera de resposta do contacto…</Text>:null}
  {session&&audioReady?<LiveKitRoom key={session.callId} serverUrl={session.serverUrl} token={session.token}
   connect audio video={session.media==='video'} onDisconnected={()=>{void hangup();}}
   onError={e=>{setError('Falha ao ligar ao LiveKit: '+e.message);void hangup();}}>
    <MediaControls media={session.media} onHangup={()=>{void hangup();}}/>
   </LiveKitRoom>:!session?<>
   {!loading&&!available?<Message>As chamadas estão indisponíveis neste momento ({providerStatus||'sem ligação ao servidor'}). O chat continua disponível.</Message>:null}
   {pending?<View style={styles.mediaPanel}>
    <Text style={styles.heading}>{peer} está a ligar</Text>
    <Text style={styles.note}>Chamada {pending.media==='video'?'de vídeo':'de voz'}. Só entrarás na sala quando aceitares.</Text>
    <Button title={busy?'A ligar…':'Aceitar chamada'} disabled={busy||!available} onPress={()=>{void answer(true);}}/>
    <Button title="Recusar chamada" secondary disabled={busy} onPress={()=>{void answer(false);}}/>
   </View>:null}
   {!pending&&available?<View style={styles.mediaPanel}>
    <Button title={busy?'A iniciar…':'Chamada de voz'} disabled={busy} onPress={()=>{void create('voice');}}/>
    <Button title="Chamada de vídeo" secondary disabled={busy} onPress={()=>{void create('video');}}/>
   </View>:null}
  </>:null}
  {!session?<Button title="Voltar ao chat" secondary onPress={()=>router.back()}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:22,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:19},
 mediaPanel:{gap:13,padding:16,borderWidth:1,borderColor:C.border,borderRadius:18,backgroundColor:C.surface},
 videos:{gap:9},videoCard:{gap:5,padding:8,backgroundColor:C.surface2,borderRadius:12},
 video:{width:'100%',height:230,borderRadius:10}
});
