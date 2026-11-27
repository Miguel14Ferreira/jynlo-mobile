import React from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {t} from '../lib/i18n';
import {useAuth} from '../lib/auth';
import {friendsGoingLabel,useFriendsGoing} from '../lib/friends-going';
import {resolveJynloMedia} from '../lib/social-feed-api';

/** "👥 João e mais 2 amigos vão" with their photos. Renders nothing when no friend is in the game. */
export function FriendsGoing({sessionId}:{sessionId:number}){
 const auth=useAuth();
 const data=useFriendsGoing(sessionId,auth.token??null);
 if(!data)return null;
 const label=friendsGoingLabel(data,t);
 return <View style={styles.row} accessibilityLabel={label}>
  <View style={styles.faces}>
   {data.friends.slice(0,3).map((f,i)=>resolveJynloMedia(f.profilePicUrl)
    ?<Image key={f.username} source={{uri:resolveJynloMedia(f.profilePicUrl)!}} style={[styles.face,i>0&&styles.overlap]}/>
    :<View key={f.username} style={[styles.face,styles.initial,i>0&&styles.overlap]}><Text style={styles.initialText}>{(f.fullName||f.username).charAt(0).toUpperCase()}</Text></View>)}
  </View>
  <Text style={styles.text} numberOfLines={1}>{label}</Text>
 </View>;
}

const styles=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:6,marginTop:4},
 faces:{flexDirection:'row'},
 face:{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#0b2533'},
 overlap:{marginLeft:-6},
 initial:{backgroundColor:'#1d4d5c',alignItems:'center',justifyContent:'center'},
 initialText:{color:'#eafff9',fontSize:10,fontWeight:'800'},
 text:{color:'#7ae5c5',fontSize:13,fontWeight:'700',flexShrink:1},
});
