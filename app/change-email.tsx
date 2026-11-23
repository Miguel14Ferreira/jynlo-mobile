import React,{useState} from 'react';
import {t} from '../src/lib/i18n';
import {StyleSheet,Text,TextInput} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Eyebrow,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {ApiError,DEMO_MODE,request} from '../src/lib/api';
import {C} from '../src/lib/theme';

/** The email changes only after the link sent to the new address is opened. */
export default function ChangeEmailScreen(){
 const router=useRouter(),auth=useAuth();
 const [newEmail,setNewEmail]=useState('');
 const [currentPassword,setCurrentPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [sentTo,setSentTo]=useState('');
 async function submit(){
  const email=newEmail.trim();
  if(busy||!auth.token||DEMO_MODE||!email)return;
  setError('');setBusy(true);
  try{
   await request('/api/profile/me/email-change',{token:auth.token,method:'POST',body:{newEmail:email,currentPassword:currentPassword||null}});
   setSentTo(email);setNewEmail('');
  }catch(e){
   setError(e instanceof ApiError&&e.status===400&&e.message&&e.message.length<200?e.message
    :t('Não foi possível pedir a alteração. Tenta novamente.'));
  }finally{setBusy(false);setCurrentPassword('');}
 }
 const editable=!busy&&!!auth.token&&!DEMO_MODE;
 return <Page>
  <Eyebrow>{t('EMAIL DA CONTA')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Mudar email')}</Text>
  <Text style={styles.hint}>{t('Para mudar, confirmamos a tua palavra-passe e o novo endereço.')}</Text>
  {sentTo?<Message>{t('Enviámos um link para {e}. O email só muda quando o abrires.',{e:sentTo})}</Message>:null}
  {error?<Message tone="error">{error}</Message>:null}
  <Text style={styles.label}>{t('Novo email')}</Text>
  <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address"
   autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={editable}/>
  <Text style={styles.label}>{t('Palavra-passe atual')}</Text>
  <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword}
   secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={editable}/>
  <Text style={styles.hint}>{t('Se entras só com Google ou Apple, deixa em branco.')}</Text>
  <Button title={busy?t('A enviar…'):t('Enviar link de confirmação')} onPress={()=>{void submit();}} disabled={!editable||!newEmail.trim()}/>
  <Button title={t('Voltar ao perfil')} secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:28,fontWeight:'900'},
 hint:{color:C.muted,fontSize:13,lineHeight:19},
 label:{color:C.white,fontSize:13,fontWeight:'700'},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:15,color:C.white,fontSize:15}
});
