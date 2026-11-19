import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,PermissionsAndroid,Platform,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {JynloIcon} from '../components/JynloIcon';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {AudioSession,LiveKitRoom,VideoTrack,isTrackReference,registerGlobals,useRoomContext,useTracks} from '@livekit/react-native';
import {Track} from 'livekit-client';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../components/UI';
import {useAuth} from '../lib/auth';
import {ApiError} from '../lib/api';
import {C} from '../lib/theme';
import {chooseVideoStageTracks,videoStageDimensions} from '../lib/video-stage-layout.cjs';
import {
 directCallAvailability,pendingDirectCall,startDirectCall,acceptDirectCall,declineDirectCall,endDirectCall,directCallMembers,
 type DirectCallSession,type DirectCallInvitation,type DirectCallMedia
} from '../lib/direct-call-api';

// Register native WebRTC globals only when a call connects, not while Expo Router registers routes.
let liveKitGlobalsRegistered=false;

const PEER=/^[a-zA-Z0-9_.@-]{1,128}$/;
async function ensureCallPermissions(media:DirectCallMedia):Promise<void>{
 if(Platform.OS!=='android')return;
 const needed:Array<typeof PermissionsAndroid.PERMISSIONS.RECORD_AUDIO|typeof PermissionsAndroid.PERMISSIONS.CAMERA>=[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
 if(media==='video')needed.push(PermissionsAndroid.PERMISSIONS.CAMERA);
 const results=await PermissionsAndroid.requestMultiple(needed);
 if(needed.some(permission=>results[permission]!==PermissionsAndroid.RESULTS.GRANTED)){
  throw Error('Para participares nesta chamada, permite o acesso ao microfone'+(media==='video'?' e à câmara':'')+' nas definições do Android.');
 }
}
function MediaControls({media,onHangup}:{media:DirectCallMedia;onHangup:()=>void}){
 const room=useRoomContext();
 const tracks=useTracks([Track.Source.Camera]);
 const {width,height}=useWindowDimensions();
 const dimensions=videoStageDimensions(width,height,expandedVideo);
 const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(media==='voice');
 const [expandedVideo,setExpandedVideo]=useState(false);
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
   {(()=>{
    const {dominant,previews,remaining}=chooseVideoStageTracks(tracks.filter(isTrackReference));
    return <>
     <View style={[styles.videoStage,{height:dimensions.stageHeight}]}>
      {dominant?<View style={styles.mainVideo}>
       <VideoTrack trackRef={dominant} style={styles.video}/>
       <Text style={styles.videoTag}>{dominant.participant.isLocal?'Tu':'Participante'}</Text>
      </View>:<View style={styles.videoFallback}><Text style={styles.note}>A aguardar vídeo dos participantes…</Text></View>}
      {previews.map(track=><View key={track.participant.identity+'-'+track.source} style={[styles.previewVideo,{width:dimensions.previewWidth,height:dimensions.previewHeight}]}>
       <VideoTrack trackRef={track} style={styles.video}/>
       <Text style={styles.previewTag}>{track.participant.isLocal?'Tu':'Participante'}</Text>
      </View>)}
      {remaining>0?<View style={styles.remainingCount}><Text style={styles.remainingCountText}>+{remaining} câmaras</Text></View>:null}
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={expandedVideo?'Reduzir vídeo da chamada':'Ampliar vídeo da chamada'}
      accessibilityState={{selected:expandedVideo}} onPress={()=>setExpandedVideo(value=>!value)} style={styles.expandVideoAction}>
      <Text style={styles.expandVideoText}>{expandedVideo?'Reduzir vídeo':'Ampliar vídeo'}</Text>
     </Pressable>
    </>;
   })()}
  </View>:<Text style={styles.note}>A ligação de áudio utiliza o LiveKit. Verifica o som do dispositivo.</Text>}
  {error?<Message tone="error">{error}</Message>:null}
  <View style={styles.callActions}>
   <Pressable accessibilityRole="button" accessibilityLabel={muted?'Ligar microfone':'Desligar microfone'} accessibilityState={{disabled:changing}} disabled={changing}
    onPress={()=>{void toggle('microphone');}} style={styles.callAction}>
    <JynloIcon name="microphone" size={23} color={muted?C.muted:C.mint}/>
    <Text style={styles.callActionText}>{muted?'Ligar áudio':'Silenciar'}</Text>
   </Pressable>
   {media==='video'?<Pressable accessibilityRole="button" accessibilityLabel={cameraOff?'Ligar câmara':'Desligar câmara'} accessibilityState={{disabled:changing}} disabled={changing}
    onPress={()=>{void toggle('camera');}} style={styles.callAction}>
    <JynloIcon name="video" size={23} color={cameraOff?C.muted:C.mint}/>
    <Text style={styles.callActionText}>{cameraOff?'Ligar vídeo':'Desligar vídeo'}</Text>
   </Pressable>:null}
   <Pressable accessibilityRole="button" accessibilityLabel="Terminar chamada" onPress={onHangup} style={[styles.callAction,styles.hangupAction]}>
    <JynloIcon name="close" size={24} color={C.white}/><Text style={styles.callActionText}>Desligar</Text>
   </Pressable>
  </View>
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
  // A new screen generation must not inherit a pending action lock.
  operation.current=false;setBusy(false);
  setLoading(true);setError('');setPending(null);setProviderStatus('');setAvailable(false);
  void refresh(version);
  const timer=setInterval(()=>{if(AppState.currentState==='active'&&!operation.current&&!sessionRef.current)void refresh(version);},10000);
  return()=>{
   clearInterval(timer);generation.current++;
   // Discard any in-flight operation from this generation. Its later finally
   // must not unlock actions started when the screen is reopened.
   operation.current=false;
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
  const startAudio=async()=>{
   if(!liveKitGlobalsRegistered){
    registerGlobals();
    liveKitGlobalsRegistered=true;
   }
   await AudioSession.startAudioSession();
  };
  void startAudio().then(()=>{
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
    // A caller may receive 403 while the invitation is still ringing.
    // Once connected, 403 instead means the session is no longer accessible.
    if(e instanceof ApiError&&e.status===403&&!connectedToPeer)return;
    if(e instanceof ApiError&&[403,404,410].includes(e.status)){
     sessionRef.current=null;setSession(null);setConnectedToPeer(false);
     setError('A chamada terminou, expirou ou deixou de estar acessível.');
    }
   }finally{inspectInFlight=false;}
  };
  void inspect();
  const timer=setInterval(()=>{if(AppState.currentState==='active')void inspect();},8000);
  return()=>{active=false;clearInterval(timer);};
 },[session?.callId,auth.token,connectedToPeer]);
 async function create(media:DirectCallMedia){
  if(operation.current||!auth.token||!available||!PEER.test(peer))return;
  const version=generation.current;operation.current=true;setBusy(true);setError('');
  try{
   await ensureCallPermissions(media);
   if(version!==generation.current)return;
   const result=await startDirectCall(peer,media,auth.token);
   if(version!==generation.current){void endDirectCall(result.callId,auth.token).catch(()=>{});return;}
   setPending(null);setConnectedToPeer(false);ending.current=false;sessionRef.current=result;setSession(result);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível iniciar a chamada.');}
  finally{if(version===generation.current){operation.current=false;setBusy(false);}}
 }
 async function answer(accept:boolean){
  if(operation.current||!auth.token||!pending)return;
  const version=generation.current,invitation=pending;
  operation.current=true;setBusy(true);setError('');
  try{
   if(accept){
    await ensureCallPermissions(invitation.media);
    if(version!==generation.current)return;
    const result=await acceptDirectCall(invitation.callId,auth.token);
    if(version!==generation.current){void endDirectCall(result.callId,auth.token).catch(()=>{});return;}
    setConnectedToPeer(true);ending.current=false;sessionRef.current=result;setSession(result);
   }else await declineDirectCall(invitation.callId,auth.token);
   if(version===generation.current)setPending(null);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível responder à chamada.');}
  finally{if(version===generation.current){operation.current=false;setBusy(false);}}
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
 mediaPanel:{gap:12,padding:12,borderWidth:1,borderColor:C.border,borderRadius:18,backgroundColor:C.surface},
 callActions:{flexDirection:'row',gap:8,alignItems:'stretch',justifyContent:'space-evenly'},
 callAction:{flex:1,minHeight:70,paddingHorizontal:5,paddingVertical:9,backgroundColor:C.surface2,borderRadius:14,justifyContent:'center',alignItems:'center',gap:5},
 callActionText:{color:C.white,fontSize:11,fontWeight:'800',textAlign:'center'},
 hangupAction:{backgroundColor:'#813D43'},
 videos:{gap:9},
 videoStage:{borderRadius:17,overflow:'hidden',backgroundColor:'#021017',position:'relative'},
 mainVideo:{height:'100%',width:'100%'},
 video:{width:'100%',height:'100%'},
 videoFallback:{flex:1,alignItems:'center',justifyContent:'center',padding:14},
 videoTag:{position:'absolute',top:10,left:10,color:C.white,fontWeight:'900',fontSize:12,
  paddingHorizontal:9,paddingVertical:6,backgroundColor:'#12313ED9',borderRadius:8},
 previewVideo:{position:'absolute',right:10,bottom:10,borderRadius:12,
  overflow:'hidden',borderColor:C.mint,borderWidth:2,backgroundColor:'#021017'},
 remainingCount:{position:'absolute',right:10,top:10,backgroundColor:'#0B273BCF',borderRadius:9,paddingHorizontal:9,paddingVertical:5},
 remainingCountText:{fontSize:11,color:C.white,fontWeight:'900'},
 previewTag:{position:'absolute',bottom:5,left:5,color:C.white,fontSize:11,fontWeight:'900',
  backgroundColor:'#122D3BD9',borderRadius:5,paddingHorizontal:5,paddingVertical:3},
 expandVideoAction:{alignSelf:'flex-end',minHeight:44,justifyContent:'center',paddingHorizontal:14,
  borderWidth:1,borderColor:C.border,borderRadius:11,backgroundColor:C.surface2},
 expandVideoText:{color:C.mint,fontWeight:'800',fontSize:13}
});
