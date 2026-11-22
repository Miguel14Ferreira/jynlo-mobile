import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {ActivityIndicator,Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import type {MobileMedia} from '../lib/types';
import {pickerMediaMime} from '../lib/picker-media-format.cjs';
import {validateMedia} from '../lib/social-feed-core.cjs';
import {C} from '../lib/theme';

type Props={onCaptured:(media:MobileMedia)=>void;onPickGallery:()=>void};
/**
 * Open the device's own camera UI rather than mounting a black CameraView
 * inside a tall Story modal. Keep a small retry/galeria choice on cancel.
 */
export default function StoryCameraCapture({onCaptured,onPickGallery}:Props){
 const alive=useRef(true),busyRef=useRef(false),autoOpened=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[permissionDenied,setPermissionDenied]=useState(false);
 const capture=async()=>{
  if(!alive.current||busyRef.current)return;
  busyRef.current=true;setBusy(true);setError('');setPermissionDenied(false);
  try{
   const ImagePicker=await import('expo-image-picker');
   const permission=await ImagePicker.requestCameraPermissionsAsync();
   if(!alive.current)return;
   if(!permission.granted){
    setPermissionDenied(true);
     setError(t('Autoriza o acesso à câmara nas definições do telemóvel ou escolhe um ficheiro da galeria.'));
    return;
   }
   // The native camera chooses photo/video without a custom preview overlay.
   const result=await ImagePicker.launchCameraAsync({
    mediaTypes:['images','videos'],quality:.85,videoMaxDuration:30,
    exif:false,base64:false
   });
   if(!alive.current||result.canceled||!result.assets?.length)return;
   const asset=result.assets[0];
   if(!asset)return;
   const kind=asset.type==='video'?'video':'image';
   const mime=pickerMediaMime(asset);
   if(!mime){setError(t('Formato não suportado. Escolhe JPG, PNG, WebP, MP4 ou WebM.'));return;}
   let size=asset.fileSize||0;
   if(!size){
    // Android can return a content:// URI without readable picker metadata.
    // Do not block capture if this preliminary size probe fails: the uploader
    // copies the file to app cache and validates its actual byte count.
    try{
     const {File}=await import('expo-file-system');
     const file=new File(asset.uri);
     if(file.exists)size=file.size;
    }catch{}
   }
   if(!alive.current)return;
   // A few Android camera providers omit size metadata; the upload flow
    // reads the real file and enforces the same limits before sending.
    const problem=size>0?validateMedia(mime,size,true):null;
   if(problem){setError(problem);return;}
   const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':
     kind==='video'?(mime==='video/webm'?'webm':'mp4'):'jpg';
   onCaptured({uri:asset.uri,type:kind,mimeType:mime,fileName:asset.fileName||'jynlo-story-'+Date.now()+'.'+extension,fileSize:size});
  }catch(e){
   if(alive.current)setError(e instanceof Error?e.message:t('Não foi possível abrir a câmara do telemóvel.'));
  }finally{
   busyRef.current=false;
   if(alive.current)setBusy(false);
  }
 };
 useEffect(()=>{
  alive.current=true;
  // Allow the Story modal's opening transition to complete before Android
  // presents the operating system camera activity.
  const timer=setTimeout(()=>{
   if(alive.current&&!autoOpened.current){autoOpened.current=true;void capture();}
  },450);
  return()=>{alive.current=false;clearTimeout(timer);};
 },[]);
 return <View style={styles.panel}>
  <Text style={styles.heading}>{t('Fotografia ou vídeo')}</Text>
  <Text style={styles.description}>{t('Usa a câmara do teu telemóvel para capturar um momento ou escolhe da galeria.')}</Text>
  {busy?<View style={styles.loading}><ActivityIndicator color={C.mint}/><Text style={styles.description}>{t('A abrir a câmara…')}</Text></View>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {permissionDenied?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir definições de permissões da câmara')} onPress={()=>void Linking.openSettings().catch(()=>setError(t('Abre as definições da Jynlo e autoriza a câmara.')))} style={styles.settingsAction}><Text style={styles.settingsText}>{t('Abrir definições')}</Text></Pressable>:null}
  <View style={styles.actions}>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir câmara do dispositivo')}
    disabled={busy} style={[styles.action,styles.primary,busy&&styles.disabled]} onPress={()=>{void capture();}}>
    <Text style={styles.primaryText}>{t('Abrir câmara')}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir galeria de fotografias e vídeos')}
    disabled={busy} style={[styles.action,styles.secondary,busy&&styles.disabled]} onPress={onPickGallery}>
    <Text style={styles.secondaryText}>{t('Escolher da galeria')}</Text>
   </Pressable>
  </View>
 </View>;
}
const styles=StyleSheet.create({
 panel:{minHeight:175,padding:18,gap:12,backgroundColor:C.surface,borderRadius:18,borderWidth:1,borderColor:C.border},
 heading:{fontSize:18,fontWeight:'900',color:C.white},
 description:{fontSize:13,lineHeight:20,color:C.muted},
 actions:{flexDirection:'row',gap:9,flexWrap:'wrap'},
 action:{minHeight:48,borderRadius:13,paddingHorizontal:14,justifyContent:'center',alignItems:'center',flexGrow:1},
 primary:{backgroundColor:C.mint},secondary:{borderWidth:1,borderColor:C.border},
 primaryText:{color:C.background,fontWeight:'900'},secondaryText:{color:C.white,fontWeight:'800'},
 loading:{flexDirection:'row',alignItems:'center',gap:9},
 error:{fontSize:12,color:'#FF9F9F'},settingsAction:{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingHorizontal:14,borderRadius:10,borderWidth:1,borderColor:C.mint},settingsText:{fontSize:13,color:C.mint,fontWeight:'800'},disabled:{opacity:.5}
});
