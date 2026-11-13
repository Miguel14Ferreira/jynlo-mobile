import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {storyMentionUsernames} from '../lib/story-details.cjs';
type Props={locationLabel?:string|null;taggedUsernames?:string|null;onOpenProfile?:(username:string)=>void};
export default function StoryDetailsView({locationLabel,taggedUsernames,onOpenProfile}:Props){
 const tags=storyMentionUsernames(taggedUsernames);
 if(!locationLabel&&!tags.length)return null;
 return <View pointerEvents="box-none" style={styles.wrap}>
  {locationLabel?<Text style={styles.label}>⌖ {locationLabel}</Text>:null}
  {tags.length?<View style={styles.tags}>{tags.map(username=>onOpenProfile?
   <Pressable key={username} accessibilityRole="button" accessibilityLabel={'Abrir perfil de '+username}
    onPress={()=>onOpenProfile(username)} style={styles.tag}><Text style={styles.labelText}>@{username}</Text></Pressable>:
   <View key={username} style={styles.tag}><Text style={styles.labelText}>@{username}</Text></View>)}</View>:null}
 </View>;
}
const styles=StyleSheet.create({
 wrap:{position:'absolute',top:20,left:14,right:14,alignItems:'flex-start',gap:6},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:6},
 label:{maxWidth:'100%',color:'#fff',fontWeight:'800',fontSize:13,backgroundColor:'rgba(0,0,0,.66)',borderRadius:14,overflow:'hidden',paddingHorizontal:11,paddingVertical:7},
 tag:{backgroundColor:'rgba(0,0,0,.72)',borderRadius:14,minHeight:38,justifyContent:'center',paddingHorizontal:10},
 labelText:{fontSize:13,color:'#fff',fontWeight:'800'}
});
