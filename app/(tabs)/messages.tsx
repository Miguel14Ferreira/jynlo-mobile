import React,{useCallback,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../../src/lib/optional-notifications.cjs';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {communityInbox,directInbox} from '../../src/lib/chat-api';
import {pendingDirectCall,type DirectCallInvitation} from '../../src/lib/direct-call-api';
import {myCommunityInvites} from '../../src/lib/community-api';
import {C,MobileTheme} from '../../src/lib/theme';
import type {CommunityInvite,JynloInboxSummary} from '../../src/lib/types';
import {filterInbox,unreadInboxCount,formatInboxTime,formatUnreadBadge} from '../../src/lib/inbox-filter.cjs';
export default function MessagesScreen(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<JynloInboxSummary[]>([]);
 const [chatWarning,setChatWarning]=useState('');
 const [invites,setInvites]=useState<CommunityInvite[]>([]);
 const [incomingCall,setIncomingCall]=useState<DirectCallInvitation|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [lastSyncedAt,setLastSyncedAt]=useState<Date|null>(null);
 const [search,setSearch]=useState(''),[unreadOnly,setUnreadOnly]=useState(false);
 const identity=useRef('');
 const sameIdentity=!!auth.token&&!!auth.username&&identity.current===auth.username+'|'+auth.token;
 const displayed=useMemo(()=>sameIdentity?filterInbox(items,search,unreadOnly) as JynloInboxSummary[]:[],[items,search,unreadOnly,sameIdentity]);
 const unreadTotal=useMemo(()=>sameIdentity?unreadInboxCount(items) as number:0,[items,sameIdentity]);
 const busyVersion=useRef<number|null>(null),generation=useRef(0);
 const pendingRefresh=useRef(false);
 const load=useCallback(async(silent=false,version=generation.current)=>{
  if(busyVersion.current===version){pendingRefresh.current=true;return;}
  if(!auth.token||!auth.username){
   setItems([]);setInvites([]);setIncomingCall(null);setLastSyncedAt(null);setLoading(false);return;
  }
  busyVersion.current=version;
  if(!silent){setLoading(true);setError('');setChatWarning('');}
  try{
   const [groups,privateChats,requests,call]=await Promise.allSettled([
    communityInbox(auth.token,auth.username),directInbox(auth.token),
    myCommunityInvites(auth.token,auth.username),pendingDirectCall(auth.token)
   ]);
   if(version!==generation.current||identity.current!==auth.username+'|'+auth.token)return;
   // A failing source must not erase healthy conversations from the other source.
   setItems(previous=>[
    ...(privateChats.status==='fulfilled'?privateChats.value:previous.filter(i=>i.kind==='direct')),
    ...(groups.status==='fulfilled'?groups.value:previous.filter(i=>i.kind==='community'))
   ].sort((a,b)=>(Date.parse(b.latestAt||'')||0)-(Date.parse(a.latestAt||'')||0)));
   if(requests.status==='fulfilled')setInvites(requests.value);
   if(call.status==='fulfilled')setIncomingCall(call.value&&Number.isFinite(Date.parse(call.value.expiresAt))&&Date.parse(call.value.expiresAt)>Date.now()?call.value:null);
   else setIncomingCall(null); // Never present an unverified stale invitation as active.
   const failedSources=[
    ...(privateChats.status==='rejected'?['mensagens privadas']:[]),
    ...(groups.status==='rejected'?['comunidades']:[]),
    ...(requests.status==='rejected'?['convites']:[])
   ];
   const partial=failedSources.length>0;
   setChatWarning(partial?`Não foi possível sincronizar: ${failedSources.join(', ')}. Os dados anteriores podem estar desatualizados. Tenta atualizar novamente.`:'');
   if(!partial)setLastSyncedAt(new Date());
  }catch(e){
   if(version===generation.current&&identity.current===auth.username+'|'+auth.token){
    if(!silent)setError(e instanceof Error?e.message:'Não foi possível carregar as conversas.');
    else setChatWarning('A atualização automática falhou. Confirma a ligação e volta a atualizar.');
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
   identity.current=currentIdentity;setItems([]);setInvites([]);setIncomingCall(null);
   setLastSyncedAt(null);setChatWarning('');setError('');
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
 return <Page><Brand subtitle="A CONVERSA CONTINUA"/><DemoBanner/>
  <View style={styles.headerRow}>
   <View style={styles.headerCopy}><Eyebrow>COMUNIDADE É CONVERSA</Eyebrow><Text style={styles.title}>Mensagens</Text>
    <Text style={styles.sub}>As tuas conversas e comunidades, num só lugar.</Text>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel="Abrir notificações" onPress={()=>router.push('/notifications')} style={styles.notificationAction}><Text style={styles.notificationIcon}>♢</Text><Text style={styles.notificationLabel}>Alertas</Text></Pressable>
  </View>
  {auth.token?<View style={styles.searchBox}>
   <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar conversas…"
    placeholderTextColor={C.muted} style={styles.searchInput} autoCapitalize="none"
    accessibilityLabel="Pesquisar conversas pelo contacto ou mensagem"/>
   <View style={styles.filterRow}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mostrar todas as conversas" accessibilityState={{selected:!unreadOnly}}
      onPress={()=>setUnreadOnly(false)} style={[styles.filterChip,!unreadOnly&&styles.filterActive]}>
      <Text style={[styles.filterText,!unreadOnly&&styles.filterTextActive]}>Todas</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Mostrar apenas conversas não lidas" accessibilityState={{selected:unreadOnly}}
      onPress={()=>setUnreadOnly(true)} style={[styles.filterChip,unreadOnly&&styles.filterActive]}>
      <Text style={[styles.filterText,unreadOnly&&styles.filterTextActive]}>Não lidas · {unreadTotal}</Text>
    </Pressable>
    {!!search?<Pressable accessibilityRole="button" accessibilityLabel="Limpar pesquisa de conversas" onPress={()=>setSearch('')} style={styles.clearSearch}><Text style={styles.clearSearchText}>Limpar ×</Text></Pressable>:null}
   </View>
   <Text style={styles.tiny}>{displayed.length} de {sameIdentity?items.length:0} conversas</Text>
  </View>:null}
  {!auth.token?<Button title="Entrar para ver mensagens" onPress={()=>router.push('/login')}/>:null}
  {sameIdentity&&incomingCall?<Pressable accessibilityRole="button"
    accessibilityLabel={'Atender chamada de '+incomingCall.caller}
    onPress={()=>router.push({pathname:'/messages/call',params:{peer:incomingCall.caller}})}
    style={styles.alert}>
    <View style={{flex:1,gap:4}}>
     <Text style={styles.alertText}>Chamada {incomingCall.media==='video'?'de vídeo':'de voz'} de {incomingCall.caller}</Text>
     <Text style={styles.tiny}>Abrir chamada para aceitar ou recusar</Text>
    </View><Text style={styles.arrow}>›</Text>
   </Pressable>:null}
  {sameIdentity&&invites.length>0?<Pressable onPress={()=>router.push('/communities/invites')} style={styles.alert}>
    <Text style={styles.alertText}>✉  Tens {invites.length} convite(s) para comunidades</Text><Text style={styles.arrow}>›</Text>
  </Pressable>:null}
  {auth.token?<Button secondary title="Ver convites e pedidos" onPress={()=>router.push('/communities/invites')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {chatWarning?<Message>{chatWarning}</Message>:null}
  {sameIdentity&&lastSyncedAt?<Text style={styles.tiny}>Última sincronização completa: {lastSyncedAt.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</Text>:null}
  {auth.token?<Button secondary title="Atualizar conversas" disabled={loading} onPress={()=>{void load(false);}}/>:null}
  {!loading&&sameIdentity&&items.length===0&&!error&&!chatWarning?<Message>Não foram encontradas conversas acessíveis. As mensagens privadas exigem que a amizade esteja ativa.</Message>:null}
  {sameIdentity&&!loading&&items.length>0&&displayed.length===0?<Message>Não foram encontradas conversas com estes filtros.</Message>:null}
  {displayed.length>0?<View style={styles.listHeader}><Text style={styles.listTitle}>Conversas recentes</Text><Text style={styles.listCount}>{displayed.length}</Text></View>:null}
  {displayed.map(item=><Pressable key={`${item.kind}-${item.id}`}
    accessibilityRole="button"
    accessibilityLabel={`${item.kind==='direct'?'Conversa com':item.kind==='community'?'Comunidade':'Chat da sessão'} ${item.id}, ${item.unreadCount>0?`${item.unreadCount} mensagens não lidas`:'sem mensagens não lidas'}`}
    onPress={()=>item.kind==='direct'?router.push({pathname:'/messages/[peer]',params:{peer:item.id}}):
      item.kind==='community'?router.push({pathname:'/communities/[id]/chat',params:{id:item.id}}):
      router.push({pathname:'/sessions/[id]/chat',params:{id:item.id}})}
    style={({pressed})=>[styles.tile,item.unreadCount>0&&styles.unreadTile,pressed&&styles.pressedTile]}>
    <View style={[styles.avatar,item.kind==='community'&&styles.communityAvatar,item.kind==='session'&&styles.sessionAvatar]}>
      <Text style={styles.avatarSymbol}>{item.kind==='direct'?'◉':item.kind==='community'?'◎':'▣'}</Text>
    </View>
    <View style={styles.conversationBody}>
      <View style={styles.conversationTop}>
       <Text style={[styles.item,item.unreadCount>0&&styles.itemUnread]} numberOfLines={1}>{item.kind==='direct'?item.id:item.kind==='community'?'Comunidade #'+item.id:'Sessão #'+item.id}</Text>
       {!!item.latestAt&&<Text style={[styles.tiny,item.unreadCount>0&&styles.unreadTime]}>{formatInboxTime(item.latestAt)}</Text>}
      </View>
      <Text numberOfLines={1} style={[styles.preview,item.unreadCount>0&&styles.previewUnread]}>{item.latestText||'Abre para começar a conversa'}</Text>
      {!!item.latestSender&&<Text numberOfLines={1} style={styles.tiny}>{item.latestSender}</Text>}
    </View>
    {formatUnreadBadge(item.unreadCount)?<Text style={styles.unread}>{formatUnreadBadge(item.unreadCount)}</Text>:<Text style={styles.arrow}>›</Text>}
  </Pressable>)}
  <Message>Conversas e contadores de não lidas atualizados automaticamente enquanto esta página está aberta. O chat da comunidade usa ligação em tempo real, com sincronização de reserva quando está offline; as conversas privadas usam atualização periódica. Podes consultar e ativar os avisos push, quando disponíveis nesta APK, em Alertas.</Message>
 </Page>;
}
const T=MobileTheme.colors;
const styles=StyleSheet.create({
 headerRow:{flexDirection:'row',alignItems:'flex-start',gap:12},
 headerCopy:{flex:1,gap:8},
 notificationAction:{minWidth:MobileTheme.touchTarget,minHeight:MobileTheme.touchTarget,paddingHorizontal:9,paddingVertical:8,borderRadius:MobileTheme.radius.md,alignItems:'center',justifyContent:'center',backgroundColor:T.surface,borderWidth:1,borderColor:T.border,gap:3},
 notificationIcon:{fontSize:21,color:T.accent},notificationLabel:{fontSize:10,fontWeight:'800',color:T.muted},
 searchBox:{gap:11,padding:14,borderRadius:MobileTheme.radius.lg,backgroundColor:T.surface,borderWidth:1,borderColor:T.border},
 searchInput:{color:T.text,borderColor:T.border,borderWidth:1,borderRadius:MobileTheme.radius.md,paddingHorizontal:13,minHeight:MobileTheme.touchTarget,backgroundColor:T.background},
 filterRow:{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'},
 filterChip:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:15,paddingVertical:9,borderRadius:MobileTheme.radius.pill,borderColor:T.border,borderWidth:1},
 filterActive:{backgroundColor:T.accent,borderColor:T.accent},
 filterText:{color:T.muted,fontWeight:'800',fontSize:12},filterTextActive:{color:T.background},
 clearSearch:{minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:9},clearSearchText:{color:T.accent,fontWeight:'800',fontSize:12},
 title:{fontSize:28,fontWeight:'900',color:T.text},sub:{color:T.muted,fontSize:13,lineHeight:19},
 listHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 listTitle:{fontSize:17,fontWeight:'900',color:T.text},listCount:{color:T.muted,fontSize:12},
 conversationTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 tile:{borderRadius:MobileTheme.radius.lg,borderWidth:1,borderColor:T.border,backgroundColor:T.surface,padding:13,flexDirection:'row',alignItems:'center',gap:12,minHeight:82},
 unreadTile:{borderColor:T.accent,backgroundColor:T.raised},pressedTile:{opacity:.78},
 avatar:{width:52,height:52,borderRadius:17,backgroundColor:T.raised,alignItems:'center',justifyContent:'center'},
 communityAvatar:{backgroundColor:'#0C4650'},sessionAvatar:{backgroundColor:'#15453F'},
 avatarSymbol:{fontSize:25,fontWeight:'800',color:T.accent},
 conversationBody:{flex:1,gap:5},
 item:{flexShrink:1,fontWeight:'800',fontSize:15,color:T.text},itemUnread:{fontWeight:'900'},
 preview:{color:T.muted,fontSize:12,lineHeight:17},previewUnread:{color:T.text,fontWeight:'700'},
 tiny:{fontSize:11,color:T.muted},unreadTime:{color:T.accent,fontWeight:'800'},
 alert:{backgroundColor:'#27463D',borderColor:'#417060',borderWidth:1,borderRadius:MobileTheme.radius.md,padding:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 alertText:{color:T.accent,fontWeight:'800',fontSize:13},
 unread:{fontWeight:'900',color:T.background,backgroundColor:T.accent,paddingHorizontal:9,paddingVertical:5,borderRadius:MobileTheme.radius.pill,overflow:'hidden'},
 arrow:{color:T.accent,fontSize:25}
});
