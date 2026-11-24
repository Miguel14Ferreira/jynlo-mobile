import React,{useEffect,useRef,useState} from 'react';
import {Animated,Image,PanResponder,Pressable,StyleSheet,View} from 'react-native';
import type {GestureResponderEvent} from 'react-native';
import {useAuth} from '../lib/auth';
import {t} from '../lib/i18n';
import {mediaRequestSource} from '../lib/protected-media-source';
import {DOUBLE_TAP_MS,isDoubleTap,pinchScale,touchDistance} from '../lib/photo-gestures.cjs';
import {JynloIcon} from './JynloIcon';

/**
 * A post photo with Instagram gestures: one tap opens it full screen, two taps like the post
 * (with a heart burst), and two fingers zoom in place, springing back when released.
 */
export default function AdaptivePostPhoto({uri,width,label,onExpand,onDoubleTap}:{
 uri:string;width:number;label:string;onExpand:()=>void;onDoubleTap?:()=>void
}){
 const {token}=useAuth();
 const [dimensions,setDimensions]=useState<{width:number;height:number}|null>(null);
 useEffect(()=>{setDimensions(null);},[uri]);
 const height=dimensions?Math.min(620,Math.max(180,Math.round(width*dimensions.height/dimensions.width))):350;

 const lastTap=useRef({at:0,x:0,y:0});
 const singleTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const heart=useRef(new Animated.Value(0)).current;
 const zoom=useRef(new Animated.Value(1)).current;
 const pinchStart=useRef(0);
 const pinching=useRef(false);
 const [zoomed,setZoomed]=useState(false);
 useEffect(()=>()=>{if(singleTimer.current)clearTimeout(singleTimer.current);},[]);

 const burst=()=>{
  heart.setValue(0);
  Animated.sequence([
   Animated.spring(heart,{toValue:1,friction:4,tension:120,useNativeDriver:true}),
   Animated.delay(350),
   Animated.timing(heart,{toValue:0,duration:220,useNativeDriver:true}),
  ]).start();
 };
 const onPress=(event:GestureResponderEvent)=>{
  if(pinching.current)return;
  const now=Date.now(),{pageX:x,pageY:y}=event.nativeEvent;
  if(onDoubleTap&&isDoubleTap(lastTap.current.at,now,lastTap.current.x,lastTap.current.y,x,y)){
   if(singleTimer.current)clearTimeout(singleTimer.current);
   singleTimer.current=null;lastTap.current={at:0,x:0,y:0};
   burst();onDoubleTap();
   return;
  }
  lastTap.current={at:now,x,y};
  if(!onDoubleTap){onExpand();return;}
  if(singleTimer.current)clearTimeout(singleTimer.current);
  singleTimer.current=setTimeout(()=>{singleTimer.current=null;onExpand();},DOUBLE_TAP_MS);
 };
 const release=()=>{
  pinching.current=false;pinchStart.current=0;
  Animated.spring(zoom,{toValue:1,friction:6,useNativeDriver:true}).start(()=>setZoomed(false));
 };
 const pinch=useRef(PanResponder.create({
  onStartShouldSetPanResponderCapture:event=>event.nativeEvent.touches.length>=2,
  onMoveShouldSetPanResponderCapture:event=>event.nativeEvent.touches.length>=2,
  onPanResponderGrant:event=>{
   pinching.current=true;setZoomed(true);
   pinchStart.current=touchDistance(event.nativeEvent.touches);
  },
  onPanResponderMove:event=>{
   const distance=touchDistance(event.nativeEvent.touches);
   if(!pinchStart.current&&distance)pinchStart.current=distance;
   if(distance)zoom.setValue(pinchScale(pinchStart.current,distance));
  },
  onPanResponderRelease:release,
  onPanResponderTerminate:release,
  onPanResponderTerminationRequest:()=>false,
 })).current;

 const heartStyle={opacity:heart,transform:[{scale:heart.interpolate({inputRange:[0,1],outputRange:[0.4,1.15]})}]};
 return <View {...pinch.panHandlers} style={[zoomed&&styles.raised]}>
  <Pressable accessibilityRole="button" accessibilityLabel={label}
   accessibilityHint={onDoubleTap?t('Toca duas vezes para gostar'):undefined} onPress={onPress}>
   <Animated.View style={{transform:[{scale:zoom}]}}>
    <Image source={mediaRequestSource(uri,token)} resizeMode="contain"
      style={{width:'100%',height,backgroundColor:'#020A10',borderRadius:12}}
      onLoad={event=>{
        const source=event.nativeEvent.source;
        if(source&&Number.isFinite(source.width)&&Number.isFinite(source.height)&&source.width>0&&source.height>0)
          setDimensions(previous=>previous?.width===source.width&&previous?.height===source.height?previous:{width:source.width,height:source.height});
      }}/>
   </Animated.View>
   <Animated.View pointerEvents="none" style={[styles.heart,heartStyle]}>
    <JynloIcon name="like" size={96} color="#FFFFFF" active/>
   </Animated.View>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 raised:{zIndex:50,elevation:50},
 heart:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center'},
});
