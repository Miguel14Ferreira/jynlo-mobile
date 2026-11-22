import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {ActivityIndicator,Alert,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Message} from './UI';
import {JynloIcon} from './JynloIcon';
import PostAlbumCarousel from './PostAlbumCarousel';
import FeedVideo from './FeedVideo';
import PostImageLightbox,{type ExpandedPostPhotos} from './PostImageLightbox';
import {ChatMentionText} from './ChatMentions';
import {communityPosts,deleteCommunityPost,editCommunityPost,publishCommunityTextPost,type CommunityPost} from '../lib/community-feed-api';
import {publishCommunityPostWithMedia} from '../lib/social-feed-api';
import {validateMedia} from '../lib/social-feed-core.cjs';
import {appendAlbumSelection,postMediaItems,MAX_ALBUM_ITEMS} from '../lib/post-album.cjs';
import {pickerMediaMime} from '../lib/picker-media-format.cjs';
import type {MobileMedia} from '../lib/types';
import {C,MobileTheme} from '../lib/theme';

const MAX_POST=1000;
const when=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':
 d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});};

/** The community feed, as on the web: posts with text, @mentions, photos and videos. Members only. */
export function CommunityFeedPanel({communityId,token,username,canManage}:{communityId:number;token:string;username:string;canManage:boolean}){
 const router=useRouter();
 const [posts,setPosts]=useState<CommunityPost[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [draft,setDraft]=useState(''),[media,setMedia]=useState<MobileMedia[]>([]),[posting,setPosting]=useState(false);
 const [editing,setEditing]=useState<CommunityPost|null>(null),[editText,setEditText]=useState(''),[busy,setBusy]=useState(false);
 const [expanded,setExpanded]=useState<ExpandedPostPhotos|null>(null);
 const version=useRef(0);

 const load=useCallback(async()=>{
  const request=++version.current;
  try{const list=await communityPosts(communityId,token);if(request===version.current){setPosts(list);setError('');}}
  catch(e){if(request===version.current)setError(e instanceof Error?e.message:t('Não foi possível carregar o feed.'));}
  finally{if(request===version.current)setLoading(false);}
 },[communityId,token]);
 useEffect(()=>{setLoading(true);void load();return()=>{version.current++;};},[load]);

 async function pick(source:'gallery'|'camera'){
  const slots=MAX_ALBUM_ITEMS-media.length;
  if(slots<=0){Alert.alert(t('Álbum completo'),t('Remove um ficheiro antes de adicionares outro.'));return;}
  try{
   const ImagePicker=await import('expo-image-picker');
   if(source==='camera'){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted){Alert.alert(t('Câmara sem autorização'),t('Autoriza a câmara nas definições do telemóvel ou escolhe a galeria.'));return;}}
   const result=source==='camera'
    ?await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:.86,videoMaxDuration:30,exif:false,base64:false})
    :await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:.86,allowsMultipleSelection:true,selectionLimit:slots});
   if(result.canceled||!result.assets.length)return;
   const prepared:MobileMedia[]=[];
   for(const asset of result.assets){
    const kind=asset.type==='video'?'video':'image';
    const mime=pickerMediaMime(asset);
    if(!mime){Alert.alert(t('Formato não suportado'),t('Escolhe JPG, PNG, WebP, MP4 ou WebM.'));return;}
    const size=asset.fileSize||0;
    const fault=size>0?validateMedia(mime,size,false):null;
    if(fault){Alert.alert(t('Ficheiro não aceite'),fault);return;}
    prepared.push({uri:asset.uri,type:kind,mimeType:mime,fileName:asset.fileName||`${kind==='video'?'video':'foto'}-${Date.now()}.${kind==='video'?'mp4':'jpg'}`,fileSize:size});
   }
   const next=appendAlbumSelection(media,prepared);
   if(next.error){Alert.alert(t('Álbum não aceite'),next.error);return;}
   setMedia(next.items);
  }catch(e){Alert.alert(t('Não foi possível abrir a galeria'),e instanceof Error?e.message:t('Confirma as permissões do telemóvel.'));}
 }

 async function publish(){
  if(posting||(!draft.trim()&&!media.length))return;
  setPosting(true);setError('');
  try{
   if(media.length)await publishCommunityPostWithMedia(communityId,draft,media,token);
   else await publishCommunityTextPost(communityId,draft,token);
   setDraft('');setMedia([]);await load();
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível publicar.'));}
  finally{setPosting(false);}
 }

 function options(post:CommunityPost){
  const own=post.username.toLowerCase()===username.toLowerCase();
  const items:Array<{text:string;style?:'cancel'|'destructive';onPress?:()=>void}>=[];
  if(own)items.push({text:t('Editar texto'),onPress:()=>{setEditing(post);setEditText(post.body||'');}});
  if(own||canManage)items.push({text:t('Apagar publicação'),style:'destructive',onPress:()=>Alert.alert(t('Apagar publicação?'),t('Deixa de aparecer no feed da comunidade.'),[
   {text:t('Cancelar'),style:'cancel'},{text:t('Apagar'),style:'destructive',onPress:()=>{void remove(post);}}])});
  if(!items.length)return;
  items.push({text:t('Cancelar'),style:'cancel'});
  Alert.alert(own?t('A minha publicação'):t('Publicação da comunidade'),t('Seleciona uma ação.'),items);
 }
 async function saveEdit(){
  if(!editing||busy)return;
  setBusy(true);setError('');
  try{const updated=await editCommunityPost(communityId,editing.id,editText,token);setPosts(list=>list.map(p=>p.id===updated.id?{...p,...updated}:p));setEditing(null);}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível guardar a edição.'));}
  finally{setBusy(false);}
 }
 async function remove(post:CommunityPost){
  setBusy(true);setError('');
  try{await deleteCommunityPost(communityId,post.id,token);setPosts(list=>list.filter(p=>p.id!==post.id));}
  catch{setError(t('Não foi possível apagar a publicação.'));}
  finally{setBusy(false);}
 }

 return <View style={styles.wrap}>
  <View style={styles.composer}>
   <Text style={styles.title}>{t('Escrever no feed')}</Text>
   <TextInput value={draft} onChangeText={setDraft} multiline maxLength={MAX_POST} editable={!posting}
    placeholder={t('Partilha um resultado, uma foto do treino ou uma novidade… Usa @ para identificar alguém.')} placeholderTextColor={C.muted}
    style={styles.input} accessibilityLabel={t('Texto da publicação')}/>
   {media.length?<View style={styles.thumbs}>{media.map((file,index)=><Pressable key={file.uri+index} accessibilityRole="button" accessibilityLabel={t('Remover ficheiro {v}',{v:(index+1)})}
    disabled={posting} onPress={()=>setMedia(list=>list.filter((_,i)=>i!==index))} style={{gap:3}}>
    {file.type==='video'?<View style={styles.videoThumb}><JynloIcon name="video" size={20} color={C.white}/></View>:<Image source={{uri:file.uri}} style={styles.thumb}/>}
    <Text style={styles.meta}>{t('Remover')}</Text></Pressable>)}</View>:null}
   <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Adicionar fotografias ou vídeos')} disabled={posting} onPress={()=>{void pick('gallery');}} style={styles.tool}>
     <JynloIcon name="gallery" size={23} color={C.mint}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir câmara')} disabled={posting} onPress={()=>{void pick('camera');}} style={styles.tool}>
     <JynloIcon name="camera" size={23} color={C.mint}/></Pressable>
    <Text style={[styles.meta,{flex:1,textAlign:'right'}]}>{draft.length}/{MAX_POST}</Text>
   </View>
   <Button title={posting?t('A publicar…'):t('Publicar')} disabled={posting||(!draft.trim()&&!media.length)} onPress={()=>{void publish();}}/>
  </View>
  {error?<Message tone="error">{error}</Message>:null}
  {loading?<ActivityIndicator color={C.mint}/>:null}
  {!loading&&!posts.length&&!error?<Message>{t('Ainda não há publicações. Sê o primeiro a partilhar algo com a comunidade.')}</Message>:null}
  {posts.map(post=>{const album=postMediaItems(post);const own=post.username.toLowerCase()===username.toLowerCase();
   return <View key={post.id} style={styles.card}>
    <View style={styles.row}>
     <Pressable accessibilityRole="link" accessibilityLabel={t('Abrir perfil de {v}',{v:post.username})} style={{flex:1}}
      onPress={()=>router.push({pathname:'/social/[username]',params:{username:post.username}})}>
      <Text style={styles.author}>{post.username}</Text>
      <Text style={styles.meta}>{when(post.createdAt)}{post.editedAt?' · '+t('editada'):''}</Text>
     </Pressable>
     {own||canManage?<Pressable accessibilityRole="button" accessibilityLabel={t('Opções desta publicação')} disabled={busy} onPress={()=>options(post)} hitSlop={8} style={styles.tool}>
      <JynloIcon name="more" size={20} color={C.mint}/></Pressable>:null}
    </View>
    {editing?.id===post.id?<View style={{gap:8}}>
     <TextInput value={editText} onChangeText={setEditText} multiline maxLength={MAX_POST} editable={!busy} style={styles.input} accessibilityLabel={t('Editar publicação')}/>
     <Button title={busy?t('A guardar…'):t('Guardar')} disabled={busy} onPress={()=>{void saveEdit();}}/>
     <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setEditing(null)}/>
    </View>:post.body?<ChatMentionText body={post.body} style={styles.body}/>:null}
    {album.length?<PostAlbumCarousel items={album} onExpand={setExpanded} renderVideo={uri=><FeedVideo uri={uri}/>}/>:null}
   </View>;})}
  <PostImageLightbox key={expanded?.uris[expanded.index]||'closed'} photos={expanded} onClose={()=>setExpanded(null)}/>
 </View>;
}

const styles=StyleSheet.create({
 wrap:{gap:12},
 composer:{gap:10,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 title:{color:C.white,fontSize:16,fontWeight:'900'},
 input:{minHeight:80,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,backgroundColor:C.background,textAlignVertical:'top'},
 row:{flexDirection:'row',alignItems:'center',gap:8},
 tool:{minWidth:MobileTheme.touchTarget,minHeight:MobileTheme.touchTarget,alignItems:'center',justifyContent:'center'},
 thumbs:{flexDirection:'row',flexWrap:'wrap',gap:8},
 thumb:{width:72,height:72,borderRadius:10},
 videoThumb:{width:72,height:72,borderRadius:10,backgroundColor:'#173039',alignItems:'center',justifyContent:'center'},
 card:{gap:10,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 author:{color:C.white,fontWeight:'900',fontSize:15},
 meta:{color:C.muted,fontSize:12},
 body:{color:C.white,fontSize:15,lineHeight:21},
});
