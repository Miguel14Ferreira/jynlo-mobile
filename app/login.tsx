import React,{useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../src/components/UI';
import {DEMO_MODE} from '../src/lib/api';
import {useAuth} from '../src/lib/auth';
import {chooseGoogleIdentity} from '../src/lib/google-credential';
import {safeRedirect} from '../src/lib/routes.cjs';
import {C} from '../src/lib/theme';
export default function LoginScreen(){
 const auth=useAuth();const router=useRouter();
 const params=useLocalSearchParams<{redirect?:string}>();
 const redirect=safeRedirect(params.redirect);
 const [username,setUsername]=useState('');const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function doGoogleLogin(){
   if(busy||auth.username)return;
   setError('');setBusy(true);
   try{
     const credential=await chooseGoogleIdentity();
     if(!credential)return; // user cancelled Google picker
     const outcome=await auth.loginGoogle(credential);
     if(outcome==='ONBOARDING_REQUIRED')router.replace({pathname:'/google-onboarding',params:{redirect}});
     else if(outcome==='MFA_REQUIRED')router.replace({pathname:'/mfa',params:{redirect}});
     else router.replace(redirect as any);
   }catch(e){setError(e instanceof Error?e.message:'Não foi possível iniciar sessão com a Google.');}
   finally{setBusy(false);}
 }
 async function doLogin(){
   if(busy)return;setError('');setBusy(true);
   try{const outcome=await auth.login(username.trim(),password);
      setPassword('');
      if(outcome==='MFA_REQUIRED')router.replace({pathname:'/mfa',params:{redirect}});
      else router.replace(redirect as any);
   }catch(e){setError(e instanceof Error?e.message:'Não foi possível iniciar sessão.');}
   finally{setBusy(false);}
 }
 function demoAs(name:string){try{auth.loginDemo(name);router.replace(redirect as any);}catch(e){setError(e instanceof Error?e.message:'Inicia sessão novamente.');}}
 return <Page>
   <Brand subtitle="ENTRA NO JOGO"/>
   <DemoBanner/>
   <Eyebrow>A TUA CONTA</Eyebrow>
   {auth.username?<Message>Já tens sessão iniciada como {auth.username}. Termina essa sessão no Perfil antes de entrares com outra conta.</Message>:null}
   <Text style={styles.headline}>Joga com a tua malta.</Text>
   <Text style={styles.sub}>{DEMO_MODE?'Esta APK usa apenas personagens fictícias. As contas reais não funcionam nesta demonstração.':'Entra com Google ou utiliza a tua conta Jynlo para participares nas sessões.'}</Text>
   {error?<Message tone="error">{error}</Message>:null}
   {auth.username?null:DEMO_MODE?<View style={styles.demoPanel}>
     <Text style={styles.panelTitle}>Experimentar com personagens fictícias</Text>
     <Text style={styles.sub}>Escolhe um dos amigos do anúncio. A inscrição é simulada apenas neste dispositivo.</Text>
     <Button title="Continuar como Tiago" onPress={()=>demoAs('Tiago')}/>
     <Button title="Continuar como André" secondary onPress={()=>demoAs('André')}/>
   </View>:<View style={{gap:15}}>
     <Button title={busy?'A autenticar…':'Continuar com Google'} onPress={()=>{void doGoogleLogin();}} disabled={busy}/>
     <Text style={styles.separator}>ou entra com utilizador e palavra-passe</Text>
     <TextInput style={styles.input} placeholder="Nome de utilizador" placeholderTextColor={C.muted}
       value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username"/>
     <TextInput style={styles.input} placeholder="Palavra-passe" placeholderTextColor={C.muted}
       value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"/>
     <Button title={busy?'A entrar…':'Entrar'} onPress={()=>{void doLogin();}}
       disabled={busy||!username.trim()||!password}/>
     <Text style={styles.sub}>Se for a tua primeira vez com Google, concluis o registo Jynlo na aplicação. Poderá ser necessária verificação MFA.</Text>
     <Button title="Criar conta na Jynlo" secondary onPress={()=>router.push('/register')}/>
     <Button title="Esqueci-me da palavra-passe" secondary onPress={()=>router.push('/reset-password')}/>
     <Button title="Confirmar email ou reenviar confirmação" secondary onPress={()=>router.push('/confirm-email')}/>
   </View>}
 </Page>;
}
const styles=StyleSheet.create({
 headline:{color:C.white,fontSize:31,fontWeight:'900',lineHeight:38},
 sub:{color:C.muted,fontSize:14,lineHeight:21},separator:{textAlign:'center',color:C.muted,fontSize:12,marginVertical:3},
 demoPanel:{padding:20,backgroundColor:C.surface,borderRadius:20,borderWidth:1,borderColor:C.border,gap:16},
 panelTitle:{fontSize:19,color:C.white,fontWeight:'800'},
 input:{height:56,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:16,color:C.white,fontSize:16},
});
