import React,{useCallback,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as Notifications from 'expo-notifications';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {communityInbox,directInbox} from '../../src/lib/chat-api';
import {myCommunityInvites} from '../../src/lib/community-api';
import {C} from '../../src/lib/theme';
import type {CommunityInvite,JynloInboxSummary} from '../../src/lib/types';
import {filterInbox,unreadInboxCount} from '../../src/lib/inbox-filter.cjs';
export default function MessagesScreen(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<JynloInboxSummary[]>([]);
 const [chatWarning,setChatWarning]=useState('');
 const [invites,setInvites]=useState<CommunityInvite[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [lastSyncedAt,setLastSyncedAt]=useState<Date|null>(null);
 const [search,setSearch]=useState(''),[unreadOnly,setUnreadOnly]=useState(false);
 const displayed=useMemo(()=>filterInbox(items,search,unreadOnly) as JynloInboxSummary[],[items,search,unreadOnly]);
 const unreadTotal=useMemo(()=>unreadInboxCount(items) as number,[items]);
 const busyVersion=useRef<number|null>(null),generation=useRef(0);
 const identity=useRef('');
 const pendingRefresh=useRef(false);
 const load=useCallback(async(silent=false,version=generation.current)=>{
  if(busyVersion.current===version){pendingRefresh.current=true;return;}
  if(!auth.token||!auth.username){
   setItems([]);setInvites([]);setLastSyncedAt(null);setLoading(false);return;
  }
  busyVersion.current=version;
  if(!silent){setLoading(true);setError('');setChatWarning('');}
  try{
   const [groups,privateChats,requests]=await Promise.allSettled([
    communityInbox(auth.token,auth.username),directInbox(auth.token),
    myCommunityInvites(auth.token,auth.username)
   ]);
   if(version!==generation.current)return;
   // A failing source must not erase healthy conversations from the other source.
   setItems(previous=>[
    ...(privateChats.status==='fulfilled'?privateChats.value:previous.filter(i=>i.kind==='direct')),
    ...(groups.status==='fulfilled'?groups.value:previous.filter(i=>i.kind==='community'))
   ].sort((a,b)=>(Date.parse(b.latestAt||'')||0)-(Date.parse(a.latestAt||'')||0)));
   if(requests.status==='fulfilled')setInvites(requests.value);
   const partial=groups.status==='rejected'||privateChats.status==='rejected'||requests.status==='rejected';
   setChatWarning(partial?'Não foi possível sincronizar todas as conversas. Os dados anteriores podem estar desatualizados.':'');
   if(!partial)setLastSyncedAt(new Date());
  }catch(e){
   if(version===generation.current){
    if(!silent)setError(e instanceof Error?e.message:'Não foi possível carregar as conversas.');
    else setChatWarning('A atualização automática falhou. Confirma a ligação e volta a atualizar.');
   }
  }finally{
   if(busyVersion.current===version)busyVersion.current=null;
   if(version===generation.current){
    if(!silent)setLoading(false);
    if(pendingRefresh.current){pendingRefresh.current=false;void load(true,version);}
   }
  }
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{
  const currentIdentity=auth.username+'|'+auth.token;
  if(identity.current!==currentIdentity){
   identity.current=currentIdentity;setItems([]);setInvites([]);
   setLastSyncedAt(null);setChatWarning('');setError('');
  }
  const version=++generation.current;
  pendingRefresh.current=false;
  void load(false,version);
  const timer=setInterval(()=>{if(AppState.currentState==='active')void load(true,version);},15000);
  const resume=AppState.addEventListener('change',state=>{
   if(state==='active'&&generation.current===version)void load(true,version);
  });
  const received=Notifications.addNotificationReceivedListener(notification=>{
   if(notification.request.content.data?.kind!=='notification'||generation.current!==version)return;
   if(auth.token&&auth.username)void load(true,version);
  });
  return ()=>{
   clearInterval(timer);resume.remove();received.remove();pendingRefresh.current=false;
   generation.current++;
  };
 },[load,auth.username,auth.token]));
 return <Page><Brand subtitle="A CONVERSA CONTINUA"/><DemoBanner/>
  <Eyebrow>COMUNIDADE É CONVERSA</Eyebrow>
  <Button secondary title="🔔 Notificações" onPress={()=>router.push("/notifications")}/>
  <Text style={styles.title}>As tuas conversas</Text>
  <Text style={styles.sub}>Fala com quem joga contigo, antes e depois das sessões.</Text>
  {auth.token?<View style={styles.searchBox}>
   <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar conversas…"
    placeholderTextColor={C.muted} style={styles.searchInput} autoCapitalize="none"
    accessibilityLabel="Pesquisar conversas pelo contacto ou mensagem"/>
   <Pressable accessibilityRole="button" accessibilityState={{selected:unreadOnly}}
    onPress={()=>setUnreadOnly(current=>!current)} style={[styles.filterChip,unreadOnly&&styles.filterActive]}>
    <Text style={styles.filterText}>{unreadOnly?'✓ Não lidas':'Não lidas'} · {unreadTotal}</Text>
   </Pressable>
   <Text style={styles.tiny}>{displayed.length} de {items.length} conversas</Text>
  </View>:null}
  {!auth.token?<Button title="Entrar para ver mensagens" onPress={()=>router.push('/login')}/>:null}
  {auth.token&&invites.length>0?<Pressable onPress={()=>router.push('/communities/invites')} style={styles.alert}>
    <Text style={styles.alertText}>✉  Tens {invites.length} convite(s) para comunidades</Text><Text style={styles.arrow}>›</Text>
  </Pressable>:null}
  {auth.token?<Button secondary title="Ver convites e pedidos" onPress={()=>router.push('/communities/invites')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {chatWarning?<Message>{chatWarning}</Message>:null}
  {auth.token&&lastSyncedAt?<Text style={styles.tiny}>Última sincronização completa: {lastSyncedAt.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</Text>:null}
  {auth.token?<Button secondary title="Atualizar conversas" disabled={loading} onPress={()=>{void load(false);}}/>:null}
  {!loading&&auth.token&&items.length===0&&!error?<Message>Não foram encontradas conversas acessíveis. As mensagens privadas exigem que a amizade esteja ativa.</Message>:null}
  {auth.token&&!loading&&items.length>0&&displayed.length===0?<Message>Não foram encontradas conversas com estes filtros.</Message>:null}
  {displayed.map(item=><Pressable key={`${item.kind}-${item.id}`}
    onPress={()=>item.kind==='direct'?router.push({pathname:'/messages/[peer]',params:{peer:item.id}}):
      item.kind==='community'?router.push({pathname:'/communities/[id]/chat',params:{id:item.id}}):undefined}
    style={({pressed})=>[styles.tile,pressed&&{opacity:.7}]}>
    <View style={styles.avatar}><Text style={{fontSize:23}}>{item.kind==='direct'?'👤':'💬'}</Text></View>
    <View style={{flex:1,gap:5}}><Text style={styles.item}>{item.kind==='direct'?item.id:'Comunidade #'+item.id}</Text>
      <Text numberOfLines={2} style={styles.sub}>{item.latestText||'Abre para começar a conversa'}</Text>
      {!!item.latestSender&&<Text style={styles.tiny}>Última mensagem: {item.latestSender}</Text>}
    </View>
    {!!item.unreadCount?<Text style={styles.unread}>{item.unreadCount}</Text>:<Text style={styles.arrow}>›</Text>}
  </Pressable>)}
  <Message>Conversas e contadores de não lidas atualizados automaticamente enquanto esta página está aberta. O chat da comunidade usa ligação em tempo real; as conversas privadas usam atualização periódica. Push com a app fechada ainda não está implementado.</Message>
 </Page>;
}
const styles=StyleSheet.create({
 searchBox:{gap:9,padding:12,borderRadius:14,backgroundColor:C.surface},
 searchInput:{color:C.white,borderColor:C.border,borderWidth:1,borderRadius:10,paddingHorizontal:13,minHeight:46},
 filterChip:{alignSelf:'flex-start',paddingHorizontal:13,paddingVertical:9,borderRadius:99,borderColor:C.border,borderWidth:1},
 filterActive:{backgroundColor:C.surface2,borderColor:C.mint},filterText:{color:C.mint,fontWeight:'800'},title:{fontSize:31,fontWeight:'900',color:C.white},sub:{color:C.muted,fontSize:13,lineHeight:19},
 tile:{borderRadius:19,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,padding:15,flexDirection:'row',alignItems:'center',gap:13},
 avatar:{width:52,height:52,borderRadius:15,backgroundColor:C.surface2,alignItems:'center',justifyContent:'center'},
 item:{fontWeight:'900',fontSize:16,color:C.white},tiny:{fontSize:11,color:C.muted},alert:{backgroundColor:'#27463D',borderColor:'#417060',borderWidth:1,borderRadius:14,padding:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 alertText:{color:C.mint,fontWeight:'800',fontSize:13},unread:{fontWeight:'900',color:C.background,backgroundColor:C.mint,paddingHorizontal:9,paddingVertical:5,borderRadius:15},arrow:{color:C.mint,fontSize:25}});
