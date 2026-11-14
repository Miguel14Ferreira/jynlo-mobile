import React,{useRef,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GestureResponderEvent} from 'react-native';
import type {StoryTextGeometry} from '../lib/types';
import {clampStickerPosition} from '../lib/story-sticker-bounds.cjs';

type Props={caption:string;geometry:StoryTextGeometry;onChange?:(value:StoryTextGeometry)=>void;disabled?:boolean;reservedTopPx?:number};
type TouchPoint={pageX:number;pageY:number};
type GestureStart={count:number;centerX:number;centerY:number;distance:number;angle:number;geometry:StoryTextGeometry};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const touchMetrics=(touches:readonly TouchPoint[])=>{
 const a=touches[0],b=touches.length>1?touches[1]:null;
 if(!a)return null;
 return {count:b?2:1,centerX:b?(a.pageX+b.pageX)/2:a.pageX,
  centerY:b?(a.pageY+b.pageY)/2:a.pageY,
  distance:b?Math.hypot(b.pageX-a.pageX,b.pageY-a.pageY):1,
  angle:b?Math.atan2(b.pageY-a.pageY,b.pageX-a.pageX):0};
};
/** Drag a Story caption with one finger; pinch and rotate with two fingers. */
export default function StoryTextPlacement({caption,geometry,onChange,disabled=false,reservedTopPx=0}:Props){
 const [area,setArea]=useState({width:340,height:320});
 const [sticker,setSticker]=useState({width:150,height:54});
 const gesture=useRef<GestureStart|null>(null);
 const current=useRef(geometry);current.current=geometry;
 function begin(event:GestureResponderEvent){
  if(disabled||!onChange)return;
  const p=touchMetrics(event.nativeEvent.touches);
  if(p)gesture.current={...p,geometry:{...current.current}};
 }
 function move(event:GestureResponderEvent){
  if(disabled||!onChange)return;
  const now=touchMetrics(event.nativeEvent.touches);
  if(!now)return;
  const initial=gesture.current;
  if(!initial||initial.count!==now.count){begin(event);return;}
  const base=initial.geometry;
  const next={
   x:base.x+100*(now.centerX-initial.centerX)/Math.max(1,area.width),
   y:base.y+100*(now.centerY-initial.centerY)/Math.max(1,area.height),
   rotation:now.count===2?clamp(base.rotation+(now.angle-initial.angle)*180/Math.PI,-360,360):base.rotation,
   zoom:now.count===2?clamp(base.zoom*now.distance/Math.max(1,initial.distance),.5,3):base.zoom
  };
  onChange(clampStickerPosition(next,area,sticker,reservedTopPx));
 }
 const position=clampStickerPosition(geometry,area,sticker,reservedTopPx);
 return <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}
  onLayout={event=>{const {width,height}=event.nativeEvent.layout;if(width>0&&height>0)setArea({width,height});}}>
  <View accessible accessibilityLabel={onChange?'Texto da Story: arrasta com um dedo, roda ou amplia com dois dedos':'Texto da Story'}
   style={[styles.caption,{
    left:area.width*position.x/100-sticker.width/2,
    top:area.height*position.y/100-sticker.height/2,
    transform:[{rotate:geometry.rotation+'deg'},{scale:geometry.zoom}]
   }]}
   onLayout={event=>{const {width,height}=event.nativeEvent.layout;
    if(width>0&&height>0&&Math.abs(width-sticker.width)+Math.abs(height-sticker.height)>1)setSticker({width,height});}}
   onStartShouldSetResponder={()=>Boolean(onChange&&!disabled)}
   onMoveShouldSetResponder={()=>Boolean(onChange&&!disabled)}
   onResponderGrant={begin} onResponderMove={move}
   onResponderRelease={()=>{gesture.current=null;}}
   onResponderTerminate={()=>{gesture.current=null;}}>
   <Text style={styles.captionText}>{caption}</Text>
  </View>
 </View>;
}
const styles=StyleSheet.create({
 caption:{position:'absolute',maxWidth:'80%',borderRadius:13,overflow:'hidden',backgroundColor:'rgba(0,0,0,0.65)',paddingHorizontal:13,paddingVertical:9},
 captionText:{fontSize:20,fontWeight:'900',color:'#fff',textAlign:'center'}
});
