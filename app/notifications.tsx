import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import * as Notifications from 'expo-notifications';
import {useFocusEffect,useIsFocused,useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {answerSessionInvite,pendingSessionInvites} from '../src/lib/api';
import {myNotifications,markNotificationRead} from '../src/lib/notifications-api';
import {C} from '../src/lib/theme';
import type {JynloNotification,PendingSessionInvite} from '../src/lib/types';
import {notificationDestination} from '../src/lib/notification-route.cjs';
import {disableMobilePush,enableMobilePush,pushRegistrationStatus} from '../src/lib/mobile-push';

export default function NotificationsScreen(){
 const auth=useAuth(),router=useRouter(),isFocused=useIsFocused();
 const {notificationId}=useLocalSearchParams<{notificationId?:string}>();
 const lastPushHandled=useRef<string|null>(null);
 const [items,setItems]=useState<JynloNotification[]>([]),[invites,setInvites]=useState<PendingSessionInvite[]>([]);
 const [loading,setLoading]=useState(true),[historyReady,setHistoryReady]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busyInvite,setBusyInvite]=useState<number|null>(null);
 const [pushEnabled,setPushEnabled]=useState(false),[pushBusy,setPushBusy]=useState(false);
 const [pushError,setPushError]=useState('');
 const inFlight=useRef<number|null>(null),generation=useRef(0),account=useRef('');
 const pendingRefresh=useRef(false);
 const statusRequest=useRef(0);
 const load=useCallback(async(silent=false,version=generation.current)=>{
  if(inFlight.current===version){pendingRefresh.current=true;return;}
  if(!auth.token||!auth.username){
   setLoading(false);setItems([]);setInvites([]);return;
  }
  inFlight.current=version;
  if(!silent){setLoading(true);setError('');}
  try{
   const [notifs,invitations]=await Promise.allSettled([
    myNotifications(auth.token,auth.username),pendingSessionInvites(auth.token,auth.username)
   ]);
   if(version!==generation.current)return;
   if(notifs.status==='fulfilled'){
    setItems(notifs.value.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)));
    setHistoryReady(true);
   }
   if(invitations.status==='fulfilled')setInvites(invitations.value);
   if(notifs.status==='rejected'||invitations.status==='rejected'){
    if(!silent)setError('Não foi possível atualizar todas as notificações. A informação anterior foi preservada.');
   }else if(!silent)setError('');
  }finally{
   if(inFlight.current===version)inFlight.current=null;
   if(version===generation.current){
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
   account.current=identity;setItems([]);setInvites([]);
  }
  const version=++generation.current;
  pendingRefresh.current=false;
  setHistoryReady(false);
  setPushEnabled(false);setPushError('');
  const requestId=++statusRequest.current;
  if(auth.username&&auth.token)void pushRegistrationStatus(auth.username,auth.token).then(value=>{
   if(generation.current===version&&statusRequest.current===requestId)setPushEnabled(value);
  }).catch(()=>{});
  void load(false,version);
  const timer=setInterval(()=>{void load(true,version);},20000);
  const received=Notifications.addNotificationReceivedListener(notification=>{
   const payload=notification.request.content.data;
   // The backend sends only this notification kind; never navigate on receipt.
   if(payload?.kind!=='notification'||generation.current!==version)return;
   if(!auth.token||!auth.username)return;
   void load(true,version);
  });
  return ()=>{
   clearInterval(timer);received.remove();pendingRefresh.current=false;
   generation.current++;statusRequest.current++;
  };
 },[load,auth.username,auth.token]));
 async function togglePush(){
  if(!auth.username||!auth.token||pushBusy)return;
  // Ignore an older status lookup while an explicit user choice is processing.
  statusRequest.current++;
  const identity=auth.username+'|'+auth.token;
  setPushBusy(true);setPushError('');
  try{
   if(pushEnabled){
    await disableMobilePush(auth.username,auth.token);
    if(account.current===identity)setPushEnabled(false);
   }else{
    await enableMobilePush(auth.username,auth.token);
    if(account.current===identity)setPushEnabled(true);
   }
  }catch(e){if(account.current===identity)setPushError(e instanceof Error?e.message:'Não foi possível atualizar as notificações push.');}
  finally{setPushBusy(false);}
 }
 async function decide(invite:PendingSessionInvite,accept:boolean){
  if(!auth.token||busyInvite!==null)return;
  setBusyInvite(invite.id);setError('');setNotice('');
  try{
   const response=await answerSessionInvite(invite.sessionId,invite.id,accept,auth.token,auth.username||undefined);
   setInvites(old=>old.filter(x=>x.id!==invite.id));
   setNotice(!accept?'Convite recusado.':
    response?.state==='WAITLISTED'?'Convite aceite: estás na lista de espera.':
    response?.state==='PARTICIPANT'?'Convite aceite: presença confirmada pelo servidor.':
    'Resposta registada. Abre a sessão para confirmar a tua presença ou posição na lista de espera.');
  }catch(e){setError((e instanceof Error?e.message:'Não foi possível responder ao convite.')+' Atualiza antes de repetir.');}
  finally{setBusyInvite(null);}
 }
 async function open(item:JynloNotification){
  if(!auth.token||!auth.username)return;
  const initialIdentity=auth.username+'|'+auth.token;
  try{if(!item.read){await markNotificationRead(item.id,auth.token);setItems(old=>old.map(x=>x.id===item.id?{...x,read:true}:x));}}
  catch{setError('Não foi possível marcar a notificação como lida.');}
  if(account.current!==initialIdentity)return;
  const destination=notificationDestination(item);
  if(!destination)return;
  switch(destination.kind){
   case 'invites':router.push('/communities/invites');break;
   case 'community':router.push({pathname:'/communities/[id]',params:{id:destination.id!}});break;
   case 'session':router.push({pathname:'/sessions/[id]',params:{id:destination.id!}});break;
   case 'community-chat':router.push({pathname:'/communities/[id]/chat',params:{id:destination.id!}});break;
   case 'session-chat':router.push({pathname:'/sessions/[id]/chat',params:{id:destination.id!}});break;
   case 'direct-chat':router.push({pathname:'/messages/[peer]',params:{peer:destination.peer!}});break;
  }
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
   setNotice('A confirmar a notificação no servidor. Podes atualizar a lista.');
   return;
  }
  lastPushHandled.current=key;
  router.setParams({notificationId:''});
  void open(target);
 },[isFocused,auth.token,auth.username,notificationId,loading,historyReady,items,router]);
 return <Page><Brand subtitle="NÃO PERDAS O PRÓXIMO JOGO"/><DemoBanner/>
  <Text style={styles.title}>Notificações</Text>
  <Text style={styles.note}>Convites e novidades das comunidades e sessões. A decisão é sempre confirmada pela API.</Text>
  {auth.token?<View style={styles.pushPanel}>
   <Text style={styles.heading}>Notificações no telemóvel</Text>
   <Text style={styles.note}>Ativação opcional. Pedimos permissão apenas quando escolheres ativar; o envio de notificações ainda depende da configuração do servidor e das credenciais Android.</Text>
   <Button title={pushBusy?'A atualizar…':pushEnabled?'Desativar neste dispositivo':'Ativar notificações neste dispositivo'} disabled={pushBusy} onPress={()=>{void togglePush();}}/>
   {pushError?<Message tone="error">{pushError}</Message>:null}
  </View>:null}
  {!auth.token?<Button title="Iniciar sessão" onPress={()=>router.push({pathname:'/login',params:{redirect:'/notifications'}})}/>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {auth.token&&!loading?<View style={{gap:12}}>
   <Text style={styles.heading}>Convites para sessões · {invites.length}</Text>
   {invites.length===0?<Text style={styles.note}>Não tens convites pendentes para sessões.</Text>:invites.map(invite=><View key={invite.id} style={styles.invite}>
    <Text style={styles.subject}>{invite.sport||'Sessão desportiva'} · {invite.city||'Local a confirmar'}</Text>
    <Text style={styles.body}>Convidado por @{invite.inviterUsername}</Text>
    {invite.gameDate?<Text style={styles.note}>{new Date(invite.gameDate).toLocaleString('pt-PT')}</Text>:null}
    <Button secondary title="Ver detalhes da sessão" disabled={busyInvite!==null}
      onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(invite.sessionId)}})}/>
    <View style={styles.actions}>
     <View style={{flex:1}}><Button title={busyInvite===invite.id?'A processar…':'Aceitar'} disabled={busyInvite!==null} onPress={()=>{void decide(invite,true);}}/></View>
     <View style={{flex:1}}><Button title="Recusar" secondary disabled={busyInvite!==null} onPress={()=>{void decide(invite,false);}}/></View>
    </View>
   </View>)}
   <Text style={styles.heading}>Outras notificações · {items.length}</Text>
   {items.length===0?<Text style={styles.note}>Sem outras notificações.</Text>:items.map(n=><Pressable key={n.id} onPress={()=>{void open(n);}} style={[styles.tile,!n.read&&styles.new]}>
    <View style={{flex:1,gap:6}}><Text style={styles.subject}>{n.subject||'Jynlo'}</Text><Text style={styles.body}>{n.message}</Text>
     <Text style={styles.note}>{new Date(n.createdAt).toLocaleString('pt-PT')}</Text></View>
    {!n.read?<Text style={styles.badge}>●</Text>:null}
   </Pressable>)}
  </View>:null}
  <Button secondary title="Atualizar" onPress={()=>{void load();}} disabled={loading||busyInvite!==null}/>
  <Message>Notificações atualizadas automaticamente de 20 em 20 segundos enquanto este ecrã está aberto. O envio push com a app fechada ainda não está disponível.</Message>
 </Page>;
}
const styles=StyleSheet.create({
 pushPanel:{padding:14,borderRadius:16,backgroundColor:C.surface,gap:10},
 title:{fontSize:31,fontWeight:'900',color:C.white},heading:{fontSize:18,fontWeight:'800',color:C.white,marginTop:8},
 note:{fontSize:12,color:C.muted,lineHeight:19},tile:{padding:16,borderRadius:16,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,flexDirection:'row',gap:9},
 invite:{padding:16,borderRadius:16,backgroundColor:C.surface,borderWidth:1,borderColor:C.mint,gap:8},
 actions:{flexDirection:'row',gap:9,marginTop:6},
 new:{borderColor:C.mint},subject:{color:C.white,fontWeight:'900',fontSize:15},body:{color:C.muted,fontSize:13,lineHeight:20},badge:{color:C.mint,fontSize:16}
});
