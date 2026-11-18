import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Alert,AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {AudioSession,LiveKitRoom,VideoTrack,isTrackReference,registerGlobals,useTracks,useRoomContext} from '@livekit/react-native';
import {Track} from 'livekit-client';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {ensureLiveCapturePermissions} from '../../src/lib/live-capture-permissions';
import {observePersonalLives} from '../../src/lib/personal-live-realtime';
import {
 joinPersonalLive,heartbeatPersonalLive,endPersonalLive,
 personalLiveMessages,personalLiveControls,sendPersonalLiveMessage,requestPersonalLiveGuest,
 setPersonalLiveChatEnabled,decidePersonalLiveGuest,
 type PersonalLiveConnection,type PersonalLiveMessage,type PersonalLiveControls
} from '../../src/lib/personal-live-api';

let globalsReady=false;
function LiveVideoStage({host}:{host:boolean}){
 const tracks=useTracks([Track.Source.Camera]);
 const videos=tracks.filter(isTrackReference);
 return <View style={styles.videoStage}>
  {videos.length?videos.map(track=><View key={track.participant.identity+'|'+track.source} style={styles.videoTile}>
    <VideoTrack trackRef={track} style={styles.video}/>
    <Text style={styles.videoLabel}>{track.participant.isLocal?'A tua câmara':'Em direto'}</Text>
   </View>):<View style={styles.videoPlaceholder}><Text style={styles.placeholderText}>
   {host?'A transmitir. Ativa a câmara se ainda não apareceu imagem.':'À espera da imagem do apresentador…'}
  </Text></View>}
 </View>;
}
function BroadcastControls({publisher}:{publisher:boolean}){
 const room=useRoomContext();
 const [micOn,setMicOn]=useState(true),[cameraOn,setCameraOn]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!publisher)return null;
 const toggle=async(kind:'mic'|'camera')=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   if(kind==='mic'){
    await room.localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(value=>!value);
   }else{
    await room.localParticipant.setCameraEnabled(!cameraOn);
    setCameraOn(value=>!value);
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível mudar o dispositivo.');}
  finally{setBusy(false);}
 };
 return <View style={styles.broadcastControls}>
  <Pressable accessibilityRole="button" accessibilityLabel={micOn?'Desligar microfone':'Ligar microfone'}
   disabled={busy} style={styles.control} onPress={()=>void toggle('mic')}>
    <Text style={styles.controlLabel}>{micOn?'🎙️ Microfone ligado':'🔇 Microfone desligado'}</Text>
  </Pressable>
  <Pressable accessibilityRole="button" accessibilityLabel={cameraOn?'Desligar câmara':'Ligar câmara'}
   disabled={busy} style={styles.control} onPress={()=>void toggle('camera')}>
    <Text style={styles.controlLabel}>{cameraOn?'📹 Câmara ligada':'📷 Câmara desligada'}</Text>
  </Pressable>
  {error?<Text style={styles.note}>{error}</Text>:null}
 </View>;
}
export default function PersonalLiveRoom(){
 const {id:rawId}=useLocalSearchParams<{id:string}>(),id=Number(rawId);
 const auth=useAuth(),router=useRouter();
 const [connection,setConnection]=useState<PersonalLiveConnection|null>(null);
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[ending,setEnding]=useState(false);
 const [error,setError]=useState(''),[chatError,setChatError]=useState('');
 const [messages,setMessages]=useState<PersonalLiveMessage[]>([]);
 const [controls,setControls]=useState<PersonalLiveControls|null>(null);
 const [draft,setDraft]=useState(''),[sending,setSending]=useState(false),[showChat,setShowChat]=useState(true);
 const [requesting,setRequesting]=useState(false),[moderating,setModerating]=useState(false);
 const active=useRef(false),endingRef=useRef(false),sendLock=useRef(false);
 const connectionRole=useRef<PersonalLiveConnection['role']|null>(null),switchingRole=useRef(false);
 const role=connection?.role;
 const host=role==='HOST';
 useFocusEffect(useCallback(()=>{
  active.current=true;endingRef.current=false;
  if(!auth.token||!Number.isSafeInteger(id)||id<=0){
   setLoading(false);setError('Direto inválido ou sessão expirada.');
   return()=>{active.current=false;};
  }
  setLoading(true);setError('');
  void joinPersonalLive(auth.token,id).then(async value=>{
   if(!active.current)return;
   if(!globalsReady){registerGlobals();globalsReady=true;}
   await AudioSession.startAudioSession();
   if(!active.current){void AudioSession.stopAudioSession();return;}
   connectionRole.current=value.role;setConnection(value);setReady(true);
  }).catch(e=>{if(active.current)setError(e instanceof Error?e.message:'Não foi possível entrar no direto.');})
   .finally(()=>{if(active.current)setLoading(false);});
  return()=>{
   active.current=false;connectionRole.current=null;setConnection(null);setReady(false);
   void AudioSession.stopAudioSession();
  };
 },[auth.token,id]));
 const refresh=useCallback(async()=>{
  if(!auth.token||!Number.isSafeInteger(id)||id<=0||!active.current)return;
  const [chat,state]=await Promise.allSettled([personalLiveMessages(auth.token,id),personalLiveControls(auth.token,id)]);
  if(!active.current)return;
  if(chat.status==='fulfilled')setMessages(chat.value.slice(-100));
  if(state.status==='fulfilled'){
   setControls(state.value);
   // Guest approval grants publishing only with a NEW LiveKit token.
   if(!state.value.isGuest&&connectionRole.current==='GUEST'&&!switchingRole.current){
    // A host can revoke co-host privileges at any moment. A previously
    // approved guest must not keep a publishing UI after server revocation.
    switchingRole.current=true;
    void joinPersonalLive(auth.token,id).then(next=>{
     if(active.current&&next.role==='VIEWER'){connectionRole.current='VIEWER';setConnection(next);}
    }).catch(()=>{if(active.current)setChatError('Não foi possível atualizar as permissões do direto.');})
     .finally(()=>{switchingRole.current=false;});
   }
   if(state.value.isGuest&&connectionRole.current==='VIEWER'&&!switchingRole.current){
    switchingRole.current=true;
    void (async()=>{
     await ensureLiveCapturePermissions();
     return joinPersonalLive(auth.token,id);
    })().then(next=>{
     if(active.current&&next.role==='GUEST'){connectionRole.current='GUEST';setConnection(next);}
    }).catch(()=>{if(active.current)setChatError('A aprovação foi recebida, mas o vídeo ainda não ligou.');})
      .finally(()=>{switchingRole.current=false;});
   }
  }
 },[id,auth.token]);
 useEffect(()=>{
  if(!connection||!ready)return;
  void refresh();
  const stop=auth.token?observePersonalLives({token:auth.token,onInvalidated:()=>{if(AppState.currentState==='active')void refresh();}}):()=>{};
  const poll=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30000);
  return()=>{stop();clearInterval(poll);};
 },[connection?.serverUrl,ready,refresh,auth.token]);
 useEffect(()=>{
  if(!host||!auth.token||!ready)return;
  // Host heartbeats are intentionally scoped to the active room. If the app
  // disappears, the server expires an abandoned broadcast after two minutes.
  const beat=()=>{if(AppState.currentState==='active'&&!endingRef.current)
   void heartbeatPersonalLive(auth.token!,id).catch(()=>{if(active.current)setError('Não foi possível confirmar o direto no servidor.');});
  };
  beat();
  const timer=setInterval(beat,30000);
  return()=>clearInterval(timer);
 },[auth.token,id,host,ready]);
 const leave=()=>{router.back();};
 const end=()=>{
  if(!host||!auth.token||endingRef.current)return;
  Alert.alert('Terminar direto?','A transmissão será encerrada para todos os espectadores.',[
   {text:'Continuar em direto',style:'cancel'},
   {text:'Terminar',style:'destructive',onPress:()=>{
    if(endingRef.current)return;
    endingRef.current=true;setEnding(true);setError('');
    void endPersonalLive(auth.token!,id).then(()=>{if(active.current)router.replace('/live');})
     .catch(e=>{endingRef.current=false;if(active.current)setError(e instanceof Error?e.message:'Não foi possível encerrar o direto.');})
     .finally(()=>{if(active.current)setEnding(false);});
   }}
  ]);
 };
 const send=async()=>{
  const message=draft.trim();
  if(!auth.token||!connection||!message||sendLock.current||controls?.mutedByHost||(!host&&controls?.chatEnabled===false))return;
  sendLock.current=true;setSending(true);setChatError('');
  try{
   const sent=await sendPersonalLiveMessage(auth.token,id,message);
   if(active.current){
    setMessages(current=>current.some(item=>item.id===sent.id)?current:[...current,sent].slice(-100));
    setDraft(current=>current.trim()===message?'':current);
   }
  }catch(e){if(active.current)setChatError(e instanceof Error?e.message:'A mensagem não foi confirmada.');}
  finally{sendLock.current=false;if(active.current)setSending(false);}
 };
 const toggleChat=async()=>{
  if(!host||!auth.token||!controls||moderating)return;
  setModerating(true);setChatError('');
  try{const value=await setPersonalLiveChatEnabled(auth.token,id,!controls.chatEnabled);
   if(active.current)setControls(value);
  }catch(e){if(active.current)setChatError(e instanceof Error?e.message:'Não foi possível alterar o chat.');}
  finally{if(active.current)setModerating(false);}
 };
 const decide=async(requestId:number,approve:boolean)=>{
  if(!host||!auth.token||moderating)return;
  setModerating(true);setChatError('');
  try{await decidePersonalLiveGuest(auth.token,id,requestId,approve);if(active.current)await refresh();}
  catch(e){if(active.current)setChatError(e instanceof Error?e.message:'Não foi possível decidir o pedido.');}
  finally{if(active.current)setModerating(false);}
 };
 const ask=async()=>{
  if(!auth.token||host||requesting)return;
  setRequesting(true);setChatError('');
  try{await requestPersonalLiveGuest(auth.token,id);if(active.current)void refresh();}
  catch(e){if(active.current)setChatError(e instanceof Error?e.message:'Não foi possível enviar o pedido.');}
  finally{if(active.current)setRequesting(false);}
 };
 return <Page>
  <View style={styles.header}>
   <Text style={styles.heading}>● LIVE</Text>
   <Text style={styles.subtitle}>{host?'A tua transmissão':'A assistir ao direto'}</Text>
  </View>
  {error?<Message tone="error">{error}</Message>:null}
  {loading?<Loader/>:null}
  {!loading&&!connection?<Button title="Voltar aos diretos" secondary onPress={leave}/>:null}
  {connection&&ready?<LiveKitRoom key={id+'-'+role} serverUrl={connection.serverUrl}
   token={connection.token} connect audio={host||role==='GUEST'} video={host||role==='GUEST'}
   onDisconnected={()=>{if(active.current&&!endingRef.current&&connectionRole.current===role)setError('A ligação ao vídeo terminou. Volta à lista para entrar novamente.');}}
   onError={e=>{if(active.current)setError('Erro na transmissão: '+e.message);}}>
   <LiveVideoStage host={host}/>
   <BroadcastControls publisher={host||role==='GUEST'}/>
  </LiveKitRoom>:null}
  {connection?<View style={styles.actions}>
   <Button title={host?(ending?'A terminar…':'Terminar direto'):'Sair do direto'}
    danger={host} disabled={ending} onPress={host?end:leave}/>
   <Button title={showChat?'Ocultar chat':'Mostrar chat'} secondary onPress={()=>setShowChat(value=>!value)}/>
  </View>:null}
  {connection&&!host&&!controls?.isGuest?<View style={styles.panel}>
    <Text style={styles.note}>{controls?.requestStatus==='PENDING'
     ?'Pedido enviado. O apresentador pode aprovar a tua participação.'
     :'Podes pedir para aparecer no direto com o apresentador.'}</Text>
    {controls?.requestStatus!=='PENDING'?
     <Button secondary title={requesting?'A enviar…':'Pedir para entrar no direto'} disabled={requesting} onPress={()=>void ask()}/>:null}
   </View>:null}
  {connection&&host&&controls?<View style={styles.panel}>
   <Text style={styles.subtitle}>Moderação do direto</Text>
   <Button secondary title={controls.chatEnabled?'Desativar chat':'Ativar chat'}
     disabled={moderating} onPress={()=>void toggleChat()}/>
   {controls.pendingRequests.filter(item=>item.status==='PENDING').map(item=>
    <View key={item.id} style={styles.requestRow}>
     <Text style={styles.note}>@{item.username} quer entrar no direto</Text>
     <Button title="Aceitar" disabled={moderating} onPress={()=>void decide(item.id,true)}/>
     <Button secondary title="Recusar" disabled={moderating} onPress={()=>void decide(item.id,false)}/>
    </View>)}
  </View>:null}
  {connection&&showChat?<View style={styles.panel}>
   <Text style={styles.subtitle}>Chat do direto</Text>
   {messages.length?messages.map(message=><View key={message.id} style={styles.message}>
    <Text style={styles.author}>@{message.username}</Text><Text style={styles.messageText}>{message.message}</Text>
   </View>):<Text style={styles.note}>As mensagens vão aparecer aqui.</Text>}
   {controls?.chatEnabled===false&&!host?<Text style={styles.note}>O apresentador desativou o chat.</Text>:null}
   {controls?.mutedByHost?<Text style={styles.note}>O apresentador silenciou as tuas mensagens.</Text>:null}
   {chatError?<Message tone="error">{chatError}</Message>:null}
   <View style={styles.compose}>
    <TextInput value={draft} onChangeText={setDraft} style={styles.input} multiline maxLength={500}
     placeholder="Escrever mensagem…" placeholderTextColor={C.muted}
     accessibilityLabel="Mensagem no chat do direto"
     editable={!sending&&!controls?.mutedByHost&&(host||controls?.chatEnabled!==false)}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" style={styles.send}
      disabled={!draft.trim()||sending||controls?.mutedByHost===true||(!host&&controls?.chatEnabled===false)}
      onPress={()=>void send()}><Text style={styles.sendText}>Enviar</Text></Pressable>
   </View>
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 header:{gap:4},heading:{color:'#FF838C',fontWeight:'900',fontSize:19},
 subtitle:{color:C.white,fontWeight:'900',fontSize:18},
 broadcastControls:{flexDirection:'row',flexWrap:'wrap',gap:9},
 control:{minHeight:44,padding:10,borderRadius:11,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,justifyContent:'center'},
 controlLabel:{color:C.white,fontWeight:'800',fontSize:12},
 requestRow:{gap:8,paddingVertical:8,borderBottomWidth:1,borderColor:C.border},
 videoStage:{minHeight:235,backgroundColor:'#021017',borderRadius:15,overflow:'hidden',gap:7},
 videoTile:{height:280},video:{width:'100%',height:'100%'},
 videoLabel:{position:'absolute',bottom:9,left:12,color:C.white,fontWeight:'800',backgroundColor:'#142A32',padding:6,borderRadius:7},
 videoPlaceholder:{minHeight:235,alignItems:'center',justifyContent:'center',padding:15},
 placeholderText:{color:C.muted,textAlign:'center',fontSize:14},
 actions:{gap:8},panel:{padding:13,gap:11,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:15},
 note:{fontSize:13,lineHeight:19,color:C.muted},
 message:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingBottom:9,borderBottomWidth:1,borderBottomColor:C.border},
 author:{color:C.mint,fontSize:13,fontWeight:'900'},messageText:{color:C.white,fontSize:13,flexShrink:1},
 compose:{flexDirection:'row',gap:8,alignItems:'flex-end'},
 input:{color:C.white,backgroundColor:C.background,borderRadius:11,borderWidth:1,borderColor:C.border,padding:10,minHeight:44,maxHeight:110,flex:1},
 send:{backgroundColor:C.mint,borderRadius:10,minHeight:44,paddingHorizontal:13,justifyContent:'center'},
 sendText:{color:C.background,fontWeight:'900'}
});
