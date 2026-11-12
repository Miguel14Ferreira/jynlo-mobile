import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Animated,FlatList,Image,Modal,Pressable,RefreshControl,ScrollView,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
// Load the native media picker only when the user explicitly opens the gallery.
// Native video is loaded on demand for actual video content.
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE} from '../../src/lib/api';
import {socialFeed,storyFeed,myStories,likePost,postComments,addPostComment,publishPost,publishStory,toggleStoryLike,replyToStory,storyById,deleteStory,resolveJynloMedia} from '../../src/lib/social-feed-api';
import {groupStories,validateMedia} from '../../src/lib/social-feed-core.cjs';
import {C,MobileTheme} from '../../src/lib/theme';
import type {FeedItem,SocialStory,SocialComment,MobileMedia} from '../../src/lib/types';

type StoriesGroup={key:string;name:string;avatar:string|null;stories:SocialStory[]};
const {background:INDIGO,surface:PANEL,border:BORDER,accent:TEAL,muted:MUTED,text:WHITE}=MobileTheme.colors;
const maxPostLength=1000;
const startLetter=(s:string)=>s.replace(/^@/,'').charAt(0).toUpperCase()||'J';
const timeAgo=(date:string)=>{const x=Date.parse(date);if(!Number.isFinite(x))return 'Recentemente';const seconds=Math.max(0,Math.floor((Date.now()-x)/1000));if(seconds<60)return 'Agora';if(seconds<3600)return `${Math.floor(seconds/60)} min`;if(seconds<86400)return `${Math.floor(seconds/3600)} h`;return `${Math.floor(seconds/86400)} d`;};
const mediaSource=(url:string|null|undefined)=>(url?.startsWith('file:')||url?.startsWith('content:'))?url:resolveJynloMedia(url);

const FeedVideo=lazy(()=>import('../../src/components/FeedVideo'));
function MediaVideo({uri,story=false,paused=false,onEnd}:{uri:string;story?:boolean;paused?:boolean;onEnd?:()=>void}){
 return <Suspense fallback={<View style={story?styles.storyVideo:styles.postVideo}/>}>
  <FeedVideo uri={uri} story={story} paused={paused} onEnd={onEnd}/>
 </Suspense>;
}
function CircleAvatar({name,size=42,image}:{name:string;size?:number;image?:string|null}){
  const src=mediaSource(image);
  return <View style={[styles.avatar,{width:size,height:size,borderRadius:size/2}]}>{src?
    <Image source={{uri:src}} style={{width:size,height:size,borderRadius:size/2}}/>:
    <Text style={[styles.avatarLetter,{fontSize:size*.38}]}>{startLetter(name)}</Text>}</View>;
}
function SectionHeader({eyebrow,title,action,onPress}:{eyebrow?:string;title:string;action?:string;onPress?:()=>void}){
  return <View style={styles.sectionHead}><View style={{flex:1,gap:3}}>{eyebrow?<Text style={styles.eyebrow}>{eyebrow}</Text>:null}<Text style={styles.sectionTitle}>{title}</Text></View>{action&&onPress?<Pressable onPress={onPress} style={styles.ghostButton} accessibilityRole="button"><Text style={styles.ghostButtonText}>{action}</Text></Pressable>:null}</View>;
}

function StoryViewer({group,groups,onClose,onDeleted,onUpdated,token,username}:{group:StoriesGroup|null;groups:StoriesGroup[];onClose:()=>void;onDeleted:()=>void;onUpdated:(story:SocialStory)=>void;token:string|null;username:string|null}){
  const [currentKey,setCurrentKey]=useState<string|null>(null);
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [replyText,setReplyText]=useState(''),[storyBusy,setStoryBusy]=useState(false),[replyFocused,setReplyFocused]=useState(false);
  const submittingStory=useRef(false);
  const longPress=useRef(false);
  const touchStartY=useRef<number|null>(null);
  const progress=useRef(new Animated.Value(0)).current;
  const remaining=useRef(1);
  React.useEffect(()=>{
    setCurrentKey(group?.key||null);setIndex(0);setPaused(false);setReplyText('');
    remaining.current=1;progress.setValue(0);longPress.current=false;
  },[group?.key,progress]);
  const activeGroup=groups.find(entry=>entry.key===currentKey)||group;
  const story=activeGroup?.stories[index];
  React.useEffect(()=>{setReplyText('');setReplyFocused(false);},[story?.id]);
  const resetProgress=()=>{remaining.current=1;progress.stopAnimation();progress.setValue(0);setReplyText('');};
  const go=(direction:-1|1)=>{
    if(!activeGroup||submittingStory.current||replyFocused)return;
    if(direction===-1&&index>0){resetProgress();setIndex(i=>i-1);return;}
    if(direction===1&&index<activeGroup.stories.length-1){resetProgress();setIndex(i=>i+1);return;}
    const groupIndex=groups.findIndex(entry=>entry.key===activeGroup.key);
    const nextGroup=groups[groupIndex+direction];
    if(nextGroup){resetProgress();setCurrentKey(nextGroup.key);setIndex(direction===1?0:nextGroup.stories.length-1);return;}
    if(direction===1)onClose();
  };
  // Drive both the visible progress bar and photo advancement from one animation.
  // Pausing resumes from the remaining duration rather than restarting 6 seconds.
  React.useEffect(()=>{
    if(!story||story.video||paused||replyFocused||storyBusy)return;
    const animation=Animated.timing(progress,{toValue:1,duration:Math.max(50,6000*remaining.current),useNativeDriver:false});
    animation.start(({finished})=>{
      if(finished){
        const groupIndex=groups.findIndex(entry=>entry.key===activeGroup?.key);
        if(activeGroup&&index<activeGroup.stories.length-1){remaining.current=1;progress.setValue(0);setIndex(i=>i+1);}
        else if(groupIndex>=0&&groupIndex<groups.length-1){remaining.current=1;progress.setValue(0);setCurrentKey(groups[groupIndex+1].key);setIndex(0);}
        else onClose();
      }
    });
    return ()=>{animation.stop();};
  },[story?.id,story?.video,paused,replyFocused,storyBusy,index,currentKey,groups,activeGroup?.key,onClose,progress]);
  if(!activeGroup||!story)return null;
  const uri=mediaSource(story.mediaUrl);
  const ownStory=story.authorUsername.toLowerCase()===username?.toLowerCase();
  async function toggleLike(){
    if(!story||!token||!username||submittingStory.current)return;
    submittingStory.current=true;setStoryBusy(true);setPaused(true);
    try{const updated=await toggleStoryLike(story.id,Boolean(story.likedByMe),token,username);onUpdated(updated);}
    catch(e){Alert.alert('Gosto na Story',e instanceof Error?e.message:'Não foi possível atualizar o gosto.');}
    finally{submittingStory.current=false;setStoryBusy(false);setPaused(false);}
  }
  async function sendReply(){
    const message=replyText.trim();
    if(!story||!token||!username||ownStory||!message||submittingStory.current)return;
    submittingStory.current=true;setStoryBusy(true);setPaused(true);
    try{
      await replyToStory(story.id,message,token,username);
      setReplyText(current=>current.trim()===message?'':current);
      Alert.alert('Resposta enviada','A tua resposta ficou guardada em privado. O autor recebe um aviso se tiver as notificações ativadas.');
    }catch(e){Alert.alert('Resposta à Story',e instanceof Error?e.message:'Não foi possível confirmar a resposta. Verifica antes de repetires.');}
    finally{submittingStory.current=false;setStoryBusy(false);setPaused(false);}
  }
  function confirmDeleteStory(){
    if(!story||!story.canDelete||!token||submittingStory.current)return;
    const storyId=story.id,actorToken=token;
    setPaused(true);
    Alert.alert('Eliminar Story?', 'Esta Story será removida antes das 24 horas. A ação é definitiva.', [
      {text:'Cancelar',style:'cancel',onPress:()=>setPaused(false)},
      {text:'Eliminar',style:'destructive',onPress:()=>{
        if(submittingStory.current)return;
        submittingStory.current=true;setStoryBusy(true);
        void deleteStory(storyId,actorToken).then(()=>{onClose();onDeleted();})
          .catch(e=>Alert.alert('Story',e instanceof Error?e.message:'Não foi possível confirmar a eliminação.'))
          .finally(()=>{submittingStory.current=false;setStoryBusy(false);setPaused(false);});
      }}
    ]);
  }
  async function shareStory(){
    if(!story||submittingStory.current)return;
    setPaused(true);
    try{await Share.share({message:[`Story de ${story.displayName} na Jynlo`,story.caption?.trim(),uri?.startsWith('https://')?uri:null].filter(Boolean).join('\n')});}
    catch(e){Alert.alert('Partilhar Story',e instanceof Error?e.message:'Não foi possível partilhar.');}
    finally{setPaused(false);}
  }
  const tapZone=(direction:-1|1)=>({
    onPress:()=>{if(!longPress.current)go(direction);},
    onPressIn:()=>{longPress.current=false;setPaused(true);progress.stopAnimation(value=>{remaining.current=Math.max(0,1-value);});},
    onPressOut:()=>setPaused(false),
    onLongPress:()=>{longPress.current=true;setPaused(true);},
    delayLongPress:250
  });
  return <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={styles.storyOverlay}
      onTouchStart={event=>{touchStartY.current=event.nativeEvent.pageY;}}
      onTouchEnd={event=>{
        const start=touchStartY.current;
        touchStartY.current=null;
        if(start!==null&&event.nativeEvent.pageY-start>110)onClose();
      }}
      onTouchCancel={()=>{touchStartY.current=null;}}>
      <View style={styles.storyProgress}>{activeGroup.stories.map((entry,i)=><Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Ir para Story ${i+1}`} onPress={()=>{resetProgress();setIndex(i);}} style={styles.progressPart}>
        {i<index?<View style={styles.storyProgressFill}/>:i===index?<Animated.View style={[styles.storyProgressFill,{width:story.video?'100%':progress.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/>:null}
      </Pressable>)}</View>
      <View style={styles.storyTop}><CircleAvatar name={story.displayName} image={activeGroup.avatar} size={34}/><Text style={styles.storyUser}>{activeGroup.name}</Text><Pressable onPress={onClose} style={styles.closeStory} accessibilityRole="button" accessibilityLabel="Fechar Story"><Text style={styles.closeStoryText}>✕</Text></Pressable></View>
      <View style={styles.storyMedia}>{uri?(story.video?<MediaVideo key={story.id} uri={uri} story paused={paused||replyFocused||storyBusy} onEnd={()=>go(1)}/>:<Image source={{uri}} resizeMode="contain" style={styles.storyImage}/>):<Text style={styles.storyCaption}>Media indisponível</Text>}
        {story.caption?.trim()?<View pointerEvents="none" style={styles.storyCaptionLayer}><Text style={styles.storyCaptionOverlay}>{story.caption.trim()}</Text></View>:null}
        <View style={styles.storyTapZones} pointerEvents="box-none">
          <Pressable {...tapZone(-1)} accessibilityRole="button" accessibilityLabel="Story anterior" style={styles.storyTapZone}/>
          <Pressable {...tapZone(1)} accessibilityRole="button" accessibilityLabel="Story seguinte" style={styles.storyTapZone}/>
        </View>
      </View>
      <View style={styles.storyBottom}><Text style={styles.storyCount}>{index+1} / {activeGroup.stories.length}</Text><Text style={styles.storyCount}>Toca para avançar · mantém premido para pausar</Text></View>
      <View style={styles.storyEngagement}>
        <Pressable accessibilityRole="button" accessibilityLabel={story.likedByMe?'Retirar gosto da Story':'Gostar da Story'} disabled={storyBusy} onPress={()=>void toggleLike()} style={styles.storyEngagementAction}>
          <Text style={[styles.storyEngagementText,story.likedByMe&&{color:'#FF778C'}]}>{story.likedByMe?'♥':'♡'} {story.likeCount||0}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Partilhar Story" disabled={storyBusy} onPress={()=>void shareStory()} style={styles.storyEngagementAction}><Text style={styles.storyEngagementText}>↗ Partilhar</Text></Pressable>
      </View>
      {!ownStory?<View style={styles.storyReplyRow}>
        <TextInput value={replyText} onChangeText={setReplyText} onFocus={()=>setReplyFocused(true)} onBlur={()=>setReplyFocused(false)}
          placeholder="Responder em privado à Story…" placeholderTextColor={MUTED} maxLength={500}
          accessibilityLabel="Resposta privada ao autor da Story" style={styles.storyReplyInput}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar resposta privada à Story" disabled={storyBusy||!replyText.trim()} onPress={()=>void sendReply()} style={styles.storyReplySend}>
          <Text style={styles.storyReplySendText}>{storyBusy?'…':'Enviar'}</Text>
        </Pressable>
      </View>:null}
      {!ownStory?<Text style={styles.storyReplyHint}>A resposta vai apenas para o autor, através de uma notificação.</Text>:null}
      {story.canDelete?<Pressable accessibilityRole="button" accessibilityLabel="Eliminar a minha Story" disabled={storyBusy} onPress={confirmDeleteStory} style={styles.storyDeleteAction}><Text style={styles.storyOwnHint}>Eliminar Story</Text></Pressable>:null}
    </SafeAreaView>
  </Modal>;
}
export default function JynloFeedHome(){
  const router=useRouter();const auth=useAuth();
  const {compose,storyId}=useLocalSearchParams<{compose?:string;storyId?:string}>();
  const activeStoryAccount=useRef<string|null>(auth.token);
  activeStoryAccount.current=auth.token;
  const [posts,setPosts]=useState<FeedItem[]>([]);
  const [stories,setStories]=useState<SocialStory[]>([]),[ownStories,setOwnStories]=useState<SocialStory[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [storyViewer,setStoryViewer]=useState<StoriesGroup|null>(null);
  const [storyComposer,setStoryComposer]=useState(false),[storyCaption,setStoryCaption]=useState('');
  const [storyMedia,setStoryMedia]=useState<MobileMedia|null>(null);
  const [composerOpen,setComposerOpen]=useState(false);
  const [composerText,setComposerText]=useState(''),[composerMedia,setComposerMedia]=useState<MobileMedia|null>(null);
  const [publishing,setPublishing]=useState(false),[storyPublishing,setStoryPublishing]=useState(false),[busyPost,setBusyPost]=useState<number|null>(null);
  const [expandedComments,setExpandedComments]=useState<number|null>(null),[comments,setComments]=useState<SocialComment[]>([]),[commentText,setCommentText]=useState(''),[commentsLoading,setCommentsLoading]=useState(false);
  const reloadNumber=useRef(0);
  const commentsRequest=useRef(0);
  const feedIdentity=useRef('');
  const load=useCallback(async()=>{
    const id=++reloadNumber.current;
    const identity=auth.token&&auth.username?`${auth.username}:${auth.token}`:'guest';
    const identityChanged=feedIdentity.current!==identity;
    if(identityChanged){
      feedIdentity.current=identity;
      // Never keep previous-account stories, private comments or pending media
      // visible when a user logs out or signs into a different account.
      commentsRequest.current++;
      setPosts([]);setStories([]);setOwnStories([]);
      setStoryViewer(null);setStoryComposer(false);setStoryMedia(null);setStoryCaption('');
      setComposerOpen(false);setComposerMedia(null);setComposerText('');
      setExpandedComments(null);setComments([]);setCommentText('');setCommentsLoading(false);
    }
    setLoading(true);setError('');
    const fetches=await Promise.allSettled([
      auth.token&&auth.username?socialFeed(auth.token,auth.username):Promise.resolve([]),
      auth.token?storyFeed(auth.token):Promise.resolve([]),
      auth.token?myStories(auth.token,auth.username):Promise.resolve([])
    ]);
    if(id!==reloadNumber.current)return;
    const value=<T,>(i:number,fallback:T):T=>{const entry=fetches[i];return entry?.status==='fulfilled'?(entry as PromiseFulfilledResult<T>).value:fallback;};
    if(fetches[0].status==='fulfilled')setPosts(value(0,[] as FeedItem[]));
    if(fetches[1].status==='fulfilled')setStories(value(1,[] as SocialStory[]));
    if(fetches[2].status==='fulfilled')setOwnStories(value(2,[] as SocialStory[]));
    if(fetches[0].status==='rejected')setError('Não foi possível atualizar as publicações. O conteúdo apresentado pode estar desatualizado. Tenta novamente.');
    setLoading(false);
  },[auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{if(!auth.ready||(!auth.token&&!auth.browsingAsGuest))return;void load();return ()=>{reloadNumber.current++;};},[auth.ready,auth.token,auth.browsingAsGuest,load]));
  // The central + action reuses the same authenticated composers as the Feed.
  // Consume the route intent once to avoid reopening it after dismissal.
  useEffect(()=>{
    if(compose!=='post'&&compose!=='story')return;
    if(!auth.ready)return;
    router.setParams({compose:undefined});
    if(!auth.token||!auth.username){
      router.push({pathname:'/login',params:{redirect:'/'}});
      return;
    }
    if(compose==='post')setComposerOpen(true);
    else setStoryComposer(true);
  },[compose,auth.ready,auth.token,auth.username,router]);
  useEffect(()=>{
    if(typeof storyId!=='string'||!auth.ready||!auth.token)return;
    // Consume the deep link exactly once; no automatic retries for expired Stories.
    router.setParams({storyId:undefined});
    if(!/^[1-9][0-9]{0,15}$/.test(storyId))return;
    const originalToken=auth.token;
    void storyById(Number(storyId),originalToken).then(story=>{
      if(activeStoryAccount.current!==originalToken)return;
      setStoryViewer({key:'notification-story-'+story.id,name:story.displayName,
        avatar:story.avatarUrl,stories:[story]});
    }).catch(()=>{
      if(activeStoryAccount.current===originalToken)
        Alert.alert('Story indisponível','Esta Story pode ter expirado ou já não estar acessível.');
    });
  },[storyId,auth.ready,auth.token,router]);
  const storyGroups=useMemo(()=>groupStories(ownStories,stories) as StoriesGroup[],[ownStories,stories]);
  function requireLogin(){if(auth.token&&auth.username)return true;router.push({pathname:'/login',params:{redirect:'/'}});return false;}
  async function pickMedia(setter:(v:MobileMedia|null)=>void,source:'gallery'|'camera'='gallery'){
    if(!requireLogin())return;
    try{const ImagePicker=await import('expo-image-picker');
      const result=source==='camera'?await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:.86}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:.86});
      if(result.canceled||!result.assets.length)return;
      const asset=result.assets[0];if(!asset)return;const kind=asset.type==='video'?'video':'image';
      const mime=asset.mimeType||(kind==='image'?'image/jpeg':'video/mp4');
      const size=asset.fileSize||0;const validation=validateMedia(mime,size,true);
      if(validation){Alert.alert('Ficheiro não aceite',size===0?'Não foi possível obter o tamanho do ficheiro.':validation);return;}
      setter({uri:asset.uri,type:kind,mimeType:mime,fileName:asset.fileName||`${kind==='video'?'video':'foto'}-${Date.now()}.${kind==='video'?'mp4':'jpg'}`,fileSize:size});
    }catch{Alert.alert('Não foi possível abrir a galeria','Confirma as permissões do teu telemóvel.');}
  }
  async function submitPost(){if(!requireLogin()||publishing||!composerMedia)return;
    setPublishing(true);try{await publishPost(composerText,composerMedia,auth.token,auth.username);setComposerText('');setComposerMedia(null);setComposerOpen(false);await load();}
    catch(e){Alert.alert('Publicação',e instanceof Error?e.message:'Não foi possível publicar.');}finally{setPublishing(false);}
  }
  async function submitStory(){if(!requireLogin()||storyPublishing||!storyMedia)return;
    setStoryPublishing(true);try{await publishStory(storyCaption,storyMedia,auth.token,auth.username);setStoryCaption('');setStoryMedia(null);setStoryComposer(false);await load();}
    catch(e){Alert.alert('Story',e instanceof Error?e.message:'Não foi possível publicar.');}finally{setStoryPublishing(false);}
  }
  async function toggleLike(item:FeedItem){if(item.type!=='POST'||!item.postId||!requireLogin()||busyPost!==null)return;
    setBusyPost(item.postId);try{await likePost(item.postId,item.likedByMe,auth.token,auth.username);await load();}
    catch(e){Alert.alert('Gosto',e instanceof Error?e.message:'Não foi possível atualizar o gosto.');}finally{setBusyPost(null);}
  }
  function closeComments(){commentsRequest.current++;setExpandedComments(null);setComments([]);setCommentText('');setCommentsLoading(false);}
  async function openComments(item:FeedItem){if(!item.postId)return;const id=item.postId;
    const requestId=++commentsRequest.current;
    if(expandedComments===id){closeComments();return;}
    setExpandedComments(id);setComments([]);setCommentText('');setCommentsLoading(true);
    try{
      const next=await postComments(id,auth.token);
      if(requestId===commentsRequest.current)setComments(next);
    }catch{
      if(requestId===commentsRequest.current)Alert.alert('Comentários','Não foi possível carregar os comentários.');
    }finally{
      if(requestId===commentsRequest.current)setCommentsLoading(false);
    }
  }
  async function submitComment(postId:number){if(!requireLogin()||busyPost!==null||!commentText.trim())return;setBusyPost(postId);
    const requestId=commentsRequest.current;
    try{const created=await addPostComment(postId,commentText,auth.token,auth.username);if(requestId===commentsRequest.current){setComments(prev=>[...prev,created]);setCommentText('');}await load();}
    catch(e){if(requestId===commentsRequest.current)Alert.alert('Comentário',e instanceof Error?e.message:'Não foi possível comentar.');}finally{setBusyPost(null);}
  }
  async function sharePost(item:FeedItem){
    const id=item.sessionId;
    const link=Number.isSafeInteger(id)&&id!==null&&id>0?`https://d24sports.com/sessions/${id}`:'https://d24sports.com';
    await Share.share({message:[item.content||`${item.sport||'Desporto'} em ${item.city||'Jynlo'}`,link].join('\n')});
  }
  function SessionPostAttachment({item}:{item:FeedItem}){
    const id=item.sessionId;
    if(!Number.isSafeInteger(id)||!id||id<=0)return null;
    const scheduled= item.gameDate?Date.parse(item.gameDate):NaN;
    const when=Number.isFinite(scheduled)?new Date(scheduled).toLocaleString('pt-PT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):null;
    return <Pressable accessibilityRole="button" accessibilityLabel="Consultar sessão associada à publicação" onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(id)}})} style={styles.postSessionCard}>
      <View style={styles.postSessionIcon}><Text style={styles.postSessionIconText}>↗</Text></View>
      <View style={{flex:1,gap:4}}>
        <Text style={styles.postSessionTitle}>{item.sport?.trim()||'Sessão desportiva'}</Text>
        {(item.city?.trim()||when)?<Text style={styles.postSessionMeta}>{[item.city?.trim(),when].filter(Boolean).join(' · ')}</Text>:null}
        <Text style={styles.postSessionLink}>Ver detalhes da sessão</Text>
      </View>
    </Pressable>;
  }
  function PostCard({item}:{item:FeedItem}){
    const media=mediaSource(item.imageUrl),video=mediaSource(item.videoUrl);const likeBusy=busyPost===item.postId;
    return <View style={styles.postCard}>
      <View style={styles.postTop}><CircleAvatar name={item.authorDisplayName||item.authorUsername} image={item.authorProfilePicUrl} size={43}/>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${item.authorUsername}`} onPress={()=>router.push({pathname:'/social/[username]',params:{username:item.authorUsername}})} style={{flex:1,gap:3}}><Text style={styles.postName}>{item.authorDisplayName||item.authorUsername}</Text>
          <Text style={styles.postMeta}>{item.type==='POST'?'Publicação':'Atividade desportiva'}  ·  {timeAgo(item.createdAt)}</Text></Pressable>
        <Pressable onPress={()=>{void sharePost(item);}} accessibilityRole="button" accessibilityLabel="Partilhar publicação" hitSlop={8}><Text style={{color:MUTED,fontSize:19}}>↗</Text></Pressable></View>
      {item.type!=='POST'&&item.content?<Text style={styles.postBody}>{item.content}</Text>:null}
      {media?<Image source={{uri:media}} style={styles.postImage} resizeMode="cover"/>:null}
      {video?<MediaVideo uri={video}/>:null}
      {item.type==='POST'?<><View style={styles.postActions}>
        <Pressable onPress={()=>{void toggleLike(item);}} disabled={likeBusy} style={styles.postAction} accessibilityRole="button" accessibilityLabel={item.likedByMe?'Retirar gosto':'Gostar'}><Text style={[styles.actionIcon,item.likedByMe&&{color:'#FF7797'}]}>{item.likedByMe?'♥':'♡'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={item.hideLikers&&item.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Lista de gostos privada":"Ver quem gostou desta publicação"} disabled={Boolean(item.hideLikers&&item.authorUsername.toLowerCase()!==auth.username?.toLowerCase())||!Number.isSafeInteger(item.postId)||!item.postId||item.postId<=0} onPress={()=>router.push({pathname:'/posts/[postId]/likers',params:{postId:String(item.postId)}})} style={styles.postAction}><Text style={styles.actionCount}>{item.hideLikers&&item.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Gostos privados":`${item.likeCount} gostos`}</Text></Pressable>
        <Pressable onPress={()=>{void openComments(item);}} style={styles.postAction} accessibilityRole="button" accessibilityLabel="Abrir comentários"><Text style={styles.actionIcon}>♧</Text><Text style={styles.actionCount}>{item.commentCount}</Text></Pressable>
        <Pressable onPress={()=>{void sharePost(item);}} style={styles.postAction}><Text style={styles.actionIcon}>↗</Text><Text style={styles.actionCount}>Partilhar</Text></Pressable>
      </View>{item.content?<Text style={styles.postBody}>{item.content}</Text>:null}</>:null}
      <SessionPostAttachment item={item}/>
    </View>;
  }
  const Header=()=> <View style={styles.screenPad}>
    <View style={styles.navHeader}><View style={styles.brand}><Image source={require('../../assets/jynlo-icon.png')} style={styles.brandLogo}/><Text style={styles.brandName}>JYNLO</Text></View><View style={styles.headerRight}>
      <Pressable onPress={()=>router.push('/notifications')} style={styles.headerCircle} accessibilityLabel="Notificações"><Text style={styles.headerIcon}>♧</Text><View style={styles.pulse}/></Pressable>
      <Pressable onPress={()=>router.push(auth.token?'/(tabs)/profile':'/login')} style={styles.headerUser} accessibilityLabel={auth.token?'Perfil e conta ativa':'Iniciar sessão'}><CircleAvatar name={auth.username||'Visitante'} size={32}/><Text style={styles.headerName} numberOfLines={1}>{auth.username||'Entrar'}</Text></Pressable></View></View>
    {DEMO_MODE?<View style={styles.demoRibbon}><Text style={styles.demoRibbonText}>◉ PRÉVIA LOCAL  ·  DADOS DE DEMONSTRAÇÃO</Text></View>:null}
    <View style={styles.storiesCard}>
      <SectionHeader eyebrow="MOMENTOS DESPORTIVOS" title="Stories"/>
      {storyGroups.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>{auth.token?<Pressable accessibilityRole="button" accessibilityLabel="Criar a minha story" onPress={()=>setStoryComposer(true)} style={styles.storyItem}><View style={styles.storyCreateRing}><CircleAvatar name={auth.username||'Jynlo'} size={57}/><View style={styles.storyCreateBadge}><Text style={styles.storyCreatePlus}>＋</Text></View></View><Text style={styles.storyItemName} numberOfLines={1}>A tua story</Text></Pressable>:null}{storyGroups.map(group=><Pressable key={group.key} onPress={()=>setStoryViewer(group)} style={styles.storyItem} accessibilityLabel={`Ver Stories de ${group.name}`}>
        <View style={styles.storyRing}><CircleAvatar name={group.name} image={group.avatar} size={57}/></View><Text style={styles.storyItemName} numberOfLines={1}>{group.name}</Text></Pressable>)}</ScrollView>
        :<Pressable accessibilityRole="button" accessibilityLabel="Criar a minha story" onPress={()=>requireLogin()&&setStoryComposer(true)} style={styles.emptyStories}><View style={styles.storyEmptyIcon}><Text style={{color:TEAL,fontSize:23}}>{auth.token?'＋':'◎'}</Text></View><View style={{flex:1}}><Text style={styles.storiesEmptyTitle}>{auth.token?'Partilha o teu primeiro momento':'Descobre os momentos da comunidade'}</Text><Text style={styles.storiesEmptyText}>{auth.token?'Fotografias e vídeos que duram 24 horas.':'Entra com a tua conta para veres e partilhares Stories.'}</Text></View></Pressable>}
    </View>
    {!auth.token?<View style={styles.visitorCard}><Text style={styles.visitorDescription}>Entra para partilhares momentos e acompanhares os teus amigos.</Text><Pressable onPress={()=>router.push('/login')} style={styles.visitorPrimary}><Text style={styles.visitorPrimaryText}>Iniciar sessão</Text></Pressable></View>:null}
    <View style={styles.latestTitle}><Text style={styles.sectionTitle}>Publicações</Text></View>
    {error?<View style={styles.errorBox}><Text style={{color:'#FFB8B8'}}>{error}</Text><Pressable onPress={()=>void load()}><Text style={styles.link}>Tentar novamente</Text></Pressable></View>:null}
    {loading&&posts.length===0?<ActivityIndicator color={TEAL} style={{margin:20}}/>:null}
    {!loading&&!error&&auth.token&&posts.length===0?<Text style={styles.mutedText}>Ainda não há publicações. Partilha o teu primeiro momento!</Text>:null}
  </View>;
  if(!auth.ready)return <SafeAreaView style={{flex:1,backgroundColor:INDIGO,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={TEAL}/></SafeAreaView>;
  if(!auth.token&&!auth.browsingAsGuest)return <Redirect href="/welcome"/>;
  return <SafeAreaView style={{flex:1,backgroundColor:INDIGO}} edges={['top','left','right']}>
    <FlatList data={posts} keyExtractor={(item,index)=>`${item.type}-${item.postId||item.sessionId||index}-${index}`} renderItem={({item})=><View style={styles.feedCardWrap}>{PostCard({item})}</View>} ListHeaderComponent={Header()}
      refreshControl={<RefreshControl refreshing={loading&&posts.length>0} onRefresh={()=>void load()} tintColor={TEAL}/>}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"/>
    <StoryViewer group={storyViewer} groups={storyGroups} token={auth.token} username={auth.username} onClose={()=>setStoryViewer(null)} onDeleted={()=>void load()} onUpdated={updated=>{setStories(previous=>previous.map(story=>story.id===updated.id?updated:story));setOwnStories(previous=>previous.map(story=>story.id===updated.id?updated:story));setStoryViewer(previous=>previous&&previous.stories.some(story=>story.id===updated.id)?{...previous,stories:previous.stories.map(story=>story.id===updated.id?updated:story)}:previous);}}/>
    <Modal visible={expandedComments!==null} transparent animationType="slide" onRequestClose={closeComments}>
      <View style={styles.commentsModal}>
        <Pressable style={styles.commentsBackdrop} accessibilityRole="button" accessibilityLabel="Fechar comentários" onPress={closeComments}/>
        <SafeAreaView edges={['bottom']} style={styles.commentsSheet}>
          <View style={styles.commentsHandle}/>
          <View style={styles.commentsHeader}><Text style={styles.commentsTitle}>Comentários</Text>
            <Pressable onPress={closeComments} accessibilityRole="button" accessibilityLabel="Fechar comentários" hitSlop={12}><Text style={styles.commentsClose}>✕</Text></Pressable>
          </View>
          {commentsLoading?<ActivityIndicator color={TEAL} style={{marginVertical:24}}/>:
            <ScrollView style={styles.commentsList} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.commentsListContent}>
              {comments.length?comments.map(c=><View key={c.id} style={styles.comment}>
                <CircleAvatar name={c.authorUsername} image={c.authorProfilePicUrl} size={34}/>
                <View style={{flex:1,gap:4}}><Text style={styles.commentAuthor}>@{c.authorUsername}</Text><Text style={styles.commentBody}>{c.content}</Text></View>
              </View>):<Text style={styles.commentsEmpty}>Ainda não há comentários. Inicia a conversa!</Text>}
            </ScrollView>}
          <View style={styles.commentCompose}><TextInput value={commentText} onChangeText={setCommentText} style={styles.commentInput} maxLength={2000} placeholder={auth.token?'Escrever comentário…':'Inicia sessão para comentar'} placeholderTextColor={MUTED} editable={!!auth.token&&busyPost===null} multiline/>
            <Pressable onPress={()=>expandedComments!==null&&void submitComment(expandedComments)} disabled={!auth.token||!commentText.trim()||busyPost!==null||commentsLoading} style={[styles.sendComment,(!auth.token||!commentText.trim()||busyPost!==null||commentsLoading)&&{opacity:.45}]} accessibilityRole="button" accessibilityLabel="Enviar comentário"><Text style={styles.sendText}>➤</Text></Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>

    <Modal visible={composerOpen} animationType="slide" onRequestClose={()=>!publishing&&setComposerOpen(false)}>
      <SafeAreaView style={styles.storyComposerOverlay} edges={['top','bottom']}>
        <View style={styles.storyComposerHead}><View style={{flex:1}}><Text style={styles.storyComposerTitle}>Nova publicação</Text><Text style={styles.storiesIntro}>Partilha uma fotografia ou vídeo com a comunidade.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar nova publicação" disabled={publishing} onPress={()=>setComposerOpen(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>✕</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.mediaComposeBody}>
          <View style={styles.mediaChooseRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tirar fotografia ou gravar vídeo" disabled={publishing} onPress={()=>void pickMedia(setComposerMedia,'camera')} style={styles.mediaChooseButton}><Text style={styles.mediaChooseIcon}>◎</Text><Text style={styles.mediaChooseText}>Câmara</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Escolher fotografia ou vídeo da galeria" disabled={publishing} onPress={()=>void pickMedia(setComposerMedia,'gallery')} style={styles.mediaChooseButton}><Text style={styles.mediaChooseIcon}>▧</Text><Text style={styles.mediaChooseText}>Galeria</Text></Pressable>
          </View>
          {composerMedia?<View style={styles.postMediaPreview}>
            {composerMedia.type==='image'?<Image source={{uri:composerMedia.uri}} resizeMode="contain" style={styles.postMediaPreviewImage}/>:<MediaVideo key={composerMedia.uri} uri={composerMedia.uri}/>}
            <View style={styles.postMediaPreviewFooter}><Text style={styles.attachedText} numberOfLines={1}>{composerMedia.type==='image'?'Fotografia':'Vídeo'} · {composerMedia.fileName}</Text><Pressable accessibilityRole="button" accessibilityLabel="Remover media da publicação" disabled={publishing} onPress={()=>setComposerMedia(null)} style={styles.removeMediaButton}><Text style={styles.removeMediaText}>Remover</Text></Pressable></View>
          </View>:<View style={styles.mediaEmptyState}><Text style={styles.mediaEmptyTitle}>O teu próximo momento desportivo</Text><Text style={styles.storiesIntro}>Escolhe a câmara ou uma fotografia da galeria para começares.</Text></View>}
          <TextInput style={styles.composerInput} value={composerText} onChangeText={setComposerText} placeholder="Escreve uma legenda (opcional)…" placeholderTextColor={MUTED} multiline maxLength={maxPostLength}/>
          <Text style={styles.countText}>{composerText.length}/{maxPostLength}</Text>
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Publicar fotografia ou vídeo" disabled={!composerMedia||publishing} onPress={()=>void submitPost()} style={[styles.primaryButton,{minHeight:52,marginLeft:0},(!composerMedia||publishing)&&{opacity:.45}]}><Text style={styles.primaryButtonText}>{publishing?'A publicar…':'Partilhar publicação'}</Text></Pressable>
      </SafeAreaView>
    </Modal>

    <Modal visible={storyComposer} animationType="slide" onRequestClose={()=>!storyPublishing&&setStoryComposer(false)}>
      <SafeAreaView style={styles.storyComposerOverlay} edges={['top','bottom']}>
        <View style={styles.storyComposerHead}><View style={{flex:1,gap:4}}><Text style={styles.storyComposerTitle}>Criar Story</Text><Text style={styles.storiesIntro}>Uma fotografia ou vídeo visível durante 24 horas.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar criação de Story" disabled={storyPublishing} onPress={()=>setStoryComposer(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>✕</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.mediaComposeBody}>
          <View style={styles.mediaChooseRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tirar fotografia para Story" disabled={storyPublishing} onPress={()=>void pickMedia(setStoryMedia,'camera')} style={styles.mediaChooseButton}><Text style={styles.mediaChooseIcon}>◎</Text><Text style={styles.mediaChooseText}>Câmara</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Escolher fotografia ou vídeo para Story" disabled={storyPublishing} onPress={()=>void pickMedia(setStoryMedia,'gallery')} style={styles.mediaChooseButton}><Text style={styles.mediaChooseIcon}>▧</Text><Text style={styles.mediaChooseText}>Galeria</Text></Pressable>
          </View>
          {storyMedia?<View style={styles.storyPreview}>
            {storyMedia.type==='image'?<Image source={{uri:storyMedia.uri}} resizeMode="contain" style={styles.storyPreviewMedia}/>:<MediaVideo uri={storyMedia.uri} story paused/>}
            {storyCaption.trim()?<View pointerEvents="none" style={styles.storyCaptionLayer}><Text style={styles.storyCaptionOverlay}>{storyCaption.trim()}</Text></View>:null}
          </View>:<View style={styles.mediaEmptyState}><Text style={styles.mediaEmptyTitle}>Mostra o teu momento</Text><Text style={styles.storiesIntro}>Escolhe uma fotografia ou vídeo para o teu Story.</Text></View>}
          {storyMedia?<Pressable accessibilityRole="button" disabled={storyPublishing} onPress={()=>setStoryMedia(null)} style={styles.removeMediaButton}><Text style={styles.removeMediaText}>Remover fotografia ou vídeo</Text></Pressable>:null}
          <Text style={styles.storiesIntro}>Texto sobre o Story (visível também como legenda na web)</Text>
          <TextInput value={storyCaption} onChangeText={setStoryCaption} maxLength={180} placeholder="Escreve sobre o momento (opcional)…" placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          <Text style={styles.countText}>{storyCaption.length}/180</Text>
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Publicar Story" onPress={()=>void submitStory()} style={[styles.primaryButton,{minHeight:54,marginLeft:0},(!storyMedia||storyPublishing)&&{opacity:.5}]} disabled={!storyMedia||storyPublishing}><Text style={styles.primaryButtonText}>{storyPublishing?'A publicar…':'Publicar Story'}</Text></Pressable>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  screenPad:{paddingHorizontal:12,gap:9},navHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:11,paddingBottom:3},brand:{flexDirection:'row',alignItems:'center',gap:9},brandLogo:{width:32,height:32,borderRadius:9},brandName:{color:WHITE,fontSize:19,fontWeight:'900',letterSpacing:2.2},headerRight:{flexDirection:'row',alignItems:'center',gap:9},headerCircle:{borderRadius:22,width:37,height:37,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:BORDER,backgroundColor:PANEL},headerIcon:{color:WHITE,fontSize:24},pulse:{position:'absolute',width:6,height:6,right:7,top:5,borderRadius:3,backgroundColor:TEAL},headerUser:{flexDirection:'row',alignItems:'center',gap:6,borderRadius:22,paddingRight:10,paddingLeft:3,paddingVertical:3,borderWidth:1,borderColor:'#14616D',backgroundColor:'#072B35',maxWidth:128},headerName:{color:WHITE,fontSize:11,fontWeight:'800',maxWidth:65},
  avatar:{justifyContent:'center',alignItems:'center',backgroundColor:'#10536A',borderWidth:1,borderColor:'#28849B',overflow:'hidden'},avatarLetter:{color:WHITE,fontWeight:'900'},
  demoRibbon:{marginTop:1,borderWidth:1,borderColor:'#165660',backgroundColor:'#082B31',borderRadius:9,paddingVertical:5,paddingHorizontal:9,alignSelf:'flex-start'},demoRibbonText:{fontSize:9,fontWeight:'800',letterSpacing:.9,color:'#72D5CC'},
  hero:{padding:19,minHeight:140,borderWidth:1,borderColor:'#086073',borderRadius:18,backgroundColor:'#052332',justifyContent:'center',gap:9},heroEyebrow:{fontSize:10,color:TEAL,fontWeight:'900',letterSpacing:1.1},heroTitle:{fontSize:31,color:WHITE,fontWeight:'900',letterSpacing:-0.8,lineHeight:37},heroSub:{fontSize:13,color:'#C2DFE5',lineHeight:20,maxWidth:460},
  storiesCard:{paddingVertical:10,gap:8},sectionHead:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between'},eyebrow:{fontSize:9,color:TEAL,fontWeight:'900',letterSpacing:1.4},sectionTitle:{color:WHITE,fontSize:18,fontWeight:'900',letterSpacing:-.25},ghostButton:{borderRadius:10,borderWidth:1,borderColor:'#145664',paddingHorizontal:10,paddingVertical:9},ghostButtonText:{fontSize:11,color:TEAL,fontWeight:'800'},storiesIntro:{fontSize:11,color:'#B7D6DB',lineHeight:16},storyRail:{gap:11,paddingTop:2,paddingBottom:2},storyItem:{width:64,alignItems:'center',gap:4},storyRing:{padding:2,borderRadius:38,borderWidth:2,borderColor:TEAL},storyCreateRing:{padding:2,position:'relative'},storyCreateBadge:{position:'absolute',right:0,bottom:0,width:21,height:21,borderRadius:11,backgroundColor:TEAL,borderWidth:2,borderColor:INDIGO,alignItems:'center',justifyContent:'center'},storyCreatePlus:{color:INDIGO,fontSize:14,fontWeight:'900',lineHeight:17},storyItemName:{fontSize:10,color:WHITE,fontWeight:'700',textAlign:'center'},emptyStories:{flexDirection:'row',gap:11,alignItems:'center',paddingVertical:7},storyEmptyIcon:{width:45,height:45,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:TEAL,backgroundColor:'#06464A'},storiesEmptyTitle:{fontSize:13,color:WHITE,fontWeight:'800'},storiesEmptyText:{fontSize:11,color:MUTED,marginTop:3},
  weekPanel:{backgroundColor:'#052635',borderColor:BORDER,borderWidth:1,borderRadius:17,padding:13,gap:12},weekRail:{gap:9,paddingRight:5},weekCard:{width:220,minHeight:165,backgroundColor:'#062D3D',borderColor:'#0B5568',borderWidth:1,borderRadius:13,padding:13,gap:8},weekIcon:{width:31,height:31,borderRadius:9,backgroundColor:'#034858',borderColor:'#0D7C84',borderWidth:1,alignItems:'center',justifyContent:'center'},weekIconText:{color:TEAL,fontSize:18,fontWeight:'900'},weekTitle:{fontSize:12,fontWeight:'900',color:'#5DFFF2'},weekDetail:{color:'#D1E7ED',fontSize:11,lineHeight:15,minHeight:32},weekFooter:{fontSize:11,fontWeight:'900',color:TEAL},
  visitorCard:{backgroundColor:'#082D3D',borderColor:BORDER,borderWidth:1,borderRadius:18,padding:16,gap:12},
  visitorTitle:{color:WHITE,fontSize:19,fontWeight:'900'},
  visitorDescription:{color:MUTED,fontSize:12,lineHeight:19},
  visitorSession:{backgroundColor:'#062635',borderWidth:1,borderColor:'#145664',borderRadius:12,padding:13,gap:5},
  visitorSessionSport:{color:WHITE,fontSize:14,fontWeight:'900'},
  visitorSessionMeta:{color:MUTED,fontSize:11,lineHeight:16},
  visitorPrimary:{padding:13,alignItems:'center',borderRadius:12,backgroundColor:TEAL},
  visitorPrimaryText:{color:INDIGO,fontSize:13,fontWeight:'900'},
  visitorSecondary:{padding:12,alignItems:'center'},
  visitorSecondaryText:{color:TEAL,fontSize:12,fontWeight:'800'},
  composerCard:{backgroundColor:'#082D3D',borderColor:BORDER,borderWidth:1,borderRadius:14,padding:10,gap:10},composerHeading:{fontSize:14,color:WHITE,fontWeight:'900'},composerInput:{minHeight:85,backgroundColor:'#06333C',borderWidth:1,borderColor:'#128070',borderRadius:12,padding:12,color:WHITE,fontSize:14,textAlignVertical:'top'},composerBottom:{flexDirection:'row',alignItems:'center',gap:9},attachButton:{flexDirection:'row',gap:6,alignItems:'center',paddingVertical:6},attachIcon:{fontSize:19,color:TEAL},attachText:{color:WHITE,fontWeight:'800',fontSize:11},countText:{color:MUTED,fontSize:10},primaryButton:{marginLeft:'auto',paddingVertical:10,paddingHorizontal:15,borderRadius:10,backgroundColor:TEAL,alignItems:'center',justifyContent:'center'},primaryButtonText:{color:'#03242A',fontSize:12,fontWeight:'900'},postMediaPreview:{borderWidth:1,borderColor:BORDER,borderRadius:14,overflow:'hidden',backgroundColor:'#020A10'},postMediaPreviewImage:{width:'100%',height:300},postMediaPreviewFooter:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12,paddingVertical:9,backgroundColor:PANEL},removeMediaButton:{paddingVertical:7,paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:'#3F7D88'},removeMediaText:{color:TEAL,fontSize:12,fontWeight:'800'},attachedText:{color:MUTED,fontSize:11,flex:1},
  latestTitle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:4,paddingBottom:1},link:{color:TEAL,fontWeight:'800',fontSize:11},feedCardWrap:{paddingHorizontal:12,marginBottom:10},postCard:{backgroundColor:'#092938',borderWidth:1,borderColor:BORDER,borderRadius:16,padding:15,gap:13},postTop:{flexDirection:'row',alignItems:'center',gap:11},postName:{color:WHITE,fontSize:14,fontWeight:'900'},postMeta:{color:MUTED,fontSize:10},postBody:{color:WHITE,fontSize:14,lineHeight:21},postImage:{width:'100%',height:300,borderRadius:12},postVideo:{width:'100%',height:300,borderRadius:12},postActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',borderTopColor:'#154653',borderTopWidth:1,paddingTop:10,rowGap:8,columnGap:13},postSessionCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#06333F',borderWidth:1,borderColor:'#127681',borderRadius:14,padding:12},postSessionIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#0D5060',alignItems:'center',justifyContent:'center'},postSessionIconText:{fontSize:24,color:TEAL,fontWeight:'900'},postSessionTitle:{fontSize:14,fontWeight:'900',color:WHITE},postSessionMeta:{fontSize:11,color:MUTED},postSessionLink:{fontSize:12,fontWeight:'800',color:TEAL},postAction:{flexDirection:'row',gap:5,alignItems:'center',minHeight:36},actionIcon:{fontSize:21,color:TEAL},actionCount:{fontSize:12,color:MUTED,fontWeight:'700'},activityBox:{flexDirection:'row',padding:12,borderRadius:12,backgroundColor:'#062C3A',borderWidth:1,borderColor:BORDER,alignItems:'center',gap:10},activityTitle:{color:WHITE,fontSize:13,fontWeight:'800'},activityMeta:{color:MUTED,fontSize:10,marginTop:2},viewSession:{color:TEAL,fontSize:12,fontWeight:'800'},commentsModal:{flex:1,justifyContent:'flex-end'},commentsBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.7)'},commentsSheet:{height:'74%',backgroundColor:INDIGO,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:BORDER,paddingHorizontal:16,paddingTop:9},commentsHandle:{alignSelf:'center',width:42,height:4,borderRadius:2,backgroundColor:'#587A85',marginBottom:15},commentsHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:14,borderBottomWidth:1,borderBottomColor:BORDER},commentsTitle:{color:WHITE,fontSize:17,fontWeight:'900'},commentsClose:{color:WHITE,fontSize:20,paddingHorizontal:8},commentsList:{flex:1},commentsListContent:{paddingVertical:13,gap:10,flexGrow:1},commentsEmpty:{color:MUTED,fontSize:13,textAlign:'center',marginTop:26},comment:{flexDirection:'row',gap:10,padding:11,backgroundColor:'#06232F',borderRadius:11},commentAuthor:{color:TEAL,fontSize:11,fontWeight:'800'},commentBody:{fontSize:12,color:WHITE},commentCompose:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:12,borderTopWidth:1,borderTopColor:BORDER},commentInput:{flex:1,minHeight:39,color:WHITE,backgroundColor:'#06232F',borderColor:BORDER,borderWidth:1,paddingHorizontal:12,borderRadius:10},sendComment:{backgroundColor:TEAL,width:40,height:40,borderRadius:11,alignItems:'center',justifyContent:'center'},sendText:{color:INDIGO,fontSize:20},errorBox:{borderColor:'#C87575',borderWidth:1,padding:12,borderRadius:10,gap:6},mutedText:{fontSize:11,color:MUTED,lineHeight:16},discoveryCard:{borderColor:BORDER,borderWidth:1,borderRadius:16,backgroundColor:PANEL,padding:15,gap:12},personRow:{flexDirection:'row',gap:9,alignItems:'center'},personName:{fontWeight:'900',fontSize:12,color:WHITE},
  storyOverlay:{flex:1,backgroundColor:'#020A10',paddingHorizontal:12,paddingTop:5},storyEngagement:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:6},storyEngagementAction:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderColor:BORDER,borderWidth:1,borderRadius:18},storyEngagementText:{color:WHITE,fontSize:15,fontWeight:'800'},storyReplyRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6},storyReplyInput:{flex:1,color:WHITE,borderColor:BORDER,borderWidth:1,borderRadius:23,minHeight:46,paddingHorizontal:15,backgroundColor:PANEL},storyReplySend:{minHeight:46,paddingHorizontal:13,backgroundColor:TEAL,borderRadius:23,justifyContent:'center'},storyReplySendText:{color:INDIGO,fontWeight:'800'},storyReplyHint:{fontSize:11,color:MUTED,paddingBottom:8},storyDeleteAction:{minHeight:44,alignSelf:'center',justifyContent:'center',paddingHorizontal:15},storyProgress:{flexDirection:'row',gap:4,height:4},progressPart:{flex:1,backgroundColor:'#557781',borderRadius:3,overflow:'hidden'},storyProgressFill:{height:'100%',width:'100%',backgroundColor:WHITE},storyTop:{flexDirection:'row',alignItems:'center',gap:9,marginTop:12},storyUser:{flex:1,color:WHITE,fontWeight:'900'},closeStory:{padding:9},closeStoryText:{color:WHITE,fontSize:20},storyMedia:{flex:1,justifyContent:'center',alignItems:'center',paddingVertical:12},storyTapZones:{...StyleSheet.absoluteFillObject,flexDirection:'row'},storyTapZone:{flex:1},storyImage:{width:'100%',height:'100%'},storyVideo:{width:'100%',height:'100%'},storyCaption:{color:WHITE,textAlign:'center',fontSize:16,fontWeight:'800',paddingVertical:10},storyCaptionLayer:{position:'absolute',bottom:24,left:15,right:15,alignItems:'center',justifyContent:'center'},storyCaptionOverlay:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',backgroundColor:'rgba(0,0,0,0.64)',paddingHorizontal:14,paddingVertical:9,borderRadius:13,overflow:'hidden'},storyBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14},storyNav:{padding:11},storyNavText:{color:TEAL,fontWeight:'800'},storyCount:{color:MUTED,fontSize:11},storyOwnHint:{color:MUTED,fontSize:10,textAlign:'center',paddingBottom:5},
  modalClose:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},modalCloseText:{fontSize:22,color:WHITE,fontWeight:'800'},mediaComposeBody:{gap:14,paddingBottom:24},mediaChooseRow:{flexDirection:'row',gap:12},mediaChooseButton:{flex:1,minHeight:94,borderRadius:15,borderWidth:1,borderColor:'#146875',backgroundColor:PANEL,alignItems:'center',justifyContent:'center',gap:7,padding:12},mediaChooseIcon:{fontSize:25,color:TEAL},mediaChooseText:{fontSize:14,fontWeight:'800',color:WHITE},mediaEmptyState:{minHeight:155,borderRadius:16,borderWidth:1,borderColor:BORDER,backgroundColor:'#072B39',justifyContent:'center',alignItems:'center',gap:9,padding:20},mediaEmptyTitle:{fontSize:15,fontWeight:'800',color:WHITE,textAlign:'center'},storyComposerOverlay:{flex:1,backgroundColor:INDIGO,padding:18,gap:17},storyComposerHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},storyComposerTitle:{color:WHITE,fontSize:22,fontWeight:'900'},mediaPicker:{minHeight:115,borderRadius:15,borderWidth:1,borderColor:TEAL,backgroundColor:PANEL,alignItems:'center',justifyContent:'center',gap:9,padding:12},storyPreview:{width:'100%',height:320,backgroundColor:'#020A10',borderRadius:16,overflow:'hidden',justifyContent:'center'},storyPreviewMedia:{width:'100%',height:'100%'},storyCaptionInput:{backgroundColor:PANEL,borderWidth:1,borderColor:BORDER,color:WHITE,padding:13,borderRadius:12,minHeight:50}
});
