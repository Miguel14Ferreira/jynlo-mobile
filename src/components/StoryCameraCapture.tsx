import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {CameraView,useCameraPermissions,useMicrophonePermissions} from 'expo-camera';
import {File} from 'expo-file-system';
import type {MobileMedia} from '../lib/types';
import {C} from '../lib/theme';

type Props={
 onCaptured:(file:MobileMedia)=>void;
 onPickGallery:()=>void;
};
export default function StoryCameraCapture({onCaptured,onPickGallery}:Props){
 const camera=useRef<CameraView|null>(null);
 const gestureStart=useRef<{x:number;y:number}|null>(null);
 const [permission,requestPermission]=useCameraPermissions();
 const [micPermission,requestMicPermission]=useMicrophonePermissions();
 const [mode,setMode]=useState<'picture'|'video'>('picture');
 const [recording,setRecording]=useState(false);
 const recordingRef=useRef(false);
 const alive=useRef(true);
 useEffect(()=>()=>{alive.current=false;if(recordingRef.current)camera.current?.stopRecording();},[]);
 const [facing,setFacing]=useState<'back'|'front'>('back');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function capture(){
  if(busy||recordingRef.current||mode!=='picture'||!permission?.granted||!camera.current)return;
  setBusy(true);setError('');
  try{
   const photo=await camera.current.takePictureAsync({quality:0.7,exif:false,skipProcessing:false});
   if(!photo?.uri)throw Error('A câmara não devolveu uma fotografia.');
   const file=new File(photo.uri);
   const size=file.size;
   if(!file.exists||!size||size>5*1024*1024)throw Error('A fotografia não pôde ser preparada (máximo 5 MB).');
   onCaptured({uri:photo.uri,type:'image',mimeType:'image/jpeg',fileName:'jynlo-story-'+Date.now()+'.jpg',fileSize:size});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível tirar a fotografia.');}
  finally{setBusy(false);}
 }
 async function toggleRecording(){
  if(recordingRef.current){
   camera.current?.stopRecording();
   return;
  }
  if(busy||!permission?.granted||!camera.current||mode!=='video')return;
  if(!micPermission?.granted){
   try{
    const granted=await requestMicPermission();
    if(!granted.granted){if(alive.current)setError('Autoriza o microfone para gravar vídeo com som, ou utiliza a galeria.');return;}
   }catch{if(alive.current)setError('Não foi possível obter a permissão do microfone.');return;}
  }
  recordingRef.current=true;setRecording(true);setBusy(true);setError('');
  try{
   // The server accepts MP4 up to 20 MB. The native recorder stops at either limit.
   const result=await camera.current.recordAsync({maxDuration:30,maxFileSize:20*1024*1024});
   if(!alive.current)return;
   if(!result?.uri)throw Error('Não foi possível guardar o vídeo gravado.');
   const video=new File(result.uri);
   const size=video.size;
   if(!video.exists||!size||size>20*1024*1024)
    throw Error('O vídeo excede 20 MB ou não pôde ser guardado.');
   onCaptured({uri:result.uri,type:'video',mimeType:'video/mp4',
     fileName:'jynlo-story-'+Date.now()+'.mp4',fileSize:size});
  }catch(e){
   if(alive.current)setError(e instanceof Error?e.message:'Falha ao gravar vídeo.');
  }finally{
   recordingRef.current=false;
   if(alive.current){setRecording(false);setBusy(false);}
  }
 }
 const beginGalleryGesture=(x:number,y:number)=>{gestureStart.current={x,y};};
 const finishGalleryGesture=(x:number,y:number)=>{
  const start=gestureStart.current;
  gestureStart.current=null;
  // Require a deliberate upward swipe, not a diagonal camera gesture or tap.
  if(start&&!busy&&!recordingRef.current&&start.y-y>75&&Math.abs(start.x-x)<110)onPickGallery();
 };
 if(!permission)return <View style={styles.placeholder}><ActivityIndicator color={C.mint}/></View>;
 if(!permission.granted)return <View style={styles.permission}>
  <Text style={styles.title}>A tua próxima Story começa aqui</Text>
  <Text style={styles.subtitle}>Autoriza a câmara para tirar fotografias e gravar vídeos sem sair da Jynlo. A galeria continua disponível sem esta permissão.</Text>
  <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>void requestPermission()}><Text style={styles.primaryText}>Permitir câmara</Text></Pressable>
  <Pressable accessibilityRole="button" style={styles.secondary} onPress={onPickGallery}><Text style={styles.secondaryText}>Abrir galeria</Text></Pressable>
 </View>;
 return <View style={styles.cameraContainer}>
  <CameraView ref={camera} style={StyleSheet.absoluteFillObject} facing={facing} mode={mode} videoQuality="720p"/>
  <View style={styles.cameraGestureArea}
    accessible accessibilityLabel="Pré-visualização da câmara. Desliza para cima para abrir a galeria."
    onStartShouldSetResponder={()=>true}
    onResponderGrant={e=>beginGalleryGesture(e.nativeEvent.pageX,e.nativeEvent.pageY)}
    onResponderRelease={e=>finishGalleryGesture(e.nativeEvent.pageX,e.nativeEvent.pageY)}
    onResponderTerminate={()=>{gestureStart.current=null;}}>
    <View style={styles.topOverlay} pointerEvents="none"><Text style={styles.topHint}>Desliza para cima para abrir a galeria ↑</Text></View>
  </View>
  <View style={styles.modeRow}>
    <Pressable accessibilityRole="button" accessibilityLabel="Modo fotografia" disabled={busy} onPress={()=>setMode('picture')} style={[styles.modeButton,mode==='picture'&&styles.modeActive]}><Text style={styles.modeText}>Fotografia</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Modo vídeo" disabled={busy} onPress={()=>setMode('video')} style={[styles.modeButton,mode==='video'&&styles.modeActive]}><Text style={styles.modeText}>Vídeo</Text></Pressable>
  </View>
  <View style={styles.controls}>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir galeria de fotografias e vídeos"
      disabled={busy||recording} onPress={onPickGallery} style={styles.galleryButton}><Text style={styles.galleryIcon}>▦</Text><Text style={styles.controlText}>Galeria</Text></Pressable>
    <Pressable accessibilityRole="button"
      accessibilityLabel={mode==='video'?(recording?'Terminar gravação':'Começar gravação'):'Tirar fotografia'}
      disabled={busy&&!recording} onPress={()=>void (mode==='video'?toggleRecording():capture())}
      style={[styles.captureOuter,recording&&styles.recordOuter]}>
      <View style={[styles.captureInner,mode==='video'&&styles.videoCaptureInner,recording&&styles.stopCaptureInner]}/>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Trocar câmara frontal ou traseira"
      disabled={busy||recording} onPress={()=>setFacing(v=>v==='back'?'front':'back')} style={styles.galleryButton}><Text style={styles.galleryIcon}>⟳</Text><Text style={styles.controlText}>Rodar</Text></Pressable>
  </View>
  {recording?<View style={styles.recordStatus}><Text style={styles.recordText}>● A gravar · máximo 30 segundos</Text></View>:
  busy?<View style={styles.busy}><ActivityIndicator color="#fff"/><Text style={styles.controlText}>A preparar ficheiro…</Text></View>:null}
  {error?<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>:null}
 </View>;
}
const styles=StyleSheet.create({
 cameraContainer:{width:'100%',height:440,borderRadius:20,overflow:'hidden',backgroundColor:'#091c22',justifyContent:'space-between'},
 cameraGestureArea:{flex:1,justifyContent:'flex-start'},
 placeholder:{height:350,justifyContent:'center'},
 permission:{height:350,padding:22,borderRadius:18,backgroundColor:C.surface,gap:15,justifyContent:'center'},
 title:{fontSize:19,fontWeight:'900',color:C.white},
 subtitle:{fontSize:13,lineHeight:20,color:C.muted},
 primary:{minHeight:52,backgroundColor:C.mint,alignItems:'center',justifyContent:'center',borderRadius:15},
 primaryText:{color:C.background,fontWeight:'900'},
 secondary:{minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:15,borderWidth:1,borderColor:C.border},
 secondaryText:{color:C.white,fontWeight:'800'},
 topOverlay:{alignItems:'center',padding:15,backgroundColor:'rgba(0,0,0,0.40)'},
 topHint:{color:'#fff',fontSize:12,fontWeight:'800'},
 modeRow:{flexDirection:'row',justifyContent:'center',backgroundColor:'rgba(0,0,0,.45)',gap:12,paddingVertical:7},
 modeButton:{paddingHorizontal:17,paddingVertical:8,borderRadius:20},
 modeActive:{backgroundColor:'rgba(255,255,255,.25)'},
 modeText:{color:'#fff',fontSize:12,fontWeight:'800'},
 recordOuter:{borderColor:'#ff4b5d'},
 videoCaptureInner:{backgroundColor:'#ff4b5d'},
 stopCaptureInner:{width:30,height:30,borderRadius:7},
 recordStatus:{position:'absolute',top:54,alignSelf:'center',backgroundColor:'rgba(0,0,0,.8)',borderRadius:12,padding:10},
 recordText:{color:'#ff7b89',fontWeight:'900',fontSize:12},
 controls:{flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',backgroundColor:'rgba(0,0,0,0.45)',paddingVertical:20},
 galleryButton:{alignItems:'center',justifyContent:'center',gap:4,minHeight:60,minWidth:76},
 galleryIcon:{fontSize:27,color:'#fff'},controlText:{fontSize:11,color:'#fff',fontWeight:'800'},
 captureOuter:{width:75,height:75,borderRadius:38,borderWidth:4,borderColor:'#fff',alignItems:'center',justifyContent:'center'},
 captureInner:{width:60,height:60,borderRadius:30,backgroundColor:'#fff'},
 busy:{position:'absolute',top:130,left:0,right:0,alignItems:'center',gap:10},
 error:{position:'absolute',top:60,left:12,right:12,padding:11,borderRadius:9,backgroundColor:'rgba(40,5,5,0.9)'},
 errorText:{color:'#fff',fontSize:12,fontWeight:'700'}
});
