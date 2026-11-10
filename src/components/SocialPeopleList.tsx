import React,{useCallback,useRef,useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {Loader,Message,Page} from './UI';
import {MobileTheme} from '../lib/theme';
import {useAuth} from '../lib/auth';
import {resolveJynloMedia} from '../lib/social-feed-api';
import {followingPeople,postLikers,type PeopleListKind,type SocialPerson} from '../lib/social-relations-api';

type Props={kind:PeopleListKind;username:string}|{postId:number};
const T=MobileTheme.colors;
export default function SocialPeopleList(props:Props){
 const auth=useAuth();
 const [people,setPeople]=useState<SocialPerson[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const generation=useRef(0);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setPeople([]);setLoading(true);setError('');
  const task='postId' in props?postLikers(props.postId,auth.token):
    followingPeople(props.username,props.kind,auth.token);
  void task.then(result=>{if(version===generation.current)setPeople(result);})
   .catch(()=>{if(version===generation.current)setError('Não foi possível carregar esta lista. Tenta abrir novamente.');})
   .finally(()=>{if(version===generation.current)setLoading(false);});
  return()=>{generation.current++;setPeople([]);};
 },[auth.token,'postId' in props?props.postId:props.username,'postId' in props?'likers':props.kind]));
 const title='postId' in props?'Quem gostou':props.kind==='followers'?'Seguidores':'A seguir';
 return <Page>
  <Text style={styles.heading}>{title}</Text>
  <Text style={styles.sub}>Perfis apresentados pela Jynlo. Os dados e a visibilidade dependem das permissões do servidor.</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!loading&&!error&&people.length===0?<Message>Não existem pessoas para mostrar nesta lista.</Message>:null}
  {people.map(person=>{
   const uri=resolveJynloMedia(person.profilePicUrl);
   const name=person.nickname?.trim()||person.fullName?.trim()||person.username;
   return <View key={person.username} style={styles.person}>
    <View style={styles.avatar}>{uri?<Image style={styles.photo} source={{uri}}/>:<Text style={styles.initial}>{person.username.charAt(0).toUpperCase()}</Text>}</View>
    <View style={styles.identity}><Text style={styles.name} numberOfLines={1}>{name}</Text><Text style={styles.handle} numberOfLines={1}>@{person.username}</Text></View>
   </View>;
  })}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{fontSize:25,color:T.text,fontWeight:'900'},sub:{fontSize:12,lineHeight:19,color:T.muted},
 person:{flexDirection:'row',alignItems:'center',gap:12,minHeight:76,padding:12,backgroundColor:T.surface,borderWidth:1,borderColor:T.border,borderRadius:MobileTheme.radius.lg},
 avatar:{width:49,height:49,borderRadius:25,overflow:'hidden',backgroundColor:T.raised,alignItems:'center',justifyContent:'center'},
 photo:{width:'100%',height:'100%'},initial:{fontSize:19,color:T.accent,fontWeight:'900'},
 identity:{flex:1,gap:4},name:{fontSize:15,color:T.text,fontWeight:'900'},handle:{fontSize:12,color:T.muted}
});
