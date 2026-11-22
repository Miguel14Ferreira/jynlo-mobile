import React,{Suspense,lazy,useEffect,useState} from 'react';
import {t} from '../lib/i18n';
import {ActivityIndicator,Pressable,Text,View} from 'react-native';
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
 const [error,setError]=useState(false);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let alive=true,privateFile:Awaited<ReturnType<typeof downloadPrivateProfileMedia>>|null=null;
  setUri(null);setError(false);
  if(!src.startsWith('/api/profile-media/')){
   const publicUri=resolveJynloMedia(src);
   if(publicUri)setUri(publicUri);
   else setError(true);
   return()=>{alive=false;};
  }
  if(!token){setError(true);return()=>{alive=false;};}
  void downloadPrivateProfileMedia(src,token).then(file=>{
   privateFile=file;
   if(alive)setUri(file.uri);
   else releasePrivateProfileMedia(file);
  }).catch(()=>{if(alive)setError(true);});
  return()=>{
   alive=false;
   if(privateFile)releasePrivateProfileMedia(privateFile);
  };
 },[src,token,attempt]);
 if(!uri)return <View style={{height:type==='image'?220:300,backgroundColor:'#020A10',alignItems:'center',justifyContent:'center',gap:12,paddingHorizontal:15}}>
   {error?<><Text style={{color:'#B9D8DA',textAlign:'center'}}>{t('Não foi possível carregar este conteúdo. Verifica a ligação ou as permissões.')}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Tentar carregar multimédia novamente')}
       onPress={()=>setAttempt(n=>n+1)} style={{paddingVertical:9,paddingHorizontal:15,borderRadius:10,backgroundColor:'#173A43'}}>
       <Text style={{color:'#fff',fontWeight:'700'}}>{t('Tentar novamente')}</Text>
     </Pressable></>:<ActivityIndicator color={MobileTheme.colors.accent}/>}
  </View>;
 return type==='video'
  ?<Suspense fallback={<ActivityIndicator color={MobileTheme.colors.accent}/>}><FeedVideo uri={uri}/></Suspense>
  :<AdaptivePostPhoto uri={uri} width={width} label={label} onExpand={()=>onExpand(src.startsWith('/api/profile-media/')?(resolveJynloMedia(src)||uri):uri)}/>;
}
