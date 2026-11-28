import React,{useEffect,useRef,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../src/components/UI';
import {DEMO_MODE} from '../src/lib/api';
import {useAuth} from '../src/lib/auth';
import {chooseGoogleIdentity,googleSignInAvailable} from '../src/lib/google-credential';
import * as AppleAuthentication from 'expo-apple-authentication';
import {appleSignInAvailable,chooseAppleIdentity} from '../src/lib/apple-auth';
import {chooseFacebookToken,facebookAppId} from '../src/lib/facebook-auth';
import {safeRedirect} from '../src/lib/routes.cjs';
import {C} from '../src/lib/theme';
export default function LoginScreen(){
 const auth=useAuth();const router=useRouter();
 const params=useLocalSearchParams<{redirect?:string}>();
 const redirect=safeRedirect(params.redirect);
 const [username,setUsername]=useState('');const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);const loginInFlight=useRef(false);const [error,setError]=useState('');
 async function doGoogleLogin(){
   if(loginInFlight.current||auth.username)return;
   loginInFlight.current=true;setError('');setBusy(true);
   try{
     const credential=await chooseGoogleIdentity();
     if(!credential)return; // user cancelled Google picker
     const outcome=await auth.loginGoogle(credential);
     if(outcome==='ONBOARDING_REQUIRED')router.replace({pathname:'/google-onboarding',params:{redirect}});
     else if(outcome==='MFA_REQUIRED')router.replace({pathname:'/mfa',params:{redirect}});
     else router.replace(redirect as any);
   }catch(e){setError(e instanceof Error?e.message:t('Não foi possível iniciar sessão com a Google.'));}
   finally{loginInFlight.current=false;setBusy(false);}
 }
 const [appleReady,setAppleReady]=useState(false);
 useEffect(()=>{let on=true;void appleSignInAvailable().then(v=>{if(on)setAppleReady(v);});return()=>{on=false;};},[]);
 async function doAppleLogin(){
   if(loginInFlight.current||auth.username)return;
   loginInFlight.current=true;setError('');setBusy(true);
   try{
     const identity=await chooseAppleIdentity();
     if(!identity)return; // user closed the Apple sheet
     const outcome=await auth.loginApple(identity.credential,identity.fullName);
     if(outcome==='ONBOARDING_REQUIRED')router.replace({pathname:'/google-onboarding',params:{redirect}});
     else if(outcome==='MFA_REQUIRED')router.replace({pathname:'/mfa',params:{redirect}});
     else router.replace(redirect as any);
   }catch(e){setError(e instanceof Error?e.message:t('Não foi possível iniciar sessão com a Apple.'));}
   finally{loginInFlight.current=false;setBusy(false);}
 }
 const [facebookReady,setFacebookReady]=useState(false);
 useEffect(()=>{let on=true;void facebookAppId().then(id=>{if(on)setFacebookReady(Boolean(id));});return()=>{on=false;};},[]);
 async function doFacebookLogin(){
   if(loginInFlight.current||auth.username)return;
   loginInFlight.current=true;setError('');setBusy(true);
   try{
     const token=await chooseFacebookToken();
     if(!token)return; // user closed the Facebook page
     const outcome=await auth.loginFacebook(token);
     if(outcome==='ONBOARDING_REQUIRED')router.replace({pathname:'/google-onboarding',params:{redirect}});
     else if(outcome==='MFA_REQUIRED')router.replace({pathname:'/mfa',params:{redirect}});
     else router.replace(redirect as any);
   }catch(e){setError(e instanceof Error?e.message:t('Não foi possível iniciar sessão com Facebook.'));}
   finally{loginInFlight.current=false;setBusy(false);}
 }
 async function doLogin(){
   if(loginInFlight.current||auth.username)return;
   loginInFlight.current=true;setError('');setBusy(true);
   try{const outcome=await auth.login(username.trim(),password);
      setPassword('');
      if(outcome==='MFA_REQUIRED')router.replace({pathname:'/mfa',params:{redirect}});
      else router.replace(redirect as any);
   }catch(e){setError(e instanceof Error?e.message:t('Não foi possível iniciar sessão.'));}
   finally{loginInFlight.current=false;setBusy(false);}
 }
 function demoAs(name:string){try{auth.loginDemo(name);router.replace(redirect as any);}catch(e){setError(e instanceof Error?e.message:t('Inicia sessão novamente.'));}}
 return <Page>
   <Brand subtitle={t('ENTRA NO JOGO')}/>
   <DemoBanner/>
   <Eyebrow>{t('A TUA CONTA')}</Eyebrow>
   {auth.username?<Message>{t('Já tens sessão iniciada como {user}. Termina essa sessão no Perfil antes de entrares com outra conta.',{user:auth.username})}</Message>:null}
   <Text maxFontSizeMultiplier={1.3} style={styles.headline}>{t('Joga com a tua malta.')}</Text>
   <Text style={styles.sub}>{DEMO_MODE?t('Esta APK usa apenas personagens fictícias. As contas reais não funcionam nesta demonstração.'):facebookReady?t('Entra com Google, Facebook ou a tua conta Jynlo para participares nos jogos.'):t('Entra com Google ou utiliza a tua conta Jynlo para participares nos jogos.')}</Text>
   {error?<Message tone="error">{error}</Message>:null}
   {auth.username?null:DEMO_MODE?<View style={styles.demoPanel}>
     <Text style={styles.panelTitle}>{t('Experimentar com personagens fictícias')}</Text>
     <Text style={styles.sub}>{t('Escolhe um dos amigos do anúncio. A inscrição é simulada apenas neste dispositivo.')}</Text>
     <Button title={t('Continuar como Tiago')} onPress={()=>demoAs('Tiago')}/>
     <Button title={t('Continuar como André')} secondary onPress={()=>demoAs('André')}/>
   </View>:<View style={{gap:15}}>
     {appleReady?<AppleAuthentication.AppleAuthenticationButton
       buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
       buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
       cornerRadius={14} style={styles.appleButton}
       onPress={()=>{if(!busy)void doAppleLogin();}}/>:null}
     {googleSignInAvailable()?<Pressable accessibilityRole="button" accessibilityLabel={t('Continuar com Google')}
       disabled={busy} onPress={()=>{void doGoogleLogin();}}
       style={({pressed})=>[styles.googleButton,(busy||pressed)&&{opacity:0.65}]}>
       <Image source={{uri:'https://developers.google.com/static/identity/images/g-logo.png'}}
         style={styles.googleLogo} accessibilityLabel={t('Símbolo da Google')}/>
       <Text style={styles.googleLabel}>{busy?t('A autenticar…'):t('Continuar com Google')}</Text>
     </Pressable>:null}
     {facebookReady?<Pressable accessibilityRole="button" accessibilityLabel={t('Continuar com Facebook')}
       disabled={busy} onPress={()=>{void doFacebookLogin();}}
       style={({pressed})=>[styles.googleButton,styles.facebookButton,(busy||pressed)&&{opacity:0.65}]}>
       <View style={styles.facebookLogo}><Text style={styles.facebookF}>f</Text></View>
       <Text style={[styles.googleLabel,{color:'#FFFFFF'}]}>{busy?t('A autenticar…'):t('Continuar com Facebook')}</Text>
     </Pressable>:null}
     <Text style={styles.separator}>{t('ou entra com utilizador e palavra-passe')}</Text>
     <TextInput style={styles.input} placeholder={t('Nome de utilizador')} placeholderTextColor={C.muted}
       value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" testID="login-username"/>
     <TextInput style={styles.input} placeholder={t('Palavra-passe')} placeholderTextColor={C.muted}
       value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" testID="login-password"/>
     <Button title={busy?t('A entrar…'):t('Entrar')} onPress={()=>{void doLogin();}}
       disabled={busy||!username.trim()||!password}/>
     <Text style={styles.sub}>{t('Se for a tua primeira vez com Google, concluis o registo Jynlo na aplicação. Poderá ser necessária verificação MFA.')}</Text>
     <Button title={t('Criar conta na Jynlo')} secondary onPress={()=>router.push('/register')}/>
     <Button title={t('Esqueci-me da palavra-passe')} secondary onPress={()=>router.push('/reset-password')}/>
     <Button title={t('Confirmar email ou reenviar confirmação')} secondary onPress={()=>router.push('/confirm-email')}/>
   </View>}
 </Page>;
}
const styles=StyleSheet.create({
 appleButton:{width:'100%',height:52},
 headline:{color:C.white,fontSize:31,fontWeight:'900',lineHeight:38},
 googleButton:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,minHeight:54,borderRadius:15,backgroundColor:'#FFFFFF',paddingHorizontal:16},
 googleLogo:{height:24,width:24},
 facebookButton:{backgroundColor:'#1877F2'},
 facebookLogo:{height:24,width:24,borderRadius:12,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'flex-end',overflow:'hidden'},
 facebookF:{color:'#1877F2',fontSize:22,fontWeight:'900',lineHeight:24,marginBottom:-3,marginLeft:4},googleLabel:{fontSize:15,fontWeight:'800',color:'#202124'},
 sub:{color:C.muted,fontSize:14,lineHeight:21},separator:{textAlign:'center',color:C.muted,fontSize:12,marginVertical:3},
 demoPanel:{padding:20,backgroundColor:C.surface,borderRadius:20,borderWidth:1,borderColor:C.border,gap:16},
 panelTitle:{fontSize:19,color:C.white,fontWeight:'800'},
 input:{height:56,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:16,color:C.white,fontSize:16},
});
