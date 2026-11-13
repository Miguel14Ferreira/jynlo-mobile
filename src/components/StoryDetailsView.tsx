import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
type Props={locationLabel?:string|null;taggedUsernames?:string|null};
export default function StoryDetailsView({locationLabel,taggedUsernames}:Props){
 const tags=(taggedUsernames||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5);
 if(!locationLabel&&!tags.length)return null;
 return <View pointerEvents="none" style={styles.wrap}>
  {locationLabel?<Text style={styles.label}>⌖ {locationLabel}</Text>:null}
  {tags.length?<Text style={styles.label}>{tags.map(x=>'@'+x).join('  ')}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({wrap:{position:'absolute',top:20,left:14,right:14,alignItems:'flex-start',gap:6},label:{maxWidth:'100%',color:'#fff',fontWeight:'800',fontSize:13,backgroundColor:'rgba(0,0,0,.66)',borderRadius:14,overflow:'hidden',paddingHorizontal:11,paddingVertical:7}});
