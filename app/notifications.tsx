import React,{useCallback,useEffect,useRef,useState} from 'react';
import {isServerNotificationText} from '../src/lib/server-notification-texts.cjs';
import {currentLocale,t} from '../src/lib/i18n';
import {Alert,Animated,AppState,Modal,PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../src/lib/optional-notifications.cjs';
import {Stack,useFocusEffect,useIsFocused,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,DemoBanner,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {answerSessionInvite,pendingSessionInvites} from '../src/lib/api';
import {myNotifications,markNotificationRead,deleteMyNotification,deleteAllMyNotifications} from '../src/lib/notifications-api';
import {myCommunityInvites} from '../src/lib/community-api';
import {C} from '../src/lib/theme';
import {confirmedSessionJoin} from '../src/lib/session-join-receipt.cjs';
import type {JynloNotification,PendingSessionInvite,CommunityInvite} from '../src/lib/types';
import {notificationDestination} from '../src/lib/notification-route.cjs';
import {androidPushConfigured,disableMobilePush,enableMobilePush,pushRegistrationStatus} from '../src/lib/mobile-push';
import {pushDeliveryReady} from '../src/lib/push-device-api';
import {sportName} from '../src/lib/sport-names.cjs';
import {JynloIcon,type JynloIconName} from '../src/components/JynloIcon';
import {buildSections,notificationKind,shortTime,type NotificationKind,type NotificationRow} from '../src/lib/notification-center.cjs';

export default function NotificationsScreen(){
 const auth=useAuth(),router=useRouter(),isFocused=useIsFocused();
 const {notificationId}=useLocalSearchParams<{notificationId?:string}>();
 const lastPushHandled=useRef<string|null>(null);
 const [items,setItems]=useState<JynloNotification[]>([]),[invites,setInvites]=useState<PendingSessionInvite[]>([]);
 const [communityInvites,setCommunityInvites]=useState<CommunityInvite[]>([]);
 const [loading,setLoading]=useState(true),[historyReady,setHistoryReady]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busyInvite,setBusyInvite]=useState<number|null>(null);
 const [unreadOnly,setUnreadOnly]=useState(false),[notificationBusy,setNotificationBusy]=useState(false);
 const notificationLock=useRef(false),notificationRevision=useRef(0);
 const [pushEnabled,setPushEnabled]=useState(false),[pushBusy,setPushBusy]=useState(false);
 const [deliveryReady,setDeliveryReady]=useState<boolean|null>(null);
 const [menuOpen,setMenuOpen]=useState(false),[showPush,setShowPush]=useState(false);
 const [rowMenu,setRowMenu]=useState<NotificationRow<JynloNotification>|null>(null),[swiped,setSwiped]=useState<string|null>(null);
 const pushBusyRef=useRef(false);
 const [pushError,setPushError]=useState('');
 const inFlight=useRef<number|null>(null),generation=useRef(0),account=useRef('');
 const pendingRefresh=useRef(false);
 const statusRequest=useRef(0);
 const pushOperation=useRef(0),inviteOperation=useRef(0);
 const inviteDecisionInFlight=useRef<number|null>(null);
 // Gate private content during render, before the focus effect has time to
 // clear state left by a different signed-in account.
 const sameAccount=Boolean(auth.token&&auth.username&&account.current===auth.username+'|'+auth.token);
 const visibleItems=sameAccount?items:[];
 const unreadCount=visibleItems.filter(item=>!item.read).length;
 const filteredItems=unreadOnly?visibleItems.filter(item=>!item.read):visibleItems;
 const visibleInvites=sameAccount?invites:[];
 const visibleCommunityInvites=sameAccount?communityInvites:[];
 const load=useCallback(async(silent=false,version=generation.current)=>{
  if(inFlight.current===version){pendingRefresh.current=true;return;}
  if(!auth.token||!auth.username){
   setHistoryReady(false);setLoading(false);setItems([]);setInvites([]);setCommunityInvites([]);return;
  }
  inFlight.current=version;
  const initialNotificationRevision=notificationRevision.current;
  if(!silent){setLoading(true);setError('');}
  try{
   const [notifs,invitations,communityInvitations]=await Promise.allSettled([
    myNotifications(auth.token,auth.username),
    pendingSessionInvites(auth.token,auth.username),
    myCommunityInvites(auth.token,auth.username)
   ]);
   if(version!==generation.current||account.current!==auth.username+'|'+auth.token)return;
   // An older GET must never undo a newly confirmed delete or read mutation.
   if(notifs.status==='fulfilled'&&notificationRevision.current===initialNotificationRevision&&!notificationLock.current){
    setItems(notifs.value.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)));
    setHistoryReady(true);
   }
   if(notifs.status==='rejected')setHistoryReady(false);
   if(invitations.status==='fulfilled')setInvites(invitations.value);
   if(communityInvitations.status==='fulfilled')setCommunityInvites(communityInvitations.value);
   if(notifs.status==='rejected'||invitations.status==='rejected'||communityInvitations.status==='rejected'){
    if(!silent)setError(t('Não foi possível atualizar todas as notificações. A informação anterior foi preservada.'));
   }else if(!silent)setError('');
  }finally{
   if(inFlight.current===version)inFlight.current=null;
   if(version===generation.current&&account.current===auth.username+'|'+auth.token){
    if(!silent)setLoading(false);
    if(pendingRefresh.current){
     pendingRefresh.current=false;
     void load(true,version);
    }
   }
  }
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const identity=auth.username+'|'+auth.token;
  if(identity!==account.current){
   account.current=identity;setItems([]);setInvites([]);setCommunityInvites([]);
   // Invalidate in-flight mutations started by the previous account.
   pushOperation.current++;inviteOperation.current++;notificationRevision.current++;
   pushBusyRef.current=false;notificationLock.current=false;setNotificationBusy(false);setUnreadOnly(false);
   inviteDecisionInFlight.current=null;
   // An old request finishing after account change cannot clear the new account's lock.
   // The in-flight native enrollment is cancelled by auth logout/expiry.
   setPushBusy(false);setBusyInvite(null);setNotice('');
  }
  const version=++generation.current;
  pendingRefresh.current=false;
  setHistoryReady(false);
  setPushEnabled(false);setPushError('');setDeliveryReady(null);
  const requestId=++statusRequest.current;
  if(auth.username&&auth.token){
   void pushRegistrationStatus(auth.username,auth.token).then(value=>{
    if(generation.current===version&&statusRequest.current===requestId)setPushEnabled(value);
   }).catch(()=>{});
   // A registered token does not prove that server push delivery is enabled.
   void pushDeliveryReady(auth.token).then(value=>{
    if(generation.current===version&&statusRequest.current===requestId)setDeliveryReady(value);
   }).catch(()=>{if(generation.current===version&&statusRequest.current===requestId)setDeliveryReady(null);});
  }
  void load(false,version);
  const timer=setInterval(()=>{void load(true,version);},20000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&generation.current===version)void load(true,version);
  });
  let received:ReturnType<typeof NotificationTypes.addNotificationReceivedListener>|null=null;
  try{
   const Notifications=getNativeNotifications() as typeof NotificationTypes|null;
   if(Notifications)received=Notifications.addNotificationReceivedListener(notification=>{
    const payload=notification.request?.content?.data;
    // The backend sends only this notification kind; never navigate on receipt.
    if(payload?.kind!=='notification'||generation.current!==version)return;
    if(!auth.token||!auth.username)return;
    void load(true,version);
   });
  }catch{
   // The inbox still refreshes on focus, resume and polling without native push.
  }
  return ()=>{
   clearInterval(timer);
   try{received?.remove();}catch{}
   resume.remove();pendingRefresh.current=false;
   generation.current++;statusRequest.current++;
  };
 },[load,auth.username,auth.token]));
 async function verifyPushStatus(){
  if(!sameAccount||!auth.token||!auth.username||pushBusyRef.current)return;
  pushBusyRef.current=true;
  const identity=auth.username+'|'+auth.token,revision=++statusRequest.current;
  setPushBusy(true);setPushError('');
  try{
   const [registration,delivery]=await Promise.allSettled([
    pushRegistrationStatus(auth.username,auth.token),pushDeliveryReady(auth.token)
   ]);
   if(account.current!==identity||statusRequest.current!==revision)return;
   if(registration.status==='fulfilled')setPushEnabled(registration.value);
   else setPushError(t('Não foi possível confirmar o registo deste dispositivo.'));
   if(delivery.status==='fulfilled')setDeliveryReady(delivery.value);
   else setDeliveryReady(null);
  }finally{
   if(account.current===identity&&statusRequest.current===revision){
    pushBusyRef.current=false;setPushBusy(false);
   }
  }
 }
 async function togglePush(){
  if(!sameAccount||!auth.username||!auth.token||pushBusyRef.current)return;
  // Ignore an older status lookup while an explicit user choice is processing.
  pushBusyRef.current=true;
  statusRequest.current++;
  const identity=auth.username+'|'+auth.token;
  const operation=++pushOperation.current;
  setPushBusy(true);setPushError('');
  try{
   if(pushEnabled){
    await disableMobilePush(auth.username,auth.token);
    if(account.current===identity&&pushOperation.current===operation)setPushEnabled(false);
   }else{
    await enableMobilePush(auth.username,auth.token);
    if(account.current===identity&&pushOperation.current===operation)setPushEnabled(true);
   }
   // Registration and provider readiness are separate; neither proves delivery.
   if(account.current===identity&&pushOperation.current===operation){
    const request=++statusRequest.current;
    try{
     const ready=await pushDeliveryReady(auth.token);
     if(account.current===identity&&pushOperation.current===operation&&statusRequest.current===request)
      setDeliveryReady(ready);
    }catch{
     if(account.current===identity&&pushOperation.current===operation&&statusRequest.current===request)
      setDeliveryReady(null);
    }
   }
  }catch(e){if(account.current===identity&&pushOperation.current===operation)
   setPushError(e instanceof Error?e.message:t('Não foi possível atualizar as notificações push.'));}
  finally{
   // Completion from the previous account must not unlock a new push operation.
   if(account.current===identity&&pushOperation.current===operation){
    pushBusyRef.current=false;
    setPushBusy(false);
   }
  }
 }
 async function decide(invite:PendingSessionInvite,accept:boolean){
  if(!sameAccount||!auth.token||inviteDecisionInFlight.current!==null)return;
  const initialIdentity=auth.username+'|'+auth.token;
  const operation=++inviteOperation.current;
  // Synchronous lock: a second tap before React renders must not repeat the POST.
  inviteDecisionInFlight.current=operation;
  setBusyInvite(invite.id);setError('');setNotice('');
  try{
   const response=await answerSessionInvite(invite.sessionId,invite.id,accept,auth.token,auth.username||undefined);
   if(account.current!==initialIdentity||inviteOperation.current!==operation)return;
   const confirmed=accept?confirmedSessionJoin(response):null;
   if(accept&&!confirmed)
    throw Error(t('A aceitação ainda não foi confirmada. Atualiza a lista de convites antes de repetir.'));
   // Rejecting is a confirmed HTTP 204; accepting requires a validated state.
   setInvites(old=>old.filter(x=>x.id!==invite.id));
   setNotice(!accept?t('Convite recusado.'):
    confirmed?.state==='WAITLISTED'?(t('Convite aceite: {v}',{v:confirmed.message})):
    t('Convite aceite: presença confirmada pelo servidor.'));
  }catch(e){if(account.current===initialIdentity&&inviteOperation.current===operation)
   setError((e instanceof Error?e.message:t('Não foi possível responder ao convite.'))+' '+t('Atualiza antes de repetir.'));}
  finally{
   if(inviteDecisionInFlight.current===operation)inviteDecisionInFlight.current=null;
   if(account.current===initialIdentity&&inviteOperation.current===operation)setBusyInvite(null);
  }
 }
 async function markAllRead(){
  if(!sameAccount||!auth.token||!auth.username||notificationLock.current||!historyReady)return;
  const identity=auth.username+'|'+auth.token,revision=++notificationRevision.current;
  const unread=items.filter(item=>!item.read&&Number.isSafeInteger(item.id)&&item.id>0);
  if(!unread.length)return;
  notificationLock.current=true;setNotificationBusy(true);setError('');setNotice('');
  let confirmed=0;
  try{
   // No bulk-read backend endpoint: write sequentially and only acknowledge server-confirmed IDs.
   for(const item of unread){
    if(account.current!==identity||notificationRevision.current!==revision)break;
    await markNotificationRead(item.id,auth.token);
    if(account.current!==identity||notificationRevision.current!==revision)break;
    confirmed++;
    setItems(old=>old.map(n=>n.id===item.id?{...n,read:true}:n));
   }
   if(account.current===identity&&notificationRevision.current===revision)
    setNotice(confirmed===unread.length?t('Notificações marcadas como lidas.'):
     t('Algumas notificações foram atualizadas. Confirma as restantes.'));
  }catch{
   if(account.current===identity&&notificationRevision.current===revision)
    setError(t('Algumas notificações podem ter sido marcadas como lidas. Atualiza antes de repetir.'));
  }finally{
   if(notificationRevision.current===revision){notificationLock.current=false;setNotificationBusy(false);}
  }
 }
 async function removeOne(item:JynloNotification){
  if(!sameAccount||!auth.token||!auth.username||notificationLock.current)return;
  const identity=auth.username+'|'+auth.token,revision=++notificationRevision.current;
  notificationLock.current=true;setNotificationBusy(true);setError('');setNotice('');
  try{
   await deleteMyNotification(item.id,auth.token);
   if(account.current===identity&&notificationRevision.current===revision){
    setItems(old=>old.filter(n=>n.id!==item.id));setNotice(t('Notificação eliminada.'));
   }
  }catch{
   if(account.current===identity&&notificationRevision.current===revision)
    setError(t('Não foi possível confirmar a eliminação. Atualiza antes de repetir.'));
  }finally{
   if(notificationRevision.current===revision){notificationLock.current=false;setNotificationBusy(false);}
  }
 }
 async function removeAll(){
  if(!sameAccount||!auth.token||!auth.username||notificationLock.current)return;
  const identity=auth.username+'|'+auth.token,revision=++notificationRevision.current;
  notificationLock.current=true;setNotificationBusy(true);setError('');setNotice('');
  try{
   await deleteAllMyNotifications(auth.token);
   if(account.current===identity&&notificationRevision.current===revision){
    setItems([]);setNotice(t('Notificações eliminadas.'));
   }
  }catch{
   if(account.current===identity&&notificationRevision.current===revision)
    setError(t('Não foi possível confirmar a eliminação. Atualiza antes de repetir.'));
  }finally{
   if(notificationRevision.current===revision){notificationLock.current=false;setNotificationBusy(false);}
  }
 }
 function open(item:JynloNotification):boolean{
  if(!sameAccount||!auth.token||!auth.username)return false;
  const initialIdentity=auth.username+'|'+auth.token;
  const originalToken=auth.token;
  const destination=notificationDestination(item);
  if(!destination){setNotice(t('Esta notificação não tem um destino disponível.'));return false;}
  try{
   // Navigation must never wait for a slow PUT /read. Use only routes derived
   // from a verified notification in this authenticated account's inbox.
   switch(destination.kind){
    case 'invites':router.push('/communities/invites');break;
    case 'messages':router.push('/(tabs)/messages');break;
    case 'venue-bookings':router.push('/venue-bookings');break;
    case 'community':router.push({pathname:'/communities/[id]',params:{id:destination.id!}});break;
    case 'tournament':router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:destination.communityId!,id:destination.id!}});break;
    case 'session':router.push({pathname:'/sessions/[id]',params:{id:destination.id!}});break;
    case 'community-chat':router.push({pathname:'/communities/[id]/chat',params:{id:destination.id!}});break;
    case 'session-chat':router.push({pathname:'/sessions/[id]/chat',params:{id:destination.id!}});break;
    case 'group-chat':router.push({pathname:'/groups/[id]',params:{id:destination.id!}});break;
    case 'team-chat':router.push({pathname:'/teams/[id]',params:{id:destination.id!,tab:'CHAT'}});break;
    case 'direct-chat':router.push({pathname:'/messages/[peer]',params:{peer:destination.peer!}});break;
    case 'message-requests':router.push('/messages/requests');break;
    case 'social-profile':router.push({pathname:'/social/[username]',params:{username:destination.peer!}});break;
    case 'social-post':router.push({pathname:'/posts/[postId]',params:{postId:destination.id!}});break;
    case 'social-story':router.push({pathname:'/',params:{storyId:destination.id!}});break;
    case 'story-replies':router.push('/stories/replies');break;
   }
  }catch{
   if(account.current===initialIdentity)setError(t('Não foi possível abrir esta notificação. Tenta novamente.'));
   return false;
  }
  if(!item.read){
   void markNotificationRead(item.id,originalToken).then(()=>{
    if(account.current!==initialIdentity)return;
    // Invalidate a polling response that started before the confirmed PUT.
    notificationRevision.current++;
    setItems(old=>old.map(n=>n.id===item.id?{...n,read:true}:n));
   }).catch(()=>{
    if(account.current===initialIdentity)setError(t('Não foi possível marcar a notificação como lida.'));
   });
  }
  return true;
 }
 useEffect(()=>{
  if(!isFocused||!auth.token||!auth.username||loading||!historyReady)return;
  if(account.current!==auth.username+'|'+auth.token)return;
  // Push data is untrusted. Resolve the ID only against this account's API history.
  if(typeof notificationId!=='string'||!/^[1-9][0-9]{0,15}$/.test(notificationId))return;
  const key=auth.username+'|'+auth.token+'|'+notificationId;
  if(lastPushHandled.current===key)return;
  const target=items.find(item=>String(item.id)===notificationId);
  if(!target){
   // A newly committed notification may not be visible in the first API reply.
   // Keep the ID so the next successful refresh can resolve it.
   setNotice(t('A confirmar a notificação no servidor. Podes atualizar a lista.'));
   return;
  }
  // An unresolved route remains retryable; do not consume the incoming tap.
  if(open(target)){
   lastPushHandled.current=key;
   try{router.setParams({notificationId:''});}catch{/* Navigation already succeeded. */}
  }
 },[isFocused,auth.token,auth.username,notificationId,loading,historyReady,items,router]);
 const sections=buildSections(filteredItems);
 const isUnread=(row:NotificationRow<JynloNotification>)=>row.items.some(n=>!n.read);
 async function markRowRead(row:NotificationRow<JynloNotification>){
  if(!sameAccount||!auth.token)return;
  const identity=auth.username+'|'+auth.token;
  for(const n of row.items.filter(x=>!x.read)){
   try{await markNotificationRead(n.id,auth.token);}catch{setError(t('Não foi possível marcar a notificação como lida.'));return;}
   if(account.current!==identity)return;
   notificationRevision.current++;
   setItems(old=>old.map(x=>x.id===n.id?{...x,read:true}:x));
  }
 }
 async function removeRow(row:NotificationRow<JynloNotification>){
  setSwiped(null);setRowMenu(null);
  for(const n of row.items)await removeOne(n);
 }
 function openRow(row:NotificationRow<JynloNotification>){
  if(open(row.lead)&&row.items.length>1)void markRowRead({...row,items:row.items.filter(n=>n.id!==row.lead.id)});
 }
 const menuItems:[string,()=>void,boolean?][]=[
  ...(unreadCount>0?[[notificationBusy?t('A atualizar…'):t('Marcar todas como lidas'),()=>{void markAllRead();}] as [string,()=>void]]:[]),
  [t('Definições de notificações'),()=>router.push('/notification-settings')],
  [t('Respostas privadas às minhas Stories'),()=>router.push('/stories/replies')],
  [showPush?t('Esconder notificações no telemóvel'):t('Notificações no telemóvel'),()=>setShowPush(v=>!v)],
  ...(visibleItems.length>0?[[t('Eliminar todas…'),()=>Alert.alert(t('Eliminar as {n} notificações?',{n:visibleItems.length}),t('Não é possível desfazer. Os convites pendentes continuam disponíveis nas comunidades e nos jogos.'),[{text:t('Cancelar'),style:'cancel'},{text:t('Eliminar todas'),style:'destructive',onPress:()=>void removeAll()}]),true] as [string,()=>void,boolean]]:[]),
 ];
 return <Page><DemoBanner/>
  <Stack.Screen options={{headerRight:sameAccount?()=><Pressable accessibilityRole="button" accessibilityLabel={t('Mais ações')} hitSlop={8}
    onPress={()=>setMenuOpen(true)} style={styles.headerButton}><JynloIcon name="more" size={24} color={C.white}/></Pressable>:undefined}}/>
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/notifications'}})}/>:null}
  {sameAccount&&error?<Message tone="error">{error}</Message>:null}
  {sameAccount&&notice?<Message>{notice}</Message>:null}
  {sameAccount&&(visibleCommunityInvites.length>0||visibleInvites.length>0)?<View style={styles.invites}>
   {visibleCommunityInvites.slice(0,3).map(invite=><Pressable key={'c'+invite.id} accessibilityRole="button" onPress={()=>router.push('/communities/invites')} style={styles.inviteRow}>
    <View style={[styles.icon,{backgroundColor:TONES.invite.bg}]}><JynloIcon name="community" size={20} color={TONES.invite.fg}/></View>
    <View style={{flex:1,minWidth:0}}><Text style={styles.rowTitle} numberOfLines={1}>{invite.communityName}</Text>
     <Text style={styles.preview} numberOfLines={1}>{t('Convidado por @{a}',{a:invite.invitedByUsername})}</Text></View>
    <Text style={styles.inviteCta}>{t('Responder')}</Text>
   </Pressable>)}
   {visibleInvites.map(invite=><View key={'s'+invite.id} style={styles.inviteRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Ver detalhes do jogo')} style={{flexDirection:'row',gap:12,flex:1,minWidth:0}} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(invite.sessionId)}})}>
     <View style={[styles.icon,{backgroundColor:TONES.invite.bg}]}><JynloIcon name="calendar" size={20} color={TONES.invite.fg}/></View>
     <View style={{flex:1,minWidth:0}}><Text style={styles.rowTitle} numberOfLines={1}>{sportName(invite.sport)||t('Jogo')} · {invite.city||t('Local a confirmar')}</Text>
      <Text style={styles.preview} numberOfLines={1}>{t('Convidado por @{a}',{a:invite.inviterUsername})}{invite.gameDate?' · '+new Date(invite.gameDate).toLocaleString(currentLocale(),{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}</Text></View>
    </Pressable>
    <View style={{flexDirection:'row',gap:6}}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Aceitar')} disabled={busyInvite!==null} onPress={()=>{void decide(invite,true);}} style={[styles.pill,styles.pillOn]}>
      <Text style={styles.pillOnText}>{busyInvite===invite.id?'…':t('Aceitar')}</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Recusar')} disabled={busyInvite!==null} onPress={()=>{void decide(invite,false);}} style={styles.pill}>
      <Text style={styles.pillText}>{t('Recusar')}</Text></Pressable>
    </View>
   </View>)}
   {visibleCommunityInvites.length>3?<Pressable accessibilityRole="button" onPress={()=>router.push('/communities/invites')}><Text style={styles.more}>{t('Ver todos os convites de comunidades')}</Text></Pressable>:null}
  </View>:null}
  {sameAccount?<View style={styles.filters} accessibilityRole="tablist">
   <Pressable accessibilityRole="tab" accessibilityState={{selected:!unreadOnly}} onPress={()=>setUnreadOnly(false)} style={[styles.filter,!unreadOnly&&styles.filterOn]}>
    <Text style={[styles.filterText,!unreadOnly&&styles.filterTextOn]}>{t('Todas')} {visibleItems.length}</Text></Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:unreadOnly}} onPress={()=>setUnreadOnly(true)} style={[styles.filter,unreadOnly&&styles.filterOn]}>
    <Text style={[styles.filterText,unreadOnly&&styles.filterTextOn]}>{t('Não lidas')}</Text>
    {unreadCount>0?<Text style={styles.count}>{unreadCount}</Text>:null}</Pressable>
  </View>:null}
  {loading&&!visibleItems.length?<Loader/>:null}
  {sameAccount&&!loading&&filteredItems.length===0?<View style={styles.empty}>
   <JynloIcon name="notifications" size={34} color={C.muted}/>
   <Text style={styles.emptyText}>{unreadOnly?t('Não tens notificações por ler.'):t('Ainda não tens notificações.')}</Text>
  </View>:null}
  {sameAccount?<View style={styles.list}>{sections.map(section=><View key={section.id}>
   <Text style={styles.section}>{section.id==='today'?t('HOJE'):section.id==='yesterday'?t('ONTEM'):t('ANTERIORES')}</Text>
   {section.rows.map(row=>{
    const n=row.lead,kind=notificationKind(n.type),tone=TONES[kind],unread=isUnread(row);
    const subject=isServerNotificationText(n.subject)?t(n.subject):(n.subject||'Jynlo');
    const title=row.items.length>1&&kind==='chat'?t('{n} mensagens · {who}',{n:row.items.length,who:subject})
     :row.items.length>1?t('{who} e mais {n}',{who:subject,n:row.items.length-1}):subject;
    return <SwipeToDelete key={row.key} open={swiped===row.key} onOpen={()=>setSwiped(row.key)} onClose={()=>setSwiped(s=>s===row.key?null:s)}
      onDelete={()=>{void removeRow(row);}} label={t('Eliminar')}>
     <Pressable accessibilityRole="button" accessibilityLabel={(unread?t('Não lida')+': ':'')+title} accessibilityHint={t('Toque longo para mais opções')}
      disabled={notificationBusy} onPress={()=>{if(swiped===row.key)setSwiped(null);else openRow(row);}} onLongPress={()=>setRowMenu(row)}
      style={[styles.row,unread&&styles.rowUnread]}>
      <View style={[styles.icon,{backgroundColor:tone.bg}]}><JynloIcon name={tone.icon} size={20} color={tone.fg}/></View>
      <View style={{flex:1,minWidth:0}}>
       <View style={styles.rowTop}>
        <Text style={[styles.rowTitle,!unread&&styles.rowTitleRead]} numberOfLines={1}>{title}</Text>
        <Text style={styles.time}>{shortTime(n.createdAt,t,currentLocale())}</Text>
       </View>
       <Text style={[styles.preview,unread&&styles.previewUnread]} numberOfLines={2}>{isServerNotificationText(n.message)?t(n.message):n.message}</Text>
      </View>
      {unread?<View style={styles.dot} accessibilityElementsHidden/>:null}
     </Pressable>
    </SwipeToDelete>;
   })}
  </View>)}</View>:null}
  {sameAccount&&showPush?<View style={styles.pushPanel}>
   <Text style={styles.heading}>{t('Notificações no telemóvel')}</Text>
   <Text style={styles.note}>{androidPushConfigured()?pushEnabled?t('Este dispositivo está registado para notificações push. O registo não garante que os avisos sejam entregues.'):t('Podes ativar os avisos neste dispositivo. A entrega exige o serviço de envio operacional.'):t('As notificações dentro da aplicação continuam disponíveis. Para avisos com a aplicação fechada é necessária uma APK com Firebase configurado.')}</Text>
   {deliveryReady===false?<Message tone="error">{t('O envio push ainda não está ativo no servidor. Os avisos continuam disponíveis dentro da Jynlo, mas não serão enviados para o telemóvel.')}</Message>:null}
   {androidPushConfigured()?<Button title={pushBusy?t('A atualizar…'):pushEnabled?t('Desativar neste dispositivo'):t('Ativar notificações neste dispositivo')} disabled={pushBusy||(!pushEnabled&&deliveryReady===false)} onPress={()=>{void togglePush();}}/>:<Message>{t('As notificações dentro da app já funcionam. Os avisos com a app fechada chegam numa próxima versão.')}</Message>}
   <Button secondary title={pushBusy?t('A verificar…'):t('Verificar registo e serviço de envio')} disabled={pushBusy} onPress={()=>{void verifyPushStatus();}}/>
   {pushEnabled&&deliveryReady===true?<Text style={styles.note}>{t('Dispositivo registado e servidor preparado para enviar. A entrega deve ser confirmada com uma notificação real.')}</Text>:null}
   {pushError?<Message tone="error">{pushError}</Message>:null}
  </View>:null}
  <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={()=>setMenuOpen(false)}>
   <Pressable style={styles.backdrop} accessibilityLabel={t('Fechar menu')} onPress={()=>setMenuOpen(false)}>
    <View style={styles.menu}>
     {menuItems.map(([label,action,danger],i)=><Pressable key={label} accessibilityRole="menuitem" onPress={()=>{setMenuOpen(false);action();}}
      style={[styles.menuItem,i>0&&styles.menuDivider]}><Text style={[styles.menuText,danger&&styles.menuDanger]}>{label}</Text></Pressable>)}
    </View>
   </Pressable>
  </Modal>
  <Modal visible={!!rowMenu} transparent animationType="fade" onRequestClose={()=>setRowMenu(null)}>
   <Pressable style={[styles.backdrop,{justifyContent:'flex-end'}]} accessibilityLabel={t('Fechar menu')} onPress={()=>setRowMenu(null)}>
    <View style={styles.sheet}>
     {rowMenu&&isUnread(rowMenu)?<Pressable accessibilityRole="menuitem" onPress={()=>{const r=rowMenu;setRowMenu(null);void markRowRead(r);}} style={styles.menuItem}>
      <Text style={styles.menuText}>{t('Marcar como lida')}</Text></Pressable>:null}
     {rowMenu?<Pressable accessibilityRole="menuitem" onPress={()=>{const r=rowMenu;setRowMenu(null);openRow(r);}} style={[styles.menuItem,styles.menuDivider]}>
      <Text style={styles.menuText}>{t('Abrir')}</Text></Pressable>:null}
     {rowMenu?<Pressable accessibilityRole="menuitem" onPress={()=>{const r=rowMenu;void removeRow(r);}} style={[styles.menuItem,styles.menuDivider]}>
      <Text style={[styles.menuText,styles.menuDanger]}>{t('Eliminar')}</Text></Pressable>:null}
     <Pressable accessibilityRole="button" onPress={()=>setRowMenu(null)} style={[styles.menuItem,styles.menuDivider]}>
      <Text style={[styles.menuText,{color:C.muted}]}>{t('Cancelar')}</Text></Pressable>
    </View>
   </Pressable>
  </Modal>
 </Page>;
}

const TONES:Record<NotificationKind,{icon:JynloIconName;bg:string;fg:string}>={
 chat:{icon:'messages',bg:'#123a48',fg:'#62e6c4'},invite:{icon:'calendar',bg:'#3a2c10',fg:'#f2b84b'},
 session:{icon:'session',bg:'#12324a',fg:'#7cc4ff'},payment:{icon:'check',bg:'#123a2c',fg:'#7ee0a1'},
 social:{icon:'like',bg:'#2a1838',fg:'#c9a7ff'},tournament:{icon:'tournament',bg:'#3a2c10',fg:'#f2b84b'},
 community:{icon:'community',bg:'#12324a',fg:'#7cc4ff'},venue:{icon:'venue',bg:'#123a2c',fg:'#7ee0a1'},
 other:{icon:'notifications',bg:'#1d3644',fg:'#b9d4d6'},
};

/** Swipe left to reveal "Eliminar" (or long-press the row for the same option). */
function SwipeToDelete({children,open,onOpen,onClose,onDelete,label}:{children:React.ReactNode;open:boolean;onOpen:()=>void;onClose:()=>void;onDelete:()=>void;label:string}){
 const x=useRef(new Animated.Value(0)).current;
 const WIDTH=92;
 useEffect(()=>{Animated.spring(x,{toValue:open?-WIDTH:0,useNativeDriver:true,bounciness:0}).start();},[open,x]);
 const pan=useRef(PanResponder.create({
  onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.5,
  onPanResponderMove:(_,g)=>{x.setValue(Math.max(-WIDTH*1.4,Math.min(0,g.dx+(openRef.current?-WIDTH:0))));},
  onPanResponderRelease:(_,g)=>{const total=g.dx+(openRef.current?-WIDTH:0);if(total<-WIDTH/2)onOpenRef.current();else{onCloseRef.current();Animated.spring(x,{toValue:0,useNativeDriver:true,bounciness:0}).start();}},
  onPanResponderTerminate:()=>{Animated.spring(x,{toValue:openRef.current?-WIDTH:0,useNativeDriver:true,bounciness:0}).start();},
 })).current;
 const openRef=useRef(open);openRef.current=open;
 const onOpenRef=useRef(onOpen);onOpenRef.current=onOpen;
 const onCloseRef=useRef(onClose);onCloseRef.current=onClose;
 return <View style={styles.swipe}>
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onDelete} style={styles.swipeAction}>
   <JynloIcon name="remove" size={20} color="#fff"/><Text style={styles.swipeText}>{label}</Text>
  </Pressable>
  <Animated.View style={{transform:[{translateX:x}]}} {...pan.panHandlers}>{children}</Animated.View>
 </View>;
}

const styles=StyleSheet.create({
 headerButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 invites:{gap:8},
 inviteRow:{flexDirection:'row',alignItems:'center',gap:12,padding:10,borderRadius:14,backgroundColor:C.surface,borderWidth:1,borderColor:'rgba(242,184,75,.35)'},
 inviteCta:{color:C.mint,fontWeight:'800',fontSize:13},
 pill:{minHeight:36,paddingHorizontal:10,borderRadius:18,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 pillOn:{backgroundColor:C.mint,borderColor:C.mint},pillText:{color:C.white,fontWeight:'700',fontSize:12},pillOnText:{color:C.background,fontWeight:'800',fontSize:12},
 more:{color:C.mint,fontWeight:'700',fontSize:13,paddingVertical:6},
 filters:{flexDirection:'row',gap:8},
 filter:{flexDirection:'row',alignItems:'center',gap:6,minHeight:38,paddingHorizontal:14,borderRadius:19,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 filterOn:{backgroundColor:C.mint,borderColor:C.mint},filterText:{color:C.white,fontWeight:'700',fontSize:14},filterTextOn:{color:C.background},
 count:{minWidth:20,height:20,lineHeight:20,borderRadius:10,backgroundColor:'#f2b84b',color:'#231500',fontSize:12,fontWeight:'800',textAlign:'center',paddingHorizontal:5,overflow:'hidden'},
 empty:{alignItems:'center',gap:8,paddingVertical:36},emptyText:{color:C.muted,fontSize:14},
 list:{marginHorizontal:-16},
 section:{color:C.muted,fontSize:12,fontWeight:'800',letterSpacing:.6,paddingHorizontal:16,paddingTop:10,paddingBottom:4},
 swipe:{overflow:'hidden'},
 swipeAction:{position:'absolute',right:0,top:0,bottom:0,width:92,backgroundColor:'#b4232f',alignItems:'center',justifyContent:'center',gap:2},
 swipeText:{color:'#fff',fontSize:12,fontWeight:'800'},
 row:{flexDirection:'row',alignItems:'flex-start',gap:12,paddingHorizontal:16,paddingVertical:10,backgroundColor:C.background},
 rowUnread:{backgroundColor:'#0b1d2b'},
 icon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
 rowTop:{flexDirection:'row',alignItems:'baseline',gap:8},
 rowTitle:{flex:1,color:C.white,fontWeight:'800',fontSize:14},rowTitleRead:{fontWeight:'600',color:'#d7ecee'},
 time:{color:C.muted,fontSize:12},
 preview:{color:C.muted,fontSize:13,lineHeight:18,marginTop:2},previewUnread:{color:'#c9e3e6'},
 dot:{width:9,height:9,borderRadius:5,backgroundColor:C.mint,marginTop:6},
 pushPanel:{padding:14,borderRadius:16,backgroundColor:C.surface,gap:10},
 heading:{fontSize:16,fontWeight:'800',color:C.white},note:{fontSize:12,color:C.muted,lineHeight:19},
 backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.45)',alignItems:'flex-end',paddingTop:56,paddingHorizontal:8},
 menu:{width:270,borderRadius:14,backgroundColor:'#10283a',borderWidth:1,borderColor:'#2c5568',overflow:'hidden'},
 sheet:{alignSelf:'stretch',borderTopLeftRadius:20,borderTopRightRadius:20,backgroundColor:'#10283a',borderWidth:1,borderColor:'#2c5568',paddingBottom:24,marginHorizontal:-8},
 menuItem:{minHeight:50,justifyContent:'center',paddingHorizontal:16},menuDivider:{borderTopWidth:1,borderTopColor:'#1c3a4a'},
 menuText:{color:C.white,fontSize:15,fontWeight:'600'},menuDanger:{color:'#ff8a8a'},
});
