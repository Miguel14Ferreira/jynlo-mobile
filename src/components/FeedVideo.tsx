import React,{useEffect,useRef} from 'react';
import {StyleSheet} from 'react-native';
import {VideoView,useVideoPlayer} from 'expo-video';

/** Loaded only for an actual feed/story video, never at tab startup. */
export default function FeedVideo({uri,story=false,paused=false,muted=false,onEnd}:{uri:string;story?:boolean;paused?:boolean;muted?:boolean;onEnd?:()=>void}){
 const player=useVideoPlayer(uri,p=>{
  // Stories must advance when playback finishes, not loop forever.
  p.loop=false;
  if(story){p.muted=muted;p.play();}
 });
 const ended=useRef(false);
 useEffect(()=>{ended.current=false;},[uri]);
 useEffect(()=>{
  if(!story||!onEnd)return;
  const subscription=player.addListener('playToEnd',()=>{
   if(ended.current)return;
   ended.current=true;
   onEnd();
  });
  return ()=>subscription.remove();
 },[player,story,onEnd]);
 useEffect(()=>{if(story){if(paused)player.pause();else player.play();}},[paused,story,player]);
 useEffect(()=>{if(story)player.muted=muted;},[muted,story,player]);
 return <VideoView player={player} style={story?styles.storyVideo:styles.postVideo}
  contentFit={story?'cover':'contain'} nativeControls={!story}/>;
}
const styles=StyleSheet.create({
 storyVideo:{width:'100%',height:'100%'},
 postVideo:{width:'100%',height:300,borderRadius:12,backgroundColor:'#020A10'}
});
