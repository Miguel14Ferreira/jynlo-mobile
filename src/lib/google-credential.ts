import {Platform} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
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
 GoogleSignin.configure({webClientId,offlineAccess:false});
 await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
 const result=await GoogleSignin.signIn();
 if(result.type==='cancelled')return null;
 if(result.type!=='success'||!result.data.idToken)
  throw Error('A Google não devolveu uma credencial válida. Verifica a configuração OAuth da app Android.');
 return result.data.idToken;
}
