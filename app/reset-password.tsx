import React,{useRef,useState} from 'react';
import {t} from '../src/lib/i18n';
import {StyleSheet,Text,TextInput} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,Eyebrow,Message,Page} from '../src/components/UI';
import {confirmNativePasswordReset,initiateNativePasswordReset} from '../src/lib/native-registration';
import {C} from '../src/lib/theme';

export default function ResetPasswordScreen(){
 const router=useRouter();
 const params=useLocalSearchParams<{token?:string}>();
 const [email,setEmail]=useState('');
 const [token,setToken]=useState(typeof params.token==='string'?params.token:'');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const requestInFlight=useRef(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 async function requestReset(){
  if(requestInFlight.current||!email.trim())return;
  requestInFlight.current=true;setBusy(true);setError('');setMessage('');
  try{await initiateNativePasswordReset(email);setMessage(t('Se o email estiver associado a uma conta, receberás instruções de recuperação.'));}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível pedir a recuperação.'));}
  finally{requestInFlight.current=false;setBusy(false);}
 }
 async function finishReset(){
  if(requestInFlight.current)return;
  if(!token.trim()||password.length<8||password.length>128||password!==confirmPassword){
   setError(t('Introduz o código recebido por email e duas palavras-passe iguais (8 a 128 caracteres).'));return;
  }
  requestInFlight.current=true;setBusy(true);setError('');setMessage('');
  try{await confirmNativePasswordReset(token,password);setPassword('');setConfirmPassword('');setToken('');
   setMessage(t('Palavra-passe alterada. Já podes iniciar sessão.'));}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível alterar a palavra-passe.'));}
  finally{requestInFlight.current=false;setBusy(false);}
 }
 return <Page>
  <Brand subtitle={t('SEGURANÇA DA CONTA')}/>
  <Eyebrow>{t('RECUPERAR ACESSO')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Recupera a tua conta.')}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {message?<Message>{message}</Message>:null}
  <Text style={styles.label}>{t('Email da tua conta')}</Text>
  <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none"
   autoComplete="email" keyboardType="email-address" placeholder={t('o.teu@email.com')} placeholderTextColor={C.muted}/>
  <Button title={busy?t('A enviar…'):t('Enviar email de recuperação')} onPress={()=>{void requestReset();}} disabled={busy||!email.trim()}/>
  <Text style={styles.hint}>{t('Recebeste um link de recuperação? Introduz abaixo o código indicado nesse email e escolhe a nova palavra-passe.')}</Text>
  <Text style={styles.label}>{t('Token de recuperação')}</Text>
  <TextInput style={styles.input} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholderTextColor={C.muted} placeholder={t('Token do email')}/>
  <Text style={styles.label}>{t('Nova palavra-passe')}</Text>
  <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholderTextColor={C.muted} placeholder={t('Mínimo 8 caracteres')}/>
  <Text style={styles.label}>{t('Confirmar nova palavra-passe')}</Text>
  <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" placeholderTextColor={C.muted} placeholder={t('Repetir palavra-passe')}/>
  <Button title={busy?t('A guardar…'):t('Alterar palavra-passe')} disabled={busy} onPress={()=>{void finishReset();}}/>
  <Button title={t('Voltar ao login')} secondary onPress={()=>router.replace('/login')}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:29,fontWeight:'900',color:C.white},
 label:{fontSize:13,fontWeight:'800',color:C.white},
 hint:{fontSize:13,lineHeight:20,color:C.muted},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:14,color:C.white}
});
