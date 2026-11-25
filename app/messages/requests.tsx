import React,{useCallback,useEffect,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t} from '../../src/lib/i18n';
import {useAuth} from '../../src/lib/auth';
import {C} from '../../src/lib/theme';
import {Button,Loader,Message,Page} from '../../src/components/UI';
import {resolveJynloMedia} from '../../src/lib/social-feed-api';
import {blockUser} from '../../src/lib/user-safety-api';
import {acceptMessageRequest,declineMessageRequest,incomingMessageRequests,messagePolicy,setMessagePolicy,
 type IncomingMessageRequest,type MessagePolicy} from '../../src/lib/message-requests-api';

const POLICIES:[MessagePolicy,string][]=[['EVERYONE','Toda a gente'],['COMMUNITIES','Só pessoas das minhas comunidades'],['FOLLOWING','Só quem eu sigo']];

/** "Pedidos de mensagem": people who are not friends wrote once; accept, delete or block. */
export default function MessageRequestsScreen(){
 const auth=useAuth(),router=useRouter();
 const [items,setItems]=useState<IncomingMessageRequest[]>([]);
 const [policy,setPolicy]=useState<MessagePolicy|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [blockConfirm,setBlockConfirm]=useState<number|null>(null);
 const token=auth.token;
 const load=useCallback(async()=>{
  if(!token)return;setLoading(true);setError('');
  try{
   const [list,p]=await Promise.all([incomingMessageRequests(token),messagePolicy(token).catch(()=>null)]);
   setItems(list||[]);if(p)setPolicy(p.policy);
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível carregar.'));}
  finally{setLoading(false);}
 },[token]);
 useEffect(()=>{void load();},[load]);
 async function act(work:()=>Promise<unknown>,after:()=>void){
  if(busy)return;setBusy(true);setError('');
  try{await work();after();}catch(e){setError(e instanceof Error?e.message:t('A ação não foi confirmada. Atualiza antes de repetir.'));}
  finally{setBusy(false);}
 }
 if(!token)return <Page><Message tone="error">{t('Inicia sessão para continuar.')}</Message></Page>;
 return <Page>
  <Text style={styles.title}>{t('Pedidos de mensagem')}</Text>
  <Text style={styles.note}>{t('Mensagens de quem ainda não é teu amigo. Só depois de aceitares podem continuar a escrever.')}</Text>
  {policy?<View style={styles.policyBox}>
   <Text style={styles.label}>{t('Quem te pode enviar pedidos')}</Text>
   <View style={styles.row}>{POLICIES.map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{selected:policy===value,disabled:busy}}
     disabled={busy} onPress={()=>{void act(()=>setMessagePolicy(value,token),()=>setPolicy(value));}} style={[styles.chip,policy===value&&styles.chipOn]}>
     <Text style={[styles.chipText,policy===value&&styles.chipTextOn]}>{t(label)}</Text></Pressable>)}</View>
  </View>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&!items.length?<Message>{t('Não tens pedidos de mensagem.')}</Message>:null}
  {items.map(r=><View key={r.id} style={styles.card}>
   <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/social/[username]',params:{username:r.username}})} style={styles.head}>
    <View style={styles.avatar}>{resolveJynloMedia(r.profilePicUrl)?<Image source={{uri:resolveJynloMedia(r.profilePicUrl)!}} style={styles.avatarImg}/>:<Text style={styles.avatarLetter}>{r.username.charAt(0).toUpperCase()}</Text>}</View>
    <View style={{flex:1}}><Text style={styles.name}>@{r.username}</Text>{r.fullName?<Text style={styles.note}>{r.fullName}</Text>:null}</View>
   </Pressable>
   <Text style={styles.body}>{r.text}</Text>
   {blockConfirm===r.id?<View style={styles.confirm}>
     <Text style={styles.note}>{t('Bloquear @{v}? Deixa de te poder contactar.',{v:r.username})}</Text>
     <View style={styles.row}>
      <Button title={t('Sim, bloquear')} disabled={busy} onPress={()=>{setBlockConfirm(null);void act(async()=>{await blockUser(r.username,token);await declineMessageRequest(r.id,token);},()=>setItems(l=>l.filter(x=>x.id!==r.id)));}}/>
      <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setBlockConfirm(null)}/>
     </View>
    </View>:<View style={styles.row}>
     <Button title={t('Aceitar')} disabled={busy} onPress={()=>{void act(()=>acceptMessageRequest(r.id,token),()=>{setItems(l=>l.filter(x=>x.id!==r.id));router.push({pathname:'/messages/[peer]',params:{peer:r.username}});});}}/>
     <Button secondary title={t('Apagar')} disabled={busy} onPress={()=>{void act(()=>declineMessageRequest(r.id,token),()=>setItems(l=>l.filter(x=>x.id!==r.id)));}}/>
     <Button secondary title={t('Bloquear')} disabled={busy} onPress={()=>setBlockConfirm(r.id)}/>
    </View>}
  </View>)}
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:24,fontWeight:'900'},
 note:{color:C.muted,fontSize:12,lineHeight:17},
 label:{color:C.white,fontWeight:'800',fontSize:13},
 body:{color:C.white,fontSize:15,lineHeight:21},
 policyBox:{gap:8},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 chip:{paddingHorizontal:12,minHeight:36,justifyContent:'center',borderRadius:18,borderWidth:1,borderColor:C.border},
 chipOn:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{color:C.white,fontSize:12,fontWeight:'700'},chipTextOn:{color:'#062B2E'},
 card:{gap:10,padding:12,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 head:{flexDirection:'row',alignItems:'center',gap:10},
 avatar:{width:44,height:44,borderRadius:22,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:C.surface2},
 avatarImg:{width:'100%',height:'100%'},avatarLetter:{color:C.mint,fontWeight:'900',fontSize:18},
 name:{color:C.white,fontWeight:'800',fontSize:15},
 confirm:{gap:8},
});
