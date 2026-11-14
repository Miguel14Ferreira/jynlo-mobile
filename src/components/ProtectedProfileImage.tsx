import React,{useEffect,useState} from 'react';
import {Image,StyleProp,ImageStyle,View,ViewStyle} from 'react-native';
import {resolveJynloMedia} from '../lib/social-feed-api';
import {downloadPrivateProfileMedia,releasePrivateProfileMedia} from '../lib/private-profile-media';

/** Shared profile picture/post media view: bearer tokens never enter image URLs. */
export default function ProtectedProfileImage({src,token,style,resizeMode='contain'}:{
 src:string|null|undefined;token:string|null;style?:StyleProp<ImageStyle>;
 resizeMode?:'cover'|'contain'|'stretch'|'repeat'|'center';
}){
 const [uri,setUri]=useState<string|null>(null);
 useEffect(()=>{
  let alive=true;
  let file:Awaited<ReturnType<typeof downloadPrivateProfileMedia>>|null=null;
  setUri(null);
  if(!src)return()=>{alive=false;};
  if(!src.startsWith('/api/profile-media/')){
   setUri(resolveJynloMedia(src));
   return()=>{alive=false;setUri(null);};
  }
  if(token)void downloadPrivateProfileMedia(src,token).then(download=>{
   file=download;
   if(alive)setUri(download.uri);
   else releasePrivateProfileMedia(download);
  }).catch(()=>{if(alive)setUri(null);});
  return()=>{
   alive=false;
   if(file)releasePrivateProfileMedia(file);
  };
 },[src,token]);
 return uri?<Image source={{uri}} style={style} resizeMode={resizeMode}/>:<View style={style as StyleProp<ViewStyle>}/>;
}
