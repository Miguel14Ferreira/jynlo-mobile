import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../../../../src/lib/i18n';
import {Alert,AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {AudioSession,LiveKitRoom,VideoTrack,isTrackReference,registerGlobals,useRoomContext,useTracks} from '@livekit/react-native';
import {Track} from 'livekit-client';
import {Button,Loader,Message,Page} from '../../../../src/components/UI';
import {useAuth} from '../../../../src/lib/auth';
import {C} from '../../../../src/lib/theme';
import {joinCommunityLive,heartbeatCommunityLive,endCommunityLive,communityLiveEvents,
 type CommunityLiveConnection} from '../../../../src/lib/community-live-api';

let webrtcRegistered=false;
function CameraStage(){
 const tracks=useTracks([Track.Source.Camera]).filter(isTrackReference);
 return <View style={styles.stage}>
  {tracks.length?tracks.map(track=><View key={track.participant.identity+'|'+track.source} style={styles.tile}>
   <VideoTrack trackRef={track} style={styles.video}/>
   <Text style={styles.tileLabel}>{track.participant.isLocal?t('A tua câmara'):t('Transmissão')}</Text>
  </View>):<Text style={styles.message}>{t('À espera da imagem da transmissão…')}</Text>}
 </View>;
}
function HostControls(){
 const room=useRoomContext();
 const [mic,setMic]=useState(true),[camera,setCamera]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const toggle=async(which:'mic'|'camera')=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   if(which==='mic'){await room.localParticipant.setMicrophoneEnabled(!mic);setMic(!mic);}
   else{await room.localParticipant.setCameraEnabled(!camera);setCamera(!camera);}
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível alterar o dispositivo.'));}
  finally{setBusy(false);}
 };
 return <View style={styles.controls}>
  <Pressable accessibilityRole="button" accessibilityLabel={mic?t('Desligar microfone'):t('Ligar microfone')} disabled={busy}
   style={styles.control} onPress={()=>void toggle('mic')}><Text style={styles.controlText}>{mic?t('Microfone ligado'):t('Microfone desligado')}</Text></Pressable>
  <Pressable accessibilityRole="button" accessibilityLabel={camera?t('Desligar câmara'):t('Ligar câmara')} disabled={busy}
   style={styles.control} onPress={()=>void toggle('camera')}><Text style={styles.controlText}>{camera?t('Câmara ligada'):t('Câmara desligada')}</Text></Pressable>
  {error?<Text style={styles.message}>{error}</Text>:null}
 </View>;
}
export default function CommunityLiveRoom(){
 const params=useLocalSearchParams<{id:string;eventId:string}>();
 const communityId=Number(params.id),eventId=Number(params.eventId);
 const auth=useAuth(),router=useRouter();
 const [connection,setConnection]=useState<CommunityLiveConnection|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[ending,setEnding]=useState(false);
 const active=useRef(false),leaving=useRef(false);
 const host=connection?.role==='HOST';
 useFocusEffect(useCallback(()=>{
  active.current=true;leaving.current=false;setLoading(true);setConnection(null);setError('');
  if(!auth.token||!Number.isSafeInteger(communityId)||communityId<=0||
    !Number.isSafeInteger(eventId)||eventId<=0){
   setLoading(false);setError(t('Transmissão inválida. Inicia sessão para continuar.'));
   return()=>{active.current=false;};
  }
  void joinCommunityLive(auth.token,communityId,eventId).then(async joined=>{
   if(!active.current)return;
   if(!webrtcRegistered){registerGlobals();webrtcRegistered=true;}
   await AudioSession.startAudioSession();
   if(active.current)setConnection(joined);
   else void AudioSession.stopAudioSession();
  }).catch(e=>{if(active.current)setError(e instanceof Error?e.message:t('Não foi possível entrar na transmissão.'));})
   .finally(()=>{if(active.current)setLoading(false);});
  return()=>{active.current=false;setConnection(null);void AudioSession.stopAudioSession();};
 },[auth.token,communityId,eventId]));
 useEffect(()=>{
  if(!host||!auth.token||!connection)return;
  const beat=()=>{
   if(AppState.currentState!=='active'||leaving.current)return;
   void heartbeatCommunityLive(auth.token!,communityId,eventId).catch(()=>{
    if(active.current)setError(t('Falha ao confirmar a transmissão. Verifica a ligação.'));
   });
  };
  beat();
  const timer=setInterval(beat,20000);
  return()=>clearInterval(timer);
 },[host,auth.token,communityId,eventId,connection?.token]);
 useEffect(()=>{
  if(!connection||!auth.token)return;
  // Server is authoritative if owner ends stream on the web or another device.
  const timer=setInterval(()=>{
   if(AppState.currentState!=='active'||leaving.current)return;
   void communityLiveEvents(auth.token!,communityId).then(events=>{
    if(active.current&&!events.some(x=>x.id===eventId&&x.status==='LIVE')){
     leaving.current=true;
     setError(t('Este direto terminou.'));
     setConnection(null);
    }
   }).catch(()=>{/* transient outage must not terminate a running stream */});
  },15000);
  return()=>clearInterval(timer);
 },[connection?.token,auth.token,communityId,eventId]);
 const end=()=>{
  if(!host||!auth.token||leaving.current)return;
  Alert.alert(t('Terminar transmissão?'),t('O direto termina para todos os membros.'),[
   {text:t('Continuar em direto'),style:'cancel'},
   {text:t('Terminar'),style:'destructive',onPress:()=>{
    if(leaving.current)return;
    leaving.current=true;setEnding(true);setError('');
    void endCommunityLive(auth.token!,communityId,eventId)
     .then(()=>{if(active.current)router.replace({pathname:'/communities/[id]/live',params:{id:String(communityId)}});})
     .catch(e=>{leaving.current=false;if(active.current)setError(e instanceof Error?e.message:t('Não foi possível terminar o direto.'));})
     .finally(()=>{if(active.current)setEnding(false);});
   }}
  ]);
 };
 return <Page>
  <Text style={styles.heading}>{host?t('● Em direto — apresentador'):t('● A assistir ao direto')}</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {connection?<LiveKitRoom key={eventId+'|'+connection.role} serverUrl={connection.serverUrl} token={connection.token}
   connect audio={host} video={host}
   onError={e=>{if(active.current)setError(t('Não foi possível transmitir vídeo: {v}',{v:e.message}));}}
   onDisconnected={()=>{if(active.current&&!leaving.current)setError(t('A ligação ao direto foi interrompida.'));}}>
   <CameraStage/>
   {host?<HostControls/>:null}
  </LiveKitRoom>:null}
  {connection?<View style={styles.actions}>
   <Button title={host?(ending?t('A terminar…'):t('Terminar direto')):t('Sair do direto')} disabled={ending}
    danger={host} onPress={host?end:()=>router.back()}/>
  </View>:null}
  {!loading&&!connection?<Button secondary title={t('Voltar aos diretos')}
    onPress={()=>router.replace({pathname:'/communities/[id]/live',params:{id:String(communityId)}})}/>:null}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:20,fontWeight:'900',color:C.mint},
 stage:{borderRadius:14,backgroundColor:'#021017',minHeight:260,overflow:'hidden',justifyContent:'center',alignItems:'center',gap:8},
 tile:{width:'100%',height:280},
 video:{width:'100%',height:'100%'},
 tileLabel:{position:'absolute',left:10,bottom:8,color:C.white,backgroundColor:C.surface,padding:7,borderRadius:9},
 message:{color:C.muted,fontSize:13,textAlign:'center'},
 controls:{gap:10,flexDirection:'row',flexWrap:'wrap'},
 control:{minHeight:44,padding:10,borderRadius:10,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 controlText:{color:C.white,fontSize:13,fontWeight:'800'},
 actions:{gap:9}
});
