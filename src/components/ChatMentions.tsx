import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {StyleProp,TextStyle} from 'react-native';
import {useRouter} from 'expo-router';
import {searchStoryMentionProfiles,type StoryFriend} from '../lib/social-relations-api';
import {mentionTerm,insertMention,splitMentions} from '../lib/chat-mentions.cjs';
import {C} from '../lib/theme';

/** Safe, pressable text links for @handles in ordinary chat and feed bodies. */
export function ChatMentionText({body,style}:{body:string;style?:StyleProp<TextStyle>}){
 const router=useRouter();
 const pieces=useMemo(()=>splitMentions(body),[body]);
 return <Text style={style}>
  {pieces.map((piece,i)=>piece.username
    ?<Text key={i} accessibilityRole="link"
      accessibilityLabel={'Abrir perfil de @'+piece.username} style={styles.mention}
      onPress={()=>router.push({pathname:'/social/[username]',params:{username:piece.username!}})}>{piece.text}</Text>
    :<Text key={i}>{piece.text}</Text>)}
 </Text>;
}

/** Same suggestion UI for community and permanent-team chats.
 * It offers discoverable public profiles, not only existing group members. */
export function ChatMentionSuggestions({draft,token,onChange,disabled=false}:{
 draft:string;token:string|null;onChange:(text:string)=>void;disabled?:boolean;
}){
 const term=mentionTerm(draft);
 const [options,setOptions]=useState<StoryFriend[]>([]);
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  let active=true;
  setOptions([]);
  setLoading(Boolean(term&&token&&!disabled));
  if(!term||!token||disabled){setLoading(false);return()=>{active=false;};}
  const timeout=setTimeout(()=>{
   void searchStoryMentionProfiles(term,token).then(people=>{
    if(active)setOptions(people.filter(p=>p.username.toLowerCase().includes(term.toLowerCase())).slice(0,5));
   }).catch(()=>{if(active)setOptions([]);})
    .finally(()=>{if(active)setLoading(false);});
  },250);
  return()=>{active=false;clearTimeout(timeout);};
 },[term,token,disabled]);
 if(!term||disabled||(!loading&&!options.length))return null;
 return <View style={styles.box} accessibilityLabel="Sugestões de utilizadores a identificar">
  {loading?<Text style={styles.loading}>A procurar perfis…</Text>:null}
  {options.map(person=><Pressable key={person.username} accessibilityRole="button"
   accessibilityLabel={'Identificar @'+person.username}
   onPress={()=>onChange(insertMention(draft,person.username))} style={styles.choice}>
    <Text style={styles.handle}>@{person.username}</Text>
    <Text numberOfLines={1} style={styles.name}>{person.fullName||person.nickname||''}</Text>
   </Pressable>)}
 </View>;
}
const styles=StyleSheet.create({
 mention:{color:C.mint,fontWeight:'800',textDecorationLine:'underline'},
 box:{borderWidth:1,borderColor:'#439B91',borderRadius:13,backgroundColor:'#092F3C',
  padding:7,gap:2,maxHeight:245},
 loading:{color:C.muted,fontSize:12,padding:8},
 choice:{flexDirection:'row',alignItems:'center',gap:10,minHeight:44,
  paddingVertical:9,paddingHorizontal:12,borderRadius:9,backgroundColor:'#124651'},
 handle:{color:C.mint,fontWeight:'800',fontSize:14},
 name:{color:C.white,fontSize:12,flexShrink:1}
});
