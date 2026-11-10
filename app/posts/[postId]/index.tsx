import React,{Suspense,lazy,useCallback,useRef,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../src/lib/auth';
import {socialPostById,likePost,postComments,addPostComment,resolveJynloMedia} from '../../../src/lib/social-feed-api';
import type {FeedItem,SocialComment} from '../../../src/lib/types';
import {MobileTheme} from '../../../src/lib/theme';
const T=MobileTheme.colors;
const FeedVideo=lazy(()=>import('../../../src/components/FeedVideo'));

export default function NotificationPost(){
 const {postId}=useLocalSearchParams<{postId:string}>();
 const id=typeof postId==='string'&&/^[1-9][0-9]*$/.test(postId)?Number(postId):NaN;
 const valid=Number.isSafeInteger(id)&&id>0;
 const auth=useAuth(),router=useRouter();
 const [post,setPost]=useState<FeedItem|null>(null);
 const [comments,setComments]=useState<SocialComment[]>([]);
 const [draft,setDraft]=useState('');
 const [loading,setLoading]=useState(true),[commentsLoading,setCommentsLoading]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),writing=useRef(false);
 const refresh=useCallback(async(version:number)=>{
  if(!valid||!auth.token)return;
  const [postResult,commentResult]=await Promise.allSettled([
   socialPostById(id,auth.token),postComments(id,auth.token)
  ]);
  if(version!==generation.current)return;
  if(postResult.status==='fulfilled')setPost(postResult.value);
  else{setPost(null);setError('Esta publicação já não está disponível ou não tens permissão para a consultar.');}
  if(commentResult.status==='fulfilled')setComments(commentResult.value);
  else setComments([]);
  setCommentsLoading(false);
 },[id,valid,auth.token]);
 useFocusEffect(useCallback(()=>{
  const version=++generation.current;
  setPost(null);setComments([]);setDraft('');setError('');setLoading(true);setCommentsLoading(true);
  writing.current=false;setBusy(false);
  if(!valid||!auth.token){setLoading(false);setCommentsLoading(false);return()=>{generation.current++;};}
  void refresh(version).finally(()=>{if(version===generation.current)setLoading(false);});
  return()=>{generation.current++;setPost(null);setComments([]);};
 },[refresh,valid,auth.token]));
 async function like(){
  if(!post||!auth.token||!auth.username||writing.current||!valid)return;
  writing.current=true;setBusy(true);setError('');
  const version=generation.current;
  try{await likePost(id,post.likedByMe,auth.token,auth.username);await refresh(version);}
  catch{if(version===generation.current)setError('Não foi possível confirmar o gosto. Atualiza antes de repetir.');}
  finally{if(version===generation.current){writing.current=false;setBusy(false);}}
 }
 async function comment(){
  if(!post||!auth.token||!auth.username||!draft.trim()||writing.current||!valid)return;
  const original=draft;writing.current=true;setBusy(true);setError('');
  const version=generation.current;
  try{
   await addPostComment(id,original,auth.token,auth.username);
   if(version===generation.current){setDraft(current=>current===original?'':current);await refresh(version);}
  }catch{if(version===generation.current)setError('Envio não confirmado. Consulta os comentários antes de repetir.');}
  finally{if(version===generation.current){writing.current=false;setBusy(false);}}
 }
 if(!valid)return <SafeAreaView style={styles.screen}><Text style={styles.error}>Publicação inválida.</Text></SafeAreaView>;
 const image=post?resolveJynloMedia(post.imageUrl):null;
 return <SafeAreaView style={styles.screen} edges={['bottom','left','right']}>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   {loading?<ActivityIndicator color={T.accent}/>:null}
   {error?<Text style={styles.error}>{error}</Text>:null}
   {!auth.token?<Pressable onPress={()=>router.push('/login')} accessibilityRole="button"><Text style={styles.link}>Iniciar sessão para consultar a publicação</Text></Pressable>:null}
   {post?<View style={styles.post}>
    <Pressable accessibilityRole="button" accessibilityLabel="Ver perfil do autor" onPress={()=>router.push({pathname:'/social/[username]',params:{username:post.authorUsername}})}>
     <Text style={styles.author}>{post.authorDisplayName||post.authorUsername}</Text>
     <Text style={styles.handle}>@{post.authorUsername}</Text>
    </Pressable>
    <Text style={styles.body}>{post.content||''}</Text>
    {image?<Image source={{uri:image}} style={styles.image} resizeMode="contain"/>:null}
    {post.videoUrl&&resolveJynloMedia(post.videoUrl)?<Suspense fallback={<ActivityIndicator color={T.accent}/>}><FeedVideo uri={resolveJynloMedia(post.videoUrl)!}/></Suspense>:null}
    <View style={styles.actions}>
     <Pressable accessibilityRole="button" accessibilityLabel={post.likedByMe?'Retirar gosto':'Gostar'} disabled={busy} onPress={()=>{void like();}} style={styles.action}><Text style={styles.link}>{post.likedByMe?'♥':'♡'} Gostar</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={post.hideLikers&&post.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Lista de gostos privada":"Ver quem gostou"} disabled={Boolean(post.hideLikers&&post.authorUsername.toLowerCase()!==auth.username?.toLowerCase())} onPress={()=>router.push({pathname:'/posts/[postId]/likers',params:{postId:String(id)}})} style={styles.action}><Text style={styles.link}>{post.hideLikers&&post.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Gostos privados":`${post.likeCount} gostos`}</Text></Pressable>
     <Text style={styles.note}>{post.commentCount} comentários</Text>
    </View>
   </View>:null}
   {post?<Text style={styles.heading}>Comentários</Text>:null}
   {post&&commentsLoading?<ActivityIndicator color={T.accent}/>:null}
   {post&&!commentsLoading&&comments.length===0?<Text style={styles.note}>Ainda não há comentários.</Text>:null}
   {post?comments.map(c=><View key={c.id} style={styles.comment}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${c.authorUsername}`} onPress={()=>router.push({pathname:'/social/[username]',params:{username:c.authorUsername}})}><Text style={styles.author}>@{c.authorUsername}</Text></Pressable>
    <Text style={styles.body}>{c.content}</Text>
   </View>):null}
   {post&&auth.token?<View style={styles.editor}>
    <TextInput multiline maxLength={2000} placeholder="Escrever comentário…" placeholderTextColor={T.muted} value={draft} onChangeText={setDraft} style={styles.input} accessibilityLabel="Escrever comentário"/>
    <Pressable accessibilityRole="button" accessibilityLabel="Enviar comentário" disabled={busy||!draft.trim()} onPress={()=>{void comment();}} style={[styles.send,(busy||!draft.trim())&&styles.disabled]}>
     <Text style={styles.sendLabel}>{busy?'A enviar…':'Enviar'}</Text>
    </Pressable>
   </View>:null}
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:T.background},content:{padding:16,gap:14},
 post:{padding:16,gap:12,backgroundColor:T.surface,borderWidth:1,borderColor:T.border,borderRadius:MobileTheme.radius.xl},
 author:{color:T.text,fontSize:15,fontWeight:'900'},handle:{color:T.muted,fontSize:12},body:{color:T.text,fontSize:14,lineHeight:21},
 image:{width:'100%',height:260,backgroundColor:T.raised,borderRadius:MobileTheme.radius.lg},
 actions:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
 action:{minHeight:MobileTheme.touchTarget,justifyContent:'center'},link:{color:T.accent,fontWeight:'800',fontSize:13},
 note:{color:T.muted,fontSize:12,lineHeight:18},heading:{color:T.text,fontSize:18,fontWeight:'900'},
 comment:{padding:12,gap:7,backgroundColor:T.surface,borderColor:T.border,borderWidth:1,borderRadius:MobileTheme.radius.md},
 editor:{flexDirection:'row',gap:10,alignItems:'flex-end'},input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:130,padding:12,color:T.text,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.md},
 send:{minHeight:MobileTheme.touchTarget,paddingHorizontal:14,backgroundColor:T.accent,borderRadius:MobileTheme.radius.md,justifyContent:'center'},
 sendLabel:{color:T.background,fontWeight:'900'},disabled:{opacity:.5},error:{color:T.danger,fontSize:13,lineHeight:20}
});
