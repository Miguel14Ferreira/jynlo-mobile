import React,{useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,TextInput} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Eyebrow,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {safeRedirect} from '../src/lib/routes.cjs';
import {C} from '../src/lib/theme';
export default function MfaScreen(){
 const router=useRouter();const auth=useAuth();
 const p=useLocalSearchParams<{redirect?:string}>();
 const redirect=safeRedirect(p.redirect);
 const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [resendAfter,setResendAfter]=useState(0);
 const [now,setNow]=useState(Date.now());
 const secondsUntilResend=Math.max(0,Math.ceil((resendAfter-now)/1000));
 useEffect(()=>{
   if(!resendAfter)return;
   const interval=setInterval(()=>setNow(Date.now()),1000);
   return()=>clearInterval(interval);
 },[resendAfter]);
 async function submit(){if(requestInFlight.current)return;requestInFlight.current=true;setBusy(true);setError('');setNotice('');
   try{await auth.completeMfa(code.trim());setCode('');router.replace(redirect as any);}
   catch(e){setError(e instanceof Error?e.message:'Código não aceite.');}
   finally{requestInFlight.current=false;setBusy(false);}}
 async function requestNewCode(){
   if(requestInFlight.current||secondsUntilResend>0)return;requestInFlight.current=true;setBusy(true);setError('');setNotice('');
   try{await auth.resendMfa();setCode('');setResendAfter(Date.now()+60000);setNow(Date.now());setNotice('Novo código enviado.');}
   catch(e){setError(e instanceof Error?e.message:'Não foi possível reenviar o código. Aguarda um minuto antes de tentar novamente.');}
   finally{requestInFlight.current=false;setBusy(false);}
 }
 return <Page>
   <Eyebrow>SEGURANÇA DA CONTA</Eyebrow>
   <Text style={styles.title}>Verificação em dois passos</Text>
   <Text style={styles.sub}>Introduz o código de verificação associado à tua conta Jynlo.</Text>
   {error?<Message tone="error">{error}</Message>:null}
   {notice?<Message>{notice}</Message>:null}
   <TextInput style={styles.input} value={code} onChangeText={setCode} keyboardType="number-pad"
     autoComplete="one-time-code" placeholder="Código MFA" placeholderTextColor={C.muted}/>
   <Button title={busy?'A verificar…':'Confirmar código'} disabled={busy||!code.trim()||!auth.challengeId} onPress={()=>{void submit();}}/>
   <Button title={secondsUntilResend>0?`Reenviar código (${secondsUntilResend}s)`:'Reenviar código'} secondary disabled={busy||!auth.challengeId||secondsUntilResend>0} onPress={()=>{void requestNewCode();}}/>
   {!auth.challengeId?<Message>Para receberes um código, volta ao ecrã de login.</Message>:null}
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:28,color:C.white,fontWeight:'900'},sub:{color:C.muted,lineHeight:21},
 input:{height:60,paddingHorizontal:18,borderRadius:15,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,color:C.white,fontSize:22,letterSpacing:5,textAlign:'center'},
});
