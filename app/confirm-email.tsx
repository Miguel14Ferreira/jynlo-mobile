import React,{useState} from 'react';
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
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [lastResend,setLastResend]=useState(0);
 async function confirm(){
  if(busy||!token.trim())return;
  setBusy(true);setError('');setMessage('');
  try{await confirmNativeEmail(token);setMessage('Email confirmado! Já podes iniciar sessão na Jynlo.');}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível confirmar o email.');}
  finally{setBusy(false);}
 }
 async function resend(){
  if(busy||!username.trim()||Date.now()-lastResend<60000)return;
  setBusy(true);setError('');setMessage('');
  try{await resendRegistrationConfirmation(username);setLastResend(Date.now());setMessage('Se a conta existir, receberás um email de confirmação.');}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível reenviar o email.');}
  finally{setBusy(false);}
 }
 return <Page>
  <Brand subtitle="CONFIRMAÇÃO DE CONTA"/>
  <Eyebrow>VALIDAÇÃO DO EMAIL</Eyebrow>
  <Text style={styles.headline}>Confirma o teu endereço.</Text>
  <Text style={styles.hint}>Recebeste uma ligação de confirmação por email. Podes introduzir aqui o token da ligação para confirmar diretamente na app.</Text>
  {error?<Message tone="error">{error}</Message>:null}
  {message?<Message>{message}</Message>:null}
  <Text style={styles.label}>Token de confirmação</Text>
  <TextInput style={styles.input} value={token} onChangeText={setToken} autoCapitalize="none"
   autoCorrect={false} placeholder="Token recebido por email" placeholderTextColor={C.muted}/>
  <Button title={busy?'A confirmar…':'Confirmar email'} disabled={!token.trim()||busy} onPress={()=>{void confirm();}}/>
  <Text style={styles.label}>Não recebeste o email?</Text>
  <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Nome de utilizador" placeholderTextColor={C.muted}/>
  <Button title="Reenviar confirmação" secondary disabled={busy||!username.trim()||Date.now()-lastResend<60000} onPress={()=>{void resend();}}/>
  <Button title="Voltar ao login" secondary onPress={()=>router.replace('/login')}/>
 </Page>;
}
const styles=StyleSheet.create({
 headline:{fontSize:29,fontWeight:'900',color:C.white},
 hint:{fontSize:13,lineHeight:20,color:C.muted},
 label:{fontSize:13,fontWeight:'800',color:C.white},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:14,color:C.white}
});
