import React,{useEffect,useState} from 'react';
import {Image,Pressable} from 'react-native';
import {useAuth} from '../lib/auth';
import {mediaRequestSource} from '../lib/protected-media-source';

export default function AdaptivePostPhoto({uri,width,label,onExpand}:{
 uri:string;width:number;label:string;onExpand:()=>void
}){
 const {token}=useAuth();
 const [dimensions,setDimensions]=useState<{width:number;height:number}|null>(null);
 useEffect(()=>{setDimensions(null);},[uri]);
 // A portrait upload should not be squeezed into the same short frame as a
 // landscape photo. 'contain' still protects unusually tall panoramas.
 const height=dimensions?Math.min(620,Math.max(180,Math.round(width*dimensions.height/dimensions.width))):350;
 return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onExpand}>
   <Image source={mediaRequestSource(uri,token)} resizeMode="contain"
     style={{width:'100%',height,backgroundColor:'#020A10',borderRadius:12}}
     onLoad={event=>{
       const source=event.nativeEvent.source;
       if(source&&Number.isFinite(source.width)&&Number.isFinite(source.height)&&source.width>0&&source.height>0)
         setDimensions(previous=>previous?.width===source.width&&previous?.height===source.height?previous:{width:source.width,height:source.height});
     }}/>
 </Pressable>;
}
