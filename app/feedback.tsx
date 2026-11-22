import React,{useState} from 'react';
import {Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {t} from '../src/lib/i18n';
import {Button,Eyebrow,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {DEMO_MODE,request} from '../src/lib/api';
import {C} from '../src/lib/theme';
import {buildFeedback} from '../src/lib/feedback-core.cjs';

type Kind='IDEA'|'PROBLEM'|'OTHER';

/** Lets testers and players send ideas or problems straight to the Jynlo team. */
export default function FeedbackScreen(){
 const auth=useAuth();
 const [kind,setKind]=useState<Kind>('IDEA');
 const [name,setName]=useState(auth.username||'');
 const [email,setEmail]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [sent,setSent]=useState(false);
 async function submit(){
  if(busy)return;
  const built=buildFeedback({name,email,message,kind,platform:Platform.OS==='ios'?'iPhone':Platform.OS==='android'?'Android':''});
  if(built.error){setError(t(built.error));return;}
  if(DEMO_MODE){setError(t('Na demonstração as mensagens não são enviadas.'));return;}
  setError('');setBusy(true);
  try{
   await request('/api/ideas/submit',{token:auth.token||undefined,method:'POST',body:built.body});
   setSent(true);setMessage('');
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível enviar. Tenta novamente.'));}
  finally{setBusy(false);}
 }
 const kinds:{id:Kind;label:string}[]=[{id:'IDEA',label:t('Sugestão')},{id:'PROBLEM',label:t('Problema')},{id:'OTHER',label:t('Outro assunto')}];
 return <Page>
  <Eyebrow>{t('A TUA OPINIÃO')}</Eyebrow>
  <Text style={styles.title}>{t('Diz-nos o que achas')}</Text>
  <Text style={styles.muted}>{t('Uma ideia, um erro ou algo que te confundiu: lemos todas as mensagens e respondemos por email.')}</Text>
  {sent?<Message>{t('Obrigado! Recebemos a tua mensagem.')}</Message>:null}
  {error?<Message tone="error">{error}</Message>:null}
  <View style={styles.chips}>
   {kinds.map(k=><Pressable key={k.id} accessibilityRole="radio" accessibilityState={{checked:kind===k.id}}
     onPress={()=>setKind(k.id)} style={[styles.chip,kind===k.id&&styles.chipOn]}>
     <Text style={[styles.chipText,kind===k.id&&styles.chipTextOn]}>{k.label}</Text></Pressable>)}
  </View>
  <Text style={styles.label}>{t('Nome')}</Text>
  <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={120} editable={!busy}
   accessibilityLabel={t('Nome')} placeholderTextColor={C.muted}/>
  <Text style={styles.label}>{t('Email para resposta')}</Text>
  <TextInput style={styles.input} value={email} onChangeText={setEmail} maxLength={255} editable={!busy}
   autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
   accessibilityLabel={t('Email para resposta')} placeholder="nome@email.com" placeholderTextColor={C.muted}/>
  <Text style={styles.label}>{t('Mensagem')}</Text>
  <TextInput style={[styles.input,styles.area]} value={message} onChangeText={setMessage} maxLength={4000} editable={!busy}
   multiline textAlignVertical="top" accessibilityLabel={t('Mensagem')}
   placeholder={kind==='PROBLEM'?t('O que aconteceu e em que ecrã?'):t('Escreve aqui a tua ideia')} placeholderTextColor={C.muted}/>
  <Button title={busy?t('A enviar…'):t('Enviar')} disabled={busy} onPress={()=>{void submit();}}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:24,fontWeight:'900'},
 muted:{color:C.muted,fontSize:14,lineHeight:20},
 label:{color:C.white,fontSize:14,fontWeight:'800',marginTop:4},
 input:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:'#45B9AE55',backgroundColor:C.surface2,color:C.white,paddingHorizontal:14,fontSize:16},
 area:{minHeight:140,paddingTop:12},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:'#45B9AE55'},
 chipOn:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{color:C.white,fontWeight:'800'},chipTextOn:{color:C.background}
});
