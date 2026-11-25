import React,{useCallback,useMemo,useRef,useState} from 'react';
import {currentLocale,t} from '../../src/lib/i18n';
import {JynloIcon} from '../../src/components/JynloIcon';
import {Alert,AppState,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {resolveJynloMedia} from '../../src/lib/social-feed-api';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../../src/lib/optional-notifications.cjs';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {communityInbox,directInbox,sessionInbox,privateGroupInbox,teamChatInbox} from '../../src/lib/chat-api';
import {listConversationMutes,setConversationMuted,isConversationMuted,type MutedConversation} from '../../src/lib/conversation-mutes-api';
import {pendingDirectCall,type DirectCallInvitation} from '../../src/lib/direct-call-api';
import {myUnreadNotificationCount} from '../../src/lib/notifications-api';
import {myCommunityInvites} from '../../src/lib/community-api';
import {C,MobileTheme} from '../../src/lib/theme';
import type {CommunityInvite,JynloInboxSummary} from '../../src/lib/types';
import {filterInbox,unreadInboxCount,formatInboxTime,formatUnreadBadge} from '../../src/lib/inbox-filter.cjs';
export default function MessagesScreen(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<JynloInboxSummary[]>([]);
 const [brokenAvatars,setBrokenAvatars]=useState<Record<string,boolean>>({});
 const [chatWarning,setChatWarning]=useState('');
 const [notificationUnread,setNotificationUnread]=useState(0);
 const [invites,setInvites]=useState<CommunityInvite[]>([]);
 const [incomingCall,setIncomingCall]=useState<DirectCallInvitation|null>(null);
 const [mutes,setMutes]=useState<MutedConversation[]>([]);
 const [muteKnown,setMuteKnown]=useState(false);
 const [muteError,setMuteError]=useState('');
 const [mutingKey,setMutingKey]=useState<string|null>(null);
 const muteWrites=useRef(new Set<string>());
 const muteRevision=useRef(0);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [lastSyncedAt,setLastSyncedAt]=useState<Date|null>(null);
 const [search,setSearch]=useState(''),[unreadOnly,setUnreadOnly]=useState(false);
 const [conversationKind,setConversationKind]=useState<'all'|'direct'|'private'|'team'|'community'|'session'>('all');
 const identity=useRef('');
 const sameIdentity=!!auth.token&&!!auth.username&&identity.current===auth.username+'|'+auth.token;
 const displayed=useMemo(()=>sameIdentity?(filterInbox(items,search,unreadOnly) as JynloInboxSummary[])
  .filter(item=>conversationKind==='all'||item.kind===conversationKind):[],[items,search,unreadOnly,sameIdentity,conversationKind]);
 const unreadTotal=useMemo(()=>sameIdentity?unreadInboxCount(items) as number:0,[items,sameIdentity]);
 const busyVersion=useRef<number|null>(null),generation=useRef(0);
 const pendingRefresh=useRef(false);
 const load=useCallback(async(silent=false,version=generation.current)=>{
  if(busyVersion.current===version){pendingRefresh.current=true;return;}
  if(!auth.token||!auth.username){
   setItems([]);setInvites([]);setIncomingCall(null);setNotificationUnread(0);setLastSyncedAt(null);setLoading(false);return;
  }
  busyVersion.current=version;
  const initialMuteRevision=muteRevision.current;
  if(!silent){setLoading(true);setError('');setChatWarning('');}
  try{
   const [groups,privateChats,sessionChats,requests,call,muted,unreadNotifications,groupChats,teamChats]=await Promise.allSettled([
    communityInbox(auth.token,auth.username),directInbox(auth.token),sessionInbox(auth.token,auth.username),
    myCommunityInvites(auth.token,auth.username),pendingDirectCall(auth.token),listConversationMutes(auth.token),
    myUnreadNotificationCount(auth.token),privateGroupInbox(auth.token),teamChatInbox(auth.token)
   ]);
   if(version!==generation.current||identity.current!==auth.username+'|'+auth.token)return;
   // A failing source must not erase healthy conversations from the other source.
   setItems(previous=>[
    ...(privateChats.status==='fulfilled'?privateChats.value:previous.filter(i=>i.kind==='direct')),
    ...(groups.status==='fulfilled'?groups.value:previous.filter(i=>i.kind==='community')),
    ...(sessionChats.status==='fulfilled'?sessionChats.value:previous.filter(i=>i.kind==='session')),
    ...(groupChats.status==='fulfilled'?groupChats.value:previous.filter(i=>i.kind==='private')),
    ...(teamChats.status==='fulfilled'?teamChats.value:previous.filter(i=>i.kind==='team'))
   ].sort((a,b)=>(Date.parse(b.latestAt||'')||0)-(Date.parse(a.latestAt||'')||0)));
   if(requests.status==='fulfilled')setInvites(requests.value);
   if(unreadNotifications.status==='fulfilled')setNotificationUnread(unreadNotifications.value);
   if(muted.status==='fulfilled'){
    // Do not overwrite freshly changed preferences with a stale poll response.
    if(muteWrites.current.size===0&&muteRevision.current===initialMuteRevision){setMutes(muted.value);setMuteKnown(true);setMuteError('');}
   }else if(!muteKnown){setMuteError(t('Não foi possível consultar as preferências de avisos.'));}
   if(call.status==='fulfilled')setIncomingCall(call.value&&Number.isFinite(Date.parse(call.value.expiresAt))&&Date.parse(call.value.expiresAt)>Date.now()?call.value:null);
   else setIncomingCall(null); // Never present an unverified stale invitation as active.
   const failedSources=[
    ...(privateChats.status==='rejected'?[t('mensagens privadas')]:[]),
    ...(groups.status==='rejected'?[t('comunidades')]:[]),
    ...(sessionChats.status==='rejected'?[t('sessões')]:[]),
    ...(groupChats.status==='rejected'?[t('grupos')]:[]),
    ...(teamChats.status==='rejected'?[t('equipas')]:[]),
    ...(requests.status==='rejected'?[t('convites')]:[])
   ];
   const partial=failedSources.length>0;
   setChatWarning(partial?t('Não foi possível sincronizar: {areas}. Os dados anteriores podem estar desatualizados. Tenta atualizar novamente.',{areas:failedSources.join(', ')}):'');
   if(!partial)setLastSyncedAt(new Date());
  }catch(e){
   if(version===generation.current&&identity.current===auth.username+'|'+auth.token){
    if(!silent)setError(e instanceof Error?e.message:t('Não foi possível carregar as conversas.'));
    else setChatWarning(t('A atualização automática falhou. Confirma a ligação e volta a atualizar.'));
   }
  }finally{
   if(busyVersion.current===version)busyVersion.current=null;
   if(version===generation.current&&identity.current===auth.username+'|'+auth.token){
    if(!silent)setLoading(false);
    if(pendingRefresh.current){pendingRefresh.current=false;void load(true,version);}
   }
  }
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const currentIdentity=auth.username+'|'+auth.token;
  if(identity.current!==currentIdentity){
   identity.current=currentIdentity;setItems([]);setInvites([]);setIncomingCall(null);setNotificationUnread(0);
   setLastSyncedAt(null);setChatWarning('');setError('');
   muteRevision.current++;
   setMutes([]);setMuteKnown(false);setMuteError('');setMutingKey(null);
   setSearch('');setUnreadOnly(false);
  }
  const version=++generation.current;
  pendingRefresh.current=false;
  void load(false,version);
  const timer=setInterval(()=>{if(AppState.currentState==='active')void load(true,version);},15000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&generation.current===version)void load(true,version);
  });
  // Native push is optional: the inbox remains accessible without the bridge.
  let received:ReturnType<typeof NotificationTypes.addNotificationReceivedListener>|null=null;
  try{
   const Notifications=getNativeNotifications() as typeof NotificationTypes|null;
   if(Notifications)received=Notifications.addNotificationReceivedListener(notification=>{
    if(notification.request?.content?.data?.kind!=='notification'||generation.current!==version)return;
    if(auth.token&&auth.username)void load(true,version);
   });
  }catch{
   // Polling and the app-resume listener remain the fallback.
  }
  return ()=>{
   clearInterval(timer);resume.remove();
   try{received?.remove();}catch{
    // Native listener cleanup must not prevent leaving this tab.
   }
   pendingRefresh.current=false;generation.current++;
  };
 },[load,auth.username,auth.token]));
 function toggleConversationMute(item:JynloInboxSummary){
  if(!auth.token||!auth.username||!sameIdentity||!muteKnown)return;
  const key=item.kind+':'+item.id.toLowerCase();
  if(muteWrites.current.has(key))return;
  const muted=isConversationMuted(mutes,item.kind,item.id);
  const actor=auth.username+'|'+auth.token;
  const token=auth.token;
  Alert.alert(muted?t('Ativar avisos?'):t('Silenciar conversa?'),
   muted?t('Vais voltar a receber notificações desta conversa.'):t('As mensagens continuarão a chegar e a contar como não lidas. Apenas os avisos desta conversa serão silenciados.'),[
    {text:t('Cancelar'),style:'cancel'},
    {text:muted?t('Ativar avisos'):t('Silenciar'),onPress:()=>{
      if(identity.current!==actor||muteWrites.current.has(key))return;
      muteWrites.current.add(key);muteRevision.current++;setMutingKey(key);setMuteError('');
      void setConversationMuted(item.kind,item.id,!muted,token).then(async()=>{
        const confirmed=await listConversationMutes(token);
        if(identity.current===actor){muteRevision.current++;setMutes(confirmed);setMuteKnown(true);}
      }).catch(()=>{
        if(identity.current===actor)setMuteError(t('Não foi possível confirmar a alteração. Volta a atualizar antes de repetir.'));
      }).finally(()=>{
        muteWrites.current.delete(key);
        if(identity.current===actor)setMutingKey(null);
      });
    }}
   ]);
 }
 return <Page><Brand subtitle={t('A CONVERSA CONTINUA')}/><DemoBanner/>
  <View style={styles.headerRow}>
   <View style={styles.headerCopy}><Eyebrow>{t('COMUNIDADE É CONVERSA')}</Eyebrow><Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Mensagens')}</Text>
    <Text style={styles.sub}>{t('Conversas privadas, grupos, comunidades e sessões, num só lugar.')}</Text>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir notificações')} onPress={()=>router.push('/notifications')} style={styles.notificationAction}><JynloIcon name="notifications" size={22} color={T.accent}/>{sameIdentity&&notificationUnread>0?<Text style={styles.notificationCount}>{notificationUnread>99?'99+':notificationUnread}</Text>:null}</Pressable>
  </View>
  {auth.token?<View style={styles.searchBox}>
   <TextInput value={search} onChangeText={setSearch} placeholder={t('Pesquisar conversas…')}
    placeholderTextColor={C.muted} style={styles.searchInput} autoCapitalize="none"
    accessibilityLabel={t('Pesquisar conversas pelo contacto ou mensagem')}/>
   <View style={styles.filterRow}>
    {([['all','Todas'],['direct','Privadas'],['private','Grupos'],['team','Equipas'],['community','Comunidades'],['session','Sessões']] as const).map(([kind,label])=><Pressable key={kind} accessibilityRole="button" accessibilityLabel={t('Filtrar conversas: {label}',{label:t(label)})} accessibilityState={{selected:conversationKind===kind}}
      onPress={()=>setConversationKind(kind)} style={[styles.kindChip,conversationKind===kind&&styles.kindChipActive]}>
      <Text style={[styles.kindText,conversationKind===kind&&styles.kindTextActive]}>{t(label)}</Text>
    </Pressable>)}
   </View>
   <View style={styles.filterRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Mostrar apenas conversas não lidas')} accessibilityState={{selected:unreadOnly}}
      onPress={()=>setUnreadOnly(current=>!current)} style={[styles.filterChip,unreadOnly&&styles.filterActive]}>
      <Text style={[styles.filterText,unreadOnly&&styles.filterTextActive]}>{t('Não lidas · {a}',{a:unreadTotal})}</Text>
    </Pressable>
    {!!search?<Pressable accessibilityRole="button" accessibilityLabel={t('Limpar pesquisa de conversas')} onPress={()=>setSearch('')} style={styles.clearSearch}><Text style={styles.clearSearchText}>{t('Limpar ×')}</Text></Pressable>:null}
   </View>
   <Text style={styles.tiny}>{t('{a} de {b} conversas',{a:displayed.length,b:sameIdentity?items.length:0})}</Text>
  </View>:null}
  {!auth.token?<Button title={t('Entrar para ver mensagens')} onPress={()=>router.push('/login')}/>:null}
  {sameIdentity&&incomingCall?<Pressable accessibilityRole="button"
    accessibilityLabel={t('Atender chamada de {v}',{v:incomingCall.caller})}
    onPress={()=>router.push({pathname:'/messages/call',params:{peer:incomingCall.caller}})}
    style={styles.alert}>
    <View style={{flex:1,gap:4}}>
     <Text style={styles.alertText}>{t('Chamada {a} de {b}',{a:incomingCall.media==='video'?t('de vídeo'):t('de voz'),b:incomingCall.caller})}</Text>
     <Text style={styles.tiny}>{t('Abrir chamada para aceitar ou recusar')}</Text>
    </View><Text style={styles.arrow}>›</Text>
   </Pressable>:null}
  {sameIdentity&&invites.length>0?<Pressable onPress={()=>router.push('/communities/invites')} style={styles.alert}>
    <Text style={styles.alertText}>{t('✉  Tens {a} convite(s) para comunidades',{a:invites.length})}</Text><Text style={styles.arrow}>›</Text>
  </Pressable>:null}
  {sameIdentity?<Pressable accessibilityRole="button" accessibilityLabel={t('Ver reações e respostas privadas às minhas Stories')}
   onPress={()=>router.push('/stories/replies')} style={styles.storyRepliesShortcut}>
   <View style={styles.storyRepliesSymbol}><Text maxFontSizeMultiplier={1.3} style={styles.storyRepliesEmoji}>❤️</Text></View>
   <View style={{flex:1,gap:3}}><Text style={styles.storyRepliesTitle}>{t('Reações às tuas Stories')}</Text>
    <Text style={styles.storyRepliesCaption}>{t('Respostas privadas, com acesso à Story e à conversa')}</Text></View>
   <JynloIcon name="chevron-right" size={20} color={T.accent}/>
  </Pressable>:null}
  {auth.token?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir conversas de grupo')}
   onPress={()=>router.push('/groups')} style={styles.storyRepliesShortcut}>
   <View style={styles.storyRepliesSymbol}><Text maxFontSizeMultiplier={1.3} style={styles.storyRepliesEmoji}>👥</Text></View>
   <View style={{flex:1,gap:3}}><Text style={styles.storyRepliesTitle}>{t('Conversas de grupo')}</Text>
    <Text style={styles.storyRepliesCaption}>{t('Grupos privados com os teus amigos, fora das comunidades')}</Text></View>
   <JynloIcon name="chevron-right" size={20} color={T.accent}/>
  </Pressable>:null}
  {auth.token?<Pressable accessibilityRole="button" accessibilityLabel={t('Ver convites e pedidos')} onPress={()=>router.push('/communities/invites')} style={styles.invitesShortcut}><JynloIcon name="community" size={17} color={T.accent}/><Text style={styles.invitesText}>{t('Convites e pedidos')}</Text><JynloIcon name="chevron-right" size={18} color={T.muted}/></Pressable>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {chatWarning?<Message>{chatWarning}</Message>:null}
  {muteError?<Message tone="error">{muteError}</Message>:null}
  {sameIdentity&&lastSyncedAt?<Text style={styles.tiny}>{t('Última sincronização completa: {a}',{a:lastSyncedAt.toLocaleTimeString(currentLocale(),{hour:'2-digit',minute:'2-digit'})})}</Text>:null}
  {!loading&&sameIdentity&&items.length===0&&!error&&!chatWarning?<Message>{t('Não foram encontradas conversas acessíveis. As mensagens privadas exigem que a amizade esteja ativa.')}</Message>:null}
  {sameIdentity&&!loading&&items.length>0&&displayed.length===0?<Message>{t('Não foram encontradas conversas com estes filtros.')}</Message>:null}
  {displayed.length>0?<View style={styles.listHeader}><Text style={styles.listTitle}>{t('Conversas recentes')}</Text><Text style={styles.listCount}>{displayed.length}</Text></View>:null}
  {displayed.map(item=><View key={`${item.kind}-${item.id}`} style={styles.conversationRow}>
   <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${item.kind==='direct'?t('Conversa com'):item.kind==='private'?t('Grupo'):item.kind==='team'?t('Chat da equipa'):item.kind==='community'?t('Comunidade'):t('Chat da sessão')} ${item.title||item.id}, ${item.unreadCount>0?t('{n} mensagens não lidas',{n:item.unreadCount}):t('sem mensagens não lidas')}`}
    onPress={()=>item.kind==='direct'?router.push({pathname:'/messages/[peer]',params:{peer:item.id}}):
      item.kind==='private'?router.push({pathname:'/groups/[id]',params:{id:item.id,title:item.title||''}}):
      item.kind==='team'?router.push({pathname:'/teams/[id]',params:{id:item.id,tab:'CHAT'}}):
      item.kind==='community'?router.push({pathname:'/communities/[id]/chat',params:{id:item.id}}):
      router.push({pathname:'/sessions/[id]/chat',params:{id:item.id}})}
    onLongPress={muteKnown&&mutingKey===null?()=>toggleConversationMute(item):undefined} delayLongPress={350}
    accessibilityHint={t('Mantém pressionado para silenciar ou ativar os avisos')}
    style={({pressed})=>[styles.tile,styles.tileContent,item.unreadCount>0&&styles.unreadTile,pressed&&styles.pressedTile]}>
    <View style={[styles.avatar,item.kind==='community'&&styles.communityAvatar,item.kind==='session'&&styles.sessionAvatar]}>
      {resolveJynloMedia(item.imageUrl)&&!brokenAvatars[item.kind+':'+item.id]?<Image source={{uri:resolveJynloMedia(item.imageUrl)!}} style={styles.avatarPhoto}
        onError={()=>setBrokenAvatars(previous=>({...previous,[item.kind+':'+item.id]:true}))}/>:
      <JynloIcon name={item.kind==='direct'?'profile':item.kind==='community'||item.kind==='private'||item.kind==='team'?'community':'session'} size={24} color={T.accent}/>}
    </View>
    <View style={styles.conversationBody}>
      <View style={styles.conversationTop}>
       <Text style={[styles.item,item.unreadCount>0&&styles.itemUnread]} numberOfLines={1}>{item.kind==='direct'?item.id:item.title||(item.kind==='community'?t('Comunidade'):item.kind==='private'?t('Grupo'):item.kind==='team'?t('Equipa'):t('Sessão desportiva'))}</Text>
       {muteKnown&&isConversationMuted(mutes,item.kind,item.id)?<JynloIcon name="volume-off" size={14} color={T.muted}/>:null}
       {!!item.latestAt&&<Text style={[styles.tiny,item.unreadCount>0&&styles.unreadTime]}>{formatInboxTime(item.latestAt)}</Text>}
      </View>
      <Text numberOfLines={1} style={[styles.preview,item.unreadCount>0&&styles.previewUnread]}>{item.latestText?
        (item.latestSender&&item.latestSender.toLowerCase()===auth.username?.toLowerCase()?t('Tu')+': ':
         item.kind!=='direct'&&item.latestSender?item.latestSender+': ':'')+item.latestText
        :t('Abre para começar a conversa')}</Text>
    </View>
    {formatUnreadBadge(item.unreadCount)?<Text style={styles.unread}>{formatUnreadBadge(item.unreadCount)}</Text>:<Text style={styles.arrow}>›</Text>}
   </Pressable>
  </View>)}
 </Page>;
}
const T=MobileTheme.colors;
const styles=StyleSheet.create({
 storyRepliesShortcut:{flexDirection:'row',alignItems:'center',gap:11,minHeight:74,padding:12,backgroundColor:T.surface,borderColor:T.border,borderWidth:1,borderRadius:MobileTheme.radius.lg},
 storyRepliesSymbol:{width:46,height:46,borderRadius:15,backgroundColor:T.raised,alignItems:'center',justifyContent:'center'},
 storyRepliesEmoji:{fontSize:23},storyRepliesTitle:{fontSize:14,fontWeight:'900',color:T.text},
 storyRepliesCaption:{fontSize:11,lineHeight:16,color:T.muted},
 conversationRow:{flexDirection:'row',alignItems:'center',gap:8},
 tileContent:{flex:1,minWidth:0},
 muteIcon:{fontSize:19,color:T.accent},muteText:{fontSize:10,fontWeight:'800',color:T.muted},
 headerRow:{flexDirection:'row',alignItems:'flex-start',gap:12},
 headerCopy:{flex:1,gap:8},
 notificationAction:{minWidth:MobileTheme.touchTarget,minHeight:MobileTheme.touchTarget,paddingHorizontal:9,paddingVertical:8,borderRadius:MobileTheme.radius.md,alignItems:'center',justifyContent:'center',backgroundColor:T.surface,borderWidth:1,borderColor:T.border,gap:3},
 notificationCount:{fontSize:10,fontWeight:'900',color:T.accent},
 invitesShortcut:{flexDirection:'row',alignItems:'center',gap:9,alignSelf:'flex-start',paddingHorizontal:10,minHeight:44},
 invitesText:{color:T.accent,fontWeight:'700',fontSize:12},
 searchBox:{gap:8,padding:11,borderRadius:MobileTheme.radius.lg,backgroundColor:T.surface,borderWidth:1,borderColor:T.border},
 searchInput:{color:T.text,borderColor:T.border,borderWidth:1,borderRadius:MobileTheme.radius.md,paddingHorizontal:13,minHeight:MobileTheme.touchTarget,backgroundColor:T.background},
 filterRow:{flexDirection:'row',gap:7,alignItems:'center',flexWrap:'wrap'},
 kindChip:{minHeight:44,paddingHorizontal:11,justifyContent:'center',borderRadius:MobileTheme.radius.pill,borderWidth:1,borderColor:T.border,backgroundColor:T.surface},
 kindChipActive:{backgroundColor:T.accent,borderColor:T.accent},
 kindText:{fontSize:12,fontWeight:'800',color:T.muted},kindTextActive:{color:T.background},
 filterChip:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:15,paddingVertical:9,borderRadius:MobileTheme.radius.pill,borderColor:T.border,borderWidth:1},
 filterActive:{backgroundColor:T.accent,borderColor:T.accent},
 filterText:{color:T.muted,fontWeight:'800',fontSize:12},filterTextActive:{color:T.background},
 clearSearch:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:9},clearSearchText:{color:T.accent,fontWeight:'800',fontSize:12},
 title:{fontSize:28,fontWeight:'900',color:T.text},sub:{color:T.muted,fontSize:13,lineHeight:19},
 listHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 listTitle:{fontSize:17,fontWeight:'900',color:T.text},listCount:{color:T.muted,fontSize:12},
 conversationTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 tile:{borderRadius:14,paddingVertical:10,paddingHorizontal:6,flexDirection:'row',alignItems:'center',gap:12,minHeight:70},
 unreadTile:{backgroundColor:'rgba(56,224,192,.07)'},pressedTile:{opacity:.78},
 avatar:{width:52,height:52,borderRadius:26,backgroundColor:T.raised,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 avatarPhoto:{width:'100%',height:'100%'},
 communityAvatar:{backgroundColor:'#0C4650',borderRadius:16},sessionAvatar:{backgroundColor:'#15453F',borderRadius:16},
 avatarSymbol:{fontSize:21,fontWeight:'800',color:T.accent},
 conversationBody:{flex:1,gap:5},
 item:{flexShrink:1,fontWeight:'800',fontSize:15,color:T.text},itemUnread:{fontWeight:'900'},
 preview:{color:T.muted,fontSize:12,lineHeight:17},previewUnread:{color:T.text,fontWeight:'700'},
 tiny:{fontSize:12,color:T.muted},unreadTime:{color:T.accent,fontWeight:'800'},
 alert:{backgroundColor:'#27463D',borderColor:'#417060',borderWidth:1,borderRadius:MobileTheme.radius.md,padding:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 alertText:{color:T.accent,fontWeight:'800',fontSize:13},
 unread:{fontWeight:'900',color:T.background,backgroundColor:T.accent,paddingHorizontal:9,paddingVertical:5,borderRadius:MobileTheme.radius.pill,overflow:'hidden'},
 arrow:{color:T.accent,fontSize:25}
});
