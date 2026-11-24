import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useChatViewing} from '../../src/lib/chat-viewing';
import {t} from '../../src/lib/i18n';
import {ActivityIndicator,Alert,Image,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardFrame} from '../../src/components/KeyboardFrame';
import {chatLook} from '../../src/lib/chat-look';
import {Stack,useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Loader,Message} from '../../src/components/UI';
import {FriendPicker} from '../../src/components/FriendPicker';
import {AvailabilityPanel} from '../../src/components/AvailabilityPanel';
import {useAuth} from '../../src/lib/auth';
import {ApiError} from '../../src/lib/api';
import {C} from '../../src/lib/theme';
import {markPrivateGroupRead} from '../../src/lib/chat-api';
import {uploadGroupPhoto} from '../../src/lib/private-group-photo';
import type {ImagePickerAsset} from 'expo-image-picker';
import {getGroup,groupMessages,sendGroupMessage,renameGroup,addGroupMembers,removeGroupMember,editGroupMessage,deleteGroupMessage,groupAttachmentsAvailable} from '../../src/lib/private-groups-api';
import {JynloIcon} from '../../src/components/JynloIcon';
import SecureChatAttachment from '../../src/components/SecureChatAttachment';
import ChatPdfComposer from '../../src/components/ChatPdfComposer';
import ChatReplyPreview from '../../src/components/ChatReplyPreview';
import ChatSearchPanel from '../../src/components/ChatSearchPanel';
import {ChatReactionRow,useChatReactions} from '../../src/components/ChatReactionRow';
import {chatAttachmentList,appendChatMediaSelection} from '../../src/lib/chat-attachments-core.cjs';
import {sendChatPhotoAlbum} from '../../src/lib/chat-photo-album';
import {validateChatPhoto} from '../../src/lib/chat-photo-validation';
import {ensureChatCameraPermission} from '../../src/lib/chat-camera-permission';
import {giphyImageUrl} from '../../src/lib/chat-giphy.cjs';
import {chatLocationUrl} from '../../src/lib/chat-location.cjs';
import {readPoll} from '../../src/lib/chat-poll.cjs';
import {PollCard} from '../../src/components/PollCard';
import {PollComposer} from '../../src/components/PollComposer';
import {observePrivateGroup} from '../../src/lib/session-chat-realtime';
import {listConversationMutes,isConversationMuted,setConversationMuted} from '../../src/lib/conversation-mutes-api';
import {isCreator,isMine,membersLabel,mergeMessages,validateGroupMessage,validateGroupTitle,MAX_MEMBERS,MAX_MESSAGE,editableGroupMessage,replyQuote,
 type PrivateGroup,type PrivateGroupMessage} from '../../src/lib/private-groups-core.cjs';

const time=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':
 d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});};

export default function GroupChatScreen(){
 const params=useLocalSearchParams<{id:string;title?:string}>();
 const groupId=Number(params.id);
 const auth=useAuth(),router=useRouter();
 useChatViewing('private',Number.isSafeInteger(groupId)&&groupId>0?groupId:null,auth.token);
 const me=auth.username||'';
 const [infoOpen,setInfoOpen]=useState(false),[attachOpen,setAttachOpen]=useState(false);
 const historyRef=useRef<ScrollViewInstance|null>(null);
 const [group,setGroup]=useState<PrivateGroup|null>(null);
 const [messages,setMessages]=useState<PrivateGroupMessage[]>([]);
 const [hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[loadingOlder,setLoadingOlder]=useState(false);
 const [error,setError]=useState(''),[actionError,setActionError]=useState(''),[gone,setGone]=useState(false);
 const [draft,setDraft]=useState(''),[sending,setSending]=useState(false);
 const [panel,setPanel]=useState<null|'rename'|'add'|'photo'>(null);
 const [photo,setPhoto]=useState<ImagePickerAsset|null>(null);
 const [renameTitle,setRenameTitle]=useState(''),[picked,setPicked]=useState<string[]>([]),[busy,setBusy]=useState(false);
 const [muted,setMuted]=useState(false),[muteBusy,setMuteBusy]=useState(false);
 const generation=useRef(0),sendInFlight=useRef(false);
 // Same message actions as the other chats: reply, react, edit (15 min), delete, files, location, search.
 const [replyTarget,setReplyTarget]=useState<{id:number;sender:string;text:string}|null>(null);
 const [editing,setEditing]=useState<PrivateGroupMessage|null>(null),[editText,setEditText]=useState('');
 const [filesAvailable,setFilesAvailable]=useState(false);
 const [media,setMedia]=useState<ImagePickerAsset[]>([]),[caption,setCaption]=useState(''),[mediaBusy,setMediaBusy]=useState(false);
 const [locationBusy,setLocationBusy]=useState(false),[pollOpen,setPollOpen]=useState(false);
 const reactions=useChatReactions('private',String(groupId),auth.token,messages.filter(m=>!m.deleted).map(m=>m.id),!!auth.token&&!gone);
 const creator=isCreator(group,me);

 const refresh=useCallback(async(full:boolean)=>{
  if(!auth.token||!Number.isSafeInteger(groupId)||groupId<=0){setLoading(false);setError(t('Grupo inválido.'));return;}
  const id=++generation.current;
  try{
   const [g,latest]=await Promise.all([getGroup(groupId,auth.token),groupMessages(groupId,auth.token)]);
   if(id!==generation.current)return;
   setGroup(g);setError('');setGone(false);
   setMessages(prev=>full?latest:mergeMessages(prev,latest));
   // These messages are now on screen: move the server read cursor (badge and Messages list).
   const newest=latest.reduce((max,m)=>Math.max(max,m.id),0);
   if(newest>0)void markPrivateGroupRead(groupId,newest,auth.token).catch(()=>{});
   if(full)setHasMore(latest.length>=50);
  }catch(e){
   if(id!==generation.current)return;
   if(e instanceof ApiError&&(e.status===403||e.status===404)){setGone(true);setGroup(null);setMessages([]);}
   else setError(t('Não foi possível carregar as mensagens do grupo.'));
  }finally{if(id===generation.current)setLoading(false);}
 },[auth.token,groupId]);

 useFocusEffect(useCallback(()=>{
  setLoading(true);void refresh(true);
  if(auth.token)listConversationMutes(auth.token).then(m=>setMuted(isConversationMuted(m,'private',String(groupId)))).catch(()=>{});
  if(auth.token)groupAttachmentsAvailable(groupId,auth.token).then(setFilesAvailable).catch(()=>setFilesAvailable(false));
  const stop=auth.token?observePrivateGroup({groupId,token:auth.token,onInvalidated:()=>{void refresh(false);}}):()=>{};
  return()=>{generation.current++;stop();};
 },[refresh,auth.token,groupId]));

 async function older(){
  const first=messages[0];if(loadingOlder||!auth.token||!first)return;
  setLoadingOlder(true);
  try{const page=await groupMessages(groupId,auth.token,first.id);setMessages(prev=>mergeMessages(page,prev));setHasMore(page.length>=50);}
  catch{setActionError(t('Não foi possível carregar mensagens anteriores.'));}
  finally{setLoadingOlder(false);}
 }
 async function send(){
  if(sendInFlight.current||!auth.token)return;
  let text:string;try{text=validateGroupMessage(draft);}catch(e){setActionError(e instanceof Error?e.message:'');return;}
  sendInFlight.current=true;setSending(true);setActionError('');
  try{const m=await sendGroupMessage(groupId,text,auth.token,replyTarget?.id);setDraft('');setReplyTarget(null);setMessages(prev=>mergeMessages(prev,[m]));}
  catch(e){setActionError((e instanceof Error?e.message:t('Não foi possível enviar a mensagem.'))+' '+t('A mensagem ficou na caixa; confirma a conversa antes de reenviar.'));void refresh(false);}
  finally{sendInFlight.current=false;setSending(false);}
 }
 function messageOptions(m:PrivateGroupMessage){
  if(m.deleted||busy)return;
  const own=isMine(m,me);
  if(!own&&!creator)return;
  const items:Array<{text:string;style?:'cancel'|'destructive';onPress?:()=>void}>=[];
  if(editableGroupMessage(m,me))items.push({text:t('Editar mensagem'),onPress:()=>{setEditing(m);setEditText(m.text);setReplyTarget(null);}});
  items.push({text:t('Apagar para todos'),style:'destructive',onPress:()=>Alert.alert(t('Apagar mensagem para todos?'),
   t('O conteúdo ficará identificado como apagado no grupo.'),[{text:t('Cancelar'),style:'cancel'},{text:t('Apagar'),style:'destructive',onPress:()=>{void removeMessage(m);}}])});
  items.push({text:t('Cancelar'),style:'cancel'});
  Alert.alert(own?t('A minha mensagem'):t('Mensagem do grupo'),own?t('Seleciona uma ação.'):t('Como criador do grupo, podes apagar esta mensagem.'),items);
 }
 async function saveEdit(){
  if(!editing||!auth.token||busy)return;
  let text:string;try{text=validateGroupMessage(editText);}catch(e){setActionError(e instanceof Error?e.message:'');return;}
  setBusy(true);setActionError('');
  try{const m=await editGroupMessage(groupId,editing.id,text,auth.token);setMessages(prev=>mergeMessages(prev,[m]));setEditing(null);setEditText('');}
  catch(e){setActionError(e instanceof ApiError&&e.status===409?t('Já não é possível editar: só até 15 minutos após o envio.'):t('Não foi possível editar a mensagem.'));}
  finally{setBusy(false);}
 }
 async function removeMessage(m:PrivateGroupMessage){
  if(!auth.token||busy)return;
  setBusy(true);setActionError('');
  try{await deleteGroupMessage(groupId,m.id,auth.token);setMessages(prev=>prev.map(x=>x.id===m.id?{...x,deleted:true,text:'',attachments:[]}:x));}
  catch{setActionError(t('Não foi possível apagar a mensagem.'));}
  finally{setBusy(false);}
 }
 async function chooseMedia(source:'gallery'|'camera'){
  if(mediaBusy||!filesAvailable)return;
  const remaining=4-media.length;
  if(remaining<=0){setActionError(t('Já selecionaste 4 ficheiros. Remove um antes de adicionares outro.'));return;}
  setActionError('');
  try{
   const ImagePicker=await import('expo-image-picker');
   if(source==='camera'&&!await ensureChatCameraPermission())return;
   const selected=source==='camera'?
    await ImagePicker.launchCameraAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,videoMaxDuration:30}):
    await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:0.8,exif:false,base64:false,allowsMultipleSelection:true,selectionLimit:remaining});
   if(selected.canceled||!selected.assets?.length)return;
   for(const asset of selected.assets){if(asset.type==='image')validateChatPhoto(asset);}
   const result=appendChatMediaSelection(media,selected.assets);
   if(result.error)throw Error(result.error);
   setMedia(result.items as ImagePickerAsset[]);
  }catch(e){setActionError(e instanceof Error?e.message:t('Não foi possível abrir a câmara ou a galeria.'));}
 }
 async function sendMedia(){
  if(mediaBusy||!media.length||!auth.token)return;
  setMediaBusy(true);setActionError('');
  try{await sendChatPhotoAlbum({scope:'private',id:groupId},auth.token,media,replyTarget?.id,caption);
   setMedia([]);setCaption('');setReplyTarget(null);await refresh(false);}
  catch(e){setActionError(e instanceof Error?e.message:t('Não foi possível enviar os ficheiros.'));}
  finally{setMediaBusy(false);}
 }
 async function sendPoll(text:string){
  setPollOpen(false);
  if(sendInFlight.current||!auth.token)return;
  sendInFlight.current=true;setSending(true);setActionError('');
  try{const m=await sendGroupMessage(groupId,text,auth.token);setMessages(prev=>mergeMessages(prev,[m]));}
  catch(e){setActionError(e instanceof Error?e.message:t('Não foi possível enviar a sondagem.'));}
  finally{sendInFlight.current=false;setSending(false);}
 }
 function prepareLocation(){
  if(locationBusy)return;
  Alert.alert(t('Partilhar localização atual?'),t('A Jynlo só consulta a localização nesta ação. O link fica na mensagem para reveres antes de enviar ao grupo.'),[
   {text:t('Cancelar'),style:'cancel'},
   {text:t('Continuar'),onPress:()=>{
    setLocationBusy(true);setActionError('');
    void (async()=>{
     const Location=await import('expo-location');
     const permission=await Location.requestForegroundPermissionsAsync();
     if(permission.status!=='granted')throw Error(t('Não autorizaste o acesso à localização.'));
     const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
     const url='https://www.google.com/maps?q='+point.coords.latitude.toFixed(5)+','+point.coords.longitude.toFixed(5);
     setDraft(previous=>[previous.trim(),url].filter(Boolean).join('\n'));
    })().catch(e=>setActionError(e instanceof Error?e.message:t('Não foi possível obter a localização.'))).finally(()=>setLocationBusy(false));
   }}]);
 }
 async function doRename(){
  if(busy||!auth.token)return;
  try{validateGroupTitle(renameTitle);}catch(e){setActionError(e instanceof Error?e.message:'');return;}
  setBusy(true);setActionError('');
  try{setGroup(await renameGroup(groupId,renameTitle,auth.token));setPanel(null);}
  catch{setActionError(t('Não foi possível alterar o nome do grupo.'));}finally{setBusy(false);}
 }
 async function doAdd(){
  if(busy||!auth.token||!group)return;
  setBusy(true);setActionError('');
  try{setGroup(await addGroupMembers(group,picked,me,auth.token));setPanel(null);setPicked([]);}
  catch(e){setActionError((e instanceof Error&&/30|amigo/.test(e.message)?e.message:t('Não foi possível adicionar os participantes.')));}
  finally{setBusy(false);}
 }
 function askRemove(username:string,displayName:string){
  const leaving=username.toLowerCase()===me.toLowerCase();
  Alert.alert(leaving?t('Sair do grupo'):t('Remover membro'),
   leaving?t('Queres sair deste grupo? Deixarás de receber novas mensagens.'):t('Queres remover {v} do grupo?',{v:displayName}),
   [{text:t('Cancelar'),style:'cancel'},{text:leaving?t('Sair'):t('Remover'),style:'destructive',onPress:()=>{void remove(username,leaving);}}]);
 }
 async function remove(username:string,leaving:boolean){
  if(busy||!auth.token)return;
  setBusy(true);setActionError('');
  try{const g=await removeGroupMember(groupId,username,auth.token);
   if(leaving){router.replace('/groups');return;}
   if(g)setGroup(g);else void refresh(false);}
  catch{setActionError(t('Não foi possível alterar os membros do grupo.'));}finally{setBusy(false);}
 }
 async function choosePhoto(){
  if(busy)return;setActionError('');
  try{
   const ImagePicker=await import('expo-image-picker');
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.75,exif:false,base64:false});
   if(!result.canceled&&result.assets?.[0]){setPhoto(result.assets[0]);setPanel('photo');}
  }catch{setActionError(t('Não foi possível abrir a galeria de fotografias.'));}
 }
 async function savePhoto(){
  if(busy||!photo||!auth.token)return;
  setBusy(true);setActionError('');
  try{setGroup(await uploadGroupPhoto(groupId,auth.token,photo));setPhoto(null);setPanel(null);}
  catch(e){setActionError(e instanceof Error?e.message:t('Não foi possível alterar a fotografia do grupo.'));}
  finally{setBusy(false);}
 }
 async function toggleMute(){
  if(muteBusy||!auth.token)return;
  setMuteBusy(true);
  try{await setConversationMuted('private',String(groupId),!muted,auth.token);setMuted(!muted);}
  catch{setActionError(t('Não foi possível alterar o silêncio desta conversa.'));}finally{setMuteBusy(false);}
 }

 const title=group?.title||(typeof params.title==='string'?params.title:t('Grupo'));
 return <SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
  <Stack.Screen options={{headerShown:false,title}}/>
  <KeyboardFrame style={{flex:1}}>
  <View style={styles.header}>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Voltar')} onPress={()=>router.back()} style={styles.headerIcon}><JynloIcon name="back" size={23} color={C.white}/></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Detalhes do grupo')} accessibilityState={{expanded:infoOpen}} onPress={()=>setInfoOpen(v=>!v)} style={{flex:1,flexDirection:'row',alignItems:'center',gap:10}}>
    <View style={styles.headerAvatar}>{group?.photoUrl?<Image source={{uri:group.photoUrl}} style={styles.headerAvatarImg}/>:<Text style={{fontSize:18}}>👥</Text>}</View>
    <View style={{flex:1}}><Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>{group?<Text style={styles.headerStatus}>{membersLabel(group.members.length)}</Text>:null}</View>
   </Pressable>
   {group?<Pressable accessibilityRole="button" disabled={muteBusy} accessibilityLabel={muted?t('🔕 Ativar notificações'):t('🔔 Silenciar')} onPress={()=>{void toggleMute();}} style={styles.headerIcon}>
    <Text style={{fontSize:19}}>{muted?'🔕':'🔔'}</Text></Pressable>:null}
   {group?<Pressable accessibilityRole="button" accessibilityLabel={t('Detalhes do grupo')} accessibilityState={{expanded:infoOpen}} onPress={()=>setInfoOpen(v=>!v)} style={styles.headerIcon}>
    <JynloIcon name="more" size={22} color={C.mint}/></Pressable>:null}
  </View>
  {group&&(infoOpen||panel)?<ScrollView style={styles.info} contentContainerStyle={{gap:10,padding:12}} keyboardShouldPersistTaps="handled">
   <View style={styles.actions}>
    {creator?<>
     <Pressable accessibilityRole="button" onPress={()=>{setPanel(panel==='rename'?null:'rename');setRenameTitle(group.title);setActionError('');}} style={styles.action}><Text style={styles.actionText}>{t('Alterar nome')}</Text></Pressable>
     <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void choosePhoto();}} style={styles.action}><Text style={styles.actionText}>{t('Alterar fotografia')}</Text></Pressable>
     {group.members.length<MAX_MEMBERS?<Pressable accessibilityRole="button" onPress={()=>{setPanel(panel==='add'?null:'add');setPicked([]);setActionError('');}} style={styles.action}><Text style={styles.actionText}>{t('＋ Adicionar membros')}</Text></Pressable>:null}
    </>:<Pressable accessibilityRole="button" disabled={busy} onPress={()=>askRemove(me,me)} style={styles.action}><Text style={[styles.actionText,{color:C.danger}]}>{t('Sair do grupo')}</Text></Pressable>}
   </View>
   <View style={styles.chips}>
    {group.members.map(m=><View key={m.username} style={styles.chip}>
     <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/social/[username]',params:{username:m.username}})}>
      <Text style={styles.chipText} numberOfLines={1}>{m.displayName}{m.admin?' ★':''}</Text></Pressable>
     {creator&&!m.admin?<Pressable accessibilityRole="button" accessibilityLabel={t('Remover membro: {v}',{v:m.displayName})} hitSlop={10}
      disabled={busy} onPress={()=>askRemove(m.username,m.displayName)}><Text style={styles.chipX}>×</Text></Pressable>:null}
    </View>)}
   </View>
   {auth.token?<AvailabilityPanel kind="private" targetId={groupId} token={auth.token}/>:null}
   {panel==='rename'?<View style={styles.panel}>
    <Text style={styles.label}>{t('Nome do grupo')}</Text>
    <TextInput value={renameTitle} onChangeText={setRenameTitle} maxLength={90} editable={!busy} style={styles.input} accessibilityLabel={t('Novo nome do grupo')}/>
    <Button title={busy?t('A guardar…'):t('Alterar nome')} disabled={busy||renameTitle.trim().length<2} onPress={()=>{void doRename();}}/>
    <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setPanel(null)}/>
   </View>:null}
   {panel==='photo'&&photo?<View style={styles.panel}>
    <Text style={styles.label}>{t('Nova fotografia do grupo')}</Text>
    <Image source={{uri:photo.uri}} style={styles.photoPreview} accessibilityLabel={t('Pré-visualização da fotografia do grupo')}/>
    <Button title={busy?t('A enviar…'):t('Guardar fotografia')} disabled={busy} onPress={()=>{void savePhoto();}}/>
    <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setPanel(null);setPhoto(null);}}/>
   </View>:null}
   {panel==='add'&&auth.token?<View style={styles.panel}>
    <Text style={styles.muted}>{t('Escolhe os amigos que queres juntar a esta conversa.')}</Text>
    <FriendPicker token={auth.token} group={group} selected={picked} onChange={setPicked} disabled={busy} max={MAX_MEMBERS-group.members.length}/>
    <Button title={busy?t('A adicionar…'):t('Adicionar ao grupo')} disabled={busy||!picked.length} onPress={()=>{void doAdd();}}/>
    <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setPanel(null)}/>
   </View>:null}
  </ScrollView>:null}
  <ScrollView ref={historyRef} style={{flex:1}} contentContainerStyle={styles.history} keyboardShouldPersistTaps="handled"
   onContentSizeChange={()=>{if(!loadingOlder)historyRef.current?.scrollToEnd({animated:false});}}>
  {loading?<Loader/>:null}
  {gone?<><Message>{t('Já não fazes parte deste grupo ou ele deixou de existir.')}</Message><Button title={t('Ver os meus grupos')} onPress={()=>router.replace('/groups')}/></>:null}
  {error?<><Message tone="error">{error}</Message><Button secondary title={t('Tentar novamente')} onPress={()=>{setLoading(true);void refresh(true);}}/></>:null}
  {group?<>
   {hasMore?<Pressable accessibilityRole="button" disabled={loadingOlder} onPress={()=>{void older();}} style={styles.more}>
    {loadingOlder?<ActivityIndicator color={C.mint}/>:<Text style={styles.moreText}>{t('Carregar mensagens anteriores')}</Text>}</Pressable>:null}
   {!loading&&!messages.length?<Text style={[styles.muted,{textAlign:'center',paddingVertical:16}]}>{t('Ainda não há mensagens neste grupo.')}</Text>:null}
   {auth.token?<ChatSearchPanel kind="private" conversationId={String(groupId)} token={auth.token}/>:null}
   {messages.map(m=>{const mine=isMine(m,me);const quote=replyQuote(messages,m);const gif=!m.deleted?giphyImageUrl(m.text):null;
    const files=chatAttachmentList({...m,deletedAt:m.deleted?m.createdAt:null});
    const location=!m.deleted?chatLocationUrl(m.text):null;
    const onlyFileName=files.length>0&&(!m.text||m.text.startsWith('📎 '));
    return <View key={m.id} style={[styles.message,mine&&styles.mine]}>
    {!mine?<Text style={styles.sender}>{group.members.find(x=>x.username.toLowerCase()===m.sender.toLowerCase())?.displayName||m.sender}</Text>:null}
    {quote?<Text style={[styles.quote]} numberOfLines={2}>{quote.sender?quote.sender+': ':''}{quote.text}</Text>:null}
    {m.deleted?<Text style={[styles.text,styles.deleted]}>{t('Mensagem apagada')}</Text>:
     gif?<Image source={{uri:gif}} resizeMode="contain" style={styles.gif} accessibilityLabel={t('GIF enviado no grupo')}/>:
     readPoll(m.text)?<PollCard poll={readPoll(m.text)!} kind="private" conversationId={groupId} messageId={m.id} token={auth.token}/>:
     onlyFileName?null:<Text style={[styles.text]} selectable>{m.text}</Text>}
    {files.map(file=><SecureChatAttachment key={file.index} index={file.index} scope="private" conversationId={groupId} messageId={m.id}
     token={auth.token} name={file.name} mime={file.mime} size={file.size} onAuthorizationError={()=>{void refresh(true);}}/>)}
    {location?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir localização partilhada no Google Maps')}
     onPress={()=>void Linking.openURL(location).catch(()=>Alert.alert(t('Localização'),t('Não foi possível abrir o mapa.')))} style={styles.msgAction}>
     <JynloIcon name="location" size={15} color={C.mint}/><Text style={[styles.msgActionText]}>{t('Abrir localização no mapa')}</Text></Pressable>:null}
    {!m.deleted?<View style={styles.msgActions}>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Responder à mensagem de {v}',{v:m.sender})}
      onPress={()=>{setEditing(null);setReplyTarget({id:m.id,sender:m.sender,text:(m.text||files[0]?.name||t('Anexo')).slice(0,150)});}} style={styles.msgAction}>
      <JynloIcon name="reply" size={15} color={C.mint}/><Text style={[styles.msgActionText]}>{t('Responder')}</Text></Pressable>
     {mine||creator?<Pressable accessibilityRole="button" accessibilityLabel={t('Opções da mensagem')} disabled={busy} onPress={()=>messageOptions(m)} style={styles.msgAction}>
      <JynloIcon name="more" size={18} color={C.mint}/></Pressable>:null}
    </View>:null}
    {!m.deleted?<ChatReactionRow id={m.id} summary={reactions.summaries[m.id]} busy={reactions.busyIds.has(m.id)} disabled={!auth.token} onReact={reactions.react} onInspect={reactions.inspect}/>:null}
    <Text style={[styles.time]}>{time(m.createdAt)}{m.editedAt&&!m.deleted?' · '+t('editada'):''}</Text>
   </View>;})}
   {actionError?<Message tone="error">{actionError}</Message>:null}
  </>:null}
  </ScrollView>
  {group?<View style={styles.footer}>
   {editing?<View style={styles.panel}>
    <Text style={styles.label}>{t('Editar mensagem · até 15 minutos após o envio')}</Text>
    <TextInput multiline maxLength={MAX_MESSAGE} value={editText} onChangeText={setEditText} editable={!busy} style={styles.input} accessibilityLabel={t('Editar mensagem')}/>
    <Button title={busy?t('A guardar…'):t('Guardar edição')} disabled={busy||!editText.trim()} onPress={()=>{void saveEdit();}}/>
    <Button secondary title={t('Cancelar edição')} disabled={busy} onPress={()=>{setEditing(null);setEditText('');}}/>
   </View>:null}
   {replyTarget?<ChatReplyPreview sender={replyTarget.sender} body={replyTarget.text} onCancel={()=>setReplyTarget(null)} disabled={sending||mediaBusy}/>:null}
   {media.length?<View style={styles.panel}>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
     {media.map((file,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={t('Remover ficheiro {v}',{v:(index+1)})} disabled={mediaBusy}
      onPress={()=>setMedia(list=>list.filter((_,i)=>i!==index))} style={{width:80,gap:3}}>
      {file.type==='video'?<View style={styles.videoThumb}><JynloIcon name="video" color={C.white} size={19}/></View>:<Image source={{uri:file.uri}} style={{width:80,height:80,borderRadius:10}}/>}
      <Text style={styles.muted}>{t('Remover')}</Text></Pressable>)}
    </View>
    <Text style={styles.muted}>{t('{a}/4 ficheiros · fotografias até 5 MB, vídeos até 20 MB.',{a:media.length})}</Text>
    <TextInput multiline maxLength={2000} value={caption} onChangeText={setCaption} editable={!mediaBusy} placeholder={t('Legenda (opcional)')} placeholderTextColor={C.muted} style={styles.input} accessibilityLabel={t('Legenda dos anexos')}/>
    <Button title={mediaBusy?t('A enviar ficheiros…'):t('Enviar ficheiros')} disabled={mediaBusy} onPress={()=>{void sendMedia();}}/>
    <Button secondary title={t('Cancelar anexos')} disabled={mediaBusy} onPress={()=>{setMedia([]);setCaption('');}}/>
   </View>:null}
   <View style={[styles.tools,!attachOpen&&{display:'none'}]}>
    {filesAvailable?<Pressable accessibilityRole="button" accessibilityLabel={t('Selecionar fotografias ou vídeos')} disabled={mediaBusy||sending||media.length>=4}
     onPress={()=>{void chooseMedia('gallery');}} style={styles.tool}><JynloIcon name="gallery" size={23} color={C.mint}/></Pressable>:null}
    {filesAvailable?<Pressable accessibilityRole="button" accessibilityLabel={t('Abrir câmara')} disabled={mediaBusy||sending||media.length>=4}
     onPress={()=>{void chooseMedia('camera');}} style={styles.tool}><JynloIcon name="camera" size={23} color={C.mint}/></Pressable>:null}
    {filesAvailable?<ChatPdfComposer compact target={{scope:'private',id:groupId}} token={auth.token} enabled={!sending&&!mediaBusy} replyId={replyTarget?.id}
     onSent={async()=>{setReplyTarget(null);await refresh(false);}}/>:null}
    <Pressable accessibilityRole="button" accessibilityLabel={locationBusy?t('A obter localização…'):t('Partilhar localização atual')} disabled={locationBusy||sending}
     onPress={prepareLocation} style={styles.tool}><JynloIcon name="location" size={23} color={C.mint}/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Criar sondagem')} disabled={sending}
     onPress={()=>setPollOpen(true)} style={styles.tool}><Text style={{fontSize:20}}>📊</Text></Pressable>
    <PollComposer visible={pollOpen} onClose={()=>setPollOpen(false)} onSend={text=>{void sendPoll(text);}}/>
   </View>
   <View style={styles.composer}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:attachOpen}} accessibilityLabel={attachOpen?t('Fechar anexos'):t('Abrir anexos')}
     onPress={()=>setAttachOpen(v=>!v)} style={styles.plus}><JynloIcon name={attachOpen?'close':'plus'} size={24} color={C.mint}/></Pressable>
    <TextInput onFocus={()=>setAttachOpen(false)} value={draft} onChangeText={setDraft} multiline maxLength={MAX_MESSAGE} editable={!sending}
     placeholder={t('Escreve uma mensagem ao grupo…')} placeholderTextColor={C.muted} style={styles.input} accessibilityLabel={t('Mensagem para o grupo')}/>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Enviar')} disabled={sending||!draft.trim()} onPress={()=>{void send();}}
     style={[styles.send,(sending||!draft.trim())&&{opacity:.5}]}>
     {sending?<ActivityIndicator color={C.background}/>:<JynloIcon name="send" size={22} color={C.background}/>}</Pressable>
   </View>
  </View>:null}
  </KeyboardFrame>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 ...chatLook,
 screen:{flex:1,backgroundColor:C.background},
 headerAvatar:{width:36,height:36,borderRadius:18,backgroundColor:C.surface,alignItems:'center',justifyContent:'center',overflow:'hidden'},headerAvatarImg:{width:36,height:36},
 headerTitle:{fontSize:17,fontWeight:'900',color:C.white},headerStatus:{fontSize:11,color:C.muted},
 info:{maxHeight:'48%',borderBottomWidth:1,borderBottomColor:C.border},
 history:{paddingHorizontal:10,paddingTop:10,paddingBottom:12,gap:6,flexGrow:1},
 quote:{color:C.muted,fontSize:12,lineHeight:17,borderLeftWidth:3,borderLeftColor:C.mint,paddingLeft:8,marginBottom:4},
 deleted:{fontStyle:'italic',opacity:.75},
 gif:{width:220,height:160,borderRadius:12},
 msgActions:{flexDirection:'row',justifyContent:'flex-end',gap:6},
 msgAction:{flexDirection:'row',alignItems:'center',gap:5,minHeight:36,paddingHorizontal:6},
 msgActionText:{color:C.mint,fontSize:12,fontWeight:'800'},
 tools:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},
 tool:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 videoThumb:{width:80,height:80,borderRadius:10,backgroundColor:'#173039',alignItems:'center',justifyContent:'center'},
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
 photoPreview:{width:140,height:140,borderRadius:70,alignSelf:'center',backgroundColor:C.border},
 input:{minHeight:48,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface},
 more:{minHeight:42,alignItems:'center',justifyContent:'center'},moreText:{color:C.mint,fontWeight:'800'},
 sender:{color:C.mint,fontSize:12,fontWeight:'800'},text:{color:C.white,fontSize:15,lineHeight:21},
 time:{color:C.muted,fontSize:11,alignSelf:'flex-end'},
});
