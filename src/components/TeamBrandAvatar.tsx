import React,{useEffect,useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {safeTeamKitColor,teamLogoUri,type SportsTeam} from '../lib/sports-teams-api';

type Props={team:SportsTeam;size?:number;rounded?:boolean};
export default function TeamBrandAvatar({team,size=56,rounded=false}:Props){
 const primary=safeTeamKitColor(team.kitPrimary,'#19CBB6');
 const secondary=safeTeamKitColor(team.kitSecondary,'#F0FAFB');
 const source=teamLogoUri(team.logoUrl);
 const [imageFailed,setImageFailed]=useState(false);
 useEffect(()=>{setImageFailed(false);},[source]);
 return <View accessibilityLabel={'Emblema da equipa '+team.name} style={[
   styles.crest,{width:size,height:size,borderRadius:rounded?size/2:Math.round(size*.24),
     borderColor:secondary,backgroundColor:primary}
  ]}>
  {source&&!imageFailed?<Image source={{uri:source}} style={styles.image} resizeMode="cover"
   onError={()=>setImageFailed(true)} accessibilityIgnoresInvertColors/>:
   <Text style={[styles.initial,{color:'#052E35',fontSize:Math.round(size*.38)}]}>
    {(team.name||'E').charAt(0).toUpperCase()}
   </Text>}
 </View>;
}
const styles=StyleSheet.create({
 crest:{alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:2},
 image:{width:'100%',height:'100%'},
 initial:{fontWeight:'900'}
});
