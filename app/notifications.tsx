import React,{useCallback,useEffect,useRef,useState} from 'react';
import {currentLocale,t} from '../src/lib/i18n';
import {Alert,AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import type * as NotificationTypes from 'expo-notifications';
import {getNativeNotifications} from '../src/lib/optional-notifications.cjs';
import {useFocusEffect,useIsFocused,useLocalSearchParams,useRouter} from 'expo-router';
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
    case 'community':router.push({pathname:'/communities/[id]',params:{id:destination.id!}});break;
    case 'tournament':router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:destination.communityId!,id:destination.id!}});break;
    case 'session':router.push({pathname:'/sessions/[id]',params:{id:destination.id!}});break;
    case 'community-chat':router.push({pathname:'/communities/[id]/chat',params:{id:destination.id!}});break;
    case 'session-chat':router.push({pathname:'/sessions/[id]/chat',params:{id:destination.id!}});break;
    case 'group-chat':router.push({pathname:'/groups/[id]',params:{id:destination.id!}});break;
    case 'team-chat':router.push({pathname:'/teams/[id]',params:{id:destination.id!,tab:'CHAT'}});break;
    case 'direct-chat':router.push({pathname:'/messages/[peer]',params:{peer:destination.peer!}});break;
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
 return <Page><DemoBanner/>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Notificações')}</Text>
  <Text style={styles.note}>{t('Convites, novidades desportivas e atividade social.')}</Text>
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/notifications'}})}/>:null}
  {sameAccount?<Button secondary title={t('Gerir notificações')} onPress={()=>router.push('/notification-settings')}/>:null}
  {sameAccount?<Button secondary title={t('Respostas privadas às minhas Stories')} onPress={()=>router.push('/stories/replies')}/>:null}
  {loading?<Loader/>:null}
  {sameAccount&&error?<Message tone="error">{error}</Message>:null}
  {sameAccount&&notice?<Message>{notice}</Message>:null}
  {sameAccount&&!loading?<View style={{gap:12}}>
   <Text style={styles.heading}>{t('Convites para comunidades · {a}',{a:visibleCommunityInvites.length})}</Text>
   {visibleCommunityInvites.length===0?<Text style={styles.note}>{t('Não tens convites pendentes para comunidades.')}</Text>:
    visibleCommunityInvites.slice(0,5).map(invite=><View key={invite.id} style={styles.invite}>
     <Text style={styles.subject}>{invite.communityName}</Text>
     <Text style={styles.body}>{t('Convidado por @{a}',{a:invite.invitedByUsername})}</Text>
     <Button title={t('Ver convite e responder')} secondary
      onPress={()=>router.push('/communities/invites')}/>
    </View>)}
   {visibleCommunityInvites.length>5?<Button secondary title={t('Ver todos os convites de comunidades')}
    onPress={()=>router.push('/communities/invites')}/>:null}
   <Text style={styles.heading}>{t('Convites para sessões · {a}',{a:visibleInvites.length})}</Text>
   {visibleInvites.length===0?<Text style={styles.note}>{t('Não tens convites pendentes para sessões.')}</Text>:visibleInvites.map(invite=><View key={invite.id} style={styles.invite}>
    <Text style={styles.subject}>{sportName(invite.sport)||t('Sessão desportiva')} · {invite.city||t('Local a confirmar')}</Text>
    <Text style={styles.body}>{t('Convidado por @{a}',{a:invite.inviterUsername})}</Text>
    {invite.gameDate?<Text style={styles.note}>{new Date(invite.gameDate).toLocaleString(currentLocale())}</Text>:null}
    <Button secondary title={t('Ver detalhes da sessão')} disabled={busyInvite!==null}
      onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(invite.sessionId)}})}/>
    <View style={styles.actions}>
     <View style={{flex:1}}><Button title={busyInvite===invite.id?t('A processar…'):t('Aceitar')} disabled={busyInvite!==null} onPress={()=>{void decide(invite,true);}}/></View>
     <View style={{flex:1}}><Button title={t('Recusar')} secondary disabled={busyInvite!==null} onPress={()=>{void decide(invite,false);}}/></View>
    </View>
   </View>)}
   <Text style={styles.heading}>{t('Notificações · {a}',{a:visibleItems.length})}</Text>
   <View style={styles.filterBar}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Mostrar todas as notificações')} accessibilityState={{selected:!unreadOnly}} onPress={()=>setUnreadOnly(false)} style={[styles.filterButton,!unreadOnly&&styles.filterSelected]}><Text style={styles.filterLabel}>{t('Todas · {a}',{a:visibleItems.length})}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Mostrar apenas notificações não lidas')} accessibilityState={{selected:unreadOnly}} onPress={()=>setUnreadOnly(true)} style={[styles.filterButton,unreadOnly&&styles.filterSelected]}><Text style={styles.filterLabel}>{t('Não lidas · {a}',{a:unreadCount})}</Text></Pressable>
   </View>
   {visibleItems.length>0?<View style={styles.filterBar}>
    {unreadCount>0?<View style={{flex:1}}><Button secondary title={notificationBusy?t('A atualizar…'):t('Marcar todas como lidas')} disabled={notificationBusy} onPress={()=>{void markAllRead();}}/></View>:null}
    <View style={{flex:1}}><Button secondary title={t('Limpar notificações')} disabled={notificationBusy} onPress={()=>Alert.alert(t('Eliminar todas as notificações?'),t('Esta ação elimina definitivamente todas as tuas notificações. Os convites pendentes são apresentados separadamente.'),[{text:t('Cancelar'),style:'cancel'},{text:t('Eliminar'),style:'destructive',onPress:()=>void removeAll()}])}/></View>
   </View>:null}
   {filteredItems.length===0?<Text style={styles.note}>{unreadOnly?t('Não tens notificações por ler.'):t('Sem outras notificações.')}</Text>:filteredItems.map(n=><View key={n.id} style={[styles.tile,!n.read&&styles.new]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir notificação: {v}',{v:(n.subject||'Jynlo')})} disabled={notificationBusy} onPress={()=>{void open(n);}} style={{flex:1,gap:6}}>
     <Text style={styles.subject}>{n.subject||'Jynlo'}</Text><Text style={styles.body}>{n.message}</Text>
     <Text style={styles.note}>{Number.isFinite(Date.parse(n.createdAt))?new Date(n.createdAt).toLocaleString(currentLocale()):''}</Text>
    </Pressable>
    <View style={{alignItems:'center',justifyContent:'space-between'}}>
     {!n.read?<Text style={styles.badge}>●</Text>:<Text style={styles.note}>{t('Lida')}</Text>}
     <Pressable accessibilityRole="button" accessibilityLabel={t('Eliminar notificação: {v}',{v:(n.subject||'Jynlo')})} disabled={notificationBusy} onPress={()=>Alert.alert(t('Eliminar esta notificação?'),t('A notificação será removida da tua lista.'),[{text:t('Cancelar'),style:'cancel'},{text:t('Eliminar'),style:'destructive',onPress:()=>void removeOne(n)}])} style={styles.deleteButton}><Text style={styles.deleteText}>{t('Eliminar')}</Text></Pressable>
    </View>
   </View>)}
  </View>:null}
  {sameAccount?<View style={styles.pushPanel}>
   <Text style={styles.heading}>{t('Notificações no telemóvel')}</Text>
   <Text style={styles.note}>{androidPushConfigured()?pushEnabled?t('Este dispositivo está registado para notificações push. O registo não garante que os avisos sejam entregues.'):t('Podes ativar os avisos neste dispositivo. A entrega exige o serviço de envio operacional.'):t('As notificações dentro da aplicação continuam disponíveis. Para avisos com a aplicação fechada é necessária uma APK com Firebase configurado.')}</Text>
   {deliveryReady===false?<Message tone="error">{t('O envio push ainda não está ativo no servidor. Os avisos continuam disponíveis dentro da Jynlo, mas não serão enviados para o telemóvel.')}</Message>:null}
   {deliveryReady===null&&androidPushConfigured()?<Text style={styles.note}>{t('Não foi possível confirmar se o servidor está preparado para enviar avisos push.')}</Text>:null}
   {androidPushConfigured()?<Button title={pushBusy?t('A atualizar…'):pushEnabled?t('Desativar neste dispositivo'):t('Ativar notificações neste dispositivo')} disabled={pushBusy||(!pushEnabled&&deliveryReady===false)} onPress={()=>{void togglePush();}}/>:<Message>{t('As notificações dentro da app já funcionam. Os avisos com a app fechada chegam numa próxima versão.')}</Message>}
   <Button secondary title={pushBusy?t('A verificar…'):t('Verificar registo e serviço de envio')} disabled={pushBusy}
    onPress={()=>{void verifyPushStatus();}}/>
   {pushEnabled&&deliveryReady===true?<Text style={styles.note}>{t('Dispositivo registado e servidor preparado para enviar. A entrega deve ser confirmada com uma notificação real.')}</Text>:null}
   {pushError?<Message tone="error">{pushError}</Message>:null}
  </View>:null}
  <Button secondary title={t('Atualizar')} onPress={()=>{void load();}} disabled={!sameAccount||loading||busyInvite!==null}/>

 </Page>;
}
const styles=StyleSheet.create({
 filterBar:{flexDirection:'row',gap:9,alignItems:'center',flexWrap:'wrap'},filterButton:{borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,paddingVertical:10,minHeight:44,justifyContent:'center'},filterSelected:{borderColor:C.mint,backgroundColor:C.surface},filterLabel:{color:C.white,fontWeight:'700',fontSize:12},deleteButton:{minHeight:44,justifyContent:'center',paddingHorizontal:7},deleteText:{color:'#FF9898',fontSize:12,fontWeight:'800'},
 pushPanel:{padding:14,borderRadius:16,backgroundColor:C.surface,gap:10},
 title:{fontSize:31,fontWeight:'900',color:C.white},heading:{fontSize:18,fontWeight:'800',color:C.white,marginTop:8},
 note:{fontSize:12,color:C.muted,lineHeight:19},tile:{padding:16,borderRadius:16,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,flexDirection:'row',gap:9},
 invite:{padding:16,borderRadius:16,backgroundColor:C.surface,borderWidth:1,borderColor:C.mint,gap:8},
 actions:{flexDirection:'row',gap:9,marginTop:6},
 new:{borderColor:C.mint},subject:{color:C.white,fontWeight:'900',fontSize:15},body:{color:C.muted,fontSize:13,lineHeight:20},badge:{color:C.mint,fontSize:16}
});
