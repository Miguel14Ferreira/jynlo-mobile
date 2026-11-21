import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {Stack,useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {FriendPicker} from '../../src/components/FriendPicker';
import {useAuth} from '../../src/lib/auth';
import {ApiError} from '../../src/lib/api';
import {C} from '../../src/lib/theme';
import {getGroup,groupMessages,sendGroupMessage,renameGroup,addGroupMembers,removeGroupMember} from '../../src/lib/private-groups-api';
import {observePrivateGroup} from '../../src/lib/session-chat-realtime';
import {listConversationMutes,isConversationMuted,setConversationMuted} from '../../src/lib/conversation-mutes-api';
import {isCreator,isMine,membersLabel,mergeMessages,validateGroupMessage,validateGroupTitle,MAX_MEMBERS,MAX_MESSAGE,
 type PrivateGroup,type PrivateGroupMessage} from '../../src/lib/private-groups-core.cjs';

const time=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':
 d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});};

export default function GroupChatScreen(){
 const params=useLocalSearchParams<{id:string;title?:string}>();
 const groupId=Number(params.id);
 const auth=useAuth(),router=useRouter();
 const me=auth.username||'';
 const [group,setGroup]=useState<PrivateGroup|null>(null);
 const [messages,setMessages]=useState<PrivateGroupMessage[]>([]);
 const [hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[loadingOlder,setLoadingOlder]=useState(false);
 const [error,setError]=useState(''),[actionError,setActionError]=useState(''),[gone,setGone]=useState(false);
 const [draft,setDraft]=useState(''),[sending,setSending]=useState(false);
 const [panel,setPanel]=useState<null|'rename'|'add'>(null);
 const [renameTitle,setRenameTitle]=useState(''),[picked,setPicked]=useState<string[]>([]),[busy,setBusy]=useState(false);
 const [muted,setMuted]=useState(false),[muteBusy,setMuteBusy]=useState(false);
 const generation=useRef(0),sendInFlight=useRef(false);
 const creator=isCreator(group,me);

 const refresh=useCallback(async(full:boolean)=>{
  if(!auth.token||!Number.isSafeInteger(groupId)||groupId<=0){setLoading(false);setError('Grupo inválido.');return;}
  const id=++generation.current;
  try{
   const [g,latest]=await Promise.all([getGroup(groupId,auth.token),groupMessages(groupId,auth.token)]);
   if(id!==generation.current)return;
   setGroup(g);setError('');setGone(false);
   setMessages(prev=>full?latest:mergeMessages(prev,latest));
   if(full)setHasMore(latest.length>=50);
  }catch(e){
   if(id!==generation.current)return;
   if(e instanceof ApiError&&(e.status===403||e.status===404)){setGone(true);setGroup(null);setMessages([]);}
   else setError('Não foi possível carregar as mensagens do grupo.');
  }finally{if(id===generation.current)setLoading(false);}
 },[auth.token,groupId]);

 useFocusEffect(useCallback(()=>{
  setLoading(true);void refresh(true);
  if(auth.token)listConversationMutes(auth.token).then(m=>setMuted(isConversationMuted(m,'private',String(groupId)))).catch(()=>{});
  const stop=auth.token?observePrivateGroup({groupId,token:auth.token,onInvalidated:()=>{void refresh(false);}}):()=>{};
  return()=>{generation.current++;stop();};
 },[refresh,auth.token,groupId]));

 async function older(){
  const first=messages[0];if(loadingOlder||!auth.token||!first)return;
  setLoadingOlder(true);
  try{const page=await groupMessages(groupId,auth.token,first.id);setMessages(prev=>mergeMessages(page,prev));setHasMore(page.length>=50);}
  catch{setActionError('Não foi possível carregar mensagens anteriores.');}
  finally{setLoadingOlder(false);}
 }
 async function send(){
  if(sendInFlight.current||!auth.token)return;
  let text:string;try{text=validateGroupMessage(draft);}catch(e){setActionError(e instanceof Error?e.message:'');return;}
  sendInFlight.current=true;setSending(true);setActionError('');
  try{const m=await sendGroupMessage(groupId,text,auth.token);setDraft('');setMessages(prev=>mergeMessages(prev,[m]));}
  catch(e){setActionError((e instanceof Error?e.message:'Não foi possível enviar a mensagem.')+' A mensagem ficou na caixa; confirma a conversa antes de reenviar.');void refresh(false);}
  finally{sendInFlight.current=false;setSending(false);}
 }
 async function doRename(){
  if(busy||!auth.token)return;
  try{validateGroupTitle(renameTitle);}catch(e){setActionError(e instanceof Error?e.message:'');return;}
  setBusy(true);setActionError('');
  try{setGroup(await renameGroup(groupId,renameTitle,auth.token));setPanel(null);}
  catch{setActionError('Não foi possível alterar o nome do grupo.');}finally{setBusy(false);}
 }
 async function doAdd(){
  if(busy||!auth.token||!group)return;
  setBusy(true);setActionError('');
  try{setGroup(await addGroupMembers(group,picked,me,auth.token));setPanel(null);setPicked([]);}
  catch(e){setActionError((e instanceof Error&&/30|amigo/.test(e.message)?e.message:'Não foi possível adicionar os participantes.'));}
  finally{setBusy(false);}
 }
 function askRemove(username:string,displayName:string){
  const leaving=username.toLowerCase()===me.toLowerCase();
  Alert.alert(leaving?'Sair do grupo':'Remover membro',
   leaving?'Queres sair deste grupo? Deixarás de receber novas mensagens.':'Queres remover '+displayName+' do grupo?',
   [{text:'Cancelar',style:'cancel'},{text:leaving?'Sair':'Remover',style:'destructive',onPress:()=>{void remove(username,leaving);}}]);
 }
 async function remove(username:string,leaving:boolean){
  if(busy||!auth.token)return;
  setBusy(true);setActionError('');
  try{const g=await removeGroupMember(groupId,username,auth.token);
   if(leaving){router.replace('/groups');return;}
   if(g)setGroup(g);else void refresh(false);}
  catch{setActionError('Não foi possível alterar os membros do grupo.');}finally{setBusy(false);}
 }
 async function toggleMute(){
  if(muteBusy||!auth.token)return;
  setMuteBusy(true);
  try{await setConversationMuted('private',String(groupId),!muted,auth.token);setMuted(!muted);}
  catch{setActionError('Não foi possível alterar o silêncio desta conversa.');}finally{setMuteBusy(false);}
 }

 const title=group?.title||(typeof params.title==='string'?params.title:'Grupo');
 return <Page autoScrollToEnd>
  <Stack.Screen options={{title}}/>
  {loading?<Loader/>:null}
  {gone?<><Message>Já não fazes parte deste grupo ou ele deixou de existir.</Message><Button title="Ver os meus grupos" onPress={()=>router.replace('/groups')}/></>:null}
  {error?<><Message tone="error">{error}</Message><Button secondary title="Tentar novamente" onPress={()=>{setLoading(true);void refresh(true);}}/></>:null}
  {group?<>
   <View style={styles.header}>
    <View style={styles.avatar}>{group.photoUrl?<Image source={{uri:group.photoUrl}} style={styles.avatarImg}/>:<Text style={{fontSize:22}}>👥</Text>}</View>
    <View style={{flex:1}}><Text style={styles.title} numberOfLines={2}>{group.title}</Text><Text style={styles.muted}>{membersLabel(group.members.length)}</Text></View>
   </View>
   <View style={styles.actions}>
    <Pressable accessibilityRole="button" disabled={muteBusy} onPress={()=>{void toggleMute();}} style={styles.action}>
     <Text style={styles.actionText}>{muted?'🔕 Ativar notificações':'🔔 Silenciar'}</Text></Pressable>
    {creator?<>
     <Pressable accessibilityRole="button" onPress={()=>{setPanel(panel==='rename'?null:'rename');setRenameTitle(group.title);setActionError('');}} style={styles.action}><Text style={styles.actionText}>Alterar nome</Text></Pressable>
     {group.members.length<MAX_MEMBERS?<Pressable accessibilityRole="button" onPress={()=>{setPanel(panel==='add'?null:'add');setPicked([]);setActionError('');}} style={styles.action}><Text style={styles.actionText}>＋ Adicionar membros</Text></Pressable>:null}
    </>:<Pressable accessibilityRole="button" disabled={busy} onPress={()=>askRemove(me,me)} style={styles.action}><Text style={[styles.actionText,{color:C.danger}]}>Sair do grupo</Text></Pressable>}
   </View>
   <View style={styles.chips}>
    {group.members.map(m=><View key={m.username} style={styles.chip}>
     <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}>
      <Text style={styles.chipText} numberOfLines={1}>{m.displayName}{m.admin?' ★':''}</Text></Pressable>
     {creator&&!m.admin?<Pressable accessibilityRole="button" accessibilityLabel={'Remover membro: '+m.displayName} hitSlop={10}
      disabled={busy} onPress={()=>askRemove(m.username,m.displayName)}><Text style={styles.chipX}>×</Text></Pressable>:null}
    </View>)}
   </View>
   {panel==='rename'?<View style={styles.panel}>
    <Text style={styles.label}>Nome do grupo</Text>
    <TextInput value={renameTitle} onChangeText={setRenameTitle} maxLength={90} editable={!busy} style={styles.input} accessibilityLabel="Novo nome do grupo"/>
    <Button title={busy?'A guardar…':'Alterar nome'} disabled={busy||renameTitle.trim().length<2} onPress={()=>{void doRename();}}/>
    <Button secondary title="Cancelar" disabled={busy} onPress={()=>setPanel(null)}/>
   </View>:null}
   {panel==='add'&&auth.token?<View style={styles.panel}>
    <Text style={styles.muted}>Escolhe os amigos que queres juntar a esta conversa.</Text>
    <FriendPicker token={auth.token} group={group} selected={picked} onChange={setPicked} disabled={busy} max={MAX_MEMBERS-group.members.length}/>
    <Button title={busy?'A adicionar…':'Adicionar ao grupo'} disabled={busy||!picked.length} onPress={()=>{void doAdd();}}/>
    <Button secondary title="Cancelar" disabled={busy} onPress={()=>setPanel(null)}/>
   </View>:null}
   {hasMore?<Pressable accessibilityRole="button" disabled={loadingOlder} onPress={()=>{void older();}} style={styles.more}>
    {loadingOlder?<ActivityIndicator color={C.mint}/>:<Text style={styles.moreText}>Carregar mensagens anteriores</Text>}</Pressable>:null}
   {!loading&&!messages.length?<Text style={[styles.muted,{textAlign:'center',paddingVertical:16}]}>Ainda não há mensagens neste grupo.</Text>:null}
   {messages.map(m=>{const mine=isMine(m,me);return <View key={m.id} style={[styles.bubble,mine?styles.mine:styles.theirs]}>
    {!mine?<Text style={styles.sender}>{group.members.find(x=>x.username.toLowerCase()===m.sender.toLowerCase())?.displayName||m.sender}</Text>:null}
    <Text style={[styles.text,mine&&{color:C.background}]} selectable>{m.text}</Text>
    <Text style={[styles.time,mine&&{color:'#0B3B36'}]}>{time(m.createdAt)}</Text>
   </View>;})}
   {actionError?<Message tone="error">{actionError}</Message>:null}
   <View style={styles.compose}>
    <TextInput value={draft} onChangeText={setDraft} multiline maxLength={MAX_MESSAGE} editable={!sending}
     placeholder="Escreve uma mensagem ao grupo…" placeholderTextColor={C.muted} style={styles.composeInput} accessibilityLabel="Mensagem para o grupo"/>
    <Pressable accessibilityRole="button" accessibilityLabel="Enviar" disabled={sending||!draft.trim()} onPress={()=>{void send();}}
     style={[styles.send,(sending||!draft.trim())&&{opacity:.5}]}>
     {sending?<ActivityIndicator color={C.background}/>:<Text style={styles.sendText}>Enviar</Text>}</Pressable>
   </View>
  </>:null}
 </Page>;
}
const styles=StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',gap:12},
 avatar:{width:52,height:52,borderRadius:26,backgroundColor:'#124B48',alignItems:'center',justifyContent:'center',overflow:'hidden'},
 avatarImg:{width:52,height:52},title:{color:C.white,fontSize:22,fontWeight:'900'},muted:{color:C.muted,fontSize:13,lineHeight:19},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 action:{minHeight:40,justifyContent:'center',paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 actionText:{color:C.white,fontWeight:'800',fontSize:13},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:6},
 chip:{flexDirection:'row',alignItems:'center',gap:6,maxWidth:'100%',paddingHorizontal:10,minHeight:32,borderRadius:999,borderWidth:1,borderColor:C.border},
 chipText:{color:C.white,fontSize:13,fontWeight:'700'},chipX:{color:C.muted,fontSize:18,fontWeight:'800'},
 panel:{gap:10,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:'#0D2A35'},
 label:{color:C.white,fontWeight:'800',fontSize:14},
 input:{minHeight:48,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface},
 more:{minHeight:42,alignItems:'center',justifyContent:'center'},moreText:{color:C.mint,fontWeight:'800'},
 bubble:{maxWidth:'84%',paddingHorizontal:12,paddingVertical:8,borderRadius:16,gap:2},
 mine:{alignSelf:'flex-end',backgroundColor:C.mint,borderBottomRightRadius:4},
 theirs:{alignSelf:'flex-start',backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderBottomLeftRadius:4},
 sender:{color:C.mint,fontSize:12,fontWeight:'800'},text:{color:C.white,fontSize:15,lineHeight:21},
 time:{color:C.muted,fontSize:11,alignSelf:'flex-end'},
 compose:{flexDirection:'row',alignItems:'flex-end',gap:8,paddingTop:4},
 composeInput:{flex:1,minHeight:46,maxHeight:140,borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:12,paddingVertical:10,color:C.white,backgroundColor:C.surface},
 send:{minHeight:46,paddingHorizontal:16,borderRadius:14,backgroundColor:C.mint,alignItems:'center',justifyContent:'center'},
 sendText:{color:C.background,fontWeight:'900'}
});
