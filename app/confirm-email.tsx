import React,{useRef,useState} from 'react';
import {t} from '../src/lib/i18n';
import {StyleSheet,Text,TextInput} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,Eyebrow,Message,Page} from '../src/components/UI';
import {confirmNativeEmail,resendRegistrationConfirmation} from '../src/lib/native-registration';
import {C} from '../src/lib/theme';

export default function ConfirmEmailScreen(){
 const router=useRouter();
 const params=useLocalSearchParams<{token?:string;username?:string}>();
 const [token,setToken]=useState(typeof params.token==='string'?params.token:'');
 const [username,setUsername]=useState(typeof params.username==='string'?params.username:'');
 const requestInFlight=useRef(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [lastResend,setLastResend]=useState(0);
 async function confirm(){
  if(requestInFlight.current||!token.trim())return;
  requestInFlight.current=true;setBusy(true);setError('');setMessage('');
  try{await confirmNativeEmail(token);setMessage(t('Email confirmado! Já podes iniciar sessão na Jynlo.'));}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível confirmar o email.'));}
  finally{requestInFlight.current=false;setBusy(false);}
 }
 async function resend(){
  if(requestInFlight.current||!username.trim()||Date.now()-lastResend<60000)return;
  requestInFlight.current=true;setBusy(true);setError('');setMessage('');
  try{await resendRegistrationConfirmation(username);setLastResend(Date.now());setMessage(t('Se a conta existir, receberás um email de confirmação.'));}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível reenviar o email.'));}
  finally{requestInFlight.current=false;setBusy(false);}
 }
 return <Page>
  <Brand subtitle={t('CONFIRMAÇÃO DE CONTA')}/>
  <Eyebrow>{t('VALIDAÇÃO DO EMAIL')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.headline}>{t('Confirma o teu endereço.')}</Text>
  <Text style={styles.hint}>{t('Recebeste uma ligação de confirmação por email. Se a ligação não abrir a app, copia o código que vem no email e cola-o aqui.')}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {message?<Message>{message}</Message>:null}
  <Text style={styles.label}>{t('Token de confirmação')}</Text>
  <TextInput style={styles.input} value={token} onChangeText={setToken} autoCapitalize="none"
   autoCorrect={false} placeholder={t('Token recebido por email')} placeholderTextColor={C.muted}/>
  <Button title={busy?t('A confirmar…'):t('Confirmar email')} disabled={!token.trim()||busy} onPress={()=>{void confirm();}}/>
  <Text style={styles.label}>{t('Não recebeste o email?')}</Text>
  <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder={t('Nome de utilizador')} placeholderTextColor={C.muted}/>
  <Button title={t('Reenviar confirmação')} secondary disabled={busy||!username.trim()||Date.now()-lastResend<60000} onPress={()=>{void resend();}}/>
  <Button title={t('Voltar ao login')} secondary onPress={()=>router.replace('/login')}/>
 </Page>;
}
const styles=StyleSheet.create({
 headline:{fontSize:29,fontWeight:'900',color:C.white},
 hint:{fontSize:13,lineHeight:20,color:C.muted},
 label:{fontSize:13,fontWeight:'800',color:C.white},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:14,color:C.white}
});
