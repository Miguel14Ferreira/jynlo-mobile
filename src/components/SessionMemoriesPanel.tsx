import React,{useCallback,useRef,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {sessionSocialMemories,resolveJynloMedia} from '../lib/social-feed-api';
import type {FeedItem} from '../lib/types';
import {C} from '../lib/theme';

type Props={
 sessionId:number;
 token:string;
 canSharePublicly:boolean;
 completed:boolean;
 canPublish:boolean;
};

/** Uses existing social posts, never publishes an activity automatically. */
export default function SessionMemoriesPanel({
 sessionId,token,canSharePublicly,completed,canPublish
}:Props){
 const router=useRouter();
 const [posts,setPosts]=useState<FeedItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const generation=useRef(0),pending=useRef(false);
 const load=useCallback(async()=>{
  if(pending.current||!canSharePublicly||!token)return;
  const current=++generation.current;
  pending.current=true;
  setLoading(true);setError('');
  try{
   const found=await sessionSocialMemories(sessionId,token);
   if(current!==generation.current)return;
   setPosts(found.filter(post=>post.type==='POST'&&post.sessionId===sessionId));
  }catch{
   if(current!==generation.current)return;
   setPosts([]);setError('Não foi possível carregar as recordações deste jogo.');
  }finally{
   if(current===generation.current){pending.current=false;setLoading(false);}
  }
 },[sessionId,token,canSharePublicly]);

 useFocusEffect(useCallback(()=>{
  // A return from the post composer may have added a new moment.
  pending.current=false;void load();
  return()=>{generation.current++;pending.current=false;setPosts([]);setLoading(true);};
 },[load]));

 if(!canSharePublicly||!token)return null;
 return <View style={styles.panel}>
  <Text style={styles.eyebrow}>JYNLO · MOMENTOS</Text>
  <Text style={styles.heading}>Recordações deste jogo</Text>
  <Text style={styles.hint}>Partilha fotografias, vídeos e momentos do jogo. Nada é publicado automaticamente.</Text>
  <View style={styles.actions}>
   <Pressable accessibilityRole="button" accessibilityLabel="Ver novos momentos desta sessão"
    disabled={loading} onPress={()=>void load()} style={styles.action}>
    <Text style={styles.actionLabel}>Ver novos momentos</Text>
   </Pressable>
   {completed&&canPublish?<Pressable accessibilityRole="button"
    accessibilityLabel="Partilhar um momento desta sessão" style={[styles.action,styles.primary]}
    onPress={()=>router.push({pathname:'/(tabs)',params:{momentSession:String(sessionId)}})}>
    <Text style={styles.primaryLabel}>Partilhar momento</Text>
   </Pressable>:null}
  </View>
  {loading?<Text style={styles.hint}>A carregar recordações…</Text>:
   error?<Text style={styles.error}>{error}</Text>:
   posts.length===0?<Text style={styles.hint}>Ainda não há recordações deste jogo.</Text>:
   <View style={styles.grid}>{posts.map(post=>{
    const firstPhoto=post.imageUrl||post.extraMedia?.find(asset=>asset.mimeType.startsWith('image/'))?.url||null;
    // Authenticated private-media routes require dedicated protected viewers.
    // Never ask an unauthenticated React Native Image to fetch those URLs.
    const preview=firstPhoto&&!firstPhoto.includes('/api/profile-media/')
      ?resolveJynloMedia(firstPhoto):null;
    return <Pressable key={post.postId} accessibilityRole="button"
      accessibilityLabel={'Abrir publicação de @'+post.authorUsername}
      onPress={()=>{if(post.postId)router.push({pathname:'/posts/[postId]',params:{postId:String(post.postId)}});}}
      style={styles.card}>
      {preview?<Image source={{uri:preview}} style={styles.photo} resizeMode="cover"/>:
       post.videoUrl?<View style={styles.mediaPlaceholder}><Text style={styles.actionLabel}>▶ Vídeo</Text></View>:null}
      <View style={styles.copy}>
       <Text style={styles.author}>@{post.authorUsername}</Text>
       {post.content?<Text style={styles.content} numberOfLines={3}>{post.content}</Text>:null}
      </View>
    </Pressable>;
   })}</View>}
 </View>;
}
const styles=StyleSheet.create({
 panel:{backgroundColor:'#0B303E',borderColor:C.border,borderWidth:1,borderRadius:17,padding:16,gap:10},
 eyebrow:{color:C.mint,fontSize:11,fontWeight:'900',letterSpacing:1},
 heading:{color:C.white,fontSize:19,fontWeight:'900'},
 hint:{color:C.muted,fontSize:13,lineHeight:19},
 error:{color:'#FFB8B8',fontSize:13},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 action:{minHeight:44,paddingHorizontal:13,paddingVertical:10,justifyContent:'center',borderRadius:11,borderColor:C.border,borderWidth:1},
 primary:{backgroundColor:C.mint,borderColor:C.mint},
 actionLabel:{color:C.white,fontWeight:'800',fontSize:12},
 primaryLabel:{color:'#062A30',fontWeight:'900',fontSize:12},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
 card:{width:'47%',flexGrow:1,minWidth:135,borderRadius:12,backgroundColor:'#143B48',overflow:'hidden',borderColor:C.border,borderWidth:1},
 photo:{width:'100%',height:130},
 mediaPlaceholder:{width:'100%',height:130,alignItems:'center',justifyContent:'center'},
 copy:{padding:9,gap:5},
 author:{color:C.mint,fontSize:12,fontWeight:'800'},
 content:{color:C.white,fontSize:12,lineHeight:17}
});
