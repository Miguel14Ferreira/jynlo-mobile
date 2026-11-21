import React,{useCallback,useRef,useState} from 'react';
import {ActivityIndicator,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import {hiddenFeedPosts,restoreFeedPost} from '../src/lib/social-feed-api';
import {readHiddenFeedEntries,writeHiddenFeedEntries} from '../src/lib/feed-visibility-store';
import {showEntry} from '../src/lib/feed-visibility.cjs';
import type {FeedItem} from '../src/lib/types';

/** Posts hidden from the feed in this account (shared with the web), with "Voltar a mostrar". */
export default function HiddenPostsScreen(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<FeedItem[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [restoring,setRestoring]=useState<number|null>(null);
 const generation=useRef(0);
 const load=useCallback(async()=>{
  const id=++generation.current;setError('');
  if(!auth.token){setItems([]);setLoading(false);return;}
  setLoading(true);
  try{const list=await hiddenFeedPosts(auth.token);if(id===generation.current)setItems(list);}
  catch{if(id===generation.current)setError('Não foi possível carregar as publicações ocultas.');}
  finally{if(id===generation.current)setLoading(false);}
 },[auth.token]);
 useFocusEffect(useCallback(()=>{void load();return()=>{generation.current++;};},[load]));
 async function restore(postId:number){
  if(restoring!==null||!auth.token)return;
  setRestoring(postId);setNotice('');setError('');
  try{
   await restoreFeedPost(postId,auth.token);
   setItems(prev=>prev.filter(i=>i.postId!==postId));
   // Also clear the copy kept on this phone, so the post really comes back to the feed.
   if(auth.username){
    const local=await readHiddenFeedEntries(auth.username).catch(()=>[] as string[]);
    await writeHiddenFeedEntries(auth.username,showEntry(local,'post:'+postId)).catch(()=>{});
   }
   setNotice('A publicação voltou a aparecer no teu feed.');
  }catch{setError('Não foi possível repor a publicação. Atualiza a lista e tenta de novo.');}
  finally{setRestoring(null);}
 }
 return <Page>
  <Eyebrow>FEED</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.heading}>Publicações ocultas</Text>
  <Text style={styles.sub}>O que ocultaste do teu feed, nesta conta. Quem publicou não é avisado.</Text>
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/feed-hidden'}})}/>:null}
  {notice?<Message>{notice}</Message>:null}
  {loading?<Loader/>:null}
  {error?<><Message tone="error">{error}</Message><Button secondary title="Tentar novamente" onPress={()=>{void load();}}/></>:null}
  {!loading&&!error&&auth.token&&!items.length?<Message>Não tens publicações ocultas nesta conta.</Message>:null}
  {items.map(item=><View key={item.postId} style={styles.card}>
   <View style={styles.row}>
    {item.imageUrl?<Image source={{uri:item.imageUrl}} style={styles.thumb}/>:null}
    <View style={{flex:1,gap:3}}>
     <Text style={styles.author} numberOfLines={1}>{item.authorDisplayName||item.authorUsername}</Text>
     <Text style={styles.sub} numberOfLines={3}>{item.content?.trim()||'Publicação com fotografia ou vídeo'}</Text>
    </View>
   </View>
   <View style={styles.actions}>
    <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/posts/[postId]',params:{postId:String(item.postId)}})} style={styles.link}>
     <Text style={styles.linkText}>Ver publicação</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={'Voltar a mostrar a publicação de '+(item.authorDisplayName||item.authorUsername)}
     disabled={restoring!==null} onPress={()=>{void restore(item.postId!);}} style={[styles.outline,restoring!==null&&{opacity:.6}]}>
     {restoring===item.postId?<ActivityIndicator color={C.mint}/>:<Text style={styles.outlineText}>Voltar a mostrar</Text>}</Pressable>
   </View>
  </View>)}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{color:C.white,fontSize:28,fontWeight:'900'},sub:{color:C.muted,fontSize:14,lineHeight:20},
 card:{gap:10,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 row:{flexDirection:'row',gap:12,alignItems:'center'},thumb:{width:56,height:56,borderRadius:10,backgroundColor:C.border},
 author:{color:C.white,fontSize:16,fontWeight:'800'},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 link:{minHeight:40,justifyContent:'center',paddingHorizontal:4},linkText:{color:C.mint,fontWeight:'800'},
 outline:{minHeight:40,minWidth:150,alignItems:'center',justifyContent:'center',paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:C.border},
 outlineText:{color:C.white,fontWeight:'800'}
});
