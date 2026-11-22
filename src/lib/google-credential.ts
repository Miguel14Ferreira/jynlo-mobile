import {Platform} from 'react-native';
import Constants from 'expo-constants';
// Native Google Sign-In is loaded only after the user requests login and server OAuth config is valid.
import {DEMO_MODE,request} from './api';

const GOOGLE_WEB_CLIENT_ID=/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;

/**
 * Google SDK returns an ID token with the SERVER web client ID as its audience.
 * The server then verifies signature + audience. Never persist Google's ID token.
 * The native Android OAuth client also needs com.jynlo.app + the signing SHA-1.
 */
/** iPhone needs its own Google OAuth client (set at build time); Android always has Google. */
function iosClientId():string{
 const id=Constants.expoConfig?.extra?.googleIosClientId;
 return typeof id==='string'&&GOOGLE_WEB_CLIENT_ID.test(id.trim())?id.trim():'';
}
export function googleSignInAvailable():boolean{
 return Platform.OS==='android'||(Platform.OS==='ios'&&Boolean(iosClientId()));
}
export async function chooseGoogleIdentity():Promise<string|null>{
 if(DEMO_MODE)throw Error('O login Google não está disponível na demonstração.');
 if(!googleSignInAvailable())throw Error('O login Google ainda não está disponível nesta versão.');
 const config=await request<{clientId:string}>('/api/auth/google/config');
 const webClientId=typeof config?.clientId==='string'?config.clientId.trim():'';
 if(!GOOGLE_WEB_CLIENT_ID.test(webClientId))
  throw Error('O login Google ainda não está configurado no servidor Jynlo. Não é possível iniciar sessão.');
 let result;
 try{
  const {GoogleSignin}=await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({webClientId,offlineAccess:false,...(Platform.OS==='ios'?{iosClientId:iosClientId()}:{})});
  if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
  result=await GoogleSignin.signIn();
 }catch(error){
  const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
  const message=error instanceof Error?error.message:'';
  // Dismissing the account picker must not appear as a login failure.
  if(code==='SIGN_IN_CANCELLED'||code==='12501'||code==='CANCELED'||code==='12500'&&/cancel/i.test(message))return null;
  if(code==='IN_PROGRESS'||code==='12502')
   throw Error('A autenticação Google já está em curso. Aguarda pelo fim do processo antes de tentares novamente.');
  if(code==='PLAY_SERVICES_NOT_AVAILABLE'||code==='2')
   throw Error('Os Google Play Services não estão disponíveis ou precisam de atualização neste dispositivo.');
  if(code==='10'||code==='DEVELOPER_ERROR'||message.includes('DEVELOPER_ERROR')||message.includes('ApiException: 10'))
   throw Error('Google Sign-In recusado (DEVELOPER_ERROR). A assinatura SHA-1 desta APK e o pacote com.jynlo.app têm de estar registados no cliente OAuth Android do mesmo projeto Google Cloud que o cliente Web da Jynlo.');
  if(message.includes('Native module')||message.includes('TurboModule')||message.includes('RNGoogleSignin')||message.includes('RNGoogleSigninModule'))
   throw Error('O módulo nativo de autenticação Google não está disponível nesta instalação da Jynlo. É necessária uma APK que inclua o SDK Google.');
  throw error;
 }
 if(!result||result.type==='cancelled')return null;
 if(result.type!=='success'||!result.data?.idToken)
  throw Error('A Google não devolveu uma credencial válida. Verifica a configuração OAuth da app Android.');
 return result.data.idToken;
}
