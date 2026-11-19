import React,{Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Animated,AppState,FlatList,Image,Keyboard,KeyboardAvoidingView,Linking,Modal,Platform,Pressable,RefreshControl,ScrollView,Share,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect,useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
// Load the native media picker only when the user explicitly opens the gallery.
// Native video is loaded on demand for actual video content.
import {useAuth} from '../../src/lib/auth';
import {mediaRequestSource} from '../../src/lib/protected-media-source';
import {DEMO_MODE,request,sessionDetail,cancelSession} from '../../src/lib/api';
import {myNotifications} from '../../src/lib/notifications-api';
import {myCommunityInvites} from '../../src/lib/community-api';
import {socialFeed,storyFeed,myStories,likePost,postComments,addPostComment,editPostComment,togglePostCommentLike,publishPost,publishStory,toggleStoryLike,replyToStory,storyById,recordStoryView,storyAudience,deleteStory,deletePost,hideAttendanceActivity,resolveJynloMedia} from '../../src/lib/social-feed-api';
import type {StoryAudience} from '../../src/lib/social-feed-api';
import {feedEntryKey,hideEntry,showEntry} from '../../src/lib/feed-visibility.cjs';
import {removedFeedKey,reconcileRemovedFeedKeys} from '../../src/lib/confirmed-feed-removals.cjs';
import {rememberPostLike,reconcilePostLikes,rememberCommentFloor,reconcileCommentCounts,rememberPostEdit,reconcilePostEdits} from '../../src/lib/feed-interaction-reconciliation.cjs';
import {attendanceDigest,isDigestAttendance,attendanceTitle} from '../../src/lib/attendance-digest.cjs';
import {readHiddenFeedEntries,writeHiddenFeedEntries} from '../../src/lib/feed-visibility-store';
import {groupStories,validateMedia} from '../../src/lib/social-feed-core.cjs';
import {albumError,appendAlbumSelection,moveAlbumItem,postMediaItems,MAX_ALBUM_ITEMS} from '../../src/lib/post-album.cjs';
import {sharedPostLink} from '../../src/lib/shared-post-link.cjs';
import {cancellationNotice} from '../../src/lib/session-cancellation-notice.cjs';
import {pickerMediaMime} from '../../src/lib/picker-media-format.cjs';
import {C,MobileTheme} from '../../src/lib/theme';
import PostEditSheet from '../../src/components/PostEditSheet';
import {JynloIcon} from '../../src/components/JynloIcon';
import StoryTextPlacement from '../../src/components/StoryTextPlacement';
import StoryDetailsView from '../../src/components/StoryDetailsView';
import {storyMetadataReservedHeight} from '../../src/lib/story-sticker-bounds.cjs';
import PostAlbumCarousel from '../../src/components/PostAlbumCarousel';
import PostImageLightbox,{type ExpandedPostPhotos} from '../../src/components/PostImageLightbox';
import {storyMentionFriends,searchStoryMentionProfiles,type StoryFriend} from '../../src/lib/social-relations-api';
import {myCommunities} from '../../src/lib/community-api';
import type {CommunityGroup} from '../../src/lib/types';
import {prepareStoryDetails,toggleStoryMention,storyMentionUsernames} from '../../src/lib/story-details.cjs';
import {searchSocialPlaces,socialPlaceLabel,type SocialPlace} from '../../src/lib/social-place-search';
import type {FeedItem,SocialStory,SocialComment,MobileMedia,StoryTextGeometry,StoryDetails,StoryTextAppearance} from '../../src/lib/types';

type StoriesGroup={key:string;name:string;avatar:string|null;stories:SocialStory[]};
const {background:INDIGO,surface:PANEL,border:BORDER,accent:TEAL,muted:MUTED,text:WHITE}=MobileTheme.colors;
const maxPostLength=1000;
const startLetter=(s:string)=>s.replace(/^@/,'').charAt(0).toUpperCase()||'J';
const timeAgo=(date:string)=>{const x=Date.parse(date);if(!Number.isFinite(x))return 'Recentemente';const seconds=Math.max(0,Math.floor((Date.now()-x)/1000));if(seconds<60)return 'Agora';if(seconds<3600)return `${Math.floor(seconds/60)} min`;if(seconds<86400)return `${Math.floor(seconds/3600)} h`;return `${Math.floor(seconds/86400)} d`;};
const mediaSource=(url:string|null|undefined)=>(url?.startsWith('file:')||url?.startsWith('content:'))?url:resolveJynloMedia(url);

const FeedVideo=lazy(()=>import('../../src/components/FeedVideo'));
const StoryCameraCapture=lazy(()=>import('../../src/components/StoryCameraCapture'));
function MediaVideo({uri,story=false,paused=false,muted=false,onEnd,onReady,onPlaybackError}:{uri:string;story?:boolean;paused?:boolean;muted?:boolean;onEnd?:()=>void;onReady?:()=>void;onPlaybackError?:()=>void}){
 return <Suspense fallback={<View style={story?styles.storyVideo:styles.postVideo}/>}>
  <FeedVideo uri={uri} story={story} paused={paused} muted={muted} onEnd={onEnd} onReady={onReady} onPlaybackError={onPlaybackError}/>
 </Suspense>;
}
function CircleAvatar({name,size=42,image}:{name:string;size?:number;image?:string|null}){
  const {token}=useAuth();
  const src=mediaSource(image);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{setFailed(false);},[src,token]);
  return <View style={[styles.avatar,{width:size,height:size,borderRadius:size/2}]}>{src&&!failed?
    <Image source={mediaRequestSource(src,token)} onError={()=>setFailed(true)}
      style={{width:size,height:size,borderRadius:size/2}}/>:
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
  const [replyText,setReplyText]=useState(''),[storyBusy,setStoryBusy]=useState(false),[replyFocused,setReplyFocused]=useState(false),[storyMuted,setStoryMuted]=useState(true);
  const [mediaState,setMediaState]=useState<'loading'|'ready'|'error'>('loading');
  const [mediaRetry,setMediaRetry]=useState(0);
  const [audience,setAudience]=useState<StoryAudience|null>(null);
  const [audienceOpen,setAudienceOpen]=useState(false),[audienceBusy,setAudienceBusy]=useState(false),[audienceError,setAudienceError]=useState('');
  const viewedStoryIds=useRef(new Set<number>());
  const activeStoryIdRef=useRef<number|null>(null);
  const audienceRequest=useRef(0);
  const submittingStory=useRef(false);
  const activeAccount=useRef(token);
  activeAccount.current=token;
  React.useEffect(()=>{viewedStoryIds.current.clear();},[token]);
  const longPress=useRef(false);
  const touchStartY=useRef<number|null>(null);
  const progress=useRef(new Animated.Value(0)).current;
  const remaining=useRef(1);
  React.useEffect(()=>{
    setCurrentKey(group?.key||null);setIndex(0);setPaused(false);setReplyText('');setStoryMuted(true);
    remaining.current=1;progress.setValue(0);longPress.current=false;
  },[group?.key,progress]);
  const activeGroup=groups.find(entry=>entry.key===currentKey)||group;
  const story=activeGroup?.stories[index];
  activeStoryIdRef.current=story?.id??null;
  React.useEffect(()=>{audienceRequest.current++;
    setReplyText('');setReplyFocused(false);setMediaState('loading');setMediaRetry(0);
    setAudience(null);setAudienceOpen(false);setAudienceError('');},[story?.id]);
  React.useEffect(()=>{
    if(!story||mediaState!=='loading')return;
    // Native players sometimes never fire a failure callback on a stalled connection.
    // Show recovery instead of a permanently black Story after 12 seconds.
    const timer=setTimeout(()=>setMediaState(current=>current==='loading'?'error':current),12000);
    return ()=>clearTimeout(timer);
  },[story?.id,mediaState,mediaRetry]);
  React.useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>{
      if(state!=='active')progress.stopAnimation(value=>{remaining.current=Math.max(0,1-value);});
      setAppActive(state==='active');
    });
    return ()=>subscription.remove();
  },[progress]);
  const safeClose=()=>{if(submittingStory.current)return;
    if(audienceOpen){setAudienceOpen(false);setPaused(false);return;}
    onClose();};
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
    if(!story||story.video||mediaState!=='ready'||paused||replyFocused||storyBusy||audienceOpen||!appActive)return;
    const animation=Animated.timing(progress,{toValue:1,duration:Math.max(50,6000*remaining.current),useNativeDriver:false});
    animation.start(({finished})=>{
      if(finished){
        const groupIndex=groups.findIndex(entry=>entry.key===activeGroup?.key);
        if(activeGroup&&index<activeGroup.stories.length-1){remaining.current=1;progress.setValue(0);setIndex(i=>i+1);}
        else if(groupIndex>=0&&groupIndex<groups.length-1){remaining.current=1;progress.setValue(0);setCurrentKey(groups[groupIndex+1]?.key??null);setIndex(0);}
        else safeClose();
      }
    });
    return ()=>{animation.stop();};
  },[story?.id,story?.video,mediaState,paused,replyFocused,storyBusy,audienceOpen,appActive,index,currentKey,groups,activeGroup?.key,onClose,progress]);
  if(!group||!activeGroup||!story)return null;
  const uri=mediaSource(story.mediaUrl);
  const ownStory=story.authorUsername.toLowerCase()===username?.toLowerCase();
  const mediaReady=()=>{
    setMediaState('ready');
    // Record a view only after real media is ready, once per Story/account.
    if(!ownStory&&token&&username&&!viewedStoryIds.current.has(story.id)){
      viewedStoryIds.current.add(story.id);
      void recordStoryView(story.id,token).catch(()=>{viewedStoryIds.current.delete(story.id);});
    }
  };
  const loadAudience=async()=>{
    if(!ownStory||!token||audienceBusy)return;
    pauseProgress();setAudienceOpen(true);setAudienceBusy(true);setAudienceError('');
    const id=story.id,actor=token,requestId=++audienceRequest.current;
    const stillCurrent=()=>activeAccount.current===actor&&activeStoryIdRef.current===id&&
      audienceRequest.current===requestId;
    try{const result=await storyAudience(id,actor);
      if(stillCurrent())setAudience(result);
    }catch(e){if(stillCurrent())setAudienceError(e instanceof Error?e.message:'Não foi possível carregar as visualizações.');}
    finally{if(stillCurrent())setAudienceBusy(false);}
  };
  const sendQuickReaction=async(emoji:string)=>{
    if(ownStory||!token||!username||storyBusy||submittingStory.current)return;
    submittingStory.current=true;setStoryBusy(true);pauseProgress();
    const id=story.id,actor=token;
    try{await replyToStory(id,emoji,actor,username);
      if(activeAccount.current===actor)Alert.alert('Reação enviada',emoji+' A reação foi enviada em privado ao autor.');
    }catch(e){if(activeAccount.current===actor)Alert.alert('Reação',e instanceof Error?e.message:'Não foi possível confirmar a reação.');}
    finally{submittingStory.current=false;setStoryBusy(false);setPaused(false);}
  };
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
        if(start!==null&&event.nativeEvent.pageY-start>110&&!replyFocused&&!audienceOpen)safeClose();
      }}
      onTouchCancel={()=>{touchStartY.current=null;}}>
      <View style={styles.storyProgress}>{activeGroup.stories.map((entry,i)=><Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Ir para Story ${i+1}`} onPress={()=>{if(submittingStory.current||replyFocused||!appActive)return;resetProgress();setIndex(i);}} style={styles.progressPart}>
        {i<index?<View style={styles.storyProgressFill}/>:i===index?<Animated.View style={[styles.storyProgressFill,{width:story.video?'100%':progress.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/>:null}
      </Pressable>)}</View>
      <View style={styles.storyTop}><CircleAvatar name={story.displayName} image={activeGroup.avatar} size={34}/><Text style={styles.storyUser}>{activeGroup.name}</Text><Pressable onPress={safeClose} style={styles.closeStory} accessibilityRole="button" accessibilityLabel="Fechar Story"><Text style={styles.closeStoryText}>✕</Text></Pressable></View>
      <View style={styles.storyMedia}>{uri?(story.video?
        <MediaVideo key={story.id+'-'+mediaRetry} uri={uri} story muted={storyMuted}
          paused={paused||replyFocused||storyBusy||audienceOpen||!appActive||mediaState==='error'}
          onReady={mediaReady} onPlaybackError={()=>setMediaState('error')} onEnd={()=>go(1)}/>:
        <Image key={story.id+'-'+mediaRetry} source={mediaRequestSource(uri,token)}
          resizeMode="contain" style={styles.storyImage}
          onLoad={mediaReady} onError={()=>setMediaState('error')}
          accessibilityLabel={story.altText||story.caption||'Fotografia da Story'}/>):null}
        {mediaState==='loading'&&uri?<View pointerEvents="none" style={styles.storyMediaStatus}>
          <ActivityIndicator color={WHITE} size="large"/><Text style={styles.storyMediaStatusText}>A carregar Story…</Text>
        </View>:null}
        {(!uri||mediaState==='error')?<View style={styles.storyMediaFailure}>
          <JynloIcon name="gallery" size={32} color={TEAL}/>
          <Text style={styles.storyMediaFailureTitle}>Não foi possível mostrar esta Story</Text>
          <Text style={styles.storyMediaStatusText}>Verifica a ligação ou tenta carregar novamente.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar a carregar Story"
            style={styles.storyMediaRetry} onPress={()=>{
              setMediaState('loading');setMediaRetry(n=>n+1);
              if(token)void storyById(story.id,token,username).then(fresh=>{
                if(activeAccount.current===token&&fresh.id===story.id)onUpdated(fresh);
              }).catch(()=>{setMediaState('error');});
            }}><Text style={styles.storyMediaRetryText}>Tentar novamente</Text></Pressable>
        </View>:null}
        {story.caption?.trim()?(story.textX!=null&&story.textY!=null?
          <StoryTextPlacement caption={story.caption.trim()} geometry={{x:story.textX,y:story.textY,rotation:story.textRotation??0,zoom:story.textZoom??1}}
             appearance={{color:story.textColor||'white',background:story.textBackground||'dark',font:story.textFont||'modern'}}
             reservedTopPx={storyMetadataReservedHeight(story.locationLabel,story.taggedUsernames)}/>:
          <View pointerEvents="none" style={styles.storyCaptionLayer}><Text style={styles.storyCaptionOverlay}>{story.caption.trim()}</Text></View>):null}
        <View style={styles.storyTapZones} pointerEvents={mediaState==='error'||!uri||audienceOpen?'none':'box-none'}>
          <Pressable {...tapZone(-1)} accessibilityRole="button" accessibilityLabel="Story anterior" style={styles.storyTapZone}/>
          <Pressable {...tapZone(1)} accessibilityRole="button" accessibilityLabel="Story seguinte" style={styles.storyTapZone}/>
        </View>
        <StoryDetailsView locationLabel={story.locationLabel} taggedUsernames={story.taggedUsernames} showTime={story.showTime===true} createdAt={story.createdAt}
         onOpenProfile={profile=>{
          if(!submittingStory.current){
           pauseProgress();onClose();
           router.push({pathname:'/social/[username]',params:{username:profile}});
          }
         }}/>
      </View>
      <View style={styles.storyBottom}><Text style={styles.storyCount}>{index+1} / {activeGroup.stories.length}</Text><Text style={styles.storyCount}>Toca para avançar · mantém premido para pausar</Text></View>
      <View style={styles.storyEngagement}>
        {ownStory?<Pressable accessibilityRole="button" accessibilityLabel="Ver quem viu esta Story"
          disabled={audienceBusy} onPress={()=>void loadAudience()} style={[styles.storyEngagementAction,styles.storyViewsAction]}>
          <JynloIcon name="views" size={19} color={WHITE}/>
          <Text style={styles.storyEngagementText}>{audience?audience.viewCount+' visualizações':'Ver visualizações'}</Text>
        </Pressable>:null}
        {story.video?<Pressable accessibilityRole="button" accessibilityLabel={storyMuted?'Ativar som do vídeo':'Silenciar vídeo'} onPress={()=>setStoryMuted(v=>!v)} style={styles.storyEngagementAction}>
          <JynloIcon name={storyMuted?'volume-off':'volume'} color={WHITE} size={21}/>
        </Pressable>:null}
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
      {!ownStory?<View style={styles.storyReactions}>
        <Text style={styles.storyReactionsTitle}>Reagir em privado</Text>
        <View style={styles.storyReactionRow}>{['❤️','🔥','👏','😂','😮','⚽'].map(emoji=>
          <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={'Reagir à Story com '+emoji}
            disabled={storyBusy} onPress={()=>void sendQuickReaction(emoji)} style={styles.storyReactionButton}>
            <Text style={styles.storyReactionEmoji}>{emoji}</Text>
          </Pressable>)}</View>
      </View>:null}
      {!ownStory?<Text style={styles.storyReplyHint}>O autor pode ver que visualizaste esta Story. As reações e respostas são privadas.</Text>:null}
      {audienceOpen&&ownStory?<View style={styles.storyAudiencePanel}>
        <View style={styles.storyAudienceHeader}>
          <Text style={styles.storyAudienceTitle}>Quem viu a tua Story</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar visualizações"
            onPress={()=>{setAudienceOpen(false);setPaused(false);}} style={styles.storyAudienceClose}>
            <Text style={styles.storyAudienceCloseText}>✕</Text>
          </Pressable>
        </View>
        {audienceBusy?<ActivityIndicator color={TEAL}/>:null}
        {audienceError?<Text accessibilityRole="alert" style={styles.storyMediaStatusText}>{audienceError}</Text>:null}
        {audience?<Text style={styles.storyAudienceCount}>{audience.viewCount} visualizações únicas</Text>:null}
        {audience&&audience.viewers.length===0?<Text style={styles.storyMediaStatusText}>Ainda não há visualizações registadas.</Text>:null}
        <ScrollView style={styles.storyAudienceScroll} keyboardShouldPersistTaps="handled">
          {audience?.viewers.map(viewer=><Pressable key={viewer.username} accessibilityRole="button"
            accessibilityLabel={'Abrir perfil de '+viewer.username} style={styles.storyViewerRow}
            onPress={()=>{onClose();router.push({pathname:'/social/[username]',params:{username:viewer.username}});}}>
            <CircleAvatar name={viewer.displayName||viewer.username} image={viewer.avatarUrl} size={36}/>
            <View style={{flex:1}}><Text style={styles.storyViewerName}>@{viewer.username}</Text>
              <Text style={styles.storyViewerTime}>{new Date(viewer.viewedAt).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</Text></View>
          </Pressable>)}
        </ScrollView>
        {audience&&audience.viewCount>audience.viewers.length?<Text style={styles.storyMediaStatusText}>
          A apresentar as 100 visualizações mais recentes disponíveis.
        </Text>:null}
      </View>:null}
      {story.canDelete?<Pressable accessibilityRole="button" accessibilityLabel="Eliminar a minha Story" disabled={storyBusy} onPress={confirmDeleteStory} style={styles.storyDeleteAction}><Text style={styles.storyOwnHint}>Eliminar Story</Text></Pressable>:null}
    </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export default function JynloFeedHome(){
  const router=useRouter();const auth=useAuth();
  const {width:screenWidth,height:screenHeight}=useWindowDimensions();
  const {compose,storyId,momentSession}=useLocalSearchParams<{compose?:string;storyId?:string;momentSession?:string}>();
  const activeStoryAccount=useRef<string|null>(auth.token);
  activeStoryAccount.current=auth.token;
  const [unreadNotifications,setUnreadNotifications]=useState(0);
  const [posts,setPosts]=useState<FeedItem[]>([]);
  const [stories,setStories]=useState<SocialStory[]>([]),[ownStories,setOwnStories]=useState<SocialStory[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [storyViewer,setStoryViewer]=useState<StoriesGroup|null>(null);
  const [storyComposer,setStoryComposer]=useState(false),[storyCaption,setStoryCaption]=useState('');
  const [storyLocation,setStoryLocation]=useState(''),[storyTags,setStoryTags]=useState('');
  const [storyPlaceOptions,setStoryPlaceOptions]=useState<SocialPlace[]>([]),[verifiedStoryPlace,setVerifiedStoryPlace]=useState(''),[storyPlaceLoading,setStoryPlaceLoading]=useState(false);
  const [storyFriendSearch,setStoryFriendSearch]=useState('');
  const [storyPublishCommunityId,setStoryPublishCommunityId]=useState<number|null>(null);
  const [storyManagedCommunities,setStoryManagedCommunities]=useState<CommunityGroup[]>([]);
  const [storyManagedCommunitiesLoading,setStoryManagedCommunitiesLoading]=useState(false);
  const [storyManagedCommunitiesError,setStoryManagedCommunitiesError]=useState('');
  const [storyFriends,setStoryFriends]=useState<StoryFriend[]>([]);
  const [storyFriendsBusy,setStoryFriendsBusy]=useState(false),[storyFriendsError,setStoryFriendsError]=useState('');
  const [storySearchedProfiles,setStorySearchedProfiles]=useState<StoryFriend[]>([]),[storyProfileSearchBusy,setStoryProfileSearchBusy]=useState(false);
  const storyLocationRef=useRef(''),storyTagsRef=useRef('');
  const [showStoryTime,setShowStoryTime]=useState(false);
  const [storyAltText,setStoryAltText]=useState('');
  const [storyEditorOpenedAt,setStoryEditorOpenedAt]=useState(()=>new Date().toISOString());
  const [storyTextGeometry,setStoryTextGeometry]=useState<StoryTextGeometry>({x:50,y:78,rotation:0,zoom:1});
  const [storyAppearance,setStoryAppearance]=useState<StoryTextAppearance>({color:'white',background:'dark',font:'modern'});
  const storyGeometryRef=useRef<StoryTextGeometry>({x:50,y:78,rotation:0,zoom:1});
  const storyComposerRef=useRef(false);
  const storyComposerRevision=useRef(0);
  const storyCaptureRevision=storyComposerRevision.current;
  storyComposerRef.current=storyComposer;
  const [storyMedia,setStoryMedia]=useState<MobileMedia|null>(null);
  const storyCaptionRef=useRef(''),storyMediaRef=useRef<MobileMedia|null>(null);
  storyMediaRef.current=storyMedia;
  const [composerOpen,setComposerOpen]=useState(false);
  const [composerSessionId,setComposerSessionId]=useState<number|null>(null);
  const [expandedPostImage,setExpandedPostImage]=useState<ExpandedPostPhotos|null>(null);
  const [composerText,setComposerText]=useState(''),[composerLocation,setComposerLocation]=useState(''),[composerMedia,setComposerMedia]=useState<MobileMedia[]>([]);
  const [postPlaceOptions,setPostPlaceOptions]=useState<SocialPlace[]>([]),[verifiedPostPlace,setVerifiedPostPlace]=useState(''),[postPlaceLoading,setPostPlaceLoading]=useState(false);
  const composerTextRef=useRef(''),composerLocationRef=useRef('');
  const composerMediaRef=useRef<MobileMedia[]>([]);
  const postComposerScrollRef=useRef<ScrollViewInstance|null>(null);
  const storyComposerScrollRef=useRef<ScrollViewInstance|null>(null);
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

  useEffect(()=>{
    if(!composerOpen||!auth.token||composerLocation.trim().length<2||verifiedPostPlace===composerLocation.trim()){
      setPostPlaceOptions([]);setPostPlaceLoading(false);return;
    }
    let active=true;
    const timer=setTimeout(()=>{
      setPostPlaceLoading(true);
      void searchSocialPlaces(composerLocation,auth.token).then(places=>{
        if(active)setPostPlaceOptions(places);
      }).catch(()=>{if(active)setPostPlaceOptions([]);})
        .finally(()=>{if(active)setPostPlaceLoading(false);});
    },350);
    return()=>{active=false;clearTimeout(timer);};
  },[composerOpen,composerLocation,verifiedPostPlace,auth.token]);
  useEffect(()=>{
    if(!storyComposer||!auth.token||storyLocation.trim().length<2||verifiedStoryPlace===storyLocation.trim()){
      setStoryPlaceOptions([]);setStoryPlaceLoading(false);return;
    }
    let active=true;
    const timer=setTimeout(()=>{
      setStoryPlaceLoading(true);
      void searchSocialPlaces(storyLocation,auth.token).then(places=>{
        if(active)setStoryPlaceOptions(places);
      }).catch(()=>{if(active)setStoryPlaceOptions([]);})
        .finally(()=>{if(active)setStoryPlaceLoading(false);});
    },350);
    return()=>{active=false;clearTimeout(timer);};
  },[storyComposer,storyLocation,verifiedStoryPlace,auth.token]);
  useEffect(()=>{
    if(!storyComposer||!auth.token||!auth.username){
      setStoryManagedCommunities([]);setStoryManagedCommunitiesLoading(false);
      setStoryManagedCommunitiesError('');return;
    }
    let active=true;
    setStoryManagedCommunitiesLoading(true);setStoryManagedCommunitiesError('');
    void myCommunities(auth.token,auth.username).then(groups=>{
      if(!active)return;
      setStoryManagedCommunities(groups.filter(group=>group.visibility==='PUBLIC'&&
        (group.myRole==='OWNER'||group.myRole==='ADMIN')));
    }).catch(()=>{
      if(active){setStoryManagedCommunities([]);setStoryManagedCommunitiesError('Não foi possível carregar as comunidades disponíveis.');}
    }).finally(()=>{if(active)setStoryManagedCommunitiesLoading(false);});
    return()=>{active=false;};
  },[storyComposer,auth.token,auth.username]);
  useEffect(()=>{
    const term=storyFriendSearch.trim().replace(/^@/,'');
    if(!storyComposer||!auth.token||term.length<3){
      setStorySearchedProfiles([]);setStoryProfileSearchBusy(false);return;
    }
    let active=true;
    const timer=setTimeout(()=>{
      setStoryProfileSearchBusy(true);
      void searchStoryMentionProfiles(term,auth.token).then(profiles=>{
        if(active)setStorySearchedProfiles(profiles);
      }).catch(()=>{if(active)setStorySearchedProfiles([]);})
        .finally(()=>{if(active)setStoryProfileSearchBusy(false);});
    },350);
    return()=>{active=false;clearTimeout(timer);};
  },[storyComposer,storyFriendSearch,auth.token]);
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
  const scrollComposerInput=(kind:'post'|'story',target:Parameters<ScrollViewInstance['scrollResponderScrollNativeHandleToKeyboard']>[0]|undefined)=>{
     if(target==null)return;
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
  const postActionInFlight=useRef(false);
  const sessionCancelInFlight=useRef(false);
  const [sessionCancelBusyId,setSessionCancelBusyId]=useState<number|null>(null);
  const reloadNumber=useRef(0);
  const commentsRequest=useRef(0);
  const feedIdentity=useRef('');
  const recentlyConfirmedPosts=useRef<Array<{item:FeedItem;until:number}>>([]);
  const verifiedPostLikes=useRef<Map<number,{likedByMe:boolean;likeCount:number;until:number}>>(new Map());
  const confirmedCommentFloors=useRef<Map<number,{count:number;until:number}>>(new Map());
  const confirmedPostEdits=useRef<Map<number,{content:string;location:string|null;until:number}>>(new Map());
  // Authoritative delete/hide responses must outlive feed requests that were
  // already in flight. Clear a tombstone only when the backend omits the item.
  const confirmedRemovedFeedKeys=useRef<Set<string>>(new Set());
  const [publishNotice,setPublishNotice]=useState<'post'|'story'|null>(null);
  const [confirmedPostId,setConfirmedPostId]=useState<number|null>(null);
  const [postPublishError,setPostPublishError]=useState(''),[storyPublishError,setStoryPublishError]=useState('');
  const recentlyConfirmedStories=useRef<Array<{item:SocialStory;until:number}>>([]);
  const hiddenKeysRef=useRef<string[]>([]);
  const [hiddenKeys,setHiddenKeys]=useState<string[]>([]);
  const [recentlyHidden,setRecentlyHidden]=useState<string|null>(null);
  const [showAllAttendance,setShowAllAttendance]=useState(false);
   const [myProfilePhoto,setMyProfilePhoto]=useState<string|null>(null);
  const [hiddenReady,setHiddenReady]=useState(false);
  // A canceled first reload must not permanently hide all posts while the
  // persisted visibility preferences have not finished loading.
  const hiddenReadyRef=useRef(false);
  const load=useCallback(async()=>{
    const id=++reloadNumber.current;
    const identity=auth.token&&auth.username?`${auth.username}:${auth.token}`:'guest';
    const identityChanged=feedIdentity.current!==identity;
    if(identityChanged){
      feedIdentity.current=identity;
      // Never keep previous-account stories, private comments or pending media
      // visible when a user logs out or signs into a different account.
      commentsRequest.current++;
      // A previous account's request must not block the new account or
      // release a newer action lock when its own finally handler runs.
      postActionInFlight.current=false;commentWriteLock.current=false;sessionCancelInFlight.current=false;setSessionCancelBusyId(null);
      postInFlight.current=false;storyInFlight.current=false;mediaPickerInFlight.current=false;
      setPublishing(false);setStoryPublishing(false);
      confirmedRemovedFeedKeys.current.clear();verifiedPostLikes.current.clear();confirmedCommentFloors.current.clear();confirmedPostEdits.current.clear();
      recentlyConfirmedPosts.current=[];recentlyConfirmedStories.current=[];setPublishNotice(null);setConfirmedPostId(null);setPostPublishError('');setStoryPublishError('');
      setPosts([]);setStories([]);setOwnStories([]);setEditingPost(null);setPostMenuItem(null);setMyProfilePhoto(null);
      hiddenKeysRef.current=[];setHiddenKeys([]);setRecentlyHidden(null);hiddenReadyRef.current=false;setHiddenReady(false);setShowAllAttendance(false);
      setStoryViewer(null);storyComposerRevision.current++;storyComposerRef.current=false;setStoryComposer(false);setStoryMedia(null);setStoryCaption('');
      storyCaptionRef.current='';storyMediaRef.current=null;
      setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
      setStoryPublishCommunityId(null);setStoryManagedCommunities([]);setStorySearchedProfiles([]);setStoryFriendSearch('');
      setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});setStoryAppearance({color:'white',background:'dark',font:'modern'});setShowStoryTime(false);setStoryAltText('');setExpandedPostImage(null);
      postComposerRevision.current++;composerOpenRef.current=false;setComposerOpen(false);setComposerSessionId(null);changeComposerMedia(()=>[]);setComposerText('');setComposerLocation('');
      setExpandedComments(null);setComments([]);setCommentText('');setCommentsLoading(false);setEditingComment(null);setEditCommentDraft('');setCommentWriteBusy(null);setBusyPost(null);
    }
    setLoading(true);setError('');
    const fetches=await Promise.allSettled([
      auth.token&&auth.username?socialFeed(auth.token,auth.username):Promise.resolve([]),
      auth.token?storyFeed(auth.token,auth.username):Promise.resolve([]),
      auth.token?myStories(auth.token,auth.username):Promise.resolve([]),
      (identityChanged||!hiddenReadyRef.current)&&auth.token&&auth.username?readHiddenFeedEntries(auth.username):Promise.resolve(hiddenKeysRef.current),
       auth.token?request<{profilePicUrl?:string|null}>('/api/profile/me/mobile',{token:auth.token}):Promise.resolve(null)
    ]);
    if(id!==reloadNumber.current)return;
    const value=<T,>(i:number,fallback:T):T=>{const entry=fetches[i];return entry?.status==='fulfilled'?(entry as PromiseFulfilledResult<T>).value:fallback;};
    if(fetches[0].status==='fulfilled'){
      const received=value(0,[] as FeedItem[]);
      // A pre-delete GET may finish after a successful DELETE.
      const reconciled=reconcileRemovedFeedKeys(confirmedRemovedFeedKeys.current,received);
      confirmedRemovedFeedKeys.current=reconciled.removed;
      const visibleReceived=reconciled.visible;
      recentlyConfirmedPosts.current=recentlyConfirmedPosts.current.filter(entry=>
        entry.until>Date.now()&&!received.some(item=>item.postId===entry.item.postId)&&
        !(removedFeedKey(entry.item)&&confirmedRemovedFeedKeys.current.has(removedFeedKey(entry.item)!)));
      const merged=[...recentlyConfirmedPosts.current.map(entry=>entry.item),...visibleReceived];
      const likes=reconcilePostLikes(verifiedPostLikes.current,merged);
      verifiedPostLikes.current=likes.receipts;
      const comments=reconcileCommentCounts(confirmedCommentFloors.current,likes.posts);
      confirmedCommentFloors.current=comments.floors;
      const edits=reconcilePostEdits(confirmedPostEdits.current,comments.posts);
      confirmedPostEdits.current=edits.edits;
      setPosts(edits.posts);
    }
    if(fetches[1].status==='fulfilled'){
      const received=value(1,[] as SocialStory[]);
      // The public Story endpoint can lag behind the confirmed POST. Keep the
      // author's newly created Story visible while the listing catches up.
      const fresh=recentlyConfirmedStories.current.filter(entry=>
        entry.until>Date.now()&&!received.some(story=>story.id===entry.item.id));
      const ids=new Set(fresh.map(entry=>entry.item.id));
      setStories([...fresh.map(entry=>entry.item),...received.filter(story=>!ids.has(story.id))]);
    }
    if(fetches[2].status==='fulfilled'){
      const received=value(2,[] as SocialStory[]);
      recentlyConfirmedStories.current=recentlyConfirmedStories.current.filter(entry=>entry.until>Date.now()&&!received.some(item=>item.id===entry.item.id));
      setOwnStories([...recentlyConfirmedStories.current.map(entry=>entry.item),...received]);
    }
     if(fetches[4].status==='fulfilled')setMyProfilePhoto(value(4,null as {profilePicUrl?:string|null}|null)?.profilePicUrl||null);
    if(!hiddenReadyRef.current){
      // Failure to read local visibility preferences must never be treated
      // as an empty hidden list: preserve the user's choice across refreshes.
      if(fetches[3].status==='fulfilled'){
        const stored=value(3,[] as string[]);
        hiddenKeysRef.current=stored;setHiddenKeys(stored);
        hiddenReadyRef.current=true;setHiddenReady(true);
      }else{
        setError('Não foi possível ler as publicações ocultadas neste dispositivo. Tenta novamente para proteger as tuas preferências.');
      }
    }
    if(fetches[3].status==='rejected'&&!hiddenReadyRef.current)
      setError('Não foi possível ler as publicações ocultadas neste dispositivo. Tenta novamente para proteger as tuas preferências.');
    else if(fetches[0].status==='rejected')
      setError('Não foi possível atualizar as publicações. O conteúdo apresentado pode estar desatualizado. Tenta novamente.');
    else if(fetches[1].status==='rejected'||fetches[2].status==='rejected')
      setError('Não foi possível atualizar as Stories. As Stories apresentadas podem estar desatualizadas. Tenta novamente.');
    setLoading(false);
  },[auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{if(!auth.ready||(!auth.token&&!auth.browsingAsGuest))return;void load();return ()=>{reloadNumber.current++;};},[auth.ready,auth.token,auth.browsingAsGuest,load]));
  // The central + action reuses the same authenticated composers as the Feed.
  // Consume the route intent once to avoid reopening it after dismissal.
  useEffect(()=>{
    if(momentSession || (compose!=='post'&&compose!=='story'))return;
    if(!auth.ready)return;
    router.setParams({compose:undefined});
    if(!auth.token||!auth.username){
      router.push({pathname:'/login',params:{redirect:'/'}});
      return;
    }
    if(compose==='post')openPostComposer();
    else openStoryComposer();
  },[compose,momentSession,auth.ready,auth.token,auth.username,router]);
  useEffect(()=>{
    if(!momentSession||!auth.ready)return;
    // Consume the intent before fetching eligibility; no automatic posts.
    router.setParams({momentSession:undefined,compose:undefined});
    if(!auth.token||!auth.username){router.push({pathname:'/login',params:{redirect:'/'}});return;}
    if(!/^[1-9][0-9]{0,12}$/.test(momentSession))return;
    const gameId=Number(momentSession),actor=auth.token,username=auth.username;
    if(!Number.isSafeInteger(gameId))return;
    void sessionDetail(gameId,actor,username).then(game=>{
      if(activeStoryAccount.current!==actor)return;
      if(game.status!=='COMPLETED'||game.canSharePublicly!==true||
        (!game.joined&&game.creatorUsername?.toLowerCase()!==username.toLowerCase())){
        setError('Só os participantes ou o organizador podem partilhar momentos de uma sessão pública concluída.');
        return;
      }
      openPostComposer(gameId);
    }).catch(()=>{
      if(activeStoryAccount.current===actor)setError('Não foi possível confirmar a sessão para partilhar o momento.');
    });
  },[momentSession,auth.ready,auth.token,auth.username,router]);
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
      // Community invitations may arrive by email without an accompanying
      // notifications row. Never hide these pending invites from the bell.
      const [notifications,communityInvitations]=await Promise.allSettled([
        myNotifications(token,username),myCommunityInvites(token,username)
      ]);
      if(!active)return;
      const unread=notifications.status==='fulfilled'?
        notifications.value.filter(item=>!item.read).length:0;
      const pending=communityInvitations.status==='fulfilled'?communityInvitations.value.length:0;
      // The bell is a presence indicator; it is not an additive count that
      // could accidentally double count an invite also in notifications.
      setUnreadNotifications(Math.max(unread,pending));
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
  const attendanceGroups=attendanceDigest(visiblePosts,auth.username) as Array<{sessionId:number;item:FeedItem;count:number;ownActivity:FeedItem|null}>;
  const normalPosts=visiblePosts.filter(item=>!isDigestAttendance(item));
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
        if(busyPost!==null||postActionInFlight.current||feedIdentity.current!==identity||!actor)return;
        postActionInFlight.current=true;setBusyPost(id);
        void deletePost(id,actor).then(()=>{
          if(feedIdentity.current===identity){
            const key=removedFeedKey(item);
            if(key)confirmedRemovedFeedKeys.current.add(key);
            verifiedPostLikes.current.delete(id);confirmedCommentFloors.current.delete(id);confirmedPostEdits.current.delete(id);
            recentlyConfirmedPosts.current=recentlyConfirmedPosts.current.filter(entry=>entry.item.postId!==id);
            setPosts(old=>old.filter(x=>x.postId!==id));
          }
        }).catch(()=>{if(feedIdentity.current===identity)setError('Não foi possível confirmar a eliminação. Atualiza o feed antes de repetir.');})
        .finally(()=>{if(feedIdentity.current===identity){postActionInFlight.current=false;setBusyPost(null);}});
      }}
    ]);
  }
  function hideOwnAttendance(item:FeedItem){
    if(!auth.token||!item.sessionId||busyPost!==null||postActionInFlight.current||item.type!=='SESSION_ATTENDED')return;
    setPostMenuItem(null);
    const identity=currentFeedIdentity,id=item.sessionId,actor=auth.token;
    postActionInFlight.current=true;setBusyPost(-id);
    void hideAttendanceActivity(id,actor).then(()=>{
      if(feedIdentity.current===identity){
        const key=removedFeedKey(item);
        if(key)confirmedRemovedFeedKeys.current.add(key);
        setPosts(old=>old.filter(x=>!(x.type==='SESSION_ATTENDED'&&x.sessionId===id&&x.authorUsername===item.authorUsername)));
      }
    }).catch(()=>{if(feedIdentity.current===identity)setError('Não foi possível ocultar a atividade no servidor.');})
    .finally(()=>{if(feedIdentity.current===identity){postActionInFlight.current=false;setBusyPost(null);}});
  }
  async function shareFeedSession(item:FeedItem){
    if(!Number.isSafeInteger(item.sessionId)||!item.sessionId||item.sessionId<=0)return;
    try{
      await Share.share({message:[item.sport||'Sessão desportiva',item.city||'',sharedPostLink(item)].filter(Boolean).join(' · ')});
    }catch(e){
      Alert.alert('Partilhar sessão',e instanceof Error?e.message:'Não foi possível partilhar a sessão.');
    }
  }

  async function shareCancelledFeedSession(item:Parameters<typeof cancellationNotice>[0]){
    try{await Share.share({message:cancellationNotice(item)});}
    catch(e){Alert.alert('Partilhar cancelamento',e instanceof Error?e.message:'Não foi possível abrir a partilha.');}
  }

  async function requestCancelFeedSession(item:FeedItem){
    const id=item.sessionId,actor=auth.token,username=auth.username,identity=currentFeedIdentity;
    if(item.type!=='SESSION_CREATED'||!Number.isSafeInteger(id)||!id||id<=0||
       !actor||!username||!identityMatches||
       item.authorUsername.toLowerCase()!==username.toLowerCase()||
       sessionCancelInFlight.current)return;
    sessionCancelInFlight.current=true;setSessionCancelBusyId(id);
    try{
      // The feed may be stale: never offer a destructive confirmation based
      // solely on the author displayed in an old activity card.
      const detail=await sessionDetail(id,actor,username);
      if(feedIdentity.current!==identity)return;
      if(detail.creatorUsername?.toLowerCase()!==username.toLowerCase()||
         (detail.status!=='OPEN'&&detail.status!=='FULL')){
        Alert.alert('Sessão indisponível','Esta sessão já não pode ser cancelada ou não és o organizador.');
        return;
      }
      Alert.alert('Cancelar sessão',
        `Vais cancelar a sessão de ${detail.sport||item.sport||'desporto'} para todos os participantes. Esta ação não pode ser anulada. Confirmas?`,[
        {text:'Manter sessão',style:'cancel'},
        {text:'Sim, cancelar sessão',style:'destructive',onPress:()=>{
          if(feedIdentity.current!==identity||sessionCancelInFlight.current)return;
          sessionCancelInFlight.current=true;setSessionCancelBusyId(id);
          // Never automatically retry an uncertain POST. The session detail
          // remains the source of truth if the connection drops.
          void cancelSession(id,actor,username).then(()=>{
            if(feedIdentity.current!==identity)return;
            const key=removedFeedKey(item);
            if(key)confirmedRemovedFeedKeys.current.add(key);
            setPosts(current=>current.filter(entry=>!(entry.type==='SESSION_CREATED'&&entry.sessionId===id)));
            Alert.alert('Sessão cancelada',
              'A sessão foi cancelada. Os participantes com conta Jynlo receberão uma notificação interna. Se convidaste jogadores pelo WhatsApp, partilha também o aviso com eles.',[
                {text:'Fechar',style:'cancel'},
                {text:'Partilhar aviso',onPress:()=>{void shareCancelledFeedSession(detail);}}
              ]);
            void load();
          }).catch(e=>{
            if(feedIdentity.current===identity)
              Alert.alert('Cancelamento não confirmado',
                e instanceof Error&&e.message?e.message+' Verifica o estado da sessão antes de repetir.':
                'Verifica o estado da sessão antes de repetir.');
          }).finally(()=>{
            if(feedIdentity.current===identity){sessionCancelInFlight.current=false;setSessionCancelBusyId(null);}
          });
        }}
      ]);
    }catch(e){
      if(feedIdentity.current===identity)
        Alert.alert('Não foi possível verificar a sessão',
          e instanceof Error?e.message:'Abre o detalhe e tenta novamente.');
    }finally{
      if(feedIdentity.current===identity){sessionCancelInFlight.current=false;setSessionCancelBusyId(null);}
    }
  }

  function openPostComposer(sessionId:number|null=null){
    setComposerSessionId(sessionId);
    setPublishNotice(null);setPostPublishError('');setVerifiedPostPlace('');setPostPlaceOptions([]);
    postComposerRevision.current++;
    composerOpenRef.current=true;setComposerOpen(true);
  }
  function openStoryComposer(){
    setPublishNotice(null);setStoryPublishError('');setVerifiedStoryPlace('');setStoryPlaceOptions([]);
    setStoryPublishCommunityId(null);
    storyComposerRevision.current++;
    storyComposerRef.current=true;setStoryComposer(true);setStoryEditorOpenedAt(new Date().toISOString());
    setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});
    setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
    setStoryFriendSearch('');setStorySearchedProfiles([]);
  }
  function closeStoryComposer(){
    if(storyInFlight.current)return;
    const discard=()=>{
      storyComposerRevision.current++;storyComposerRef.current=false;
      setStoryComposer(false);setStoryMedia(null);setStoryCaption('');
      setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});
      setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
      setStoryPublishCommunityId(null);
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
          postComposerRevision.current++;composerOpenRef.current=false;changeComposerMedia(()=>[]);setComposerText('');setComposerLocation('');setComposerOpen(false);setComposerSessionId(null);
        }}
      ]);
      return;
    }
    postComposerRevision.current++;composerOpenRef.current=false;setComposerOpen(false);setComposerSessionId(null);
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
        if(!permission.granted){
          Alert.alert('Câmara sem autorização','Autoriza o acesso à câmara nas definições do telemóvel ou escolhe a galeria.',[
            {text:'Cancelar',style:'cancel'},
            {text:'Abrir definições',onPress:()=>{void Linking.openSettings().catch(()=>Alert.alert('Permissões','Abre as definições da Jynlo e autoriza a câmara.'));}}
          ]);
          return;
        }
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
    finally{if(activeStoryAccount.current===actorToken)mediaPickerInFlight.current=false;}
  }
  async function submitPost(){
    if(!requireLogin()||postInFlight.current||(!composerMedia.length&&!composerText.trim()))return;
    if(composerLocation.trim()&&verifiedPostPlace!==composerLocation.trim()){
      setPostPublishError('Escolhe uma localização das sugestões ou limpa o campo.');return;
    }
    const actor=auth.token,username=auth.username,body=composerText,place=composerLocation,media=[...composerMedia];
    const linkedSessionId=composerSessionId;
    const revision=postComposerRevision.current;
    postInFlight.current=true;setPublishing(true);setPostPublishError('');
    try{
      const created=await publishPost(body,media,actor,username,place,linkedSessionId??undefined);
      if(linkedSessionId&&created.sessionId!==linkedSessionId)
        Alert.alert('Publicação enviada','O servidor confirmou a publicação, mas não a associação à sessão. Não voltes a enviar sem verificar o teu feed.');
      // Show the server-confirmed item immediately. A delayed feed refresh must
      // never make a successful post look as if it vanished.
      if(feedIdentity.current===`${username}:${actor}`){
        recentlyConfirmedPosts.current=[...recentlyConfirmedPosts.current.filter(entry=>entry.item.postId!==created.postId),{item:created,until:Date.now()+120000}];
        setPosts(current=>[created,...current.filter(item=>item.postId!==created.postId)]);
        setConfirmedPostId(created.postId);
        setPublishNotice('post');
      }
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
          changeComposerMedia(()=>[]);setComposerOpen(false);setComposerSessionId(null);
        }else{
          Alert.alert('Publicação enviada','As alterações feitas durante o envio ficaram guardadas no editor. Podes criar outra publicação.');
        }
        // Refresh failure must not be interpreted as a failed published POST.
        void load().catch(()=>setError('Publicação enviada. Não foi possível atualizar o feed; desliza para atualizar.'));
      }
    }catch(e){
      if(feedIdentity.current===`${username}:${actor}`){
        const message=e instanceof Error?e.message:'Não foi possível confirmar a publicação. Verifica o perfil antes de repetir.';
        setPostPublishError(message);
        Alert.alert('Publicação',message);
      }
    }finally{if(feedIdentity.current===`${username}:${actor}`){postInFlight.current=false;setPublishing(false);}}
  }
  async function submitStory(){
    if(!requireLogin()||storyInFlight.current||!storyMedia)return;
    const actor=auth.token,username=auth.username,body=storyCaption,media=storyMedia,geometry={...storyGeometryRef.current},appearance={...storyAppearance},showTime=showStoryTime,altText=storyAltText;
    if(storyLocation.trim()&&verifiedStoryPlace!==storyLocation.trim()){
      setStoryPublishError('Escolhe uma localização das sugestões ou limpa o campo.');return;
    }
    const tagsDraft=storyTags,locationDraft=storyLocation;
    let details:StoryDetails;
    try{details=prepareStoryDetails(locationDraft,tagsDraft);}catch(e){Alert.alert('Story',e instanceof Error?e.message:'Verifica a localização e as identificações.');return;}
    const selectedCommunityId=storyPublishCommunityId;
    if(selectedCommunityId!==null&&!storyManagedCommunities.some(group=>group.id===selectedCommunityId)){
      setStoryPublishError('Já não tens permissão para publicar Stories nesta comunidade.');return;
    }
    const revision=storyComposerRevision.current;
    storyInFlight.current=true;setStoryPublishing(true);setStoryPublishError('');
    try{
      const created=await publishStory(body,media,actor,username,selectedCommunityId,geometry,details,appearance,showTime,altText);
      if(feedIdentity.current===`${username}:${actor}`){
        recentlyConfirmedStories.current=[...recentlyConfirmedStories.current.filter(entry=>entry.item.id!==created.id),{item:created,until:Date.now()+120000}];
        setOwnStories(current=>[created,...current.filter(item=>item.id!==created.id)]);
        setStories(current=>[created,...current.filter(item=>item.id!==created.id)]);
        setConfirmedPostId(null);
        setPublishNotice('story');
      }
      if(feedIdentity.current===`${username}:${actor}`&&
         storyComposerRevision.current===revision&&storyComposerRef.current){
        const currentGeometry=storyGeometryRef.current;
        const unchanged=storyCaptionRef.current===body&&storyMediaRef.current?.uri===media.uri&&
          storyLocationRef.current===locationDraft&&storyTagsRef.current===tagsDraft&&
          storyPublishCommunityId===selectedCommunityId&&
          currentGeometry.x===geometry.x&&currentGeometry.y===geometry.y&&
          currentGeometry.rotation===geometry.rotation&&currentGeometry.zoom===geometry.zoom&&
          storyAppearance.color===appearance.color&&storyAppearance.background===appearance.background&&storyAppearance.font===appearance.font&&showStoryTime===showTime&&storyAltText===altText;
        if(unchanged){
          storyComposerRevision.current++;storyComposerRef.current=false;
          setStoryCaption('');storyCaptionRef.current='';
          setStoryMedia(null);storyMediaRef.current=null;setStoryComposer(false);
          setStoryTextGeometry({x:50,y:78,rotation:0,zoom:1});
          setStoryLocation('');setStoryTags('');storyLocationRef.current='';storyTagsRef.current='';
          setStoryPublishCommunityId(null);
        }else{
          Alert.alert('Story publicada','As alterações feitas durante o envio ficaram guardadas no editor.');
        }
        void load().catch(()=>setError('Story enviada. Não foi possível atualizar o feed.'));
      }
    }catch(e){
      if(feedIdentity.current===`${username}:${actor}`){
        const message=e instanceof Error?e.message:'Não foi possível confirmar a Story. Verifica se já aparece no perfil antes de repetir.';
        setStoryPublishError(message);
        Alert.alert('Story',message);
      }
    }finally{if(feedIdentity.current===`${username}:${actor}`){storyInFlight.current=false;setStoryPublishing(false);}}
  }
  async function toggleLike(item:FeedItem){
    if(item.type!=='POST'||!item.postId||!requireLogin()||busyPost!==null||
      postActionInFlight.current||!auth.token||!auth.username)return;
    const account=feedIdentity.current,postId=item.postId;
    postActionInFlight.current=true;setBusyPost(postId);
    try{
      const receipt=await likePost(postId,item.likedByMe,auth.token,auth.username);
      if(feedIdentity.current!==account)return;
      // Use the authoritative result without relying on a potentially stale
      // full-feed reload, and preserve the optimistic publish overlay too.
      const apply=(post:FeedItem)=>post.postId===postId?{...post,...receipt}:post;
      verifiedPostLikes.current=rememberPostLike(verifiedPostLikes.current,postId,receipt);
      recentlyConfirmedPosts.current=recentlyConfirmedPosts.current.map(entry=>({...entry,item:apply(entry.item)}));
      setPosts(current=>current.map(apply));
    }catch(e){
      if(feedIdentity.current===account)
        Alert.alert('Gosto',e instanceof Error?e.message:'Não foi possível atualizar o gosto.');
    }finally{
      if(feedIdentity.current===account){postActionInFlight.current=false;setBusyPost(null);}
    }
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
  async function submitComment(postId:number){
    if(!requireLogin()||busyPost!==null||commentWriteLock.current||!commentText.trim()||
      expandedComments!==postId||!auth.token||!auth.username)return;
    const account=feedIdentity.current,requestId=commentsRequest.current,body=commentText.trim();
    const previousCount=posts.find(item=>item.type==='POST'&&item.postId===postId)?.commentCount??0;
    commentWriteLock.current=true;setBusyPost(postId);
    try{
      const created=await addPostComment(postId,body,auth.token,auth.username);
      if(!created||!Number.isSafeInteger(created.id)||created.id<=0||created.postId!==postId||
         created.content?.trim()!==body)
        throw Error('O servidor não confirmou o comentário. Verifica a conversa antes de repetir.');
      if(account===feedIdentity.current){
        // The POST was persisted. Until a later GET includes it, ignore old
        // aggregate counts returned by feed requests already in flight.
        const floor=Math.max(previousCount,confirmedCommentFloors.current.get(postId)?.count??0)+1;
        confirmedCommentFloors.current=rememberCommentFloor(confirmedCommentFloors.current,postId,floor);
        const apply=(item:FeedItem)=>item.type==='POST'&&item.postId===postId?
          {...item,commentCount:Math.max(item.commentCount||0,floor)}:item;
        recentlyConfirmedPosts.current=recentlyConfirmedPosts.current.map(entry=>({...entry,item:apply(entry.item)}));
        setPosts(current=>current.map(apply));
        if(requestId===commentsRequest.current){
          setComments(prev=>prev.some(item=>item.id===created.id)?prev:[...prev,created]);
          setCommentText(current=>current.trim()===body?'':current);
        }
        await load();
      }
    }catch(e){
      if(account===feedIdentity.current&&requestId===commentsRequest.current)
        Alert.alert('Comentário',e instanceof Error?e.message:'Não foi possível comentar.');
    }finally{
      if(account===feedIdentity.current){commentWriteLock.current=false;setBusyPost(null);}
    }
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
    finally{if(account===feedIdentity.current){commentWriteLock.current=false;setCommentWriteBusy(null);}}
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
    finally{if(account===feedIdentity.current){commentWriteLock.current=false;setCommentWriteBusy(null);}}
  }
  function AttendanceDigest(){
    if(!attendanceGroups.length)return null;
    const groups=showAllAttendance?attendanceGroups:attendanceGroups.slice(0,5);
    return <View style={styles.attendanceDigest} accessibilityLabel="Atividade de sessões">
      {groups.map(group=>{
        const when=group.item.gameDate?new Date(group.item.gameDate):null;
        const date=when&&Number.isFinite(when.getTime())?when.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}):null;
        const place=[group.item.city?.trim(),date].filter(Boolean).join(' · ');
        return <View key={group.sessionId} style={styles.attendanceRow}>
          <View style={styles.attendanceCheck}><Text style={styles.attendanceCheckText}>✓</Text></View>
          <View style={styles.attendanceDetails}>
            <Text style={styles.attendanceTitle}>{attendanceTitle(group)}</Text>
            {place?<Text style={styles.attendanceMeta}>{place}</Text>:null}
            <View style={styles.attendanceActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver sessão ${group.sessionId}`}
                style={styles.attendanceButton} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(group.sessionId)}})}>
                <Text style={styles.attendanceActionText}>Ver sessão →</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Ocultar do meu feed"
                disabled={!auth.token||!hiddenReady}
                style={styles.attendanceButton} onPress={()=>hideFromFeed(group.item)}>
                <Text style={styles.attendanceHideText}>Ocultar do meu feed</Text>
              </Pressable>
            </View>
          </View>
        </View>;
      })}
      {attendanceGroups.length>5?<Pressable accessibilityRole="button"
        accessibilityLabel={showAllAttendance?'Mostrar menos atividades':'Ver todas as atividades'}
        accessibilityState={{expanded:showAllAttendance}}
        onPress={()=>setShowAllAttendance(value=>!value)} style={styles.attendanceMore}>
        <Text style={styles.attendanceActionText}>{showAllAttendance?'Mostrar menos':'Ver todas'}</Text>
      </Pressable>:null}
    </View>;
  }
  function SessionPostAttachment({item}:{item:FeedItem}){
    const id=item.sessionId;
    if(!Number.isSafeInteger(id)||!id||id<=0)return null;
    const scheduled= item.gameDate?Date.parse(item.gameDate):NaN;
    const when=Number.isFinite(scheduled)?new Date(scheduled).toLocaleString('pt-PT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):null;
    const mine=item.type==='SESSION_CREATED'&&Boolean(auth.token&&auth.username&&
      item.authorUsername.toLowerCase()===auth.username.toLowerCase());
    return <View style={{gap:9}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Consultar sessão associada à publicação" onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(id)}})} style={styles.postSessionCard}>
        <View style={styles.postSessionIcon}><JynloIcon name="session" size={26} color={TEAL}/></View>
        <View style={{flex:1,gap:4}}>
          <Text style={styles.postSessionTitle}>{item.sport?.trim()||'Sessão desportiva'}</Text>
          {(item.city?.trim()||when)?<Text style={styles.postSessionMeta}>{[item.city?.trim(),when].filter(Boolean).join(' · ')}</Text>:null}
          <Text style={styles.postSessionLink}>Ver detalhes da sessão</Text>
        </View>
      </Pressable>
      {item.type==='SESSION_CREATED'?<View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Partilhar sessão" style={styles.attendanceButton}
          onPress={()=>void shareFeedSession(item)}>
          <Text style={styles.attendanceActionText}>Partilhar sessão</Text>
        </Pressable>
        {mine?<Pressable accessibilityRole="button" accessibilityLabel="Cancelar a minha sessão" style={styles.attendanceButton}
          disabled={sessionCancelBusyId!==null} onPress={()=>void requestCancelFeedSession(item)}>
          <Text style={{color:'#FF9292',fontWeight:'700'}}>
            {sessionCancelBusyId===id?'A verificar…':'Cancelar sessão'}
          </Text>
        </Pressable>:null}
      </View>:null}
    </View>;
  }
  function PostCard({item}:{item:FeedItem}){
    const album=postMediaItems(item);const likeBusy=busyPost===item.postId;
    return <View style={styles.postCard}>
      <View style={styles.postTop}><CircleAvatar name={item.authorDisplayName||item.authorUsername} image={item.authorProfilePicUrl} size={43}/>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${item.authorUsername}`} onPress={()=>router.push({pathname:'/social/[username]',params:{username:item.authorUsername}})} style={{flex:1,gap:3}}><Text style={styles.postName}>{item.authorDisplayName||item.authorUsername}</Text>
          <Text style={styles.postMeta}>{item.type==='POST'?'Publicação':'Atividade desportiva'}  ·  {timeAgo(item.createdAt)}</Text></Pressable>
        
        {auth.token?<Pressable onPress={()=>openPostMenu(item)} accessibilityRole="button" accessibilityLabel="Opções desta publicação" disabled={busyPost!==null} hitSlop={8} style={{paddingHorizontal:8,minHeight:40,justifyContent:'center'}}><JynloIcon name="more" color={MUTED} size={24}/></Pressable>:null}</View>
      {item.type!=='POST'&&item.content?<Text style={styles.postBody}>{item.content}</Text>:null}
      {item.type==='POST'&&item.location?.trim()?<View style={{flexDirection:'row',alignItems:'center',gap:5}}><JynloIcon name="location" color={MUTED} size={15}/><Text style={styles.postMeta}>{item.location.trim()}</Text></View>:null}
      {album.length?<PostAlbumCarousel items={album} onExpand={setExpandedPostImage}
        renderVideo={uri=><MediaVideo uri={uri}/>}/>:null}
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
      <Pressable onPress={()=>router.push(auth.token?'/live':'/login')}
        accessibilityRole="button" accessibilityLabel="Abrir diretos Jynlo" style={styles.headerCircle}>
        <JynloIcon name="video" color={WHITE} size={22}/></Pressable>
      <Pressable onPress={()=>router.push('/notifications')} style={styles.headerCircle} accessibilityLabel="Notificações"><JynloIcon name="notifications" color={WHITE} size={22}/>{unreadNotifications>0&&identityMatches?<View style={styles.pulse} accessibilityLabel={unreadNotifications+' notificações por ler'}/>:null}</Pressable>
      <Pressable onPress={()=>router.push(auth.token?'/(tabs)/profile':'/login')} style={styles.headerUser} accessibilityLabel={auth.token?'Perfil e conta ativa':'Iniciar sessão'}><CircleAvatar name={auth.username||'Visitante'} image={myProfilePhoto} size={32}/><Text style={styles.headerName} numberOfLines={1}>{auth.username||'Entrar'}</Text></Pressable></View></View>
    {DEMO_MODE?<View style={styles.demoRibbon}><Text style={styles.demoRibbonText}>◉ PRÉVIA LOCAL  ·  DADOS DE DEMONSTRAÇÃO</Text></View>:null}
    <View style={styles.storiesCard}>
      <SectionHeader eyebrow="MOMENTOS DESPORTIVOS" title="Stories"/>
      {visibleStoryGroups.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRail}>{auth.token?<Pressable accessibilityRole="button" accessibilityLabel="Criar a minha story" onPress={openStoryComposer} style={styles.storyItem}><View style={styles.storyCreateRing}><CircleAvatar name={auth.username||'Jynlo'} image={myProfilePhoto} size={57}/><View style={styles.storyCreateBadge}><Text style={styles.storyCreatePlus}>＋</Text></View></View><Text style={styles.storyItemName} numberOfLines={1}>A tua story</Text></Pressable>:null}{visibleStoryGroups.map(group=><Pressable key={group.key} onPress={()=>setStoryViewer(group)} style={styles.storyItem} accessibilityLabel={`Ver Stories de ${group.name}`}>
        <View style={styles.storyRing}><CircleAvatar name={group.name} image={group.avatar} size={57}/></View><Text style={styles.storyItemName} numberOfLines={1}>{group.name}</Text></Pressable>)}</ScrollView>
        :<Pressable accessibilityRole="button" accessibilityLabel="Criar a minha story" onPress={()=>requireLogin()&&openStoryComposer()} style={styles.emptyStories}><View style={styles.storyEmptyIcon}><JynloIcon name={auth.token?'plus':'camera'} color={TEAL} size={23}/></View><View style={{flex:1}}><Text style={styles.storiesEmptyTitle}>{auth.token?'Partilha o teu primeiro momento':'Descobre os momentos da comunidade'}</Text><Text style={styles.storiesEmptyText}>{auth.token?'Fotografias e vídeos que duram 24 horas.':'Entra com a tua conta para veres e partilhares Stories.'}</Text></View></Pressable>}
    </View>
    {auth.token?<Pressable accessibilityRole="button"
      accessibilityLabel="Criar publicação no Feed" onPress={()=>openPostComposer()}
      style={styles.feedComposerPrompt}>
      <CircleAvatar name={auth.username||'Jynlo'} image={myProfilePhoto} size={39}/>
      <View style={styles.feedComposerCopy}>
        <Text style={styles.feedComposerTitle}>Em que estás a pensar?</Text>
        <Text style={styles.feedComposerHint}>Partilha fotografias, vídeos e momentos desportivos</Text>
      </View>
      <JynloIcon name="post" color={TEAL} size={23}/>
    </Pressable>:null}
    {!auth.token?<View style={styles.visitorCard}><Text style={styles.visitorDescription}>Entra para partilhares momentos e acompanhares os teus amigos.</Text><Pressable onPress={()=>router.push('/login')} style={styles.visitorPrimary}><Text style={styles.visitorPrimaryText}>Iniciar sessão</Text></Pressable></View>:null}
    <View style={styles.latestTitle}><Text style={styles.sectionTitle}>Publicações</Text></View>
    <AttendanceDigest/>
    {identityMatches&&recentlyHidden?<View style={styles.hiddenNotice}>
      <Text style={styles.hiddenNoticeText}>{recentlyHidden?.startsWith('attendance:')?'Atividade ocultada do teu feed neste dispositivo.':'Publicação ocultada só neste dispositivo.'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Desfazer ocultação" onPress={undoHide} style={styles.hiddenUndo}><Text style={styles.link}>Desfazer</Text></Pressable>
    </View>:null}
    {identityMatches&&publishNotice?<View style={styles.hiddenNotice}>
      <Text style={styles.hiddenNoticeText}>{publishNotice==='post'?'Publicação confirmada! Já aparece no teu feed.':'Story confirmada! Já aparece nas tuas Stories.'}</Text>
      {publishNotice==='post'&&confirmedPostId!==null?<Pressable accessibilityRole="button" accessibilityLabel="Ver publicação confirmada"
        onPress={()=>router.push({pathname:'/posts/[postId]',params:{postId:String(confirmedPostId)}})} style={styles.hiddenUndo}>
        <Text style={styles.link}>Ver publicação</Text>
      </Pressable>:null}
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar confirmação de publicação" onPress={()=>{setPublishNotice(null);setConfirmedPostId(null);}} style={styles.hiddenUndo}><Text style={styles.link}>Fechar</Text></Pressable>
    </View>:null}
    {error?<View style={styles.errorBox}><Text style={{color:'#FFB8B8'}}>{error}</Text><Pressable onPress={()=>void load()}><Text style={styles.link}>Tentar novamente</Text></Pressable></View>:null}
    {(loading||!identityMatches)&&visiblePosts.length===0?<ActivityIndicator color={TEAL} style={{margin:20}}/>:null}
    {!loading&&!error&&identityMatches&&auth.token&&normalPosts.length===0&&attendanceGroups.length===0?<Text style={styles.mutedText}>Ainda não há publicações. Partilha o teu primeiro momento!</Text>:null}
  </View>;
  if(!auth.ready)return <SafeAreaView style={{flex:1,backgroundColor:INDIGO,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={TEAL}/></SafeAreaView>;
  if(!auth.token&&!auth.browsingAsGuest)return <Redirect href="/welcome"/>;
  return <SafeAreaView style={{flex:1,backgroundColor:INDIGO}} edges={['top','left','right']}>
    <FlatList data={normalPosts} keyExtractor={(item,index)=>feedEntryKey(item)||`${item.type}-${item.authorUsername}-${item.createdAt}-${index}`} renderItem={({item})=><View style={styles.feedCardWrap}>{PostCard({item})}</View>} ListHeaderComponent={Header()}
      refreshControl={<RefreshControl refreshing={loading&&visiblePosts.length>0} onRefresh={()=>void load()} tintColor={TEAL}/>}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"/>
    <StoryViewer group={visibleStoryViewer} groups={visibleStoryGroups} token={auth.token} username={auth.username} onClose={()=>setStoryViewer(null)} onDeleted={()=>void load()} onUpdated={updated=>{setStories(previous=>previous.map(story=>story.id===updated.id?updated:story));setOwnStories(previous=>previous.map(story=>story.id===updated.id?updated:story));setStoryViewer(previous=>previous&&previous.stories.some(story=>story.id===updated.id)?{...previous,stories:previous.stories.map(story=>story.id===updated.id?updated:story)}:previous);}}/>
    <PostImageLightbox key={expandedPostImage?.uris[expandedPostImage.index]||'closed'}
      photos={identityMatches?expandedPostImage:null} onClose={()=>setExpandedPostImage(null)}/>
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
                    maxLength={500} multiline style={styles.commentInput} placeholder="Editar comentário" placeholderTextColor={MUTED}/>
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
          <View style={styles.commentCompose}><TextInput value={commentText} onChangeText={setCommentText} style={styles.commentInput} maxLength={500} placeholder={auth.token?'Escrever comentário…':'Inicia sessão para comentar'} placeholderTextColor={MUTED} editable={!!auth.token&&busyPost===null} multiline/>
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
            }}><Text style={styles.postMenuText}>Editar publicação e multimédia</Text></Pressable>:null}
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
      onClose={()=>setEditingPost(null)} onSaved={(updated,mediaReplaced)=>{
        if(feedIdentity.current!==currentFeedIdentity)return;
        confirmedPostEdits.current=rememberPostEdit(confirmedPostEdits.current,updated,Date.now(),mediaReplaced);
        // Keep reactions from the current feed, but use server-confirmed media
        // after explicit replacement. A stale GET is reconciled by the receipt.
        const applyEdit=(item:FeedItem)=>item.postId===updated.postId?
          {...item,content:updated.content,location:updated.location,
            ...(mediaReplaced?{imageUrl:updated.imageUrl,videoUrl:updated.videoUrl,extraMedia:updated.extraMedia}:{} )}:item;
        recentlyConfirmedPosts.current=recentlyConfirmedPosts.current.map(entry=>({
          ...entry,item:applyEdit(entry.item)
        }));
        setPosts(current=>current.map(applyEdit));
        setEditingPost(null);
      }}/>
    <Modal visible={identityMatches&&composerOpen} animationType="slide" onRequestClose={closePostComposer}>
      <SafeAreaView style={[styles.storyComposerOverlay,screenHeight<700&&styles.storyComposerCompact]} edges={['top','bottom']}>
        <KeyboardAvoidingView style={{flex:1,gap:17}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={styles.storyComposerHead}><View style={{flex:1}}><Text style={styles.storyComposerTitle}>Nova publicação</Text><Text style={styles.storiesIntro}>{composerSessionId?'Recordação do jogo · sessão '+composerSessionId:'Partilha texto, fotografias ou vídeos com a comunidade.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar nova publicação" disabled={publishing} onPress={closePostComposer} style={styles.modalClose}><JynloIcon name="close" color={WHITE} size={25}/></Pressable></View>
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
            <Text style={styles.storiesIntro}>{composerMedia.length}/6 ficheiros · O primeiro é a capa · Desliza para ver e usa os ícones para ordenar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:10,paddingVertical:8}}>
              {composerMedia.map((media,i)=><View key={media.uri} style={{width:Math.min(260,Math.max(165,screenWidth-72)),gap:7}}>
                {media.type==='image'?<Image source={{uri:media.uri}} resizeMode="contain" style={styles.postMediaPreviewImage}/>:<MediaVideo key={media.uri} uri={media.uri}/>}
                <View style={styles.postMediaPreviewFooter}><Text style={styles.attachedText} numberOfLines={2}>{i===0?'Capa · ':''}{i+1}. {media.fileName}</Text>
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
          <TextInput onFocus={event=>scrollComposerInput('post',event.target)} style={styles.storyCaptionInput} value={composerLocation} onChangeText={value=>{composerLocationRef.current=value;setComposerLocation(value);setVerifiedPostPlace('');setPostPlaceOptions([]);}} placeholder="Adicionar localização (opcional)" accessibilityLabel="Localização da publicação" placeholderTextColor={MUTED} maxLength={160}/>
          {postPlaceLoading?<Text style={styles.storiesIntro}>A procurar localizações…</Text>:null}
          {postPlaceOptions.map(place=><Pressable key={place.id} accessibilityRole="button"
            accessibilityLabel={'Escolher localização '+socialPlaceLabel(place)} disabled={publishing}
            onPress={()=>{const label=socialPlaceLabel(place);composerLocationRef.current=label;
              setComposerLocation(label);setVerifiedPostPlace(label);setPostPlaceOptions([]);}}
            style={styles.storyFriendOption}>
            <JynloIcon name="location" size={18} color={TEAL}/>
            <View style={{flex:1}}><Text style={styles.storyFriendName}>{place.label}</Text>
              <Text style={styles.storiesIntro}>{place.subtitle}</Text></View>
          </Pressable>)}
          {composerLocation.trim()&&!verifiedPostPlace&&!postPlaceLoading&&postPlaceOptions.length===0?
            <Text style={styles.storiesIntro}>Seleciona uma localização real nas sugestões para publicar.</Text>:null}
        </ScrollView>
        {postPublishError?<View style={styles.errorBox} accessibilityRole="alert"><Text style={{color:'#FFB8B8'}}>{postPublishError}</Text><Text style={styles.mutedText}>O rascunho continua aqui. Confirma primeiro se já apareceu no teu perfil antes de repetires o envio.</Text></View>:null}
        <Pressable accessibilityRole="button" accessibilityLabel="Partilhar publicação" accessibilityState={{disabled:(!composerMedia.length&&!composerText.trim())||publishing,busy:publishing}} disabled={(!composerMedia.length&&!composerText.trim())||publishing} onPress={()=>void submitPost()} style={[styles.primaryButton,{minHeight:52,marginLeft:0},((!composerMedia.length&&!composerText.trim())||publishing)&&{opacity:.45}]}>
          <View style={styles.publishButtonContent}>{publishing?<ActivityIndicator color={INDIGO} size="small"/>:null}<Text accessibilityLiveRegion="polite" style={styles.primaryButtonText}>{publishing?'A enviar publicação…':'Partilhar publicação'}</Text></View>
        </Pressable>
        {publishing?<Text accessibilityLiveRegion="polite" style={styles.publishProgressHint}>A enviar para a Jynlo. Mantém este ecrã aberto; a publicação só será confirmada quando o servidor responder.</Text>:null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>

    <Modal visible={identityMatches&&storyComposer} animationType="slide" onRequestClose={closeStoryComposer}>
      <SafeAreaView style={[styles.storyComposerOverlay,screenHeight<700&&styles.storyComposerCompact]} edges={['top','bottom']}>
        <KeyboardAvoidingView style={{flex:1,gap:17}} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={styles.storyComposerHead}><View style={{flex:1,gap:4}}><Text style={styles.storyComposerTitle}>Criar Story</Text><Text style={styles.storiesIntro}>Uma fotografia ou vídeo visível durante 24 horas.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar criação de Story" disabled={storyPublishing} onPress={closeStoryComposer} style={styles.modalClose}><JynloIcon name="close" color={WHITE} size={25}/></Pressable></View>
        <ScrollView ref={storyComposerScrollRef} style={{flex:1}} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.mediaComposeBody}>
          {!storyMedia?<Suspense fallback={<View style={{height:440,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={TEAL}/></View>}>
            <StoryCameraCapture key={storyComposerRevision.current} onCaptured={media=>{if(activeStoryAccount.current===auth.token&&storyComposerRef.current&&storyComposerRevision.current===storyCaptureRevision&&!storyInFlight.current)setStoryMedia(media);}} onPickGallery={()=>void pickMedia(setStoryMedia,'gallery')}/>
          </Suspense>:null}
          {storyMedia?<View style={[styles.storyPreview,{height:Math.min(460,Math.max(240,Math.round(screenHeight*0.48)))}]}>
            {storyMedia.type==='image'?<Image source={{uri:storyMedia.uri}} resizeMode="contain" style={styles.storyPreviewMedia}/>:<MediaVideo uri={storyMedia.uri} story paused/>}
            <StoryDetailsView locationLabel={storyLocation} taggedUsernames={storyTags.replace(/@/g,'')} showTime={showStoryTime} createdAt={storyEditorOpenedAt}/>
            {storyCaption.trim()?<StoryTextPlacement caption={storyCaption.trim()} geometry={storyTextGeometry} appearance={storyAppearance}
              reservedTopPx={storyMetadataReservedHeight(storyLocation,storyTags)}
              onChange={value=>{storyGeometryRef.current=value;setStoryTextGeometry(value);}} disabled={storyPublishing}/>:null}
          </View>:null}
          {storyMedia?<View style={styles.storyMediaActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tirar nova fotografia ou vídeo para a Story"
             disabled={storyPublishing} onPress={()=>void pickMedia(setStoryMedia,'camera')} style={styles.storyMediaAction}>
             <JynloIcon name="camera" color={TEAL} size={19}/><Text style={styles.removeMediaText}>Câmara</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Trocar fotografia ou vídeo da Story pela galeria"
             disabled={storyPublishing} onPress={()=>void pickMedia(setStoryMedia,'gallery')} style={styles.storyMediaAction}>
             <JynloIcon name="gallery" color={TEAL} size={19}/><Text style={styles.removeMediaText}>Galeria</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Remover fotografia ou vídeo da Story"
             disabled={storyPublishing} onPress={()=>setStoryMedia(null)} style={styles.storyMediaAction}>
             <JynloIcon name="remove" color={TEAL} size={19}/><Text style={styles.removeMediaText}>Remover</Text>
            </Pressable>
           </View>:null}
          <Text style={styles.storiesIntro}>Arrasta o texto com um dedo. Usa dois dedos para rodar e ampliar.</Text>
          <View style={styles.storyStylePanel}>
           <Text style={styles.storyStyleTitle}>Personalizar texto da Story</Text>
           <Pressable accessibilityRole="checkbox" accessibilityState={{checked:showStoryTime}} disabled={storyPublishing}
            onPress={()=>setShowStoryTime(value=>!value)} style={styles.storyStyleChoice}>
            <Text style={styles.storyStyleChoiceText}>{showStoryTime?'☑':'☐'} Mostrar data e hora na Story</Text>
           </Pressable>
           <Text style={styles.storyStyleLabel}>Cor</Text>
           <View style={styles.storyStyleRow}>{([
            ['white','Branco'],['black','Preto'],['yellow','Amarelo'],['mint','Verde'],['pink','Rosa'],['blue','Azul']
           ] as const).map(([color,label])=><Pressable key={color} accessibilityRole="button" accessibilityLabel={'Cor do texto: '+label}
             accessibilityState={{selected:storyAppearance.color===color}} disabled={storyPublishing}
             onPress={()=>setStoryAppearance(prev=>({...prev,color}))}
             style={[styles.storyStyleChoice,storyAppearance.color===color&&styles.storyStyleSelected]}>
             <Text style={styles.storyStyleChoiceText}>{storyAppearance.color===color?'✓ ':''}{label}</Text>
            </Pressable>)}</View>
           <Text style={styles.storyStyleLabel}>Fundo do texto</Text>
           <View style={styles.storyStyleRow}>{([
            ['dark','Escuro'],['light','Claro'],['none','Sem fundo']
           ] as const).map(([background,label])=><Pressable key={background} accessibilityRole="button"
             accessibilityLabel={'Fundo do texto: '+label} accessibilityState={{selected:storyAppearance.background===background}}
             disabled={storyPublishing} onPress={()=>setStoryAppearance(prev=>({...prev,background}))}
             style={[styles.storyStyleChoice,storyAppearance.background===background&&styles.storyStyleSelected]}>
             <Text style={styles.storyStyleChoiceText}>{storyAppearance.background===background?'✓ ':''}{label}</Text>
            </Pressable>)}</View>
           <Text style={styles.storyStyleLabel}>Fonte</Text>
           <View style={styles.storyStyleRow}>{([
            ['modern','Moderna'],['classic','Clássica'],['mono','Monoespaçada']
           ] as const).map(([font,label])=><Pressable key={font} accessibilityRole="button"
             accessibilityLabel={'Fonte: '+label} accessibilityState={{selected:storyAppearance.font===font}}
             disabled={storyPublishing} onPress={()=>setStoryAppearance(prev=>({...prev,font}))}
             style={[styles.storyStyleChoice,storyAppearance.font===font&&styles.storyStyleSelected]}>
             <Text style={styles.storyStyleChoiceText}>{storyAppearance.font===font?'✓ ':''}{label}</Text>
            </Pressable>)}</View>
          </View>
          <Text style={styles.storiesIntro}>Publicar como</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Publicar Story no meu perfil"
            disabled={storyPublishing} onPress={()=>setStoryPublishCommunityId(null)}
            style={styles.storyFriendOption}>
            <JynloIcon name="profile" size={19} color={TEAL}/>
            <Text style={styles.storyFriendName}>{storyPublishCommunityId===null?'✓  ':''}O meu perfil</Text>
          </Pressable>
          {storyManagedCommunitiesLoading?<Text style={styles.storiesIntro}>A carregar comunidades…</Text>:null}
          {storyManagedCommunitiesError?<Text style={styles.storiesIntro}>{storyManagedCommunitiesError}</Text>:null}
          {storyManagedCommunities.map(group=><Pressable key={group.id} accessibilityRole="button"
            accessibilityLabel={'Publicar Story na comunidade '+group.name}
            disabled={storyPublishing} onPress={()=>setStoryPublishCommunityId(group.id)}
            style={styles.storyFriendOption}>
            <JynloIcon name="community" size={19} color={TEAL}/>
            <Text style={styles.storyFriendName}>{storyPublishCommunityId===group.id?'✓  ':''}{group.name}</Text>
          </Pressable>)}
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyCaption} onChangeText={value=>{storyCaptionRef.current=value;setStoryCaption(value);}} maxLength={180} placeholder="Escreve sobre o momento (opcional)…" placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          <Text style={styles.countText}>{storyCaption.length}/180</Text>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyAltText}
            onChangeText={setStoryAltText} maxLength={350} multiline
            placeholder="Descreve a imagem ou o vídeo para acessibilidade (opcional)"
            accessibilityLabel="Descrição acessível da Story" placeholderTextColor={MUTED}
            style={styles.storyCaptionInput}/>
          <Text style={styles.countText}>{storyAltText.length}/350</Text>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyLocation} onChangeText={value=>{storyLocationRef.current=value;setStoryLocation(value);setVerifiedStoryPlace('');setStoryPlaceOptions([]);}}
            placeholder="Adicionar localização (opcional)" accessibilityLabel="Localização da Story"
            maxLength={160} placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          {storyPlaceLoading?<Text style={styles.storiesIntro}>A procurar localizações…</Text>:null}
          {storyPlaceOptions.map(place=><Pressable key={place.id} accessibilityRole="button"
            accessibilityLabel={'Escolher localização da Story '+socialPlaceLabel(place)} disabled={storyPublishing}
            onPress={()=>{const label=socialPlaceLabel(place);storyLocationRef.current=label;
              setStoryLocation(label);setVerifiedStoryPlace(label);setStoryPlaceOptions([]);}}
            style={styles.storyFriendOption}>
            <JynloIcon name="location" size={18} color={TEAL}/>
            <View style={{flex:1}}><Text style={styles.storyFriendName}>{place.label}</Text>
              <Text style={styles.storiesIntro}>{place.subtitle}</Text></View>
          </Pressable>)}
          {storyLocation.trim()&&!verifiedStoryPlace&&!storyPlaceLoading&&storyPlaceOptions.length===0?
            <Text style={styles.storiesIntro}>Seleciona uma localização real nas sugestões para publicar a Story.</Text>:null}
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyTags} onChangeText={value=>{storyTagsRef.current=value;setStoryTags(value);}}
            placeholder="Identificar amigos: @ana, @joao" accessibilityLabel="Identificar amigos na Story"
            maxLength={500} autoCapitalize="none" autoCorrect={false} placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          <Text style={styles.storiesIntro}>Podes identificar até 5 perfis. Pesquisa pelo nome de utilizador ou seleciona uma sugestão.</Text>
          <TextInput onFocus={event=>scrollComposerInput('story',event.target)} value={storyFriendSearch} onChangeText={setStoryFriendSearch}
           placeholder="Procurar amigos para identificar" accessibilityLabel="Procurar amigos na Story"
           autoCapitalize="none" placeholderTextColor={MUTED} style={styles.storyCaptionInput}/>
          {storyFriendsBusy?<Text style={styles.storiesIntro}>A carregar amigos…</Text>:null}
          {storyProfileSearchBusy?<Text style={styles.storiesIntro}>A procurar perfis…</Text>:null}
          {storyFriendsError?<Text style={styles.storiesIntro}>{storyFriendsError}</Text>:null}
          {(storyFriendSearch.trim().length>=3
           ?[...storySearchedProfiles,...storyFriends.filter(friend=>
              [friend.username,friend.nickname||'',friend.fullName||''].some(value=>
               value.toLocaleLowerCase('pt-PT').includes(storyFriendSearch.trim().replace(/^@/,'').toLocaleLowerCase('pt-PT'))))]
             .filter((friend,index,all)=>all.findIndex(other=>other.username.toLowerCase()===friend.username.toLowerCase())===index)
           :storyFriends.filter(friend=>storyMentionUsernames(storyTags).includes(friend.username.toLowerCase())))
             .slice(0,15).map(friend=>{
           const selected=storyMentionUsernames(storyTags).includes(friend.username.toLowerCase());
           return <Pressable key={friend.username} accessibilityRole="button" disabled={storyPublishing}
            accessibilityLabel={(selected?'Remover identificação de ':'Identificar ')+friend.username}
            style={styles.storyFriendOption} onPress={()=>{
             try{
              const updated=toggleStoryMention(storyTagsRef.current,friend.username);
              storyTagsRef.current=updated;setStoryTags(updated);
             }catch(e){Alert.alert('Identificações',e instanceof Error?e.message:'Limite de identificações atingido.');}
            }}>
            <CircleAvatar name={friend.nickname||friend.fullName||friend.username} image={friend.profilePicUrl} size={36}/>
            <View style={{flex:1}}><Text style={styles.storyFriendName}>{friend.nickname||friend.fullName||friend.username}</Text>
             <Text style={styles.storiesIntro}>@{friend.username}</Text></View>
            <Text style={styles.storyFriendName}>{selected?'✓':'+'}</Text>
           </Pressable>;
          })}
        </ScrollView>
        {storyPublishError?<View style={styles.errorBox} accessibilityRole="alert"><Text style={{color:'#FFB8B8'}}>{storyPublishError}</Text><Text style={styles.mutedText}>O rascunho continua aqui. Verifica se a Story já foi publicada antes de repetires.</Text></View>:null}
        <Pressable accessibilityRole="button" accessibilityLabel="Publicar Story" accessibilityState={{disabled:!storyMedia||storyPublishing,busy:storyPublishing}} onPress={()=>void submitStory()} style={[styles.primaryButton,{minHeight:54,marginLeft:0},(!storyMedia||storyPublishing)&&{opacity:.5}]} disabled={!storyMedia||storyPublishing}>
          <View style={styles.publishButtonContent}>{storyPublishing?<ActivityIndicator color={INDIGO} size="small"/>:null}<Text accessibilityLiveRegion="polite" style={styles.primaryButtonText}>{storyPublishing?'A enviar Story…':'Publicar Story'}</Text></View>
        </Pressable>
        {storyPublishing?<Text accessibilityLiveRegion="polite" style={styles.publishProgressHint}>A enviar para a Jynlo. Não feches este ecrã até receberes a confirmação.</Text>:null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 jynloDiscoverPanel:{marginTop:11,marginBottom:14,padding:20,borderRadius:24,
  borderWidth:1,borderColor:'#167F80',backgroundColor:'#07303A',gap:9},
 jynloDiscoverEyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:TEAL},
 jynloDiscoverTitle:{fontSize:25,fontWeight:'900',letterSpacing:-.5,color:WHITE,lineHeight:31},
 jynloDiscoverSub:{fontSize:13,lineHeight:20,color:'#C3DEE0',maxWidth:360},
 jynloDiscoverPrimary:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,
  minHeight:48,backgroundColor:TEAL,borderRadius:14,marginTop:5,paddingHorizontal:16},
 jynloDiscoverPrimaryText:{fontSize:14,color:INDIGO,fontWeight:'900'},
 jynloActionRail:{gap:9,paddingBottom:14,paddingRight:12},
 jynloActionTile:{minWidth:90,minHeight:91,backgroundColor:'#0B2D3B',
  borderColor:'#1C5966',borderWidth:1,borderRadius:17,padding:9,
  alignItems:'center',justifyContent:'center',gap:8},
 jynloActionIcon:{width:38,height:38,borderRadius:13,backgroundColor:'#104451',
  justifyContent:'center',alignItems:'center'},
 jynloActionText:{fontSize:12,fontWeight:'800',color:WHITE,textAlign:'center'},

 feedComposerPrompt:{flexDirection:'row',alignItems:'center',gap:12,minHeight:72,
  paddingHorizontal:13,paddingVertical:12,marginTop:5,marginBottom:12,
  borderWidth:1,borderColor:'#235965',borderRadius:17,backgroundColor:'#082D39'},
 feedComposerCopy:{flex:1,minWidth:0,gap:4},
 feedComposerTitle:{fontSize:14,fontWeight:'800',color:WHITE},
 feedComposerHint:{fontSize:12,lineHeight:17,color:MUTED},
 storyStylePanel:{gap:9,padding:12,borderWidth:1,borderColor:BORDER,borderRadius:14,backgroundColor:PANEL},
 storyStyleTitle:{fontSize:15,fontWeight:'900',color:WHITE},
 storyStyleLabel:{fontSize:12,fontWeight:'800',color:MUTED},
 storyStyleRow:{flexDirection:'row',flexWrap:'wrap',gap:7},
 storyStyleChoice:{borderWidth:1,borderColor:BORDER,borderRadius:9,minHeight:40,paddingHorizontal:10,paddingVertical:9,justifyContent:'center'},
 storyStyleSelected:{borderColor:TEAL,backgroundColor:'#10483F'},
 storyStyleChoiceText:{fontSize:12,fontWeight:'800',color:WHITE},
  attendanceDigest:{gap:8,marginVertical:4},
  attendanceRow:{flexDirection:'row',gap:11,alignItems:'flex-start',borderWidth:1,borderColor:'#0B6071',borderRadius:13,backgroundColor:'#062C3A',padding:12},
  attendanceCheck:{width:27,height:27,borderRadius:14,backgroundColor:'#0B5260',alignItems:'center',justifyContent:'center',marginTop:1},
  attendanceCheckText:{color:TEAL,fontSize:16,fontWeight:'900'},
  attendanceDetails:{flex:1,minWidth:0,gap:4},
  attendanceTitle:{color:WHITE,fontSize:12,fontWeight:'800',lineHeight:17},
  attendanceMeta:{color:'#C0D7DE',fontSize:13,lineHeight:19},
  attendanceActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8,marginTop:4},
  attendanceButton:{minHeight:44,justifyContent:'center',paddingHorizontal:9,paddingVertical:8},
  attendanceActionText:{color:TEAL,fontWeight:'800',fontSize:12},
  attendanceHideText:{color:'#D8E9ED',fontWeight:'700',fontSize:12},
  attendanceMore:{alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:12,minHeight:44,justifyContent:'center'},
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
  hiddenNoticeText:{flex:1,color:WHITE,fontSize:12},hiddenUndo:{minHeight:44,justifyContent:'center',paddingHorizontal:10},
  screenPad:{paddingHorizontal:12,gap:9},navHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:11,paddingBottom:3},brand:{flexDirection:'row',alignItems:'center',gap:9},brandLogo:{width:32,height:32,borderRadius:9},brandName:{color:WHITE,fontSize:19,fontWeight:'900',letterSpacing:2.2},headerRight:{flexDirection:'row',alignItems:'center',gap:9},headerCircle:{borderRadius:22,width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:BORDER,backgroundColor:PANEL},headerIcon:{color:WHITE,fontSize:24},pulse:{position:'absolute',width:6,height:6,right:7,top:5,borderRadius:3,backgroundColor:TEAL},headerUser:{flexDirection:'row',alignItems:'center',gap:6,borderRadius:22,paddingRight:10,paddingLeft:3,paddingVertical:3,borderWidth:1,borderColor:'#14616D',backgroundColor:'#072B35',maxWidth:128},headerName:{color:WHITE,fontSize:12,fontWeight:'800',maxWidth:65},
  avatar:{justifyContent:'center',alignItems:'center',backgroundColor:'#10536A',borderWidth:1,borderColor:'#28849B',overflow:'hidden'},avatarLetter:{color:WHITE,fontWeight:'900'},
  demoRibbon:{marginTop:1,borderWidth:1,borderColor:'#165660',backgroundColor:'#082B31',borderRadius:9,paddingVertical:5,paddingHorizontal:9,alignSelf:'flex-start'},demoRibbonText:{fontSize:12,fontWeight:'800',letterSpacing:.9,color:'#72D5CC'},
  hero:{padding:19,minHeight:140,borderWidth:1,borderColor:'#086073',borderRadius:18,backgroundColor:'#052332',justifyContent:'center',gap:9},heroEyebrow:{fontSize:12,color:TEAL,fontWeight:'900',letterSpacing:1.1},heroTitle:{fontSize:31,color:WHITE,fontWeight:'900',letterSpacing:-0.8,lineHeight:37},heroSub:{fontSize:13,color:'#C2DFE5',lineHeight:20,maxWidth:460},
  storiesCard:{paddingVertical:10,gap:8},sectionHead:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between'},eyebrow:{fontSize:12,color:TEAL,fontWeight:'900',letterSpacing:1.4},sectionTitle:{color:WHITE,fontSize:18,fontWeight:'900',letterSpacing:-.25},ghostButton:{minHeight:44,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'#145664',paddingHorizontal:10,paddingVertical:9},ghostButtonText:{fontSize:12,color:TEAL,fontWeight:'800'},storiesIntro:{fontSize:13,color:'#B7D6DB',lineHeight:19},storyRail:{gap:11,paddingTop:2,paddingBottom:2},storyItem:{width:64,alignItems:'center',gap:4},storyRing:{padding:3,borderRadius:39,borderWidth:2,borderColor:TEAL,backgroundColor:'#0B3B47'},storyCreateRing:{padding:2,position:'relative'},storyCreateBadge:{position:'absolute',right:0,bottom:0,width:21,height:21,borderRadius:11,backgroundColor:TEAL,borderWidth:2,borderColor:INDIGO,alignItems:'center',justifyContent:'center'},storyCreatePlus:{color:INDIGO,fontSize:14,fontWeight:'900',lineHeight:17},storyItemName:{fontSize:12,color:WHITE,fontWeight:'700',textAlign:'center'},emptyStories:{flexDirection:'row',gap:11,alignItems:'center',paddingVertical:7},storyEmptyIcon:{width:45,height:45,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:TEAL,backgroundColor:'#06464A'},storiesEmptyTitle:{fontSize:13,color:WHITE,fontWeight:'800'},storiesEmptyText:{fontSize:13,color:MUTED,marginTop:3},
  weekPanel:{backgroundColor:'#052635',borderColor:BORDER,borderWidth:1,borderRadius:17,padding:13,gap:12},weekRail:{gap:9,paddingRight:5},weekCard:{width:220,minHeight:165,backgroundColor:'#062D3D',borderColor:'#0B5568',borderWidth:1,borderRadius:13,padding:13,gap:8},weekIcon:{width:31,height:31,borderRadius:9,backgroundColor:'#034858',borderColor:'#0D7C84',borderWidth:1,alignItems:'center',justifyContent:'center'},weekIconText:{color:TEAL,fontSize:18,fontWeight:'900'},weekTitle:{fontSize:12,fontWeight:'900',color:'#5DFFF2'},weekDetail:{color:'#D1E7ED',fontSize:13,lineHeight:19,minHeight:32},weekFooter:{fontSize:12,fontWeight:'900',color:TEAL},
  visitorCard:{backgroundColor:'#082D3D',borderColor:BORDER,borderWidth:1,borderRadius:18,padding:16,gap:12},
  visitorTitle:{color:WHITE,fontSize:19,fontWeight:'900'},
  visitorDescription:{color:MUTED,fontSize:12,lineHeight:19},
  visitorSession:{backgroundColor:'#062635',borderWidth:1,borderColor:'#145664',borderRadius:12,padding:13,gap:5},
  visitorSessionSport:{color:WHITE,fontSize:14,fontWeight:'900'},
  visitorSessionMeta:{color:MUTED,fontSize:13,lineHeight:19},
  visitorPrimary:{padding:13,alignItems:'center',borderRadius:12,backgroundColor:TEAL},
  visitorPrimaryText:{color:INDIGO,fontSize:13,fontWeight:'900'},
  visitorSecondary:{padding:12,alignItems:'center'},
  visitorSecondaryText:{color:TEAL,fontSize:12,fontWeight:'800'},
  postPhotoBackdrop:{flex:1,backgroundColor:'#020A10',justifyContent:'center',padding:12},postPhotoFull:{width:'100%',height:'86%'},postPhotoClose:{alignSelf:'center',minHeight:48,paddingHorizontal:24,justifyContent:'center',borderWidth:1,borderColor:BORDER,borderRadius:16,backgroundColor:PANEL},postPhotoCloseText:{color:WHITE,fontWeight:'900'},
   publishButtonContent:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},
   publishProgressHint:{color:MUTED,fontSize:13,lineHeight:20,textAlign:'center',paddingHorizontal:8},
   composerCard:{backgroundColor:'#082D3D',borderColor:BORDER,borderWidth:1,borderRadius:14,padding:10,gap:10},composerHeading:{fontSize:14,color:WHITE,fontWeight:'900'},composerInput:{minHeight:85,backgroundColor:'#06333C',borderWidth:1,borderColor:'#128070',borderRadius:12,padding:12,color:WHITE,fontSize:14,textAlignVertical:'top'},composerBottom:{flexDirection:'row',alignItems:'center',gap:9},attachButton:{flexDirection:'row',gap:6,alignItems:'center',paddingVertical:6},attachIcon:{fontSize:19,color:TEAL},attachText:{color:WHITE,fontWeight:'800',fontSize:13},countText:{color:MUTED,fontSize:12},primaryButton:{marginLeft:'auto',paddingVertical:10,paddingHorizontal:15,borderRadius:10,backgroundColor:TEAL,alignItems:'center',justifyContent:'center'},primaryButtonText:{color:'#03242A',fontSize:12,fontWeight:'900'},postMediaPreview:{borderWidth:1,borderColor:BORDER,borderRadius:14,overflow:'hidden',backgroundColor:'#020A10'},postMediaPreviewImage:{width:'100%',height:300,backgroundColor:'#020A10'},postMediaPreviewFooter:{gap:8,paddingHorizontal:10,paddingVertical:9,backgroundColor:PANEL},removeMediaButton:{paddingVertical:7,paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:'#3F7D88'},removeMediaText:{color:TEAL,fontSize:12,fontWeight:'800'},attachedText:{color:MUTED,fontSize:13,flex:1},
  latestTitle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:4,paddingBottom:1},link:{color:TEAL,fontWeight:'800',fontSize:13},feedCardWrap:{paddingHorizontal:12,marginBottom:14},postCard:{backgroundColor:'#092938',borderWidth:1,borderColor:'#225763',borderRadius:21,padding:16,gap:14},postTop:{flexDirection:'row',alignItems:'center',gap:12,paddingBottom:2},postName:{color:WHITE,fontSize:15,fontWeight:'900'},postMeta:{color:MUTED,fontSize:12,lineHeight:18},postBody:{color:WHITE,fontSize:14,lineHeight:23},postImage:{width:'100%',height:350,borderRadius:12,backgroundColor:'#020A10'},postVideo:{width:'100%',height:300,borderRadius:12},postActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',borderTopColor:'#225763',borderTopWidth:1,paddingTop:12,rowGap:8,columnGap:14},postDetailAction:{minHeight:44,justifyContent:'center',marginLeft:'auto',paddingHorizontal:7},postDetailLabel:{color:TEAL,fontWeight:'900',fontSize:12},postSessionCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#06333F',borderWidth:1,borderColor:'#127681',borderRadius:14,padding:12},postSessionIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#0D5060',alignItems:'center',justifyContent:'center'},postSessionIconText:{fontSize:24,color:TEAL,fontWeight:'900'},postSessionTitle:{fontSize:14,fontWeight:'900',color:WHITE},postSessionMeta:{fontSize:13,color:MUTED},postSessionLink:{fontSize:12,fontWeight:'800',color:TEAL},postAction:{flexDirection:'row',gap:5,alignItems:'center',minHeight:44},actionIcon:{fontSize:21,color:TEAL},actionCount:{fontSize:12,color:MUTED,fontWeight:'700'},activityBox:{flexDirection:'row',padding:12,borderRadius:12,backgroundColor:'#062C3A',borderWidth:1,borderColor:BORDER,alignItems:'center',gap:10},activityTitle:{color:WHITE,fontSize:13,fontWeight:'800'},activityMeta:{color:MUTED,fontSize:12,marginTop:2},viewSession:{color:TEAL,fontSize:12,fontWeight:'800'},commentsModal:{flex:1,justifyContent:'flex-end'},commentsBackdrop:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,0.7)'},commentsSheet:{height:'74%',backgroundColor:INDIGO,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:BORDER,paddingHorizontal:16,paddingTop:9},commentsHandle:{alignSelf:'center',width:42,height:4,borderRadius:2,backgroundColor:'#587A85',marginBottom:15},commentsHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:14,borderBottomWidth:1,borderBottomColor:BORDER},commentsTitle:{color:WHITE,fontSize:17,fontWeight:'900'},commentsClose:{color:WHITE,fontSize:20,paddingHorizontal:8},commentsList:{flex:1},commentsListContent:{paddingVertical:13,gap:10,flexGrow:1},commentsEmpty:{color:MUTED,fontSize:13,textAlign:'center',marginTop:26},comment:{flexDirection:'row',gap:10,padding:11,backgroundColor:'#06232F',borderRadius:11},commentAuthor:{color:TEAL,fontSize:13,fontWeight:'800'},commentBody:{fontSize:14,color:WHITE,lineHeight:20},commentCompose:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:12,borderTopWidth:1,borderTopColor:BORDER},commentInput:{flex:1,minHeight:44,color:WHITE,backgroundColor:'#06232F',borderColor:BORDER,borderWidth:1,paddingHorizontal:12,borderRadius:10},sendComment:{backgroundColor:TEAL,width:44,height:44,borderRadius:11,alignItems:'center',justifyContent:'center'},sendText:{color:INDIGO,fontSize:20},errorBox:{borderColor:'#C87575',borderWidth:1,padding:12,borderRadius:10,gap:6},mutedText:{fontSize:13,color:MUTED,lineHeight:19},discoveryCard:{borderColor:BORDER,borderWidth:1,borderRadius:16,backgroundColor:PANEL,padding:15,gap:12},personRow:{flexDirection:'row',gap:9,alignItems:'center'},personName:{fontWeight:'900',fontSize:12,color:WHITE},
  storyMediaStatus:{...StyleSheet.absoluteFillObject,justifyContent:'center',alignItems:'center',gap:12,backgroundColor:'#03131DBB'},
  storyMediaStatusText:{color:MUTED,textAlign:'center',fontSize:13,lineHeight:19},
  storyMediaFailure:{...StyleSheet.absoluteFillObject,justifyContent:'center',alignItems:'center',gap:13,padding:24,backgroundColor:'#061620'},
  storyMediaFailureTitle:{color:WHITE,fontSize:17,fontWeight:'900',textAlign:'center'},
  storyMediaRetry:{paddingHorizontal:22,paddingVertical:12,borderRadius:14,backgroundColor:TEAL,minHeight:44,justifyContent:'center'},
  storyMediaRetryText:{color:INDIGO,fontWeight:'900'},
  storyViewsAction:{flexGrow:1,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'#123641'},
  storyReactions:{gap:8,paddingVertical:7},
  storyReactionsTitle:{color:MUTED,fontSize:12,fontWeight:'800'},
  storyReactionRow:{flexDirection:'row',justifyContent:'space-between',gap:5},
  storyReactionButton:{minWidth:44,minHeight:44,borderRadius:16,backgroundColor:'#12313B',borderWidth:1,borderColor:BORDER,alignItems:'center',justifyContent:'center'},
  storyReactionEmoji:{fontSize:22},
  storyAudiencePanel:{position:'absolute',left:0,right:0,bottom:0,maxHeight:'70%',minHeight:240,zIndex:30,
    backgroundColor:'#102733',borderTopWidth:1,borderColor:TEAL,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:12},
  storyAudienceHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  storyAudienceTitle:{color:WHITE,fontSize:18,fontWeight:'900'},
  storyAudienceClose:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
  storyAudienceCloseText:{color:WHITE,fontSize:21},
  storyAudienceCount:{color:TEAL,fontWeight:'800',fontSize:14},
  storyAudienceScroll:{flexGrow:0},
  storyViewerRow:{flexDirection:'row',alignItems:'center',gap:10,minHeight:57,paddingVertical:8,borderBottomWidth:1,borderBottomColor:BORDER},
  storyViewerName:{color:WHITE,fontSize:14,fontWeight:'800'},
  storyViewerTime:{color:MUTED,fontSize:12},
  storyOverlay:{flex:1,backgroundColor:'#020A10',paddingHorizontal:12,paddingTop:5},storyEngagement:{flexDirection:'row',flexWrap:'wrap',gap:9,alignItems:'center',paddingVertical:7},storyEngagementAction:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderColor:BORDER,borderWidth:1,borderRadius:18},storyEngagementText:{color:WHITE,fontSize:15,fontWeight:'800'},storyReplyRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6},storyReplyInput:{flex:1,color:WHITE,borderColor:BORDER,borderWidth:1,borderRadius:23,minHeight:46,paddingHorizontal:15,backgroundColor:PANEL},storyReplySend:{minHeight:46,paddingHorizontal:13,backgroundColor:TEAL,borderRadius:23,justifyContent:'center'},storyReplySendText:{color:INDIGO,fontWeight:'800'},storyReplyHint:{fontSize:13,color:MUTED,paddingBottom:8},storyDeleteAction:{minHeight:44,alignSelf:'center',justifyContent:'center',paddingHorizontal:15},storyProgress:{flexDirection:'row',gap:4,height:4},progressPart:{flex:1,backgroundColor:'#557781',borderRadius:3,overflow:'hidden'},storyProgressFill:{height:'100%',width:'100%',backgroundColor:WHITE},storyTop:{flexDirection:'row',alignItems:'center',gap:9,marginTop:12},storyUser:{flex:1,color:WHITE,fontWeight:'900'},closeStory:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',padding:9},closeStoryText:{color:WHITE,fontSize:20},storyMedia:{flex:1,justifyContent:'center',alignItems:'center',paddingVertical:12},storyTapZones:{...StyleSheet.absoluteFill,flexDirection:'row'},storyTapZone:{flex:1},storyImage:{width:'100%',height:'100%'},storyVideo:{width:'100%',height:'100%'},storyCaption:{color:WHITE,textAlign:'center',fontSize:16,fontWeight:'800',paddingVertical:10},storyCaptionLayer:{position:'absolute',bottom:24,left:15,right:15,alignItems:'center',justifyContent:'center'},storyCaptionOverlay:{color:WHITE,fontSize:20,fontWeight:'900',textAlign:'center',backgroundColor:'rgba(0,0,0,0.64)',paddingHorizontal:14,paddingVertical:9,borderRadius:13,overflow:'hidden'},storyBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14},storyNav:{padding:11},storyNavText:{color:TEAL,fontWeight:'800'},storyCount:{color:MUTED,fontSize:12},storyOwnHint:{color:MUTED,fontSize:12,textAlign:'center',paddingBottom:5},
  modalClose:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},modalCloseText:{fontSize:22,color:WHITE,fontWeight:'800'},mediaComposeBody:{gap:14,paddingBottom:24},mediaChooseRow:{flexDirection:'row',gap:12},mediaChooseButton:{flex:1,minHeight:94,borderRadius:15,borderWidth:1,borderColor:'#146875',backgroundColor:PANEL,alignItems:'center',justifyContent:'center',gap:7,padding:12},mediaChooseIcon:{fontSize:25,color:TEAL},mediaChooseText:{fontSize:14,fontWeight:'800',color:WHITE},mediaEmptyState:{minHeight:155,borderRadius:16,borderWidth:1,borderColor:BORDER,backgroundColor:'#072B39',justifyContent:'center',alignItems:'center',gap:9,padding:20},mediaEmptyTitle:{fontSize:15,fontWeight:'800',color:WHITE,textAlign:'center'},storyComposerOverlay:{flex:1,backgroundColor:INDIGO,padding:18,gap:17},storyComposerCompact:{padding:12,gap:10},storyComposerHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},storyComposerTitle:{color:WHITE,fontSize:22,fontWeight:'900'},mediaPicker:{minHeight:115,borderRadius:15,borderWidth:1,borderColor:TEAL,backgroundColor:PANEL,alignItems:'center',justifyContent:'center',gap:9,padding:12},storyFriendOption:{flexDirection:'row',alignItems:'center',gap:12,padding:10,borderRadius:12,backgroundColor:PANEL,borderWidth:1,borderColor:BORDER,minHeight:56},
 storyFriendAvatar:{width:38,height:38,borderRadius:19},
 storyFriendAvatarPlaceholder:{width:38,height:38,borderRadius:19,backgroundColor:'#24545D',alignItems:'center',justifyContent:'center'},
 storyFriendName:{color:WHITE,fontWeight:'800',fontSize:13},
 storyMediaActions:{flexDirection:'row',flexWrap:'wrap',gap:8},storyMediaAction:{flexGrow:1,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center',minHeight:46,paddingHorizontal:10,borderRadius:11,borderWidth:1,borderColor:BORDER,backgroundColor:PANEL},
  storyPreview:{width:'100%',height:320,backgroundColor:'#020A10',borderRadius:16,overflow:'hidden',justifyContent:'center'},storyPreviewMedia:{width:'100%',height:'100%'},storyCaptionInput:{backgroundColor:PANEL,borderWidth:1,borderColor:BORDER,color:WHITE,padding:13,borderRadius:12,minHeight:50}
});
