import {Platform} from 'react-native';
// Native Google Sign-In is loaded only after the user requests login and server OAuth config is valid.
import {DEMO_MODE,request} from './api';

const GOOGLE_WEB_CLIENT_ID=/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;

/**
 * Google SDK returns an ID token with the SERVER web client ID as its audience.
 * The server then verifies signature + audience. Never persist Google's ID token.
 * The native Android OAuth client also needs com.jynlo.app + the signing SHA-1.
 */
export async function chooseGoogleIdentity():Promise<string|null>{
 if(DEMO_MODE)throw Error('O login Google não está disponível na demonstração.');
 if(Platform.OS!=='android')throw Error('O login Google está preparado para a versão Android.');
 const config=await request<{clientId:string}>('/api/auth/google/config');
 const webClientId=typeof config?.clientId==='string'?config.clientId.trim():'';
 if(!GOOGLE_WEB_CLIENT_ID.test(webClientId))
  throw Error('O login Google ainda não está configurado no servidor Jynlo. Não é possível iniciar sessão.');
 const {GoogleSignin}=await import('@react-native-google-signin/google-signin');
 GoogleSignin.configure({webClientId,offlineAccess:false});
 await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
 let result;
 try{
  result=await GoogleSignin.signIn();
 }catch(error){
  const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
  const message=error instanceof Error?error.message:'';
  // Android can report a closed Google account picker as an exception rather
  // than a {type:'cancelled'} result. This is not an authentication failure.
  if(code==='SIGN_IN_CANCELLED'||code==='12501')return null;
  if(code==='10'||code==='DEVELOPER_ERROR'||message.includes('DEVELOPER_ERROR'))
   throw Error('Google Sign-In recusado (DEVELOPER_ERROR). A assinatura SHA-1 desta APK e o pacote com.jynlo.app têm de estar registados no cliente OAuth Android do mesmo projeto Google Cloud que o cliente Web da Jynlo.');
  throw error;
 }
 if(result.type==='cancelled')return null;
 if(result.type!=='success'||!result.data.idToken)
  throw Error('A Google não devolveu uma credencial válida. Verifica a configuração OAuth da app Android.');
 return result.data.idToken;
}
