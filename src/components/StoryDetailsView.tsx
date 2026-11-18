import React from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {storyMentionUsernames} from '../lib/story-details.cjs';
import {JynloIcon} from './JynloIcon';
type Props={locationLabel?:string|null;taggedUsernames?:string|null;showTime?:boolean;createdAt?:string|null;onOpenProfile?:(username:string)=>void};
export default function StoryDetailsView({locationLabel,taggedUsernames,showTime=false,createdAt,onOpenProfile}:Props){
 const date=createdAt?new Date(createdAt):null;
 const timestamp=showTime&&date&&Number.isFinite(date.getTime())
  ?date.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):null;
 const tags=storyMentionUsernames(taggedUsernames);
 if(!locationLabel&&!tags.length&&!timestamp)return null;
 return <View pointerEvents="box-none" style={styles.wrap}>
  {timestamp?<View style={styles.timeBadge}><Text style={styles.locationText}>{timestamp}</Text></View>:null}
  {locationLabel?<View style={styles.locationBadge}><JynloIcon name="location" size={15} color="#fff"/><Text style={styles.locationText} numberOfLines={2}>{locationLabel}</Text></View>:null}
  {tags.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}
   keyboardShouldPersistTaps="handled" style={styles.tagsStrip} contentContainerStyle={styles.tags}>
   {tags.map(username=>onOpenProfile?
   <Pressable key={username} accessibilityRole="button" accessibilityLabel={'Abrir perfil de '+username}
    onPress={()=>onOpenProfile(username)} style={styles.tag}><Text style={styles.labelText}>@{username}</Text></Pressable>:
   <View key={username} style={styles.tag}><Text style={styles.labelText}>@{username}</Text></View>)}
   </ScrollView>:null}
 </View>;
}
const styles=StyleSheet.create({
 wrap:{position:'absolute',top:20,left:14,right:14,alignItems:'flex-start',gap:6},
 tagsStrip:{maxWidth:'100%',flexGrow:0},
 tags:{flexDirection:'row',alignItems:'center',gap:6,paddingRight:12},
 timeBadge:{backgroundColor:'rgba(0,0,0,.72)',borderRadius:13,paddingHorizontal:10,paddingVertical:6},
 locationBadge:{maxWidth:'100%',flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(0,0,0,.66)',borderRadius:14,paddingHorizontal:11,paddingVertical:7},
 locationText:{color:'#fff',fontWeight:'800',fontSize:13,flexShrink:1},
 label:{maxWidth:'100%',color:'#fff',fontWeight:'800',fontSize:13,backgroundColor:'rgba(0,0,0,.66)',borderRadius:14,overflow:'hidden',paddingHorizontal:11,paddingVertical:7},
 tag:{backgroundColor:'rgba(0,0,0,.72)',borderRadius:14,minHeight:40,justifyContent:'center',paddingHorizontal:10},
 labelText:{fontSize:13,color:'#fff',fontWeight:'800'}
});
