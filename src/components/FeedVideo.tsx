import React,{useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {VideoView,useVideoPlayer} from 'expo-video';

/** Loaded only for an actual feed/story video, never at tab startup. */
export default function FeedVideo({uri,story=false,paused=false}:{uri:string;story?:boolean;paused?:boolean}){
 const player=useVideoPlayer(uri,p=>{
  p.loop=story;
  if(story){p.muted=true;p.play();}
 });
 useEffect(()=>{if(story){if(paused)player.pause();else player.play();}},[paused,story,player]);
 return <VideoView player={player} style={story?styles.storyVideo:styles.postVideo}
  contentFit="cover" nativeControls={!story}/>;
}
const styles=StyleSheet.create({
 storyVideo:{width:'100%',height:'100%'},
 postVideo:{width:'100%',height:300,borderRadius:12}
});
