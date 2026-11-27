import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import type {HostInstance} from 'react-native';
import {ActivityIndicator,AppState,Keyboard,PermissionsAndroid,Platform,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {JynloIcon} from '../components/JynloIcon';
import CallChatSidePanel from '../components/CallChatSidePanel';
import {useFocusEffect,useLocalSearchParams,useNavigation,useRouter} from 'expo-router';
import {Alert} from 'react-native';
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
import {setActiveCall} from '../lib/active-call';

// Register native WebRTC globals only when a call connects, not while Expo Router registers routes.
let liveKitGlobalsRegistered=false;

const PEER=/^[a-zA-Z0-9_.@-]{1,128}$/;
async function ensureCallPermissions(media:DirectCallMedia):Promise<void>{
 if(Platform.OS!=='android')return;
 const needed:Array<typeof PermissionsAndroid.PERMISSIONS.RECORD_AUDIO|typeof PermissionsAndroid.PERMISSIONS.CAMERA>=[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
 if(media==='video')needed.push(PermissionsAndroid.PERMISSIONS.CAMERA);
 const results=await PermissionsAndroid.requestMultiple(needed);
 if(needed.some(permission=>results[permission]!==PermissionsAndroid.RESULTS.GRANTED)){
  throw Error(t('Para participares nesta chamada, permite o acesso ao microfone')+(media==='video'?' '+t('e à câmara'):'')+' '+t('nas definições do Android.'));
 }
}
function MediaControls({media,cameraStartsOff=false,onHangup,onMinimize,peer,self,token}:{media:DirectCallMedia;cameraStartsOff?:boolean;onHangup:()=>void;onMinimize:()=>void;peer:string;self:string;token:string}){
 const room=useRoomContext();
 const tracks=useTracks([Track.Source.Camera]);
 const {width,height}=useWindowDimensions();
 const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(media==='voice'||cameraStartsOff);
 const [expandedVideo,setExpandedVideo]=useState(false),[showChat,setShowChat]=useState(false);
 const [keyboardOpen,setKeyboardOpen]=useState(false);
 // Where the keyboard starts on screen and where this panel starts: while typing, the panel is
 // capped to the space between them, so the chat composer always sits right above the keyboard
 // (whether or not the system resized the window).
 const [keyboardTop,setKeyboardTop]=useState<number|null>(null),[panelTop,setPanelTop]=useState(0);
 const panelRef=useRef<HostInstance|null>(null);
 const measurePanel=useCallback(()=>{panelRef.current?.measureInWindow((_x:number,y:number)=>{if(Number.isFinite(y))setPanelTop(y);});},[]);
 useEffect(()=>{
  const shown=Keyboard.addListener('keyboardDidShow',event=>{
   setKeyboardOpen(true);setKeyboardTop(event.endCoordinates.screenY);setTimeout(measurePanel,60);
  });
  const hidden=Keyboard.addListener('keyboardDidHide',()=>{setKeyboardOpen(false);setKeyboardTop(null);});
  return()=>{shown.remove();hidden.remove();};
 },[measurePanel]);
 const wide=width>=720;
 // Allow the chat column to stay beside video on wide layouts without
 // forcing video beyond the available viewport on smaller devices.
 const dimensions=videoStageDimensions(wide&&showChat?width-345:width,height,expandedVideo);
 // Reserve usable message space when the call chat opens on a phone.
 const compactChatVideo=!wide&&showChat;
 // While typing on a phone the chat takes the screen; the call keeps running behind a slim bar.
 const typingInChat=compactChatVideo&&keyboardOpen;
 const stageHeight=compactChatVideo?Math.min(dimensions.stageHeight,Math.max(150,Math.round(height*.27))):dimensions.stageHeight;
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
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível alterar o dispositivo.'));}
  finally{setChanging(false);}
 }
 const typingMaxHeight=typingInChat&&keyboardTop!=null?Math.max(180,keyboardTop-panelTop-8):undefined;
 return <View ref={panelRef} onLayout={measurePanel} style={[styles.mediaPanel,styles.mediaPanelChat,typingMaxHeight!=null&&{maxHeight:typingMaxHeight}]}>
  {typingInChat?<Pressable accessibilityRole="button" accessibilityLabel={t('Voltar ao vídeo da chamada')} onPress={()=>Keyboard.dismiss()} style={styles.typingBar}>
   <View style={styles.typingDot}/><Text style={styles.typingBarText}>{t('Chamada em curso com @{a} · toca para voltar ao vídeo',{a:peer})}</Text>
  </Pressable>:<>
  <View style={styles.callHeadingRow}>
   <Text style={styles.heading}>{t('Chamada {a}',{a:media==='video'?t('de vídeo'):t('de voz')})}</Text>
   <View style={{flexDirection:'row',gap:8}}>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Minimizar a chamada e continuar a usar a app')} onPress={onMinimize} style={styles.chatToggle}>
    <JynloIcon name="chevron-down" size={19} color={C.mint}/>
    <Text style={styles.chatToggleText}>{t('Minimizar')}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={showChat?t('Ocultar chat da chamada'):t('Abrir chat da chamada')}
    accessibilityState={{expanded:showChat}} onPress={()=>setShowChat(current=>!current)}
    style={[styles.chatToggle,showChat&&styles.chatToggleActive]}>
    <JynloIcon name="messages" size={19} color={C.mint}/>
    <Text style={styles.chatToggleText}>{showChat?t('Fechar chat'):t('Chat')}</Text>
   </Pressable>
   </View>
  </View>
  {compactChatVideo?null:<View style={styles.participants} accessibilityLabel={t('Participantes da chamada')}>
   <View style={styles.participant}><View style={styles.avatar}><Text style={styles.avatarText}>{self.slice(0,1).toUpperCase()}</Text></View><Text style={styles.participantName}>{t('Tu')}</Text></View>
   <View style={styles.participant}><View style={styles.avatar}><Text style={styles.avatarText}>{peer.slice(0,1).toUpperCase()}</Text></View><Text style={styles.participantName}>@{peer}</Text></View>
  </View>}
  </>}
  <View style={[styles.callColumns,wide&&showChat&&styles.callColumnsWide,compactChatVideo&&styles.callColumnsChatOpen]}>
   <View style={[styles.callStageColumn,compactChatVideo&&{flex:0},typingInChat&&styles.hiddenStage]}>
  {media==='video'?<View style={styles.videos}>
   {(()=>{
    const {dominant,previews,remaining}=chooseVideoStageTracks(tracks.filter(isTrackReference));
    return <>
     <View style={[styles.videoStage,{height:stageHeight}]}>
      {dominant?<View style={styles.mainVideo}>
       <VideoTrack trackRef={dominant} style={styles.video}/>
       <Text style={styles.videoTag}>{dominant.participant.isLocal?t('Tu'):t('Participante')}</Text>
      </View>:<View style={styles.videoFallback}><Text style={styles.note}>{t('A aguardar vídeo dos participantes…')}</Text></View>}
      {previews.map(track=><View key={track.participant.identity+'-'+track.source} style={[styles.previewVideo,{width:compactChatVideo?Math.min(dimensions.previewWidth,96):dimensions.previewWidth,height:compactChatVideo?Math.min(dimensions.previewHeight,76):dimensions.previewHeight}]}>
       <VideoTrack trackRef={track} style={styles.video}/>
       <Text style={styles.previewTag}>{track.participant.isLocal?t('Tu'):t('Participante')}</Text>
      </View>)}
      {remaining>0?<View style={styles.remainingCount}><Text style={styles.remainingCountText}>{t('+{a} câmaras',{a:remaining})}</Text></View>:null}
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={expandedVideo?t('Reduzir vídeo da chamada'):t('Ampliar vídeo da chamada')}
      accessibilityState={{selected:expandedVideo}} onPress={()=>setExpandedVideo(value=>!value)} style={styles.expandVideoAction}>
      <Text style={styles.expandVideoText}>{expandedVideo?t('Reduzir vídeo'):t('Ampliar vídeo')}</Text>
     </Pressable>
    </>;
   })()}
  </View>:<View style={[styles.audioCall,compactChatVideo&&styles.audioCallCompact]}><Text maxFontSizeMultiplier={1.3} style={styles.audioSymbol}>◉</Text><Text style={styles.note}>{t('Chamada de voz ativa · O chat continua disponível.')}</Text></View>}
   </View>
   <CallChatSidePanel peer={peer} self={self} token={token} visible={showChat} wide={wide} typing={typingInChat}/>
  </View>
  {error?<Message tone="error">{error}</Message>:null}
  {typingInChat?null:<View style={[styles.callActions,compactChatVideo&&styles.callActionsCompact]}>
   <Pressable accessibilityRole="button" accessibilityLabel={muted?t('Ligar microfone'):t('Desligar microfone')} accessibilityState={{disabled:changing}} disabled={changing}
    onPress={()=>{void toggle('microphone');}} style={styles.callAction}>
    <JynloIcon name="microphone" size={23} color={muted?C.muted:C.mint}/>
    <Text style={styles.callActionText}>{muted?t('Ligar áudio'):t('Silenciar')}</Text>
   </Pressable>
   {media==='video'?<Pressable accessibilityRole="button" accessibilityLabel={cameraOff?t('Ligar câmara'):t('Desligar câmara')} accessibilityState={{disabled:changing}} disabled={changing}
    onPress={()=>{void toggle('camera');}} style={styles.callAction}>
    <JynloIcon name="video" size={23} color={cameraOff?C.muted:C.mint}/>
    <Text style={styles.callActionText}>{cameraOff?t('Ligar vídeo'):t('Desligar vídeo')}</Text>
   </Pressable>:null}
   <Pressable accessibilityRole="button" accessibilityLabel={t('Terminar chamada')} onPress={onHangup} style={[styles.callAction,styles.hangupAction]}>
    <JynloIcon name="close" size={24} color={C.white}/><Text style={styles.callActionText}>{t('Desligar')}</Text>
   </Pressable>
  </View>}
 </View>;
}
export default function DirectCallScreen(){
 const params=useLocalSearchParams<{peer?:string}>();
 const peer=typeof params.peer==='string'?params.peer:'';
 const auth=useAuth(),router=useRouter(),navigation=useNavigation();
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
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível consultar as chamadas.'));}
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
   // Opening another screen keeps the call running (this screen stays mounted
   // underneath). The call only ends on hang up or when this screen is closed.
  };
 },[refresh]));
 useEffect(()=>()=>{
  setActiveCall(null);
  const orphan=sessionRef.current;
  if(orphan){
   sessionRef.current=null;
   if(auth.token)void endDirectCall(orphan.callId,auth.token).catch(()=>{});
  }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{setActiveCall(session?{peer,media:session.media}:null);},[session?.callId,peer]);
 // Minimise: open the app on top of this screen, which stays mounted with the call running.
 const minimize=useCallback(()=>{Keyboard.dismiss();router.push('/');},[router]);
 // Going back would close this screen and the call with it: ask first.
 useEffect(()=>{
  if(!session)return;
  const nav=navigation as unknown as {addListener:(name:'beforeRemove',cb:(event:{preventDefault:()=>void;data:{action:unknown}})=>void)=>()=>void;dispatch:(action:never)=>void};
  return nav.addListener('beforeRemove',event=>{
   if(!sessionRef.current)return;
   event.preventDefault();
   Alert.alert(t('Sair da chamada?'),t('Podes minimizar e continuar a usar a app sem desligar. Voltas à chamada pela barra verde no topo.'),[
    {text:t('Cancelar'),style:'cancel'},
    {text:t('Minimizar'),onPress:minimize},
    {text:t('Terminar e sair'),style:'destructive',onPress:()=>{void hangup().finally(()=>nav.dispatch(event.data.action as never));}},
   ]);
  });
 },[session?.callId,navigation]);
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
   setError((e instanceof Error?e.message:t('Não foi possível iniciar o áudio.'))+' '+t('A chamada foi terminada.'));
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
     setError(t('A chamada terminou, expirou ou deixou de estar acessível.'));
    }
   }finally{inspectInFlight=false;}
  };
  void inspect();
  const timer=setInterval(()=>{if(AppState.currentState==='active')void inspect();},8000);
  return()=>{active=false;clearInterval(timer);};
 },[session?.callId,auth.token,connectedToPeer]);
 async function create(media:DirectCallMedia){
  if(operation.current||!auth.token||!available||!PEER.test(peer))return;
  setCameraOnJoin(true);
  const version=generation.current;operation.current=true;setBusy(true);setError('');
  try{
   await ensureCallPermissions(media);
   if(version!==generation.current)return;
   const result=await startDirectCall(peer,media,auth.token);
   if(version!==generation.current){void endDirectCall(result.callId,auth.token).catch(()=>{});return;}
   setPending(null);setConnectedToPeer(false);ending.current=false;sessionRef.current=result;setSession(result);
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível iniciar a chamada.'));}
  finally{if(version===generation.current){operation.current=false;setBusy(false);}}
 }
 // A video call can be answered with the camera off; it can be turned on during the call.
 const [cameraOnJoin,setCameraOnJoin]=useState(true);
 async function answer(accept:boolean,withCamera=true){
  if(operation.current||!auth.token||!pending)return;
  setCameraOnJoin(withCamera);
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
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível responder à chamada.'));}
  finally{if(version===generation.current){operation.current=false;setBusy(false);}}
 }
 const hangup=useCallback(async()=>{
  if(ending.current||!sessionRef.current||!auth.token)return;
  ending.current=true;
  const activeSession=sessionRef.current;
  sessionRef.current=null;setSession(null);
  try{await endDirectCall(activeSession.callId,auth.token);}
  catch(e){
   // Already over on the server (the other person hung up or it expired): nothing to warn about.
   if(e instanceof ApiError&&(e.status===404||e.status===410))return;
   setError(t('A ligação terminou neste dispositivo, mas não foi possível confirmar o fim da chamada no servidor.'));
  }
  finally{ending.current=false;}
 },[auth.token]);
 if(!auth.token||!PEER.test(peer))return <Page><Message tone="error">{t('Inicia sessão e escolhe um contacto válido para realizar chamadas.')}</Message><Button title={t('Voltar')} secondary onPress={()=>router.back()}/></Page>;
 // During a call the screen does not scroll: the chat and its composer always fit above the keyboard.
 return <Page scroll={!session}>{session?null:<><DemoBanner/><Eyebrow>{t('CHAMADAS PRIVADAS')}</Eyebrow></>}
  <Text style={session?styles.headingSmall:styles.heading}>{t('Chamada com {a}',{a:peer})}</Text>
  {!session?<Text style={styles.note}>{t('Para receberes um convite, abre este ecrã. As chamadas em segundo plano e os avisos globais ainda precisam de integração nativa.')}</Text>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {session&&!audioReady?<View style={styles.mediaPanel}><ActivityIndicator color={C.mint}/><Text style={styles.note}>{t('A preparar o áudio da chamada…')}</Text><Button title={t('Terminar chamada')} danger onPress={()=>{void hangup();}}/></View>:null}
  {session&&!connectedToPeer?<Text style={styles.note}>{t('À espera de resposta do contacto…')}</Text>:null}
  {session&&audioReady?<LiveKitRoom key={session.callId} serverUrl={session.serverUrl} token={session.token}
   connect audio video={session.media==='video'&&cameraOnJoin} onDisconnected={()=>{void hangup();}}
   onError={e=>{setError(t('Falha ao ligar ao LiveKit: {v}',{v:e.message}));void hangup();}}>
    <MediaControls media={session.media} cameraStartsOff={!cameraOnJoin} peer={peer} self={auth.username||''} token={auth.token}
     onHangup={()=>{void hangup();}} onMinimize={minimize}/>
   </LiveKitRoom>:!session?<>
   {!loading&&!available?<Message>{t('As chamadas estão indisponíveis neste momento ({a}). O chat continua disponível.',{a:providerStatus||t('sem ligação ao servidor')})}</Message>:null}
   {pending?<View style={styles.mediaPanel}>
    <Text style={styles.heading}>{t('{a} está a ligar',{a:peer})}</Text>
    <Text style={styles.note}>{t('Chamada {a}. Só entrarás na sala quando aceitares.',{a:pending.media==='video'?t('de vídeo'):t('de voz')})}</Text>
    {pending.media==='video'?<>
     <Button title={busy?t('A ligar…'):t('Atender com vídeo')} disabled={busy||!available} onPress={()=>{void answer(true,true);}}/>
     <Button title={t('Atender sem câmara')} secondary disabled={busy||!available} onPress={()=>{void answer(true,false);}}/>
    </>:<Button title={busy?t('A ligar…'):t('Aceitar chamada')} disabled={busy||!available} onPress={()=>{void answer(true);}}/>}
    <Button title={t('Recusar chamada')} secondary disabled={busy} onPress={()=>{void answer(false);}}/>
   </View>:null}
   {!pending&&available?<View style={styles.mediaPanel}>
    <Button title={busy?t('A iniciar…'):t('Chamada de voz')} disabled={busy} onPress={()=>{void create('voice');}}/>
    <Button title={t('Chamada de vídeo')} secondary disabled={busy} onPress={()=>{void create('video');}}/>
   </View>:null}
  </>:null}
  {!session?<Button title={t('Voltar ao chat')} secondary onPress={()=>router.back()}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:22,fontWeight:'900',color:C.white},
 note:{fontSize:13,color:C.muted,lineHeight:19},
 mediaPanel:{gap:12,padding:12,borderWidth:1,borderColor:C.border,borderRadius:18,backgroundColor:C.surface},
 mediaPanelChat:{flex:1,minHeight:0,gap:8},
 headingSmall:{fontSize:16,fontWeight:'900',color:C.white},
 audioCallCompact:{minHeight:64,flexDirection:'row',gap:10},
 callHeadingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 chatToggle:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,minHeight:44,
  borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface2},
 chatToggleActive:{borderColor:C.mint,backgroundColor:'#0B4147'},
 chatToggleText:{color:C.white,fontWeight:'800',fontSize:12},
 participants:{flexDirection:'row',alignItems:'center',gap:14,flexWrap:'wrap'},
 participant:{flexDirection:'row',alignItems:'center',gap:6,minWidth:0},
 avatar:{height:35,width:35,borderRadius:18,alignItems:'center',justifyContent:'center',
  backgroundColor:'#12414C',borderWidth:1,borderColor:C.mint},
 avatarText:{fontWeight:'900',color:C.mint,fontSize:14},
 participantName:{fontSize:12,fontWeight:'800',color:C.white},
 callColumns:{gap:10,minWidth:0,flex:1,minHeight:0},
 callColumnsWide:{flexDirection:'row',alignItems:'stretch'},
 callColumnsChatOpen:{gap:6,flex:1,minHeight:0},
 callActionsCompact:{marginTop:2},
 callStageColumn:{flex:1,minWidth:0},
 audioCall:{minHeight:170,justifyContent:'center',alignItems:'center',backgroundColor:'#061B25',borderRadius:16,gap:10},
 audioSymbol:{color:C.mint,fontSize:44,fontWeight:'900'},
 callActions:{flexDirection:'row',gap:8,alignItems:'stretch',justifyContent:'space-evenly'},
 callAction:{flex:1,minHeight:70,paddingHorizontal:5,paddingVertical:9,backgroundColor:C.surface2,borderRadius:14,justifyContent:'center',alignItems:'center',gap:5},
 callActionText:{color:C.white,fontSize:11,fontWeight:'800',textAlign:'center'},
 hangupAction:{backgroundColor:'#813D43'},
 hiddenStage:{height:0,flex:0,overflow:'hidden'},
 typingBar:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,minHeight:40,borderRadius:12,backgroundColor:'#0B4147'},
 typingDot:{width:8,height:8,borderRadius:4,backgroundColor:C.mint},
 typingBarText:{color:C.white,fontSize:12,fontWeight:'800',flexShrink:1},
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
