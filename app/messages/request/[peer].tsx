import React,{useEffect,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {t} from '../../../src/lib/i18n';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import {Message,Page} from '../../../src/components/UI';
import {JynloIcon} from '../../../src/components/JynloIcon';
import {publicSportsProfile} from '../../../src/lib/social-relations-api';
import {resolveJynloMedia} from '../../../src/lib/social-feed-api';
import {messageAvailability,sendMessageRequest} from '../../../src/lib/message-requests-api';

/** New conversation with someone who is not a friend (Instagram style): the first message goes as a request. */
export default function MessageRequestCompose(){
 const {peer}=useLocalSearchParams<{peer:string}>();
 const username=String(peer||'');
 const auth=useAuth(),router=useRouter();
 const [photo,setPhoto]=useState<string|null>(null),[fullName,setFullName]=useState('');
 const [text,setText]=useState(''),[sentText,setSentText]=useState(''),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false);
 useEffect(()=>{
  if(!auth.token||!username)return;
  let active=true;
  void publicSportsProfile(username,auth.token).then(p=>{if(!active)return;setPhoto(resolveJynloMedia(p?.profilePicUrl));setFullName(p?.fullName||'');}).catch(()=>{});
  void messageAvailability(username,auth.token).then(a=>{
   if(!active)return;
   if(a.mode==='DIRECT'){router.replace({pathname:'/messages/[peer]',params:{peer:username}});return;}
   if(a.mode==='PENDING'){setBlocked(true);setNote(t('Já enviaste um pedido. Quando for aceite, a conversa aparece em Mensagens.'));}
   else if(a.mode==='RECEIVED'){setBlocked(true);setNote(t('Esta pessoa já te enviou um pedido de mensagem: aceita-o em Mensagens.'));}
   else if(a.mode==='NOT_ALLOWED'){setBlocked(true);setNote(t('Não é possível enviar mensagens a esta pessoa.'));}
  }).catch(()=>{});
  return()=>{active=false;};
 },[username,auth.token,router]);
 async function send(){
  const body=text.trim();
  if(!auth.token||!body||busy||blocked)return;
  setBusy(true);setNote('');
  try{await sendMessageRequest(username,body,auth.token);setSentText(body);setText('');}
  catch(e){setNote(e instanceof Error?e.message:t('Não foi possível enviar o pedido.'));}
  finally{setBusy(false);}
 }
 if(!auth.token)return <Page><Message tone="error">{t('Inicia sessão para continuar.')}</Message></Page>;
 const initials=(username.match(/[\p{L}\p{N}]/u)?.[0]||'?').toUpperCase();
 return <Page scroll={false}>
  <ScrollView style={{flex:1}} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
   <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/social/[username]',params:{username}})} style={styles.intro}>
    {photo?<Image source={{uri:photo}} style={styles.bigAvatar}/>:<View style={styles.bigAvatar}><Text maxFontSizeMultiplier={1.3} style={styles.bigLetter}>{initials}</Text></View>}
    <Text style={styles.name}>@{username}</Text>
    {fullName?<Text style={styles.muted}>{fullName}</Text>:null}
    <Text style={styles.hint}>{t('Ainda não são amigos: a tua primeira mensagem chega como pedido de mensagem.')}</Text>
   </Pressable>
   {sentText?<>
    <View style={styles.bubble}><Text style={styles.bubbleText}>{sentText}</Text></View>
    <Text style={styles.status}>{t('Pedido enviado. Quando for aceite, a conversa aparece em Mensagens.')}</Text>
   </>:null}
   {note?<Text style={styles.warn}>{note}</Text>:null}
  </ScrollView>
  {!sentText&&!blocked?<View style={styles.composer}>
   <TextInput value={text} onChangeText={setText} maxLength={1000} multiline placeholder={t('Escreve uma mensagem…')} placeholderTextColor={C.muted}
    style={styles.input} accessibilityLabel={t('Mensagem')}/>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Enviar')} disabled={busy||!text.trim()} onPress={()=>{void send();}}
    style={[styles.send,(busy||!text.trim())&&{opacity:.45}]}>
    <JynloIcon name="send" size={20} color="#062B2E"/>
   </Pressable>
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 body:{flexGrow:1,justifyContent:'flex-end',gap:10,paddingVertical:12},
 intro:{alignItems:'center',gap:6,marginBottom:8},
 bigAvatar:{width:84,height:84,borderRadius:42,backgroundColor:'#163F4D',alignItems:'center',justifyContent:'center'},
 bigLetter:{color:'#BFF7E9',fontSize:28,fontWeight:'800'},
 name:{color:C.white,fontSize:18,fontWeight:'800'},
 muted:{color:C.muted,fontSize:13},
 hint:{color:'#9FD9CB',fontSize:13,textAlign:'center',maxWidth:280,lineHeight:18},
 bubble:{alignSelf:'flex-end',maxWidth:'80%',paddingHorizontal:13,paddingVertical:9,borderRadius:18,borderBottomRightRadius:4,backgroundColor:'#0E5458'},
 bubbleText:{color:C.white,fontSize:15,lineHeight:20},
 status:{alignSelf:'flex-end',color:C.muted,fontSize:12},
 warn:{alignSelf:'center',color:'#FFD2A8',fontSize:13,textAlign:'center'},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:8,paddingTop:8},
 input:{flex:1,minHeight:44,maxHeight:120,borderRadius:22,borderWidth:1,borderColor:C.border,color:C.white,backgroundColor:C.surface2,paddingHorizontal:14,paddingVertical:10},
 send:{width:44,height:44,borderRadius:22,backgroundColor:C.mint,alignItems:'center',justifyContent:'center'},
});
