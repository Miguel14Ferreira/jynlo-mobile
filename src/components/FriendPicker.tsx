import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {C} from '../lib/theme';
import {storyMentionFriends,type StoryFriend} from '../lib/social-relations-api';
import {invitableFriends,type PrivateGroup} from '../lib/private-groups-core.cjs';

/** Multi-select of established friends (the server only accepts friends without blocks). */
export function FriendPicker({token,group,selected,onChange,disabled,max}:{
 token:string;group:PrivateGroup|null;selected:string[];onChange:(next:string[])=>void;disabled?:boolean;max:number;
}){
 const [friends,setFriends]=useState<StoryFriend[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState('');
 useEffect(()=>{let live=true;setLoading(true);setError('');
  storyMentionFriends(token).then(list=>{if(live)setFriends(list);})
   .catch(()=>{if(live)setError('Não foi possível carregar os teus amigos.');})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};},[token]);
 const list=invitableFriends(friends,group,query);
 const toggle=(u:string)=>{
  if(disabled)return;
  if(selected.includes(u))onChange(selected.filter(x=>x!==u));
  else if(selected.length<max)onChange([...selected,u]);
 };
 return <View style={{gap:8}}>
  <Text style={styles.label}>Seleciona os amigos que queres convidar · {selected.length} selecionado{selected.length===1?'':'s'}</Text>
  <TextInput value={query} onChangeText={setQuery} placeholder="Pesquisa por nome ou username…" placeholderTextColor={C.muted}
   style={styles.input} autoCorrect={false} autoCapitalize="none" accessibilityLabel="Pesquisar amigos" editable={!disabled}/>
  {loading?<ActivityIndicator color={C.mint}/>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {!loading&&!error&&!list.length?<Text style={styles.muted}>{query.trim()?'Não encontrámos amigos com esse nome.':'Não há amigos disponíveis para adicionar.'}</Text>:null}
  {list.slice(0,60).map(f=>{const on=selected.includes(f.username);const name=f.nickname||f.fullName||f.username;
   return <Pressable key={f.username} accessibilityRole="checkbox" accessibilityState={{checked:on,disabled}} accessibilityLabel={name}
    onPress={()=>toggle(f.username)} style={[styles.row,on&&styles.rowOn]}>
    <View style={[styles.box,on&&styles.boxOn]}><Text style={styles.tick}>{on?'✓':''}</Text></View>
    <View style={{flex:1}}><Text style={styles.name} numberOfLines={1}>{name}</Text><Text style={styles.muted} numberOfLines={1}>@{f.username}</Text></View>
   </Pressable>;})}
 </View>;
}
const styles=StyleSheet.create({
 label:{color:C.white,fontWeight:'800',fontSize:14},muted:{color:C.muted,fontSize:13},error:{color:C.danger,fontSize:13},
 input:{minHeight:46,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface},
 row:{flexDirection:'row',alignItems:'center',gap:12,minHeight:56,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 rowOn:{borderColor:C.mint,backgroundColor:'#124B48'},
 box:{width:24,height:24,borderRadius:6,borderWidth:2,borderColor:C.muted,alignItems:'center',justifyContent:'center'},
 boxOn:{borderColor:C.mint,backgroundColor:C.mint},tick:{color:C.background,fontWeight:'900',fontSize:14},
 name:{color:C.white,fontWeight:'800',fontSize:15}
});
