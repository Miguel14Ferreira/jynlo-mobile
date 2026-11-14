import React,{Suspense,lazy,useCallback,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,Modal,Pressable,ScrollView,Share,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../src/lib/auth';
import {socialPostById,likePost,postComments,addPostComment,editPostComment,togglePostCommentLike,setPostLikerPrivacy,deletePost,resolveJynloMedia} from '../../../src/lib/social-feed-api';
import type {FeedItem,SocialComment} from '../../../src/lib/types';
import {MobileTheme} from '../../../src/lib/theme';
import {postMediaItems} from '../../../src/lib/post-album.cjs';
import {sharedPostLink} from '../../../src/lib/shared-post-link.cjs';
import PostEditSheet from '../../../src/components/PostEditSheet';
import AdaptivePostPhoto from '../../../src/components/AdaptivePostPhoto';
import ProtectedPostMedia from '../../../src/components/ProtectedPostMedia';
import {mediaRequestSource} from '../../../src/lib/protected-media-source';
const T=MobileTheme.colors;
const FeedVideo=lazy(()=>import('../../../src/components/FeedVideo'));

export default function NotificationPost(){
 const {postId}=useLocalSearchParams<{postId:string}>();
 const id=typeof postId==='string'&&/^[1-9][0-9]*$/.test(postId)?Number(postId):NaN;
 const valid=Number.isSafeInteger(id)&&id>0;
 const auth=useAuth(),router=useRouter();
 const {width:screenWidth}=useWindowDimensions();
 const [expandedImage,setExpandedImage]=useState<string|null>(null);
 const [editingPost,setEditingPost]=useState<FeedItem|null>(null);
 const [post,setPost]=useState<FeedItem|null>(null);
 const [comments,setComments]=useState<SocialComment[]>([]);
 const [draft,setDraft]=useState('');
 const [editingComment,setEditingComment]=useState<number|null>(null),[editDraft,setEditDraft]=useState('');
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
  setPost(null);setComments([]);setExpandedImage(null);setEditingPost(null);setDraft('');setError('');setLoading(true);setCommentsLoading(true);
  writing.current=false;setBusy(false);
  if(!valid||!auth.token){setLoading(false);setCommentsLoading(false);return()=>{generation.current++;};}
  void refresh(version).finally(()=>{if(version===generation.current)setLoading(false);});
  return()=>{generation.current++;setPost(null);setComments([]);setExpandedImage(null);setEditingPost(null);};
 },[refresh,valid,auth.token]));
 async function like(){
  if(!post||!auth.token||!auth.username||writing.current||!valid)return;
  writing.current=true;setBusy(true);setError('');
  const version=generation.current;
  try{await likePost(id,post.likedByMe,auth.token,auth.username);await refresh(version);}
  catch{if(version===generation.current)setError('Não foi possível confirmar o gosto. Atualiza antes de repetir.');}
  finally{if(version===generation.current){writing.current=false;setBusy(false);}}
 }
 async function toggleLikerPrivacy(){
  if(!post||!auth.token||!auth.username||!valid||writing.current||
   post.authorUsername.toLowerCase()!==auth.username.toLowerCase())return;
  const version=generation.current;
  writing.current=true;setBusy(true);setError('');
  try{
   const confirmed=await setPostLikerPrivacy(id,!Boolean(post.hideLikers),auth.token);
   if(version===generation.current){
    setPost(current=>current?.postId===id?{...current,hideLikers:confirmed}:current);
   }
  }catch{
   if(version===generation.current)setError('Não foi possível guardar a privacidade dos gostos. Confirma o estado antes de repetir.');
  }finally{
   if(version===generation.current){writing.current=false;setBusy(false);}
  }
 }
 function confirmDelete(){
  if(!post||!auth.token||!auth.username||!valid||writing.current||
     post.authorUsername.toLowerCase()!==auth.username.toLowerCase())return;
  const token=auth.token,version=generation.current;
  Alert.alert('Eliminar publicação?', 'A publicação desaparece do perfil e do feed. Esta ação é definitiva.', [
   {text:'Cancelar',style:'cancel'},
   {text:'Eliminar',style:'destructive',onPress:()=>{
    if(version!==generation.current||writing.current)return;
    writing.current=true;setBusy(true);setError('');
    void deletePost(id,token).then(()=>{
     if(version===generation.current)router.back();
    }).catch(e=>{
     if(version===generation.current)
      setError(e instanceof Error?e.message:'Eliminação não confirmada. Verifica a publicação antes de repetir.');
    }).finally(()=>{
     if(version===generation.current){writing.current=false;setBusy(false);}
    });
   }}
  ]);
 }
 async function sharePost(){
  if(!post||!valid)return;
  const contents=[post.content?.trim()||'Publicação desportiva na Jynlo',
   'Por @'+post.authorUsername,sharedPostLink(post)].filter(Boolean).join('\n');
  try{await Share.share({message:contents});}
  catch(e){Alert.alert('Partilhar publicação',e instanceof Error?e.message:'Não foi possível partilhar.');}
 }
 async function commentLike(c:SocialComment){
  if(!auth.token||!auth.username||writing.current||!valid)return;
  const version=generation.current;writing.current=true;setBusy(true);
  try{const updated=await togglePostCommentLike(id,c,auth.token,auth.username);
    if(version===generation.current)setComments(old=>old.map(item=>item.id===c.id?updated:item));
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível gostar do comentário.');}
  finally{if(version===generation.current){writing.current=false;setBusy(false);}}
 }
 async function saveEditedComment(c:SocialComment){
  if(!auth.token||!auth.username||writing.current||!valid||!editDraft.trim()||
    c.authorUsername.toLowerCase()!==auth.username.toLowerCase())return;
  const version=generation.current;writing.current=true;setBusy(true);
  try{const updated=await editPostComment(id,c.id,editDraft,auth.token,auth.username);
    if(version===generation.current){setComments(old=>old.map(item=>item.id===c.id?updated:item));setEditingComment(null);setEditDraft('');}
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível editar o comentário.');}
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
 const album=post?postMediaItems(post):[];
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
    {post.content?.trim()?<Text style={styles.body}>{post.content}</Text>:null}
    {post.location?.trim()?<Text style={styles.note}>⌖ {post.location.trim()}</Text>:null}
    {album.length?<View style={{gap:8}}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={album.length>1} style={{width:'100%'}}>
        {album.map((media,index)=><View key={index} style={{width:Math.max(220,screenWidth-64),gap:5}}>
          <ProtectedPostMedia src={media.url} type={media.type} token={auth.token}
            width={Math.max(220,screenWidth-64)}
            label={'Ampliar fotografia '+(index+1)+' de '+album.length}
            onExpand={setExpandedImage}/>
          {album.length>1?<Text style={styles.note}>{index+1} / {album.length}</Text>:null}
        </View>)}
      </ScrollView>
      {album.length>1?<Text style={styles.note}>Desliza para ver todas as fotografias e vídeos.</Text>:null}
    </View>:null}
    <View style={styles.actions}>
     <Pressable accessibilityRole="button" accessibilityLabel={post.likedByMe?'Retirar gosto':'Gostar'} disabled={busy} onPress={()=>{void like();}} style={styles.action}><Text style={styles.link}>{post.likedByMe?'♥':'♡'} Gostar</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={post.hideLikers&&post.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Lista de gostos privada":"Ver quem gostou"} disabled={Boolean(post.hideLikers&&post.authorUsername.toLowerCase()!==auth.username?.toLowerCase())} onPress={()=>router.push({pathname:'/posts/[postId]/likers',params:{postId:String(id)}})} style={styles.action}><Text style={styles.link}>{post.hideLikers&&post.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Gostos privados":`${post.likeCount} gostos`}</Text></Pressable>
     <Text style={styles.note}>{post.commentCount} comentários</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Partilhar publicação" onPress={()=>{void sharePost();}} style={styles.action}><Text style={styles.link}>↗ Partilhar</Text></Pressable>
    </View>
    {auth.username&&post.authorUsername.toLowerCase()===auth.username.toLowerCase()?
     <Pressable accessibilityRole="button" accessibilityLabel="Editar texto e localização da publicação" disabled={busy} onPress={()=>setEditingPost(post)} style={styles.privacy}>
      <Text style={styles.link}>Editar publicação</Text>
      <Text style={styles.note}>Corrige a descrição ou localização sem perder os gostos e comentários.</Text>
     </Pressable>:null}
    {auth.username&&post.authorUsername.toLowerCase()===auth.username.toLowerCase()?
     <Pressable accessibilityRole="button" accessibilityLabel={post.hideLikers?'Mostrar pessoas que gostaram':'Ocultar pessoas que gostaram'} disabled={busy} onPress={()=>{void toggleLikerPrivacy();}} style={styles.privacy}>
      <Text style={styles.link}>{post.hideLikers?'Mostrar quem gostou':'Ocultar quem gostou'}</Text>
      <Text style={styles.note}>Só tu podes alterar esta preferência.</Text>
     </Pressable>:null}
    {auth.username&&post.authorUsername.toLowerCase()===auth.username.toLowerCase()?
     <Pressable accessibilityRole="button" accessibilityLabel="Eliminar a minha publicação" disabled={busy} onPress={confirmDelete} style={styles.privacy}>
      <Text style={[styles.link,{color:T.danger}]}>Eliminar publicação</Text>
      <Text style={styles.note}>Esta ação é definitiva.</Text>
     </Pressable>:null}
   </View>:null}
   {post?<Text style={styles.heading}>Comentários</Text>:null}
   {post&&commentsLoading?<ActivityIndicator color={T.accent}/>:null}
   {post&&!commentsLoading&&comments.length===0?<Text style={styles.note}>Ainda não há comentários.</Text>:null}
   {post?comments.map(c=><View key={c.id} style={styles.comment}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${c.authorUsername}`} onPress={()=>router.push({pathname:'/social/[username]',params:{username:c.authorUsername}})}><Text style={styles.author}>@{c.authorUsername}</Text></Pressable>
    {editingComment===c.id?<><TextInput multiline maxLength={2000} value={editDraft} onChangeText={setEditDraft}
      style={styles.input} placeholder="Editar comentário" placeholderTextColor={T.muted}/>
      <View style={styles.actions}>
       <Pressable accessibilityRole="button" disabled={busy||!editDraft.trim()} onPress={()=>void saveEditedComment(c)}><Text style={styles.link}>Guardar</Text></Pressable>
       <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setEditingComment(null);setEditDraft('');}}><Text style={styles.link}>Cancelar</Text></Pressable>
      </View></>:<Text style={styles.body}>{c.content}{c.editedAt?' · editado':''}</Text>}
    <View style={styles.actions}>
     <Pressable accessibilityRole="button" accessibilityLabel={c.likedByMe?'Retirar gosto do comentário':'Gostar do comentário'} disabled={busy||!auth.token}
      onPress={()=>void commentLike(c)}><Text style={styles.link}>{c.likedByMe?'♥':'♡'} {c.likeCount||0}</Text></Pressable>
     {auth.username&&c.authorUsername.toLowerCase()===auth.username.toLowerCase()&&editingComment!==c.id?
      <Pressable accessibilityRole="button" accessibilityLabel="Editar o meu comentário" disabled={busy}
       onPress={()=>{setEditingComment(c.id);setEditDraft(c.content);}}><Text style={styles.link}>Editar</Text></Pressable>:null}
    </View>
   </View>):null}
   {post&&auth.token?<View style={styles.editor}>
    <TextInput multiline maxLength={2000} placeholder="Escrever comentário…" placeholderTextColor={T.muted} value={draft} onChangeText={setDraft} style={styles.input} accessibilityLabel="Escrever comentário"/>
    <Pressable accessibilityRole="button" accessibilityLabel="Enviar comentário" disabled={busy||!draft.trim()} onPress={()=>{void comment();}} style={[styles.send,(busy||!draft.trim())&&styles.disabled]}>
     <Text style={styles.sendLabel}>{busy?'A enviar…':'Enviar'}</Text>
    </Pressable>
   </View>:null}
  </ScrollView>
  <PostEditSheet post={editingPost&&post&&editingPost.postId===post.postId?editingPost:null} token={auth.token} username={auth.username}
   onClose={()=>setEditingPost(null)} onSaved={updated=>{setPost(current=>current?.postId===updated.postId?updated:current);setEditingPost(null);}}/>
  <Modal visible={!!expandedImage&&!!post&&!!auth.token} transparent animationType="fade" onRequestClose={()=>setExpandedImage(null)}>
   <View style={styles.photoOverlay}>
    {expandedImage?<Image source={mediaRequestSource(expandedImage,auth.token)} resizeMode="contain" style={styles.fullImage}/>:null}
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar fotografia ampliada" onPress={()=>setExpandedImage(null)} style={styles.closePhoto}><Text style={styles.closePhotoText}>✕ Fechar</Text></Pressable>
   </View>
  </Modal>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:T.background},content:{padding:16,gap:14},
 photoOverlay:{flex:1,backgroundColor:'#020A10',padding:12,justifyContent:'center',gap:12},fullImage:{width:'100%',height:'85%'},closePhoto:{alignSelf:'center',minHeight:48,justifyContent:'center',paddingHorizontal:22,backgroundColor:T.surface,borderWidth:1,borderColor:T.border,borderRadius:14},closePhotoText:{color:T.text,fontWeight:'800'},
 post:{padding:16,gap:12,backgroundColor:T.surface,borderWidth:1,borderColor:T.border,borderRadius:MobileTheme.radius.xl},
 author:{color:T.text,fontSize:15,fontWeight:'900'},handle:{color:T.muted,fontSize:12},body:{color:T.text,fontSize:14,lineHeight:21},
 image:{width:'100%',height:260,backgroundColor:T.raised,borderRadius:MobileTheme.radius.lg},
 actions:{flexDirection:'row',alignItems:'center',gap:12,flexWrap:'wrap'},
 action:{minHeight:MobileTheme.touchTarget,justifyContent:'center'},link:{color:T.accent,fontWeight:'800',fontSize:13},
 note:{color:T.muted,fontSize:12,lineHeight:18},heading:{color:T.text,fontSize:18,fontWeight:'900'},
 comment:{padding:12,gap:7,backgroundColor:T.surface,borderColor:T.border,borderWidth:1,borderRadius:MobileTheme.radius.md},
 privacy:{padding:12,minHeight:MobileTheme.touchTarget,borderWidth:1,borderColor:T.border,borderRadius:MobileTheme.radius.md,gap:5},
 editor:{flexDirection:'row',gap:10,alignItems:'flex-end'},input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:130,padding:12,color:T.text,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,borderRadius:MobileTheme.radius.md},
 send:{minHeight:MobileTheme.touchTarget,paddingHorizontal:14,backgroundColor:T.accent,borderRadius:MobileTheme.radius.md,justifyContent:'center'},
 sendLabel:{color:T.background,fontWeight:'900'},disabled:{opacity:.5},error:{color:T.danger,fontSize:13,lineHeight:20}
});
