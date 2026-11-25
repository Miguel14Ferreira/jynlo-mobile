import React,{useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t} from '../lib/i18n';
import {Button} from './UI';
import {messageAvailability} from '../lib/message-requests-api';

const REASONS:Record<string,string>={BLOCKED:'Não é possível enviar mensagens a esta pessoa.',
 DECLINED:'Esta pessoa não aceitou o teu pedido de mensagem.',ONLY_FOLLOWING:'Esta pessoa só recebe mensagens de quem segue.',
 ONLY_COMMUNITIES:'Esta pessoa só recebe mensagens de quem está nas mesmas comunidades.'};

/** "Mensagem" on a profile: opens the chat when allowed, otherwise sends one message as a request. */
export function ProfileMessageAction({username,token}:{username:string;token:string}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[sent,setSent]=useState(false),[note,setNote]=useState('');
 async function start(){
  if(busy)return;setBusy(true);setNote('');
  try{
   const a=await messageAvailability(username,token);
   if(a.mode==='DIRECT')router.push({pathname:'/messages/[peer]',params:{peer:username}});
   else if(a.mode==='RECEIVED'){setNote(t('Esta pessoa já te enviou um pedido de mensagem: aceita-o em Mensagens.'));router.push('/messages/requests');}
   else if(a.mode==='PENDING'){setSent(true);setNote(t('Já enviaste um pedido. Quando for aceite, a conversa aparece em Mensagens.'));}
   // Instagram style: open a conversation screen; the first message goes as a request.
   else if(a.mode==='REQUEST')router.push({pathname:'/messages/request/[peer]',params:{peer:username}});
   else setNote(t(REASONS[a.reason||'']||'Não é possível enviar mensagens a esta pessoa.'));
  }catch{setNote(t('Não foi possível verificar. Tenta novamente.'));}
  finally{setBusy(false);}
 }
 return <View style={styles.box}>
  <Button secondary title={busy?t('A verificar…'):sent?t('Pedido de mensagem enviado'):t('Mensagem')} disabled={busy} onPress={()=>{void start();}}/>
  {note?<Text style={styles.note}>{note}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{gap:8},
 note:{color:'#9FD9CB',fontSize:12,lineHeight:17},
});
