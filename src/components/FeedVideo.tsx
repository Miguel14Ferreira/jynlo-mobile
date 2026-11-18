import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useAuth} from '../lib/auth';
import {mediaRequestSource} from '../lib/protected-media-source';
import {StyleSheet,Text,View} from 'react-native';
import {VideoView,useVideoPlayer} from 'expo-video';

/** Loaded only for an actual feed/story video, never at tab startup. */
export default function FeedVideo({uri,story=false,paused=false,muted=false,onEnd,onReady,onPlaybackError}:{uri:string;story?:boolean;paused?:boolean;muted?:boolean;onEnd?:()=>void;onReady?:()=>void;onPlaybackError?:()=>void}){
 const {token}=useAuth();
 const source=useMemo(()=>mediaRequestSource(uri,token),[uri,token]);
 const player=useVideoPlayer(source,p=>{
  // Stories must advance when playback finishes, not loop forever.
  p.loop=false;
  if(story){p.muted=muted;p.play();}
 });
 const ended=useRef(false);
 const readyOnce=useRef(false);
 const [videoFailed,setVideoFailed]=useState(false);
 useEffect(()=>{ended.current=false;readyOnce.current=false;setVideoFailed(false);},[uri]);
 useEffect(()=>{
  if(!story)return;
  const listener=player.addListener('statusChange',({status,error})=>{
   if(status==='readyToPlay'&&!readyOnce.current){readyOnce.current=true;onReady?.();}
   if(status==='error'){
    setVideoFailed(true);onPlaybackError?.();
   }
  });
  return ()=>listener.remove();
 },[player,story,onReady,onPlaybackError]);
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
 return <View style={story?styles.storyVideo:styles.postVideo}>
  <VideoView player={player} style={styles.videoFill}
   contentFit={story?'contain':'contain'} nativeControls={!story}/>
  {videoFailed?<View style={styles.videoError}><Text style={styles.videoErrorText}>Não foi possível reproduzir este vídeo.</Text></View>:null}
 </View>;
}
const styles=StyleSheet.create({
 videoFill:{width:'100%',height:'100%'},
 videoError:{...StyleSheet.absoluteFillObject,backgroundColor:'#06131D',alignItems:'center',justifyContent:'center',padding:20},
 videoErrorText:{color:'#fff',textAlign:'center',fontSize:14},
 storyVideo:{width:'100%',height:'100%'},
 postVideo:{width:'100%',height:300,borderRadius:12,backgroundColor:'#020A10'}
});
