import React,{useCallback,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {profilePosts,resolveJynloMedia} from '../lib/social-feed-api';
import type {FeedItem} from '../lib/types';
import {C,MobileTheme} from '../lib/theme';
import {Button,Loader,Message} from './UI';

/** Public profile gallery. Posts remain until the author removes them; Stories are separate. */
export default function ProfilePosts({username,token}:{username:string;token:string|null}){
 const router=useRouter();
 const [items,setItems]=useState<FeedItem[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[hasMore,setHasMore]=useState(false);
 const generation=useRef(0),nextPage=useRef(0),busy=useRef(false),loadedIdentity=useRef('');
 const identity=username+'|'+(token||'');
 const sameProfile=loadedIdentity.current===identity;
 const visibleItems=sameProfile?items:[];
 const load=useCallback(async(version:number)=>{
  if(busy.current||!token||!username||loadedIdentity.current!==identity)return;
  const page=nextPage.current;
  busy.current=true;setLoading(true);setError('');
  try{
   const records=await profilePosts(username,token,page);
   if(version!==generation.current||loadedIdentity.current!==identity)return;
   setItems(current=>page===0?records:[...current,...records.filter(item=>!current.some(existing=>existing.postId===item.postId))]);
   nextPage.current=page+1;
   setHasMore(records.length===20);
  }catch(e){
   if(version===generation.current&&loadedIdentity.current===identity)
    setError(e instanceof Error?e.message:'Não foi possível carregar as publicações.');
  }finally{
   // Old responses may settle after navigation. Never unlock another request generation.
   if(version===generation.current){busy.current=false;setLoading(false);}
  }
 },[username,token,identity]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  busy.current=false;nextPage.current=0;loadedIdentity.current=identity;
  setItems([]);setError('');setHasMore(false);setLoading(false);
  void load(version);
  return()=>{generation.current++;};
 },[load,identity]));
 if(!token)return null;
 return <View style={styles.section}>
  <Text style={styles.title}>Publicações</Text>
  <Text style={styles.description}>Momentos partilhados no perfil, disponíveis até serem apagados pelo autor.</Text>
  <View style={styles.grid}>
   {visibleItems.map(item=><Pressable key={item.postId} accessibilityRole="button"
    accessibilityLabel={'Ver publicação de '+item.authorUsername}
    onPress={()=>item.postId&&router.push({pathname:'/posts/[postId]',params:{postId:String(item.postId)}})}
    style={styles.post}>
    {item.imageUrl?<Image source={{uri:resolveJynloMedia(item.imageUrl)||undefined}} style={styles.image} resizeMode="cover"/>:
     item.videoUrl?<View style={styles.placeholder}><Text style={styles.mediaIcon}>▶</Text><Text style={styles.content} numberOfLines={2}>{item.content}</Text></View>:
     <View style={styles.placeholder}><Text style={styles.content} numberOfLines={5}>{item.content}</Text></View>}
    <View style={styles.meta}><Text style={styles.metaText}>♡ {item.likeCount}  ·  ◯ {item.commentCount}</Text></View>
   </Pressable>)}
  </View>
  {sameProfile&&!loading&&!error&&visibleItems.length===0?<Text style={styles.empty}>Ainda não existem publicações neste perfil.</Text>:null}
  {sameProfile&&!!error?<Message tone="error">{error}</Message>:null}
  {sameProfile&&loading?<Loader/>:null}
  {sameProfile&&!loading&&(hasMore||!!error)?<Button secondary title={error?'Tentar novamente':'Ver mais publicações'} onPress={()=>void load(generation.current)}/>:null}
 </View>;
}
const T=MobileTheme.colors;
const styles=StyleSheet.create({
 section:{gap:13},title:{fontSize:19,fontWeight:'900',color:C.white},description:{color:T.muted,fontSize:12,lineHeight:18},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:9},post:{width:'48%',borderRadius:14,overflow:'hidden',backgroundColor:T.surface,borderWidth:1,borderColor:T.border},
 image:{width:'100%',height:145},placeholder:{height:145,backgroundColor:T.raised,justifyContent:'center',alignItems:'center',padding:10,gap:6},
 mediaIcon:{fontSize:27,color:T.accent},content:{color:T.text,fontSize:12,lineHeight:18,textAlign:'center'},
 meta:{paddingHorizontal:10,paddingVertical:9},metaText:{fontSize:11,color:T.muted},empty:{fontSize:13,color:T.muted,paddingVertical:14}
});
