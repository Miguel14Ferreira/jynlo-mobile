import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Animated,AppState,FlatList,Image,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,RefreshControl,ScrollView,Share,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
// Load the native media picker only when the user explicitly opens the gallery.
// Native video is loaded on demand for actual video content.
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE,request} from '../../src/lib/api';
import {myNotifications} from '../../src/lib/notifications-api';
import {socialFeed,storyFeed,myStories,likePost,postComments,addPostComment,editPostComment,togglePostCommentLike,publishPost,publishStory,toggleStoryLike,replyToStory,storyById,deleteStory,deletePost,hideAttendanceActivity,resolveJynloMedia} from '../../src/lib/social-feed-api';
import {feedEntryKey,hideEntry,showEntry} from '../../src/lib/feed-visibility.cjs';
import {readHiddenFeedEntries,writeHiddenFeedEntries} from '../../src/lib/feed-visibility-store';
import {groupStories,validateMedia} from '../../src/lib/social-feed-core.cjs';
import {albumError,appendAlbumSelection,moveAlbumItem,postMediaItems,MAX_ALBUM_ITEMS} from '../../src/lib/post-album.cjs';
import {sharedPostLink} from '../../src/lib/shared-post-link.cjs';
import {pickerMediaMime} from '../../src/lib/picker-media-format.cjs';
import {C,MobileTheme} from '../../src/lib/theme';
import PostEditSheet from '../../src/components/PostEditSheet';
import {JynloIcon} from '../../src/components/JynloIcon';
import StoryTextPlacement from '../../src/components/StoryTextPlacement';
import StoryDetailsView from '../../src/components/StoryDetailsView';
import FeedPostPhoto from '../../src/components/AdaptivePostPhoto';
import {storyMentionFriends,type StoryFriend} from '../../src/lib/social-relations-api';
import {prepareStoryDetails,toggleStoryMention,storyMentionUsernames} from '../../src/lib/story-details.cjs';
import type {FeedItem,SocialStory,SocialComment,MobileMedia,StoryTextGeometry,StoryDetails} from '../../src/lib/types';

type StoriesGroup={key:string;name:string;avatar:string|null;stories:SocialStory[]};
const {background:INDIGO,surface:PANEL,border:BORDER,accent:TEAL,muted:MUTED,text:WHITE}=MobileTheme.colors;
const maxPostLength=1000;
const startLetter=(s:string)=>s.replace(/^@/,'').charAt(0).toUpperCase()||'J';
const timeAgo=(date:string)=>{const x=Date.parse(date);if(!Number.isFinite(x))return 'Recentemente';const seconds=Math.max(0,Math.floor((Date.now()-x)/1000));if(seconds<60)return 'Agora';if(seconds<3600)return `${Math.floor(seconds/60)} min`;if(seconds<86400)return `${Math.floor(seconds/3600)} h`;return `${Math.floor(seconds/86400)} d`;};
const mediaSource=(url:string|null|undefined)=>(url?.startsWith('file:')||url?.startsWith('content:'))?url:resolveJynloMedia(url);

const FeedVideo=lazy(()=>import('../../src/components/FeedVideo'));
const StoryCameraCapture=lazy(()=>import('../../src/components/StoryCameraCapture'));
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
  const router=useRouter();
  const [currentKey,setCurrentKey]=useState<string|null>(null);
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [appActive,setAppActive]=useState(AppState.currentState==='active');
  const [replyText,setReplyText]=useState(''),[storyBusy,setStoryBusy]=useState(false),[replyFocused,setReplyFocused]=useState(false);
  const submittingStory=useRef(false);
  const activeAccount=useRef(token);
  activeAccount.current=token;
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
  React.useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>{
      if(state!=='active')progress.stopAnimation(value=>{remaining.current=Math.max(0,1-value);});
      setAppActive(state==='active');
    });
    return ()=>subscription.remove();
  },[progress]);
  const safeClose=()=>{if(!submittingStory.current)onClose();};
  const pauseProgress=()=>{
    progress.stopAnimation(value=>{remaining.current=Math.max(0,1-value);});
    setPaused(true);
  };
  const resetProgress=()=>{remaining.current=1;progress.stopAnimation();progress.setValue(0);setReplyText('');};
  const go=(direction:-1|1)=>{
    if(!activeGroup||submittingStory.current||replyFocused||!appActive)return;
    if(direction===-1&&index>0){resetProgress();setIndex(i=>i-1);return;}
    if(direction===1&&index<activeGroup.stories.length-1){resetProgress();setIndex(i=>i+1);return;}
    const groupIndex=groups.findIndex(entry=>entry.key===activeGroup.key);
    const nextGroup=groups[groupIndex+direction];
    if(nextGroup){resetProgress();setCurrentKey(nextGroup.key);setIndex(direction===1?0:nextGroup.stories.length-1);return;}
    if(direction===1)safeClose();
  };
  // Drive both the visible progress bar and photo advancement from one animation.
  // Pausing resumes from the remaining duration rather than restarting 6 seconds.
  React.useEffect(()=>{
    if(!story||story.video||paused||replyFocused||storyBusy||!appActive)return;
    const animation=Animated.timing(progress,{toValue:1,duration:Math.max(50,6000*remaining.current),useNativeDriver:false});
    animation.start(({finished})=>{
      if(finished){
        const groupIndex=groups.findIndex(entry=>entry.key===activeGroup?.key);
        if(activeGroup&&index<activeGroup.stories.length-1){remaining.current=1;progress.setValue(0);setIndex(i=>i+1);}
        else if(groupIndex>=0&&groupIndex<groups.length-1){remaining.current=1;progress.setValue(0);setCurrentKey(groups[groupIndex+1].key);setIndex(0);}
        else safeClose();
      }
    });
    return ()=>{animation.stop();};
  },[story?.id,story?.video,paused,replyFocused,storyBusy,appActive,index,currentKey,groups,activeGroup?.key,onClose,progress]);
  if(!group||!activeGroup||!story)return null;
  const uri=mediaSource(story.mediaUrl);
  const ownStory=story.authorUsername.toLowerCase()===username?.toLowerCase();
  async function toggleLike(){
    if(!story||!token||!username||submittingStory.current)return;
    submittingStory.current=true;setStoryBusy(true);pauseProgress();
    try{const updated=await toggleStoryLike(story.id,Boolean(story.likedByMe),token,username);if(activeAccount.current===token)onUpdated(updated);}
    catch(e){if(activeAccount.current===token)Alert.alert('Gosto na Story',e instanceof Error?e.message:'Não foi possível atualizar o gosto.');}
    finally{submittingStory.current=false;setStoryBusy(false);setPaused(false);}
  }
  async function sendReply(){
    const message=replyText.trim();
    if(!story||!token||!username||ownStory||!message||submittingStory.current)return;
    submittingStory.current=true;setStoryBusy(true);pauseProgress();
    try{
      await replyToStory(story.id,message,token,username);
      if(activeAccount.current!==token)return;
      setReplyText(current=>current.trim()===message?'':current);
      Alert.alert('Resposta enviada','A tua resposta ficou guardada em privado. O autor recebe um aviso se tiver as notificações ativadas.');
    }catch(e){if(activeAccount.current===token)Alert.alert('Resposta à Story',e instanceof Error?e.message:'Não foi possível confirmar a resposta. Verifica antes de repetires.');}
    finally{submittingStory.current=false;setStoryBusy(false);setPaused(false);}
  }
  function confirmDeleteStory(){
    if(!story||!story.canDelete||!token||submittingStory.current)return;
    const storyId=story.id,actorToken=token;
    pauseProgress();
    Alert.alert('Eliminar Story?', 'Esta Story será removida antes das 24 horas. A ação é definitiva.', [
      {text:'Cancelar',style:'cancel',onPress:()=>setPaused(false)},
      {text:'Eliminar',style:'destructive',onPress:()=>{
        if(submittingStory.current)return;
        submittingStory.current=true;setStoryBusy(true);
        void deleteStory(storyId,actorToken).then(()=>{if(activeAccount.current===actorToken){onClose();onDeleted();}})
          .catch(e=>{if(activeAccount.current===actorToken)Alert.alert('Story',e instanceof Error?e.message:'Não foi possível confirmar a eliminação.');})
          .finally(()=>{submittingStory.current=false;setStoryBusy(false);setPaused(false);});
      }}
    ]);
  }
  async function shareStory(){
    if(!story||submittingStory.current)return;
    pauseProgress();
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
  return <Modal visible transparent={false} animationType="fade" onRequestClose={safeClose}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
    <SafeAreaView style={styles.storyOverlay}
      onTouchStart={event=>{touchStartY.current=event.nativeEvent.pageY;}}
      onTouchEnd={event=>{
        const start=touchStartY.current;
        touchStartY.current=null;
        if(start!==null&&event.nativeEvent.pageY-start>110&&!replyFocused)safeClose();
      }}
      onTouchCancel={()=>{touchStartY.current=null;}}>
      <View style={styles.storyProgress}>{activeGroup.stories.map((entry,i)=><Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Ir para Story ${i+1}`} onPress={()=>{if(submittingStory.current||replyFocused||!appActive)return;resetProgress();setIndex(i);}} style={styles.progressPart}>
        {i<index?<View style={styles.storyProgressFill}/>:i===index?<Animated.View style={[styles.storyProgressFill,{width:story.video?'100%':progress.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/>:null}
      </Pressable>)}</View>
      <View style={styles.storyTop}><CircleAvatar name={story.displayName} image={activeGroup.avatar} size={34}/><Text style={styles.storyUser}>{activeGroup.name}</Text><Pressable onPress={safeClose} style={styles.closeStory} accessibilityRole="button" accessibilityLabel="Fechar Story"><Text style={styles.closeStoryText}>✕</Text></Pressable></View>
      <View style={styles.storyMedia}>{uri?(story.video?<MediaVideo key={story.id} uri={uri} story paused={paused||replyFocused||storyBusy||!appActive} onEnd={()=>go(1)}/>:<Image source={{uri}} resizeMode="contain" style={styles.storyImage}/>):<Text style={styles.storyCaption}>Media indisponível</Text>}
        {story.caption?.trim()?(story.textX!=null&&story.textY!=null?
          <StoryTextPlacement caption={story.caption.trim()} geometry={{x:story.textX,y:story.textY,rotation:story.textRotation??0,zoom:story.textZoom??1}}/>:
          <View pointerEvents="none" style={styles.storyCaptionLayer}><Text style={styles.storyCaptionOverlay}>{story.caption.trim()}</Text></View>):null}
        <View style={styles.storyTapZones} pointerEvents="box-none">
          <Pressable {...tapZone(-1)} accessibilityRole="button" accessibilityLabel="Story anterior" style={styles.storyTapZone}/>
          <Pressable {...tapZone(1)} accessibilityRole="button" accessibilityLabel="Story seguinte" style={styles.storyTapZone}/>
        </View>
        <StoryDetailsView locationLabel={story.locationLabel} taggedUsernames={story.taggedUsernames}
         onOpenProfile={profile=>{
          if(!submittingStory.current){
           pauseProgress();onClose();
           router.push({pathname:'/social/[username]',params:{username:profile}});
          }
         }}/>
      </View>
      <View style={styles.storyBottom}><Text style={styles.storyCount}>{index+1} / {activeGroup.stories.length}</Text><Text style={styles.storyCount}>Toca para avançar · mantém premido para pausar</Text></View>
      <View style={styles.storyEngagement}>
        <Pressable accessibilityRole="button" accessibilityLabel={story.likedByMe?'Retirar gosto da Story':'Gostar da Story'} disabled={storyBusy} onPress={()=>void toggleLike()} style={styles.storyEngagementAction}>
          <JynloIcon name="like" size={20} color={story.likedByMe?'#FF778C':WHITE} active={story.likedByMe}/><Text style={styles.storyEngagementText}>{story.likeCount||0}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Partilhar Story" disabled={storyBusy} onPress={()=>void shareStory()} style={styles.storyEngagementAction}><Text style={styles.storyEngagementText}>↗ Partilhar</Text></Pressable>
      </View>
      {!ownStory?<View style={styles.storyReplyRow}>
        <TextInput value={replyText} onChangeText={setReplyText} onFocus={()=>{progress.stopAnimation(value=>{remaining.current=Math.max(0,1-value);});setReplyFocused(true);}} onBlur={()=>setReplyFocused(false)}
          placeholder="Responder em privado à Story…" placeholderTextColor={MUTED} maxLength={500}
          accessibilityLabel="Resposta privada ao autor da Story" style={styles.storyReplyInput}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar resposta privada à Story" disabled={storyBusy||!replyText.trim()} onPress={()=>void sendReply()} style={styles.storyReplySend}>
          <Text style={styles.storyReplySendText}>{storyBusy?'…':'Enviar'}</Text>
        </Pressable>
      </View>:null}
      {!ownStory?<Text style={styles.storyReplyHint}>Resposta privada, guardada para o autor. A notificação é opcional.</Text>:null}
      {story.canDelete?<Pressable accessibilityRole="button" accessibilityLabel="Eliminar a minha Story" disabled={storyBusy} onPress={confirmDeleteStory} style={styles.storyDeleteAction}><Text style={styles.storyOwnHint}>Eliminar Story</Text></Pressable>:null}
    </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export default function JynloFeedHome(){
  const router=useRouter();const auth=useAuth();
  const {width:screenWidth,height:screenHeight}=useWindowDimensions();
  const {compose,storyId}=useLocalSearchParams<{compose?:string;storyId?:string}>();
  const activeStoryAccount=useRef<string|null>(auth.token);
  activeStoryAccount.current=auth.token;
  const [unreadNotifications,setUnreadNotifications]=useState(0);
  const [posts,setPosts]=useState<FeedItem[]>([]);
  const [stories,setStories]=useState<SocialStory[]>([]),[ownStories,setOwnStories]=useState<SocialStory[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [storyViewer,setStoryViewer]=useState<StoriesGroup|null>(null);
  const [storyComposer,setStoryComposer]=useState(false),[storyCaption,setStoryCaption]=useState('');
  const [storyLocation,setStoryLocation]=useState(''),[storyTags,setStoryTags]=useState('');
  const [storyFriendSearch,setStoryFriendSearch]=useState('');
  const [storyFriends,setStoryFriends]=useState<StoryFriend[]>([]);
  const [storyFriendsBusy,setStoryFriendsBusy]=useState(false),[storyFriendsError,setStoryFriendsError]=useState('');
  const storyLocationRef=useRef(''),storyTagsRef=useRef('');
  const [storyTextGeometry,setStoryTextGeometry]=useState<StoryTextGeometry>({x:50,y:78,rotation:0,zoom:1});
  const storyGeometryRef=useRef<StoryTextGeometry>({x:50,y:78,rotation:0,zoom:1});
  const storyComposerRef=useRef(false);
  const storyComposerRevision=useRef(0);
  const storyCaptureRevision=storyComposerRevision.current;
  storyComposerRef.current=storyComposer;
  const [storyMedia,setStoryMedia]=useState<MobileMedia|null>(null);
  const storyCaptionRef=useRef(''),storyMediaRef=useRef<MobileMedia|null>(null);
  storyMediaRef.current=storyMedia;
  const [composerOpen,setComposerOpen]=useState(false);
  const [expandedPostImage,setExpandedPostImage]=useState<string|null>(null);
  const [composerText,setComposerText]=useState(''),[composerLocation,setComposerLocation]=useState(''),[composerMedia,setComposerMedia]=useState<MobileMedia[]>([]);
  const composerTextRef=useRef(''),composerLocationRef=useRef('');
  const composerMediaRef=useRef<MobileMedia[]>([]);
  const postComposerScrollRef=useRef<ScrollView|null>(null);
  const storyComposerScrollRef=useRef<ScrollView|null>(null);
  const composerOpenRef=useRef(false);
  const postComposerRevision=useRef(0);
  composerOpenRef.current=composerOpen;
  composerTextRef.current=composerText;
  composerLocationRef.current=composerLocation;
  storyCaptionRef.current=storyCaption;
  storyLocationRef.current=storyLocation;storyTagsRef.current=storyTags;
  useEffect(()=>{
   if(!storyComposer||!auth.token||!auth.username){
    setStoryFriends([]);setStoryFriendsError('');return;
   }
   let active=true;
   setStoryFriends([]);setStoryFriendsBusy(true);setStoryFriendsError('');
   void storyMentionFriends(auth.token).then(friends=>{if(active)setStoryFriends(friends);})
    .catch(()=>{if(active)setStoryFriendsError('Não foi possível carregar os amigos. Podes escrever os nomes manualmente.');})
    .finally(()=>{if(active)setStoryFriendsBusy(false);});
   return ()=>{active=false;};
  },[storyComposer,auth.token,auth.username]);
  storyGeometryRef.current=storyTextGeometry;
  // Full-screen editors are scrollable, but Android resizing does not always
  // bring the focused lower input above the keyboard. Keep both composers
  // independent so closing or switching modals never scrolls the wrong one.
  useEffect(()=>{
    if(!composerOpen&&!storyComposer)return;
    const showEvent=Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow';
    const subscription=Keyboard.addListener(showEvent,()=>{
      const focused=TextInput.State.currentlyFocusedInput?.();
      if(!focused)return;
      const scroller=storyComposer?storyComposerScrollRef.current:postComposerScrollRef.current;
      scroller?.scrollResponderScrollNativeHandleToKeyboard(focused,28,true);
    });
    return()=>subscription.remove();
  },[composerOpen,storyComposer]);
  const scrollComposerInput=(kind:'post'|'story',target:number)=>{
    const scroller=kind==='post'?postComposerScrollRef.current:storyComposerScrollRef.current;
    scroller?.scrollResponderScrollNativeHandleToKeyboard(target,28,true);
  };
  const [publishing,setPublishing]=useState(false),[storyPublishing,setStoryPublishing]=useState(false),[busyPost,setBusyPost]=useState<number|null>(null);
  // State updates are async: refs prevent duplicate POSTs during rapid taps.
  const postInFlight=useRef(false),storyInFlight=useRef(false),mediaPickerInFlight=useRef(false);
  const [editingPost,setEditingPost]=useState<FeedItem|null>(null);
  const [postMenuItem,setPostMenuItem]=useState<FeedItem|null>(null);
  const [expandedComments,setExpandedComments]=useState<number|null>(null),[comments,setComments]=useState<SocialComment[]>([]),[commentText,setCommentText]=useState(''),[commentsLoading,setCommentsLoading]=useState(false);
  const [editingComment,setEditingComment]=useState<number|null>(null),[editCommentDraft,setEditCommentDraft]=useState('');
  const [commentWriteBusy,setCommentWriteBusy]=useState<number|null>(null);
  const commentWriteLock=useRef(false);
  const reloadNumber=useRef(0);
  const commentsRequest=useRef(0);
  const feedIdentity=useRef('');
  const hiddenKeysRef=useRef<string[]>([]);
  const [hiddenKeys,setHiddenKeys]=useState<string[]>([]);
  const [recentlyHidden,setRecentlyHidden]=useState<string|null>(null);
   const [myProfilePhoto,setMyProfilePhoto]=useState<string|null>(null);
  const [hiddenReady,setHiddenReady]=useState(false);
  const load=useCallback(async()=>{
    const id=++reloadNumber.current;
    const identity=auth.token&&auth.username?`${auth.username}:${auth.token}`:'guest';
    const identityChanged=feedIdentity.current!==identity;
    if(identityChanged){
      feedIdentity.current=identity;
      // Never keep previous-account stories, private comments or pending media
      // visible when a user logs out or signs into a different account.
      commentsRequest.current++;
      setPosts([]);setStories([]);setOwnStories([]);setEditingPost(null);setPostMenuItem(null);setMyProfilePhoto(null);
      hiddenKeysRef.current=[];setHiddenKeys([]);setRecentlyHidden(null);setHiddenReady(false);
      setStoryViewer(null);storyComposerRevision.current++;storyComposerRef.current=false;setStoryComposer(false);setStoryMedia(null);setStoryCaption('');
      storyCaptionRef.current='';storyMediaRef.current=null;
      setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
      setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});setExpandedPostImage(null);
      postComposerRevision.current++;composerOpenRef.current=false;setComposerOpen(false);changeComposerMedia(()=>[]);setComposerText('');setComposerLocation('');
      setExpandedComments(null);setComments([]);setCommentText('');setCommentsLoading(false);setEditingComment(null);setEditCommentDraft('');setCommentWriteBusy(null);
    }
    setLoading(true);setError('');
    const fetches=await Promise.allSettled([
      auth.token&&auth.username?socialFeed(auth.token,auth.username):Promise.resolve([]),
      auth.token?storyFeed(auth.token,auth.username):Promise.resolve([]),
      auth.token?myStories(auth.token,auth.username):Promise.resolve([]),
      identityChanged&&auth.token&&auth.username?readHiddenFeedEntries(auth.username):Promise.resolve(hiddenKeysRef.current),
       auth.token?request<{profilePicUrl?:string|null}>('/api/profile/me/mobile',{token:auth.token}):Promise.resolve(null)
    ]);
    if(id!==reloadNumber.current)return;
    const value=<T,>(i:number,fallback:T):T=>{const entry=fetches[i];return entry?.status==='fulfilled'?(entry as PromiseFulfilledResult<T>).value:fallback;};
    if(fetches[0].status==='fulfilled')setPosts(value(0,[] as FeedItem[]));
    if(fetches[1].status==='fulfilled')setStories(value(1,[] as SocialStory[]));
    if(fetches[2].status==='fulfilled')setOwnStories(value(2,[] as SocialStory[]));
     if(fetches[4].status==='fulfilled')setMyProfilePhoto(value(4,null as {profilePicUrl?:string|null}|null)?.profilePicUrl||null);
    if(identityChanged){
      const stored=value(3,[] as string[]);
      hiddenKeysRef.current=stored;setHiddenKeys(stored);setHiddenReady(true);
    }
    if(fetches[0].status==='rejected')
      setError('Não foi possível atualizar as publicações. O conteúdo apresentado pode estar desatualizado. Tenta novamente.');
    else if(fetches[1].status==='rejected'||fetches[2].status==='rejected')
      setError('Não foi possível atualizar as Stories. As Stories apresentadas podem estar desatualizadas. Tenta novamente.');
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
    if(compose==='post')openPostComposer();
    else openStoryComposer();
  },[compose,auth.ready,auth.token,auth.username,router]);
  useEffect(()=>{
    if(typeof storyId!=='string'||!auth.ready||!auth.token)return;
    // Consume the deep link exactly once; no automatic retries for expired Stories.
    router.setParams({storyId:undefined});
    if(!/^[1-9][0-9]{0,15}$/.test(storyId))return;
    const originalToken=auth.token;
    void storyById(Number(storyId),originalToken,auth.username).then(story=>{
      if(activeStoryAccount.current!==originalToken)return;
      setStoryViewer({key:'notification-story-'+story.id,name:story.displayName,
        avatar:story.avatarUrl,stories:[story]});
    }).catch(()=>{
      if(activeStoryAccount.current===originalToken)
        Alert.alert('Story indisponível','Esta Story pode ter expirado ou já não estar acessível.');
    });
  },[storyId,auth.ready,auth.token,router]);
  // Only render a notification indicator after a successful server-backed count.
  // Clear it on account change, and avoid leaking a previous user's unread state.
  useFocusEffect(useCallback(()=>{
    let active=true;
    setUnreadNotifications(0);
    if(!auth.token||!auth.username)return ()=>{active=false;};
    const token=auth.token,username=auth.username;
    const refresh=async()=>{
      try{
        const notifications=await myNotifications(token,username);
        if(active)setUnreadNotifications(notifications.filter(item=>!item.read).length);
      }catch{
        // Unknown is not equivalent to unread; never invent a red badge.
        if(active)setUnreadNotifications(0);
      }
    };
    void refresh();
    const subscription=AppState.addEventListener('change',state=>{
      if(state==='active')void refresh();
    });
    return ()=>{active=false;subscription.remove();};
  },[auth.token,auth.username]));
  const currentFeedIdentity=auth.token&&auth.username?`${auth.username}:${auth.token}`:'guest';
  // A newly signed-in account must never see the previous account's Story modal
  // during the render before useFocusEffect clears old asynchronous state.
  const identityMatches=feedIdentity.current===currentFeedIdentity;
  const visibleStoryViewer=identityMatches?storyViewer:null;
  const storyGroups=useMemo(()=>groupStories(ownStories,stories) as StoriesGroup[],[ownStories,stories]);
  const visibleStoryGroups=identityMatches?storyGroups:[];
  const visiblePosts=identityMatches&&hiddenReady?posts.filter(item=>{
    const key=feedEntryKey(item);return !key||!hiddenKeys.includes(key);
  }):[];
  function persistVisibility(keys:string[],identity:string,username:string){
    hiddenKeysRef.current=keys;setHiddenKeys(keys);
    void writeHiddenFeedEntries(username,keys).catch(()=>{
      if(feedIdentity.current===identity)
        setError('A preferência foi aplicada neste ecrã, mas não foi possível guardá-la no telemóvel.');
    });
  }
  function hideFromFeed(item:FeedItem){
    if(!auth.token||!auth.username||!identityMatches||!hiddenReady)return;
    const key=feedEntryKey(item);if(!key)return;
    const keys=hideEntry(hiddenKeysRef.current,key);
    setRecentlyHidden(key);
    persistVisibility(keys,currentFeedIdentity,auth.username);
  }
  function undoHide(){
    if(!recentlyHidden||!auth.token||!auth.username||!identityMatches)return;
    persistVisibility(showEntry(hiddenKeysRef.current,recentlyHidden),currentFeedIdentity,auth.username);
    setRecentlyHidden(null);
  }
  function openPostMenu(item:FeedItem){
    if(!auth.token||!auth.username||!identityMatches||busyPost!==null)return;
    setPostMenuItem(item);
  }
  function deleteOwnedPost(item:FeedItem){
    if(!auth.token||!auth.username||!item.postId||item.authorUsername.toLowerCase()!==auth.username.toLowerCase())return;
    setPostMenuItem(null);
    const id=item.postId,actor=auth.token,identity=currentFeedIdentity;
    Alert.alert('Eliminar publicação?','A publicação será removida do perfil e do feed. Esta ação não pode ser desfeita.',[
      {text:'Cancelar',style:'cancel'},
      {text:'Eliminar',style:'destructive',onPress:()=>{
        if(busyPost!==null||feedIdentity.current!==identity||!actor)return;
        setBusyPost(id);
        void deletePost(id,actor).then(()=>{
          if(feedIdentity.current===identity)setPosts(old=>old.filter(x=>x.postId!==id));
        }).catch(()=>{if(feedIdentity.current===identity)setError('Não foi possível confirmar a eliminação. Atualiza o feed antes de repetir.');})
        .finally(()=>{if(feedIdentity.current===identity)setBusyPost(null);});
      }}
    ]);
  }
  function hideOwnAttendance(item:FeedItem){
    if(!auth.token||!item.sessionId||busyPost!==null||item.type!=='SESSION_ATTENDED')return;
    setPostMenuItem(null);
    const identity=currentFeedIdentity,id=item.sessionId,actor=auth.token;
    setBusyPost(-id);
    void hideAttendanceActivity(id,actor).then(()=>{
      if(feedIdentity.current===identity)setPosts(old=>old.filter(x=>!(x.type==='SESSION_ATTENDED'&&x.sessionId===id&&x.authorUsername===item.authorUsername)));
    }).catch(()=>{if(feedIdentity.current===identity)setError('Não foi possível ocultar a atividade no servidor.');})
    .finally(()=>{if(feedIdentity.current===identity)setBusyPost(null);});
  }
  function openPostComposer(){
    postComposerRevision.current++;
    composerOpenRef.current=true;setComposerOpen(true);
  }
  function openStoryComposer(){
    storyComposerRevision.current++;
    storyComposerRef.current=true;setStoryComposer(true);
    setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});
    setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
    setStoryFriendSearch('');
  }
  function closeStoryComposer(){
    if(storyInFlight.current)return;
    const discard=()=>{
      storyComposerRevision.current++;storyComposerRef.current=false;
      setStoryComposer(false);setStoryMedia(null);setStoryCaption('');
      setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});
      setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
    };
    if(storyMedia||storyCaption.trim()||storyLocation.trim()||storyTags.trim()){
      Alert.alert('Descartar Story?','A fotografia, o vídeo e a legenda deste rascunho serão perdidos.',[
        {text:'Continuar a editar',style:'cancel'},
        {text:'Descartar',style:'destructive',onPress:discard}
      ]);
      return;
    }
    discard();
  }
  function changeComposerMedia(update:(current:MobileMedia[])=>MobileMedia[]){
    const next=update(composerMediaRef.current);
    composerMediaRef.current=next;setComposerMedia(next);
  }
  function closePostComposer(){
    if(postInFlight.current)return;
    if(composerMediaRef.current.length||composerText.trim()||composerLocation.trim()){
      Alert.alert('Descartar publicação?','As fotografias, os vídeos e o texto deste rascunho serão perdidos.',[
        {text:'Continuar a editar',style:'cancel'},
        {text:'Descartar',style:'destructive',onPress:()=>{
          postComposerRevision.current++;composerOpenRef.current=false;changeComposerMedia(()=>[]);setComposerText('');setComposerLocation('');setComposerOpen(false);
        }}
      ]);
      return;
    }
    postComposerRevision.current++;composerOpenRef.current=false;setComposerOpen(false);
  }
  function requireLogin(){if(auth.token&&auth.username)return true;router.push({pathname:'/login',params:{redirect:'/'}});return false;}
  async function pickMedia(setter:(v:MobileMedia|null)=>void,source:'gallery'|'camera'='gallery',album=false){
    if(!requireLogin()||mediaPickerInFlight.current)return;
    const actorToken=auth.token;
    const postComposerWasOpen=album&&composerOpenRef.current;
    const postRevision=postComposerRevision.current;
    const storyRevision=storyComposerRevision.current;
    const storyComposerWasOpen=!album&&storyComposerRef.current;
    const availableAlbumSlots=album?Math.max(0,MAX_ALBUM_ITEMS-composerMediaRef.current.length):1;
    if(album&&availableAlbumSlots===0){Alert.alert('Álbum completo','Remove um ficheiro antes de adicionares outro.');return;}
    mediaPickerInFlight.current=true;
    try{const ImagePicker=await import('expo-image-picker');
      if(source==='camera'){
        const permission=await ImagePicker.requestCameraPermissionsAsync();
        if(!permission.granted){Alert.alert('Câmara sem autorização','Autoriza o acesso à câmara nas definições do telemóvel ou escolhe a galeria.');return;}
      }
      const result=source==='camera'
        ?await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:.86,videoMaxDuration:30,exif:false,base64:false})
        :await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:.86,...(album?{allowsMultipleSelection:true,selectionLimit:availableAlbumSlots}: {})});
      if(activeStoryAccount.current!==actorToken||result.canceled||!result.assets.length)return;
      const prepared:MobileMedia[]=[];
      for(const asset of result.assets){
        const kind=asset.type==='video'?'video':'image';
        const mime=pickerMediaMime(asset);
        if(!mime){Alert.alert('Formato não suportado','Escolhe JPG, PNG, WebP, MP4 ou WebM. Os formatos MOV e HEIC ainda não são aceites.');return;}
        let size=asset.fileSize||0;
        if(!size){
          try{const {File}=await import('expo-file-system');const f=new File(asset.uri);if(f.exists)size=f.size;}catch{}
        }
        // Some Android gallery providers expose content:// without a file size.
        // Keep the selection and validate the real bytes after copying into cache on upload.
        const validation=size>0?validateMedia(mime,size,!album&&setter===setStoryMedia):null;
        if(validation){Alert.alert('Ficheiro não aceite',validation);return;}
        prepared.push({uri:asset.uri,type:kind,mimeType:mime,fileName:asset.fileName||`${kind==='video'?'video':'foto'}-${Date.now()}.${kind==='video'?'mp4':'jpg'}`,fileSize:size});
      }
      // The picker can remain open while authentication changes in the app.
      // Never apply its old assets to a different account's composer.
      if(activeStoryAccount.current!==actorToken)return;
      if(album){
        if(!postComposerWasOpen||!composerOpenRef.current||postComposerRevision.current!==postRevision||postInFlight.current)return;
        const result=appendAlbumSelection(composerMediaRef.current,prepared);
        if(result.error){Alert.alert('Álbum não aceite',result.error);return;}
        changeComposerMedia(()=>result.items);
      }else if(storyComposerWasOpen&&storyComposerRef.current&&storyComposerRevision.current===storyRevision&&prepared[0]&&!storyInFlight.current)setter(prepared[0]);
    }catch(e){if(activeStoryAccount.current===actorToken)Alert.alert(source==='camera'?'Não foi possível abrir a câmara':'Não foi possível abrir a galeria',e instanceof Error?e.message:'Confirma as permissões do teu telemóvel.');}
    finally{mediaPickerInFlight.current=false;}
  }
  async function submitPost(){
    if(!requireLogin()||postInFlight.current||(!composerMedia.length&&!composerText.trim()))return;
    const actor=auth.token,username=auth.username,body=composerText,place=composerLocation,media=[...composerMedia];
    const revision=postComposerRevision.current;
    postInFlight.current=true;setPublishing(true);
    try{
      await publishPost(body,media,actor,username,place);
      // A user may have kept typing or selected another file during the upload.
      // The server has published the original snapshot, never discard newer edits.
      if(feedIdentity.current===`${username}:${actor}`&&
         postComposerRevision.current===revision&&composerOpenRef.current){
        const unchanged=composerTextRef.current===body&&composerLocationRef.current===place&&
          composerMediaRef.current.length===media.length&&
          composerMediaRef.current.every((file,index)=>file.uri===media[index]?.uri);
        if(unchanged){
          postComposerRevision.current++;composerOpenRef.current=false;
          setComposerText('');composerTextRef.current='';
          setComposerLocation('');composerLocationRef.current='';
          changeComposerMedia(()=>[]);setComposerOpen(false);
        }else{
          Alert.alert('Publicação enviada','As alterações feitas durante o envio ficaram guardadas no editor. Podes criar outra publicação.');
        }
        // Refresh failure must not be interpreted as a failed published POST.
        void load().catch(()=>setError('Publicação enviada. Não foi possível atualizar o feed; desliza para atualizar.'));
      }
    }catch(e){
      if(feedIdentity.current===`${username}:${actor}`)
        Alert.alert('Publicação',e instanceof Error?e.message:'Não foi possível confirmar a publicação. Verifica o perfil antes de repetir.');
    }finally{postInFlight.current=false;setPublishing(false);}
  }
  async function submitStory(){
    if(!requireLogin()||storyInFlight.current||!storyMedia)return;
    const actor=auth.token,username=auth.username,body=storyCaption,media=storyMedia,geometry={...storyGeometryRef.current};
    const tagsDraft=storyTags,locationDraft=storyLocation;
    let details:StoryDetails;
    try{details=prepareStoryDetails(locationDraft,tagsDraft);}catch(e){Alert.alert('Story',e instanceof Error?e.message:'Verifica a localização e as identificações.');return;}
    const revision=storyComposerRevision.current;
    storyInFlight.current=true;setStoryPublishing(true);
    try{
      await publishStory(body,media,actor,username,null,geometry,details);
      if(feedIdentity.current===`${username}:${actor}`&&
         storyComposerRevision.current===revision&&storyComposerRef.current){
        const currentGeometry=storyGeometryRef.current;
        const unchanged=storyCaptionRef.current===body&&storyMediaRef.current?.uri===media.uri&&
          storyLocationRef.current===locationDraft&&storyTagsRef.current===tagsDraft&&
          currentGeometry.x===geometry.x&&currentGeometry.y===geometry.y&&
          currentGeometry.rotation===geometry.rotation&&currentGeometry.zoom===geometry.zoom;
        if(unchanged){
          storyComposerRevision.current++;storyComposerRef.current=false;
          setStoryCaption('');storyCaptionRef.current='';
          setStoryMedia(null);storyMediaRef.current=null;setStoryComposer(false);
          setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});
          setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
        }else{
          Alert.alert('Story publicada','As alterações feitas durante o envio ficaram guardadas no editor.');
        }
        void load().catch(()=>setError('Story enviada. Não foi possível atualizar o feed.'));
      }
    }catch(e){
      if(feedIdentity.current===`${username}:${actor}`)
        Alert.alert('Story',e instanceof Error?e.message:'Não foi possível confirmar a Story. Verifica se já aparece no perfil antes de repetir.');
    }finally{storyInFlight.current=false;setStoryPublishing(false);}
  }
  async function toggleLike(item:FeedItem){if(item.type!=='POST'||!item.postId||!requireLogin()||busyPost!==null)return;
    setBusyPost(item.postId);try{await likePost(item.postId,item.likedByMe,auth.token,auth.username);await load();}
    catch(e){Alert.alert('Gosto',e instanceof Error?e.message:'Não foi possível atualizar o gosto.');}finally{setBusyPost(null);}
  }
  function closeComments(){commentsRequest.current++;setExpandedComments(null);setComments([]);setCommentText('');setCommentsLoading(false);setEditingComment(null);setEditCommentDraft('');}
  async function openComments(item:FeedItem){if(!item.postId)return;const id=item.postId;
    const requestId=++commentsRequest.current;
    if(expandedComments===id){closeComments();return;}
    setExpandedComments(id);setComments([]);setCommentText('');setEditingComment(null);setEditCommentDraft('');setCommentsLoading(true);
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
    try{await Share.share({message:[item.content?.trim()||'Publicação na Jynlo',sharedPostLink(item)].join('\n')});}
    catch(e){Alert.alert('Partilhar publicação',e instanceof Error?e.message:'Não foi possível partilhar.');}
  }
  async function toggleCommentLikeInFeed(c:SocialComment){
    if(!auth.token||!auth.username||expandedComments!==c.postId||commentWriteLock.current)return;
    const account=feedIdentity.current,revision=commentsRequest.current;
    commentWriteLock.current=true;setCommentWriteBusy(c.id);
    try{
      const updated=await togglePostCommentLike(c.postId,c,auth.token,auth.username);
      if(account===feedIdentity.current&&revision===commentsRequest.current)
        setComments(old=>old.map(item=>item.id===c.id?updated:item));
    }catch(e){if(account===feedIdentity.current&&revision===commentsRequest.current)
      Alert.alert('Gosto no comentário',e instanceof Error?e.message:'Não foi possível atualizar.');}
    finally{commentWriteLock.current=false;if(account===feedIdentity.current)setCommentWriteBusy(null);}
  }
  async function saveCommentEditInFeed(c:SocialComment){
    if(!auth.token||!auth.username||expandedComments!==c.postId||commentWriteLock.current||
      c.authorUsername.toLowerCase()!==auth.username.toLowerCase()||!editCommentDraft.trim())return;
    const account=feedIdentity.current,revision=commentsRequest.current,content=editCommentDraft.trim();
    commentWriteLock.current=true;setCommentWriteBusy(c.id);
    try{
      const updated=await editPostComment(c.postId,c.id,content,auth.token,auth.username);
      if(account===feedIdentity.current&&revision===commentsRequest.current){
        setComments(old=>old.map(item=>item.id===c.id?updated:item));
        setEditingComment(null);setEditCommentDraft('');
      }
    }catch(e){if(account===feedIdentity.current&&revision===commentsRequest.current)
      Alert.alert('Editar comentário',e instanceof Error?e.message:'Não foi possível guardar.');}
    finally{commentWriteLock.current=false;if(account===feedIdentity.current)setCommentWriteBusy(null);}
  }
  function SessionPostAttachment({item}:{item:FeedItem}){
    const id=item.sessionId;
    if(!Number.isSafeInteger(id)||!id||id<=0)return null;
    const scheduled= item.gameDate?Date.parse(item.gameDate):NaN;
    const when=Number.isFinite(scheduled)?new Date(scheduled).toLocaleString('pt-PT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):null;
    return <Pressable accessibilityRole="button" accessibilityLabel="Consultar sessão associada à publicação" onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(id)}})} style={styles.postSessionCard}>
      <View style={styles.postSessionIcon}><JynloIcon name="session" size={26} color={TEAL}/></View>
      <View style={{flex:1,gap:4}}>
        <Text style={styles.postSessionTitle}>{item.sport?.trim()||'Sessão desportiva'}</Text>
        {(item.city?.trim()||when)?<Text style={styles.postSessionMeta}>{[item.city?.trim(),when].filter(Boolean).join(' · ')}</Text>:null}
        <Text style={styles.postSessionLink}>Ver detalhes da sessão</Text>
      </View>
    </Pressable>;
  }
  function PostCard({item}:{item:FeedItem}){
    const album=postMediaItems(item);const likeBusy=busyPost===item.postId;
    return <View style={styles.postCard}>
      <View style={styles.postTop}><CircleAvatar name={item.authorDisplayName||item.authorUsername} image={item.authorProfilePicUrl} size={43}/>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${item.authorUsername}`} onPress={()=>router.push({pathname:'/social/[username]',params:{username:item.authorUsername}})} style={{flex:1,gap:3}}><Text style={styles.postName}>{item.authorDisplayName||item.authorUsername}</Text>
          <Text style={styles.postMeta}>{item.type==='POST'?'Publicação':'Atividade desportiva'}  ·  {timeAgo(item.createdAt)}</Text></Pressable>
        
        {auth.token?<Pressable onPress={()=>openPostMenu(item)} accessibilityRole="button" accessibilityLabel="Opções desta publicação" disabled={busyPost!==null} hitSlop={8} style={{paddingHorizontal:8,minHeight:40,justifyContent:'center'}}><JynloIcon name="more" color={MUTED} size={24}/></Pressable>:null}</View>
      {item.type!=='POST'&&item.content?<Text style={styles.postBody}>{item.content}</Text>:null}
      {item.type==='POST'&&item.location?.trim()?<Text style={styles.postMeta}>⌖ {item.location.trim()}</Text>:null}
      {album.length?<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={album.length>1} style={{width:'100%'}}>
        {album.map((entry,i)=>{const uri=mediaSource(entry.url);return <View key={i} style={{width:Math.max(220,screenWidth-56),position:'relative'}}>
          {uri?(entry.type==='video'?<MediaVideo uri={uri}/>:<FeedPostPhoto uri={uri} width={Math.max(220,screenWidth-56)} label={'Ampliar fotografia '+(i+1)+' de '+album.length} onExpand={()=>setExpandedPostImage(uri)}/>):null}
          {album.length>1?<View pointerEvents="none" style={styles.albumCounter}><Text style={styles.albumCounterText}>{i+1}/{album.length}</Text></View>:null}
        </View>;})}
      </ScrollView>:null}
      {item.type==='POST'?<><View style={styles.postActions}>
        <Pressable onPress={()=>{void toggleLike(item);}} disabled={likeBusy} style={styles.postAction} accessibilityRole="button" accessibilityLabel={item.likedByMe?'Retirar gosto':'Gostar'}><JynloIcon name="like" color={item.likedByMe?'#FF7797':TEAL} size={23} active={item.likedByMe}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={item.hideLikers&&item.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Lista de gostos privada":"Ver quem gostou desta publicação"} disabled={Boolean(item.hideLikers&&item.authorUsername.toLowerCase()!==auth.username?.toLowerCase())||!Number.isSafeInteger(item.postId)||!item.postId||item.postId<=0} onPress={()=>router.push({pathname:'/posts/[postId]/likers',params:{postId:String(item.postId)}})} style={styles.postAction}><Text style={styles.actionCount}>{item.hideLikers&&item.authorUsername.toLowerCase()!==auth.username?.toLowerCase()?"Gostos privados":`${item.likeCount} gostos`}</Text></Pressable>
        <Pressable onPress={()=>{void openComments(item);}} style={styles.postAction} accessibilityRole="button" accessibilityLabel="Abrir comentários"><JynloIcon name="comment" color={TEAL} size={23}/><Text style={styles.actionCount}>{item.commentCount}</Text></Pressable>
        <Pressable onPress={()=>{void sharePost(item);}} accessibilityRole="button" accessibilityLabel="Partilhar publicação" style={styles.postAction}><JynloIcon name="share" color={TEAL} size={23}/><Text style={styles.actionCount}>Partilhar</Text></Pressable>
        {Number.isSafeInteger(item.postId)&&item.postId!>0?<Pressable accessibilityRole="button" accessibilityLabel="Abrir detalhe completo da publicação" onPress={()=>router.push({pathname:'/posts/[postId]',params:{postId:String(item.postId)}})} style={styles.postDetailAction}><Text style={styles.postDetailLabel}>Ver publicação ›</Text></Pressable>:null}
      </View>{item.content?<Text style={styles.postBody}>{item.content}</Text>:null}</>:null}
      <SessionPostAttachment item={item}/>
    </View>;
  }
  const Header=()=> <View style={styles.screenPad}>
    <View style={styles.navHeader}><View style={styles.brand}><Image source={require('../../assets/jynlo-icon.png')} style={styles.brandLogo}/><Text style={styles.brandName}>JYNLO</Text></View><View style={styles.headerRight}>
      <Pressable onPress={()=>router.push('/notifications')} style={styles.headerCircle} accessibilityLabel="Notificações"><JynloIcon name="notifications" color={WHITE} size={22}/>{unreadNotifications>0&&identityMatches?<View style={styles.pulse} accessibilityLabel={unreadNotifications+' notificações por ler'}/>:null}</Pressable>
      <Pressable onPress={()=>router.push(auth.token?'/(tabs)/profile':'/login')} style={styles.headerUser} accessibilityLabel={auth.token?'Perfil e conta ativa':'Iniciar sessão'}><CircleAvatar name={auth.username||'Visitante'} image={myProfilePhoto} size={32}/><Text style={styles.headerName} numberOfLines={1}>{auth.username||'Entrar'}</Text></Pressable></View></View>
    {DEMO_MODE?<View style={styles.demoRibbon}><Text style={styles.demoRibbonText}>◉ PRÉVIA LOCAL  ·  DADOS DE DEMONSTRAÇÃO</Text></View>:null}
    <View style={styles.storiesCard}>
      <SectionHeader eyebrow="MOMENTOS DESPORTIVOS" title="Stories"/>
      {visibleStoryGroups.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>{auth.token?<Pressable accessibilityRole="button" accessibilityLabel="Criar a minha story" onPress={openStoryComposer} style={styles.storyItem}><View style={styles.storyCreateRing}><CircleAvatar name={auth.username||'Jynlo'} image={myProfilePhoto} size={57}/><View style={styles.storyCreateBadge}><Text style={styles.storyCreatePlus}>＋</Text></View></View><Text style={styles.storyItemName} numberOfLines={1}>A tua story</Text></Pressable>:null}{visibleStoryGroups.map(group=><Pressable key={group.key} onPress={()=>setStoryViewer(group)} style={styles.storyItem} accessibilityLabel={`Ver Stories de ${group.name}`}>
        <View style={styles.storyRing}><CircleAvatar name={group.name} image={group.avatar} size={57}/></View><Text style={styles.storyItemName} numberOfLines={1}>{group.name}</Text></Pressable>)}</ScrollView>
        :<Pressable accessibilityRole="button" accessibilityLabel="Criar a minha story" onPress={()=>requireLogin()&&openStoryComposer()} style={styles.emptyStories}><View style={styles.storyEmptyIcon}><JynloIcon name={auth.token?'plus':'camera'} color={TEAL} size={23}/></View><View style={{flex:1}}><Text style={styles.storiesEmptyTitle}>{auth.token?'Partilha o teu primeiro momento':'Descobre os momentos da comunidade'}</Text><Text style={styles.storiesEmptyText}>{auth.token?'Fotografias e vídeos que duram 24 horas.':'Entra com a tua conta para veres e partilhares Stories.'}</Text></View></Pressable>}
    </View>
    {!auth.token?<View style={styles.visitorCard}><Text style={styles.visitorDescription}>Entra para partilhares momentos e acompanhares os teus amigos.</Text><Pressable onPress={()=>router.push('/login')} style={styles.visitorPrimary}><Text style={styles.visitorPrimaryText}>Iniciar sessão</Text></Pressable></View>:null}
    <View style={styles.latestTitle}><Text style={styles.sectionTitle}>Publicações</Text></View>
    {identityMatches&&recentlyHidden?<View style={styles.hiddenNotice}>
      <Text style={styles.hiddenNoticeText}>Publicação ocultada só neste dispositivo.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Desfazer ocultação" onPress={undoHide} style={styles.hiddenUndo}><Text style={styles.link}>Desfazer</Text></Pressable>
    </View>:null}
    {error?<View style={styles.errorBox}><Text style={{color:'#FFB8B8'}}>{error}</Text><Pressable onPress={()=>void load()}><Text style={styles.link}>Tentar novamente</Text></Pressable></View>:null}
    {(loading||!identityMatches)&&visiblePosts.length===0?<ActivityIndicator color={TEAL} style={{margin:20}}/>:null}
    {!loading&&!error&&identityMatches&&auth.token&&visiblePosts.length===0?<Text style={styles.mutedText}>Ainda não há publicações. Partilha o teu primeiro momento!</Text>:null}
  </View>;
  if(!auth.ready)return <SafeAreaView style={{flex:1,backgroundColor:INDIGO,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={TEAL}/></SafeAreaView>;
  if(!auth.token&&!auth.browsingAsGuest)return <Redirect href="/welcome"/>;
  return <SafeAreaView style={{flex:1,backgroundColor:INDIGO}} edges={['top','left','right']}>
    <FlatList data={visiblePosts} keyExtractor={(item,index)=>`${item.type}-${item.postId||item.sessionId||index}-${index}`} renderItem={({item})=><View style={styles.feedCardWrap}>{PostCard({item})}</View>} ListHeaderComponent={Header()}
      refreshControl={<RefreshControl refreshing={loading&&visiblePosts.length>0} onRefresh={()=>void load()} tintColor={TEAL}/>}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"/>
    <StoryViewer group={visibleStoryViewer} groups={visibleStoryGroups} token={auth.token} username={auth.username} onClose={()=>setStoryViewer(null)} onDeleted={()=>void load()} onUpdated={updated=>{setStories(previous=>previous.map(story=>story.id===updated.id?updated:story));setOwnStories(previous=>previous.map(story=>story.id===updated.id?updated:story));setStoryViewer(previous=>previous&&previous.stories.some(story=>story.id===updated.id)?{...previous,stories:previous.stories.map(story=>story.id===updated.id?updated:story)}:previous);}}/>
    <Modal visible={identityMatches&&!!expandedPostImage} animationType="fade" transparent onRequestClose={()=>setExpandedPostImage(null)}>
      <View style={styles.postPhotoBackdrop}>
        {expandedPostImage?<Image source={{uri:expandedPostImage}} style={styles.postPhotoFull} resizeMode="contain"/>:null}
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar fotografia ampliada" onPress={()=>setExpandedPostImage(null)} style={styles.postPhotoClose}><Text style={styles.postPhotoCloseText}>✕ Fechar</Text></Pressable>
      </View>
    </Modal>
    <Modal visible={identityMatches&&expandedComments!==null} transparent animationType="slide" onRequestClose={closeComments}>
      <KeyboardAvoidingView style={styles.commentsModal} behavior={Platform.OS==='ios'?'padding':'height'}>
        <Pressable style={styles.commentsBackdrop} accessibilityRole="button" accessibilityLabel="Fechar comentários" onPress={closeComments}/>
        <SafeAreaView edges={['bottom']} style={styles.commentsSheet}>
          <View style={styles.commentsHandle}/>
          <View style={styles.commentsHeader}><Text style={styles.commentsTitle}>Comentários</Text>
            <Pressable onPress={closeComments} accessibilityRole="button" accessibilityLabel="Fechar comentários" hitSlop={12}><JynloIcon name="close" color={WHITE} size={24}/></Pressable>
          </View>
          {commentsLoading?<ActivityIndicator color={TEAL} style={{marginVertical:24}}/>:
            <ScrollView style={styles.commentsList} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.commentsListContent}>
              {comments.length?comments.map(c=><View key={c.id} style={styles.comment}>
                <CircleAvatar name={c.authorUsername} image={c.authorProfilePicUrl} size={34}/>
                <View style={{flex:1,gap:5}}><Text style={styles.commentAuthor}>@{c.authorUsername}</Text>
                  {editingComment===c.id?<><TextInput value={editCommentDraft} onChangeText={setEditCommentDraft}
                    maxLength={2000} multiline style={styles.commentInput} placeholder="Editar comentário" placeholderTextColor={MUTED}/>
                    <View style={{flexDirection:'row',gap:12}}>
                     <Pressable disabled={commentWriteBusy!==null||!editCommentDraft.trim()} onPress={()=>void saveCommentEditInFeed(c)} accessibilityRole="button" accessibilityLabel="Guardar comentário"><Text style={styles.commentAuthor}>Guardar</Text></Pressable>
                     <Pressable disabled={commentWriteBusy!==null} onPress={()=>{setEditingComment(null);setEditCommentDraft('');}} accessibilityRole="button"><Text style={styles.commentAuthor}>Cancelar</Text></Pressable>
                    </View></>:<Text style={styles.commentBody}>{c.content}{c.editedAt?' · editado':''}</Text>}
                  <View style={{flexDirection:'row',gap:16,alignItems:'center'}}>
                    <Pressable accessibilityRole="button" accessibilityLabel={c.likedByMe?'Retirar gosto do comentário':'Gostar do comentário'} disabled={!auth.token||commentWriteBusy!==null}
                     onPress={()=>void toggleCommentLikeInFeed(c)}>
                     <Text style={styles.commentAuthor}>{c.likedByMe?'♥':'♡'} {c.likeCount||0}</Text>
                    </Pressable>
                    {auth.username&&c.authorUsername.toLowerCase()===auth.username.toLowerCase()&&editingComment!==c.id?
                     <Pressable accessibilityRole="button" accessibilityLabel="Editar o meu comentário" disabled={commentWriteBusy!==null}
                      onPress={()=>{setEditingComment(c.id);setEditCommentDraft(c.content);}}><Text style={styles.commentAuthor}>Editar</Text></Pressable>:null}
                  </View></View>
              </View>):<Text style={styles.commentsEmpty}>Ainda não há comentários. Inicia a conversa!</Text>}
            </ScrollView>}
          <View style={styles.commentCompose}><TextInput value={commentText} onChangeText={setCommentText} style={styles.commentInput} maxLength={2000} placeholder={auth.token?'Escrever comentário…':'Inicia sessão para comentar'} placeholderTextColor={MUTED} editable={!!auth.token&&busyPost===null} multiline/>
            <Pressable onPress={()=>expandedComments!==null&&void submitComment(expandedComments)} disabled={!auth.token||!commentText.trim()||busyPost!==null||commentsLoading} style={[styles.sendComment,(!auth.token||!commentText.trim()||busyPost!==null||commentsLoading)&&{opacity:.45}]} accessibilityRole="button" accessibilityLabel="Enviar comentário"><JynloIcon name="send" size={23} color={INDIGO}/></Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={identityMatches&&!!postMenuItem} transparent animationType="fade" onRequestClose={()=>setPostMenuItem(null)}>
      <View style={styles.commentsModal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar opções da publicação" style={styles.commentsBackdrop} onPress={()=>setPostMenuItem(null)}/>
        <SafeAreaView edges={['bottom']} style={styles.postMenuSafeArea}>
         <View style={[styles.postMenuContainer,{maxHeight:Math.max(220,Math.floor(screenHeight*.72))}]}>
          <View style={styles.commentsHandle}/>
          <View style={styles.postMenuHeading}>
           <Text style={styles.commentsTitle}>Opções da publicação</Text>
           <Pressable accessibilityRole="button" accessibilityLabel="Fechar opções da publicação" onPress={()=>setPostMenuItem(null)} style={styles.postMenuClose}>
            <JynloIcon name="close" color={WHITE} size={24}/>
           </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.postMenuContents}>
          {postMenuItem?<Pressable accessibilityRole="button" accessibilityLabel="Ocultar do meu feed" style={styles.postMenuAction} onPress={()=>{
            const post=postMenuItem;setPostMenuItem(null);hideFromFeed(post);
          }}><Text style={styles.postMenuText}>Ocultar do meu feed</Text></Pressable>:null}
          {postMenuItem&&auth.username&&postMenuItem.authorUsername.toLowerCase()===auth.username.toLowerCase()&&postMenuItem.type==='POST'&&postMenuItem.postId?
            <Pressable accessibilityRole="button" accessibilityLabel="Editar publicação" style={styles.postMenuAction} onPress={()=>{
              const post=postMenuItem;setPostMenuItem(null);setEditingPost(post);
            }}><Text style={styles.postMenuText}>Editar texto e localização</Text></Pressable>:null}
          {postMenuItem&&auth.username&&postMenuItem.authorUsername.toLowerCase()===auth.username.toLowerCase()&&postMenuItem.type==='POST'&&postMenuItem.postId?
            <Pressable accessibilityRole="button" accessibilityLabel="Eliminar publicação" style={styles.postMenuAction} onPress={()=>deleteOwnedPost(postMenuItem)}>
              <Text style={[styles.postMenuText,{color:'#FF8C8C'}]}>Eliminar publicação</Text>
            </Pressable>:null}
          {postMenuItem&&auth.username&&postMenuItem.authorUsername.toLowerCase()===auth.username.toLowerCase()&&postMenuItem.type==='SESSION_ATTENDED'&&postMenuItem.sessionId?
            <Pressable accessibilityRole="button" accessibilityLabel="Ocultar esta atividade para todos" style={styles.postMenuAction} onPress={()=>hideOwnAttendance(postMenuItem)}>
              <Text style={[styles.postMenuText,{color:'#FF8C8C'}]}>Ocultar atividade para todos</Text>
            </Pressable>:null}
          <Pressable accessibilityRole="button" accessibilityLabel="Cancelar opções da publicação" style={styles.postMenuAction} onPress={()=>setPostMenuItem(null)}>
            <Text style={styles.postMenuText}>Cancelar</Text>
          </Pressable>
          </ScrollView>
         </View>
        </SafeAreaView>
      </View>
    </Modal>
    <PostEditSheet post={identityMatches?editingPost:null} token={auth.token} username={auth.username}
      onClose={()=>setEditingPost(null)} onSaved={updated=>{
        if(feedIdentity.current!==currentFeedIdentity)return;
        setPosts(current=>current.map(item=>item.postId===updated.postId?updated:item));
        setEditingPost(null);
      }}/>
    <Modal visible={identityMatches&&composerOpen} animationType="slide" onRequestClose={closePostComposer}>
      <SafeAreaView style={styles.storyComposerOverlay} edges={['top','bottom']}>
        <KeyboardAvoidingView style={{flex:1,gap:17}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={styles.storyComposerHead}><View style={{flex:1}}><Text style={styles.storyComposerTitle}>Nova publicação</Text><Text style={styles.storiesIntro}>Partilha texto, fotografias ou vídeos com a comunidade.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar nova publicação" disabled={publishing} onPress={closePostComposer} style={styles.modalClose}><JynloIcon name="close" color={WHITE} size={25}/></Pressable></View>
        <ScrollView ref={postComposerScrollRef} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.mediaComposeBody}>
          <View style={styles.mediaChooseRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tirar fotografia ou gravar vídeo" disabled={publishing} onPress={()=>void pickMedia(()=>{},'camera',true)} style={styles.mediaChooseButton}><JynloIcon name="camera" size={26} color={TEAL}/><Text style={styles.mediaChooseText}>Câmara</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Escolher fotografia ou vídeo da galeria" disabled={publishing} onPress={()=>void pickMedia(()=>{},'gallery',true)} style={styles.mediaChooseButton}><JynloIcon name="gallery" size={26} color={TEAL}/><Text style={styles.mediaChooseText}>Galeria</Text></Pressable>
          </View>
          {composerMedia.length?<View style={styles.postMediaPreview}>
            <Pressable accessibilityRole="button" accessibilityLabel="Remover todos os ficheiros da publicação" disabled={publishing} onPress={()=>Alert.alert('Limpar álbum?','Remover todas as fotografias e vídeos deste rascunho?',[
              {text:'Cancelar',style:'cancel'},
              {text:'Limpar álbum',style:'destructive',onPress:()=>changeComposerMedia(()=>[])}
            ])} style={[styles.removeMediaButton,{alignSelf:'flex-end'}]}><Text style={styles.removeMediaText}>Limpar álbum</Text></Pressable>
            <Text style={styles.storiesIntro}>{composerMedia.length}/6 ficheiros · O primeiro é a capa · Desliza e usa as setas para ordenar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:10,paddingVertical:8}}>
              {composerMedia.map((media,i)=><View key={media.uri} style={{width:230,gap:5}}>
                {media.type==='image'?<Image source={{uri:media.uri}} resizeMode="contain" style={styles.postMediaPreviewImage}/>:<MediaVideo key={media.uri} uri={media.uri}/>}
                <View style={styles.postMediaPreviewFooter}><Text style={styles.attachedText} numberOfLines={1}>{i===0?'Capa · ':''}{i+1}. {media.fileName}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Mover ficheiro ${i+1} para trás`} disabled={publishing||i===0} onPress={()=>changeComposerMedia(prev=>moveAlbumItem(prev,prev.findIndex(x=>x.uri===media.uri),prev.findIndex(x=>x.uri===media.uri)-1))} style={[styles.removeMediaButton,(publishing||i===0)&&{opacity:.4}]}><JynloIcon name="back" color={TEAL} size={19}/></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Mover ficheiro ${i+1} para a frente`} disabled={publishing||i===composerMedia.length-1} onPress={()=>changeComposerMedia(prev=>moveAlbumItem(prev,prev.findIndex(x=>x.uri===media.uri),prev.findIndex(x=>x.uri===media.uri)+1))} style={[styles.removeMediaButton,(publishing||i===composerMedia.length-1)&&{opacity:.4}]}><JynloIcon name="chevron-right" color={TEAL} size={19}/></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remover ficheiro ${i+1}`} disabled={publishing} onPress={()=>changeComposerMedia(prev=>prev.filter(x=>x.uri!==media.uri))} style={styles.removeMediaButton}><Text style={styles.removeMediaText}>Remover</Text></Pressable>
                  </View>
                </View>
              </View>)}
            </ScrollView>
          </View>:<View style={styles.mediaEmptyState}><Text style={styles.mediaEmptyTitle}>O teu próximo momento desportivo</Text><Text style={styles.storiesIntro}>Escreve uma mensagem ou acrescenta até 6 fotografias ou vídeos.</Text></View>}
          <TextInput onFocus={event=>scrollComposerInput('post',event.target)} style={styles.composerInput} value={composerText} onChangeText={value=>{composerTextRef.current=value;setComposerText(value);}} placeholder="O que queres partilhar?" placeholderTextColor={MUTED} multiline maxLength={maxPostLength}/>
          <Text style={styles.countText}>{composerText.length}/{maxPostLength}</Text>
          <TextInput onFocus={event=>scrollComposerInput('post',event.target)} style={styles.storyCaptionInput} value={composerLocation} onChangeText={value=>{composerLocationRef.current=value;setComposerLocation(value);}} placeholder="Adicionar localização (opcional)" accessibilityLabel="Localização da publicação" placeholderTextColor={MUTED} maxLength={160}/>
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Publicar fotografia ou vídeo" disabled={(!composerMedia.length&&!composerText.trim())||publishing} onPress={()=>void submitPost()} style={[styles.primaryButton,{minHeight:52,marginLeft:0},((!composerMedia.length&&!composerText.trim())||publishing)&&{opacity:.45}]}><Text style={styles.primaryButtonText}>{publishing?'A publicar…':'Partilhar publicação'}</Text></Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>

    <Modal visible={identityMatches&&storyComposer} animationType="slide" onRequestClose={closeStoryComposer}>
      <SafeAreaView style={styles.storyComposerOverlay} edges={['top','bottom']}>
        <KeyboardAvoidingView style={{flex:1,gap:17}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={styles.storyComposerHead}><View style={{flex:1,gap:4}}><Text style={styles.storyComposerTitle}>Criar Story</Text><Text style={styles.storiesIntro}>Uma fotografia ou vídeo visível durante 24 horas.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar criação de Story" disabled={storyPublishing} onPress={closeStoryComposer} style={styles.modalClose}><JynloIcon name="close" color={WHITE} size={25}/></Pressable></View>
        <ScrollView ref={storyComposerScrollRef} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.mediaComposeBody}>
          {!storyMedia?<Suspense fallback={<View style={{height:440,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={TEAL}/></View>}>
            <StoryCameraCapture key={storyComposerRevision.current} onCaptured={media=>{if(activeStoryAccount.current===auth.token&&storyComposerRef.current&&storyComposerRevision.current===storyCaptureRevision&&!storyInFlight.current)setStoryMedia(media);}} onPickGallery={()=>void pickMedia(setStoryMedia,'gallery')}/>
          </Suspense>:null}
          {storyMedia?<View style={styles.storyPreview}>
            {storyMedia.type==='image'?<Image source={{uri:storyMedia.uri}} resizeMode="contain" style={styles.storyPreviewMedia}/>:<MediaVideo uri={storyMedia.uri} story paused/>}
            <StoryDetailsView locationLabel={storyLocation} taggedUsernames={storyTags.replace(/@/g,'')}/>
            {storyCaption.trim()?<StoryTextPlacement caption={storyCaption.trim()} geometry={storyTextGeometry}
              onChange={value=>{storyGeometryRef.current=value;setStoryTextGeometry(value);}} disabled={storyPublishing}/>:null}
          </View>:null}
          {storyMedia?<Pressable accessibilityRole="button" disabled={storyPublishing} onPress={()=>void pickMedia(setStoryMedia,'gallery')} style={styles.removeMediaButton}><Text style={styles.removeMediaText}>Trocar pela galeria</Text></Pressable>:null}
          {storyMedia?<Pressable accessibilityRole="button" disabled={storyPublishing} onPress={()=>setStoryMedia(null)} style={styles.removeMediaButton}><Text style={styles.removeMediaText}>Remover fotografia ou vídeo</Text></Pressable>:null}
          <Text style={styles.storiesIntro}>Arrasta o texto com um dedo. Usa dois dedos para rodar e ampliar.</Text>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyCaption} onChangeText={value=>{storyCaptionRef.current=value;setStoryCaption(value);}} maxLength={180} placeholder="Escreve sobre o momento (opcional)…" placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          <Text style={styles.countText}>{storyCaption.length}/180</Text>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyLocation} onChangeText={value=>{storyLocationRef.current=value;setStoryLocation(value);}}
            placeholder="Adicionar localização (opcional)" accessibilityLabel="Localização da Story"
            maxLength={160} placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyTags} onChangeText={value=>{storyTagsRef.current=value;setStoryTags(value);}}
            placeholder="Identificar amigos: @ana, @joao" accessibilityLabel="Identificar amigos na Story"
            maxLength={500} autoCapitalize="none" autoCorrect={false} placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          <Text style={styles.storiesIntro}>Podes identificar até 5 amigos com ligação aceite. Separa os perfis por vírgulas.</Text>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyFriendSearch} onChangeText={setStoryFriendSearch}
           placeholder="Procurar amigos para identificar" accessibilityLabel="Procurar amigos na Story"
           autoCapitalize="none" placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          {storyFriendsBusy?<Text style={styles.storiesIntro}>A carregar amigos…</Text>:null}
          {storyFriendsError?<Text style={styles.storiesIntro}>{storyFriendsError}</Text>:null}
          {storyFriends.filter(friend=>storyFriendSearch.trim()
           ?[friend.username,friend.nickname||'',friend.fullName||''].some(value=>
             value.toLocaleLowerCase('pt-PT').includes(storyFriendSearch.trim().toLocaleLowerCase('pt-PT')))
           :storyMentionUsernames(storyTags).includes(friend.username.toLowerCase())).slice(0,15).map(friend=>{
           const selected=storyMentionUsernames(storyTags).includes(friend.username.toLowerCase());
           return <Pressable key={friend.username} accessibilityRole="button" disabled={storyPublishing}
            accessibilityLabel={(selected?'Remover identificação de ':'Identificar ')+friend.username}
            style={styles.storyFriendOption} onPress={()=>{
             try{
              const updated=toggleStoryMention(storyTagsRef.current,friend.username);
              storyTagsRef.current=updated;setStoryTags(updated);
             }catch(e){Alert.alert('Identificações',e instanceof Error?e.message:'Limite de identificações atingido.');}
            }}>
            {friend.profilePicUrl?<Image source={{uri:resolveJynloMedia(friend.profilePicUrl)||undefined}} style={styles.storyFriendAvatar}/>:
             <View style={styles.storyFriendAvatarPlaceholder}><Text style={{color:WHITE,fontWeight:'800'}}>{friend.username.slice(0,1).toUpperCase()}</Text></View>}
            <View style={{flex:1}}><Text style={styles.storyFriendName}>{friend.nickname||friend.fullName||friend.username}</Text>
             <Text style={styles.storiesIntro}>@{friend.username}</Text></View>
            <Text style={styles.storyFriendName}>{selected?'✓':'+'}</Text>
           </Pressable>;
          })}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Publicar Story" onPress={()=>void submitStory()} style={[styles.primaryButton,{minHeight:54,marginLeft:0},(!storyMedia||storyPublishing)&&{opacity:.5}]} disabled={!storyMedia||storyPublishing}><Text style={styles.primaryButtonText}>{storyPublishing?'A publicar…':'Publicar Story'}</Text></Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  postMenuSafeArea:{width:'100%',backgroundColor:INDIGO,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:BORDER},
  postMenuContainer:{minHeight:220,paddingTop:12,paddingHorizontal:16,paddingBottom:12},
  postMenuContents:{paddingBottom:28,gap:10},
  postMenuHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  postMenuClose:{width:48,height:48,alignItems:'center',justifyContent:'center'},
  postMenuAction:{padding:14,minHeight:48,justifyContent:'center',borderRadius:12,backgroundColor:PANEL,borderWidth:1,borderColor:BORDER},
  postMenuText:{fontSize:14,fontWeight:'800',color:WHITE},
  albumCounter:{position:'absolute',right:10,top:10,paddingHorizontal:9,paddingVertical:4,borderRadius:12,backgroundColor:'rgba(0,0,0,.72)'},
  albumCounterText:{color:'#fff',fontWeight:'800',fontSize:12},
  hiddenNotice:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:12,backgroundColor:PANEL,borderWidth:1,borderColor:BORDER},
  hiddenNoticeText:{flex:1,color:WHITE,fontSize:12},hiddenUndo:{minHeight:42,justifyContent:'center',paddingHorizontal:8},
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
  postPhotoBackdrop:{flex:1,backgroundColor:'#020A10',justifyContent:'center',padding:12},postPhotoFull:{width:'100%',height:'86%'},postPhotoClose:{alignSelf:'center',minHeight:48,paddingHorizontal:24,justifyContent:'center',borderWidth:1,borderColor:BORDER,borderRadius:16,backgroundColor:PANEL},postPhotoCloseText:{color:WHITE,fontWeight:'900'},
   composerCard:{backgroundColor:'#082D3D',borderColor:BORDER,borderWidth:1,borderRadius:14,padding:10,gap:10},composerHeading:{fontSize:14,color:WHITE,fontWeight:'900'},composerInput:{minHeight:85,backgroundColor:'#06333C',borderWidth:1,borderColor:'#128070',borderRadius:12,padding:12,color:WHITE,fontSize:14,textAlignVertical:'top'},composerBottom:{flexDirection:'row',alignItems:'center',gap:9},attachButton:{flexDirection:'row',gap:6,alignItems:'center',paddingVertical:6},attachIcon:{fontSize:19,color:TEAL},attachText:{color:WHITE,fontWeight:'800',fontSize:11},countText:{color:MUTED,fontSize:10},primaryButton:{marginLeft:'auto',paddingVertical:10,paddingHorizontal:15,borderRadius:10,backgroundColor:TEAL,alignItems:'center',justifyContent:'center'},primaryButtonText:{color:'#03242A',fontSize:12,fontWeight:'900'},postMediaPreview:{borderWidth:1,borderColor:BORDER,borderRadius:14,overflow:'hidden',backgroundColor:'#020A10'},postMediaPreviewImage:{width:'100%',height:300,backgroundColor:'#020A10'},postMediaPreviewFooter:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12,paddingVertical:9,backgroundColor:PANEL},removeMediaButton:{paddingVertical:7,paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:'#3F7D88'},removeMediaText:{color:TEAL,fontSize:12,fontWeight:'800'},attachedText:{color:MUTED,fontSize:11,flex:1},
  latestTitle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:4,paddingBottom:1},link:{color:TEAL,fontWeight:'800',fontSize:11},feedCardWrap:{paddingHorizontal:12,marginBottom:10},postCard:{backgroundColor:'#092938',borderWidth:1,borderColor:BORDER,borderRadius:16,padding:15,gap:13},postTop:{flexDirection:'row',alignItems:'center',gap:11},postName:{color:WHITE,fontSize:14,fontWeight:'900'},postMeta:{color:MUTED,fontSize:10},postBody:{color:WHITE,fontSize:14,lineHeight:21},postImage:{width:'100%',height:350,borderRadius:12,backgroundColor:'#020A10'},postVideo:{width:'100%',height:300,borderRadius:12},postActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',borderTopColor:'#154653',borderTopWidth:1,paddingTop:10,rowGap:8,columnGap:13},postDetailAction:{minHeight:44,justifyContent:'center',marginLeft:'auto',paddingHorizontal:7},postDetailLabel:{color:TEAL,fontWeight:'900',fontSize:12},postSessionCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#06333F',borderWidth:1,borderColor:'#127681',borderRadius:14,padding:12},postSessionIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#0D5060',alignItems:'center',justifyContent:'center'},postSessionIconText:{fontSize:24,color:TEAL,fontWeight:'900'},postSessionTitle:{fontSize:14,fontWeight:'900',color:WHITE},postSessionMeta:{fontSize:11,color:MUTED},postSessionLink:{fontSize:12,fontWeight:'800',color:TEAL},postAction:{flexDirection:'row',gap:5,alignItems:'center',minHeight:36},actionIcon:{fontSize:21,color:TEAL},actionCount:{fontSize:12,color:MUTED,fontWeight:'700'},activityBox:{flexDirection:'row',padding:12,borderRadius:12,backgroundColor:'#062C3A',borderWidth:1,borderColor:BORDER,alignItems:'center',gap:10},activityTitle:{color:WHITE,fontSize:13,fontWeight:'800'},activityMeta:{color:MUTED,fontSize:10,marginTop:2},viewSession:{color:TEAL,fontSize:12,fontWeight:'800'},commentsModal:{flex:1,justifyContent:'flex-end'},commentsBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.7)'},commentsSheet:{height:'74%',backgroundColor:INDIGO,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:BORDER,paddingHorizontal:16,paddingTop:9},commentsHandle:{alignSelf:'center',width:42,height:4,borderRadius:2,backgroundColor:'#587A85',marginBottom:15},commentsHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:14,borderBottomWidth:1,borderBottomColor:BORDER},commentsTitle:{color:WHITE,fontSize:17,fontWeight:'900'},commentsClose:{color:WHITE,fontSize:20,paddingHorizontal:8},commentsList:{flex:1},commentsListContent:{paddingVertical:13,gap:10,flexGrow:1},commentsEmpty:{color:MUTED,fontSize:13,textAlign:'center',marginTop:26},comment:{flexDirection:'row',gap:10,padding:11,backgroundColor:'#06232F',borderRadius:11},commentAuthor:{color:TEAL,fontSize:11,fontWeight:'800'},commentBody:{fontSize:12,color:WHITE},commentCompose:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:12,borderTopWidth:1,borderTopColor:BORDER},commentInput:{flex:1,minHeight:39,color:WHITE,backgroundColor:'#06232F',borderColor:BORDER,borderWidth:1,paddingHorizontal:12,borderRadius:10},sendComment:{backgroundColor:TEAL,width:40,height:40,borderRadius:11,alignItems:'center',justifyContent:'center'},sendText:{color:INDIGO,fontSize:20},errorBox:{borderColor:'#C87575',borderWidth:1,padding:12,borderRadius:10,gap:6},mutedText:{fontSize:11,color:MUTED,lineHeight:16},discoveryCard:{borderColor:BORDER,borderWidth:1,borderRadius:16,backgroundColor:PANEL,padding:15,gap:12},personRow:{flexDirection:'row',gap:9,alignItems:'center'},personName:{fontWeight:'900',fontSize:12,color:WHITE},
  storyOverlay:{flex:1,backgroundColor:'#020A10',paddingHorizontal:12,paddingTop:5},storyEngagement:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:6},storyEngagementAction:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderColor:BORDER,borderWidth:1,borderRadius:18},storyEngagementText:{color:WHITE,fontSize:15,fontWeight:'800'},storyReplyRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6},storyReplyInput:{flex:1,color:WHITE,borderColor:BORDER,borderWidth:1,borderRadius:23,minHeight:46,paddingHorizontal:15,backgroundColor:PANEL},storyReplySend:{minHeight:46,paddingHorizontal:13,backgroundColor:TEAL,borderRadius:23,justifyContent:'center'},storyReplySendText:{color:INDIGO,fontWeight:'800'},storyReplyHint:{fontSize:11,color:MUTED,paddingBottom:8},storyDeleteAction:{minHeight:44,alignSelf:'center',justifyContent:'center',paddingHorizontal:15},storyProgress:{flexDirection:'row',gap:4,height:4},progressPart:{flex:1,backgroundColor:'#557781',borderRadius:3,overflow:'hidden'},storyProgressFill:{height:'100%',width:'100%',backgroundColor:WHITE},storyTop:{flexDirection:'row',alignItems:'center',gap:9,marginTop:12},storyUser:{flex:1,color:WHITE,fontWeight:'900'},closeStory:{padding:9},closeStoryText:{color:WHITE,fontSize:20},storyMedia:{flex:1,justifyContent:'center',alignItems:'center',paddingVertical:12},storyTapZones:{...StyleSheet.absoluteFillObject,flexDirection:'row'},storyTapZone:{flex:1},storyImage:{width:'100%',height:'100%'},storyVideo:{width:'100%',height:'100%'},storyCaption:{color:WHITE,textAlign:'center',fontSize:16,fontWeight:'800',paddingVertical:10},storyCaptionLayer:{position:'absolute',bottom:24,left:15,right:15,alignItems:'center',justifyContent:'center'},storyCaptionOverlay:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',backgroundColor:'rgba(0,0,0,0.64)',paddingHorizontal:14,paddingVertical:9,borderRadius:13,overflow:'hidden'},storyBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14},storyNav:{padding:11},storyNavText:{color:TEAL,fontWeight:'800'},storyCount:{color:MUTED,fontSize:11},storyOwnHint:{color:MUTED,fontSize:10,textAlign:'center',paddingBottom:5},
  modalClose:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},modalCloseText:{fontSize:22,color:WHITE,fontWeight:'800'},mediaComposeBody:{gap:14,paddingBottom:24},mediaChooseRow:{flexDirection:'row',gap:12},mediaChooseButton:{flex:1,minHeight:94,borderRadius:15,borderWidth:1,borderColor:'#146875',backgroundColor:PANEL,alignItems:'center',justifyContent:'center',gap:7,padding:12},mediaChooseIcon:{fontSize:25,color:TEAL},mediaChooseText:{fontSize:14,fontWeight:'800',color:WHITE},mediaEmptyState:{minHeight:155,borderRadius:16,borderWidth:1,borderColor:BORDER,backgroundColor:'#072B39',justifyContent:'center',alignItems:'center',gap:9,padding:20},mediaEmptyTitle:{fontSize:15,fontWeight:'800',color:WHITE,textAlign:'center'},storyComposerOverlay:{flex:1,backgroundColor:INDIGO,padding:18,gap:17},storyComposerHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},storyComposerTitle:{color:WHITE,fontSize:22,fontWeight:'900'},mediaPicker:{minHeight:115,borderRadius:15,borderWidth:1,borderColor:TEAL,backgroundColor:PANEL,alignItems:'center',justifyContent:'center',gap:9,padding:12},storyFriendOption:{flexDirection:'row',alignItems:'center',gap:12,padding:10,borderRadius:12,backgroundColor:PANEL,borderWidth:1,borderColor:BORDER,minHeight:56},
 storyFriendAvatar:{width:38,height:38,borderRadius:19},
 storyFriendAvatarPlaceholder:{width:38,height:38,borderRadius:19,backgroundColor:'#24545D',alignItems:'center',justifyContent:'center'},
 storyFriendName:{color:WHITE,fontWeight:'800',fontSize:13},
 storyPreview:{width:'100%',height:320,backgroundColor:'#020A10',borderRadius:16,overflow:'hidden',justifyContent:'center'},storyPreviewMedia:{width:'100%',height:'100%'},storyCaptionInput:{backgroundColor:PANEL,borderWidth:1,borderColor:BORDER,color:WHITE,padding:13,borderRadius:12,minHeight:50}
});
