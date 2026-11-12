import React,{useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {File} from 'expo-file-system';
import type {MobileMedia} from '../lib/types';
import {C} from '../lib/theme';

type Props={
 onCaptured:(file:MobileMedia)=>void;
 onPickGallery:()=>void;
};
export default function StoryCameraCapture({onCaptured,onPickGallery}:Props){
 const camera=useRef<CameraView|null>(null);
 const startY=useRef<number|null>(null);
 const [permission,requestPermission]=useCameraPermissions();
 const [facing,setFacing]=useState<'back'|'front'>('back');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function capture(){
  if(busy||!permission?.granted||!camera.current)return;
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
 const swipeStart=(pageY:number)=>{startY.current=pageY;};
 const swipeEnd=(pageY:number)=>{
  if(startY.current!==null&&startY.current-pageY>75&&!busy)onPickGallery();
  startY.current=null;
 };
 if(!permission)return <View style={styles.placeholder}><ActivityIndicator color={C.mint}/></View>;
 if(!permission.granted)return <View style={styles.permission}>
  <Text style={styles.title}>A tua próxima Story começa aqui</Text>
  <Text style={styles.subtitle}>Autoriza a câmara para fotografar sem sair da Jynlo. Podes usar a galeria sem esta permissão.</Text>
  <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>void requestPermission()}><Text style={styles.primaryText}>Permitir câmara</Text></Pressable>
  <Pressable accessibilityRole="button" style={styles.secondary} onPress={onPickGallery}><Text style={styles.secondaryText}>Abrir galeria</Text></Pressable>
 </View>;
 return <View style={styles.cameraContainer}
  onTouchStart={e=>swipeStart(e.nativeEvent.pageY)}
  onTouchEnd={e=>swipeEnd(e.nativeEvent.pageY)}>
  <CameraView ref={camera} style={StyleSheet.absoluteFillObject} facing={facing} mode="picture"/>
  <View style={styles.topOverlay} pointerEvents="none"><Text style={styles.topHint}>Desliza para cima para abrir a galeria ↑</Text></View>
  <View style={styles.controls}>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir galeria de fotografias e vídeos"
      disabled={busy} onPress={onPickGallery} style={styles.galleryButton}><Text style={styles.galleryIcon}>▦</Text><Text style={styles.controlText}>Galeria</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Tirar fotografia"
      disabled={busy} onPress={()=>void capture()} style={styles.captureOuter}><View style={styles.captureInner}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Trocar câmara frontal ou traseira"
      disabled={busy} onPress={()=>setFacing(v=>v==='back'?'front':'back')} style={styles.galleryButton}><Text style={styles.galleryIcon}>⟳</Text><Text style={styles.controlText}>Rodar</Text></Pressable>
  </View>
  {busy?<View style={styles.busy}><ActivityIndicator color="#fff"/><Text style={styles.controlText}>A preparar fotografia…</Text></View>:null}
  {error?<View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>:null}
 </View>;
}
const styles=StyleSheet.create({
 cameraContainer:{width:'100%',height:440,borderRadius:20,overflow:'hidden',backgroundColor:'#091c22',justifyContent:'space-between'},
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
 controls:{flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',backgroundColor:'rgba(0,0,0,0.45)',paddingVertical:20},
 galleryButton:{alignItems:'center',justifyContent:'center',gap:4,minHeight:60,minWidth:76},
 galleryIcon:{fontSize:27,color:'#fff'},controlText:{fontSize:11,color:'#fff',fontWeight:'800'},
 captureOuter:{width:75,height:75,borderRadius:38,borderWidth:4,borderColor:'#fff',alignItems:'center',justifyContent:'center'},
 captureInner:{width:60,height:60,borderRadius:30,backgroundColor:'#fff'},
 busy:{position:'absolute',top:130,left:0,right:0,alignItems:'center',gap:10},
 error:{position:'absolute',top:60,left:12,right:12,padding:11,borderRadius:9,backgroundColor:'rgba(40,5,5,0.9)'},
 errorText:{color:'#fff',fontSize:12,fontWeight:'700'}
});
