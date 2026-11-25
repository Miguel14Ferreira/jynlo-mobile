import React,{useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {Button} from './UI';
import {messageAvailability,sendMessageRequest} from '../lib/message-requests-api';

const REASONS:Record<string,string>={BLOCKED:'Não é possível enviar mensagens a esta pessoa.',
 DECLINED:'Esta pessoa não aceitou o teu pedido de mensagem.',ONLY_FOLLOWING:'Esta pessoa só recebe mensagens de quem segue.',
 ONLY_COMMUNITIES:'Esta pessoa só recebe mensagens de quem está nas mesmas comunidades.'};

/** "Mensagem" on a profile: opens the chat when allowed, otherwise sends one message as a request. */
export function ProfileMessageAction({username,token}:{username:string;token:string}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[composing,setComposing]=useState(false),[sent,setSent]=useState(false);
 const [text,setText]=useState(''),[note,setNote]=useState('');
 async function start(){
  if(busy||sent)return;setBusy(true);setNote('');
  try{
   const a=await messageAvailability(username,token);
   if(a.mode==='DIRECT')router.push({pathname:'/messages/[peer]',params:{peer:username}});
   else if(a.mode==='RECEIVED'){setNote(t('Esta pessoa já te enviou um pedido de mensagem: aceita-o em Mensagens.'));router.push('/messages/requests');}
   else if(a.mode==='PENDING'){setSent(true);setNote(t('Já enviaste um pedido. Quando for aceite, a conversa aparece em Mensagens.'));}
   else if(a.mode==='REQUEST')setComposing(true);
   else setNote(t(REASONS[a.reason||'']||'Não é possível enviar mensagens a esta pessoa.'));
  }catch{setNote(t('Não foi possível verificar. Tenta novamente.'));}
  finally{setBusy(false);}
 }
 async function send(){
  if(busy||!text.trim())return;setBusy(true);setNote('');
  try{await sendMessageRequest(username,text.trim(),token);setComposing(false);setSent(true);setText('');setNote(t('Pedido enviado. Quando for aceite, a conversa aparece em Mensagens.'));}
  catch(e){setNote(e instanceof Error?e.message:t('Não foi possível enviar o pedido.'));}
  finally{setBusy(false);}
 }
 return <View style={styles.box}>
  {composing?<>
   <Text style={styles.note}>{t('Ainda não são amigos: a tua mensagem chega como pedido e só depois de aceite podes enviar mais.')}</Text>
   <TextInput value={text} onChangeText={setText} maxLength={1000} multiline placeholder={t('Escreve a tua mensagem…')} placeholderTextColor={C.muted}
    style={styles.input} accessibilityLabel={t('Mensagem')}/>
   <View style={styles.row}>
    <Button title={busy?t('A enviar…'):t('Enviar pedido')} disabled={busy||!text.trim()} onPress={()=>{void send();}}/>
    <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setComposing(false)}/>
   </View>
  </>:<Button secondary title={busy?t('A verificar…'):sent?t('Pedido de mensagem enviado'):t('Mensagem')} disabled={busy} onPress={()=>{void start();}}/>}
  {note?<Text style={styles.note}>{note}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{gap:8},
 row:{flexDirection:'row',gap:8,flexWrap:'wrap'},
 note:{color:'#9FD9CB',fontSize:12,lineHeight:17},
 input:{minHeight:80,borderRadius:12,borderWidth:1,borderColor:C.border,color:C.white,backgroundColor:C.surface2,padding:10,textAlignVertical:'top'},
});
