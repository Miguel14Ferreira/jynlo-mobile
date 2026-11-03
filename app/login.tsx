import React,{useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../src/components/UI';
import {DEMO_MODE} from '../src/lib/api';
import {useAuth} from '../src/lib/auth';
import {safeRedirect} from '../src/lib/routes.cjs';
import {C} from '../src/lib/theme';
export default function LoginScreen(){
 const auth=useAuth();const router=useRouter();
 const params=useLocalSearchParams<{redirect?:string}>();
 const redirect=safeRedirect(params.redirect);
 const [username,setUsername]=useState('');const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
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
   <Text style={styles.sub}>Inicia sessão para confirmar a presença nos jogos.</Text>
   {error?<Message tone="error">{error}</Message>:null}
   {auth.username?null:DEMO_MODE?<View style={styles.demoPanel}>
     <Text style={styles.panelTitle}>Experimentar com personagens fictícias</Text>
     <Text style={styles.sub}>Escolhe um dos amigos do anúncio. A inscrição é simulada apenas neste dispositivo.</Text>
     <Button title="Continuar como Tiago" onPress={()=>demoAs('Tiago')}/>
     <Button title="Continuar como André" secondary onPress={()=>demoAs('André')}/>
   </View>:<View style={{gap:15}}>
     <TextInput style={styles.input} placeholder="Nome de utilizador" placeholderTextColor={C.muted}
       value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username"/>
     <TextInput style={styles.input} placeholder="Palavra-passe" placeholderTextColor={C.muted}
       value={password} onChangeText={setPassword} secureTextEntry autoComplete="password"/>
     <Button title={busy?'A entrar…':'Entrar'} onPress={()=>{void doLogin();}}
       disabled={busy||!username.trim()||!password}/>
     <Text style={styles.sub}>A autenticação Google e a criação de conta serão integradas numa fase seguinte.</Text>
   </View>}
 </Page>;
}
const styles=StyleSheet.create({
 headline:{color:C.white,fontSize:31,fontWeight:'900',lineHeight:38},
 sub:{color:C.muted,fontSize:14,lineHeight:21},
 demoPanel:{padding:20,backgroundColor:C.surface,borderRadius:20,borderWidth:1,borderColor:C.border,gap:16},
 panelTitle:{fontSize:19,color:C.white,fontWeight:'800'},
 input:{height:56,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:16,color:C.white,fontSize:16},
});
