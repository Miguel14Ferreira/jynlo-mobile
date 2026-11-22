import {Platform} from 'react-native';
import {DEMO_MODE,request} from './api';
import type {GoogleAuthResponse,GoogleSignupInput} from './google-auth-api';

/** "Sign in with Apple" exists on iPhone only; the Jynlo server verifies Apple's token. */
export async function appleSignInAvailable():Promise<boolean>{
 if(Platform.OS!=='ios'||DEMO_MODE)return false;
 try{const Apple=await import('expo-apple-authentication');return await Apple.isAvailableAsync();}
 catch{return false;}
}

export async function chooseAppleIdentity():Promise<{credential:string;fullName:string|null}|null>{
 if(Platform.OS!=='ios')throw Error('Iniciar sessão com a Apple só existe no iPhone.');
 const Apple=await import('expo-apple-authentication');
 try{
  const result=await Apple.signInAsync({requestedScopes:[
   Apple.AppleAuthenticationScope.FULL_NAME,Apple.AppleAuthenticationScope.EMAIL]});
  if(!result.identityToken)throw Error('A Apple não devolveu uma credencial de identidade.');
  // Apple shares the name only the first time; the server never trusts it as identity.
  const name=[result.fullName?.givenName,result.fullName?.familyName].filter(Boolean).join(' ').trim();
  return {credential:result.identityToken,fullName:name||null};
 }catch(error){
  const code=typeof error==='object'&&error!==null&&'code' in error?String((error as {code:unknown}).code):'';
  if(code==='ERR_REQUEST_CANCELED'||code==='ERR_CANCELED')return null;
  throw error;
 }
}

export async function appleLoginWithIdToken(credential:string,fullName:string|null):Promise<GoogleAuthResponse>{
 if(DEMO_MODE)throw Error('Iniciar sessão com a Apple indisponível na demonstração.');
 return request<GoogleAuthResponse>('/api/auth/apple/login',{method:'POST',body:{credential,fullName}});
}
export async function appleRegisterWithIdToken(credential:string,fullName:string|null,input:GoogleSignupInput):Promise<GoogleAuthResponse>{
 if(DEMO_MODE)throw Error('O registo com a Apple não funciona em demonstração.');
 if(!input.acceptedLegalTerms)throw Error('Tens de aceitar os Termos e a Política de Privacidade.');
 return request<GoogleAuthResponse>('/api/auth/apple/register',{method:'POST',body:{registration:{credential,...input},fullName}});
}
