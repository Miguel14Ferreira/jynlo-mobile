import React,{Suspense,lazy,useEffect,useState} from 'react';
import {ActivityIndicator,View} from 'react-native';
import AdaptivePostPhoto from './AdaptivePostPhoto';
import {resolveJynloMedia} from '../lib/social-feed-api';
import {downloadPrivateProfileMedia,releasePrivateProfileMedia} from '../lib/private-profile-media';
import {MobileTheme} from '../lib/theme';
const FeedVideo=lazy(()=>import('./FeedVideo'));

export default function ProtectedPostMedia({src,type,token,width,label,onExpand}:{
 src:string;type:'image'|'video';token:string|null;width:number;label:string;
 onExpand:(uri:string)=>void;
}){
 const [uri,setUri]=useState<string|null>(null);
 useEffect(()=>{
  let alive=true,privateFile:Awaited<ReturnType<typeof downloadPrivateProfileMedia>>|null=null;
  setUri(null);
  if(!src.startsWith('/api/profile-media/')){
   setUri(resolveJynloMedia(src));
   return()=>{alive=false;};
  }
  if(token)void downloadPrivateProfileMedia(src,token).then(file=>{
   privateFile=file;
   if(alive)setUri(file.uri);
   else releasePrivateProfileMedia(file);
  }).catch(()=>{if(alive)setUri(null);});
  return()=>{
   alive=false;
   if(privateFile)releasePrivateProfileMedia(privateFile);
  };
 },[src,token]);
 if(!uri)return <View style={{height:type==='image'?220:300,backgroundColor:'#020A10',alignItems:'center',justifyContent:'center'}}>
   <ActivityIndicator color={MobileTheme.colors.accent}/>
  </View>;
 return type==='video'
  ?<Suspense fallback={<ActivityIndicator color={MobileTheme.colors.accent}/>}><FeedVideo uri={uri}/></Suspense>
  :<AdaptivePostPhoto uri={uri} width={width} label={label} onExpand={()=>onExpand(uri)}/>;
}
