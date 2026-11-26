import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import {DEMO_MODE,request} from './api';
import type {GoogleAuthResponse,GoogleSignupInput} from './google-auth-api';

/**
 * Facebook Login through the system browser (no native SDK): the app id comes
 * from the server, so the button appears as soon as the Meta app is configured,
 * without a new build. The Facebook access token is only used once, sent to the
 * Jynlo server, which checks that it was issued for our app before trusting it.
 */
export const FACEBOOK_WEB_REDIRECT='https://jynlosports.com/auth/facebook/callback';
export const FACEBOOK_APP_RETURN='jynlo://auth/facebook';
const APP_ID=/^\d{5,20}$/;

let cachedAppId:{value:string;at:number}|null=null;
export async function facebookAppId():Promise<string>{
 if(DEMO_MODE)return '';
 if(cachedAppId&&Date.now()-cachedAppId.at<5*60_000)return cachedAppId.value;
 try{
  const config=await request<{appId?:string}>('/api/auth/facebook/config');
  const id=typeof config?.appId==='string'&&APP_ID.test(config.appId.trim())?config.appId.trim():'';
  cachedAppId={value:id,at:Date.now()};
  return id;
 }catch{return '';}
}

export function facebookDialogUrl(appId:string,state:string):string{
 const q=new URLSearchParams({client_id:appId,redirect_uri:FACEBOOK_WEB_REDIRECT,response_type:'token',
  scope:'public_profile,email',state,display:'touch'});
 return `https://www.facebook.com/v21.0/dialog/oauth?${q.toString()}`;
}

/** Reads #access_token=…&state=… (or ?error=…) from the return URL; rejects a foreign state. */
export function parseFacebookReturn(url:string,expectedState:string):{token:string|null;error:string|null}{
 const at=url.indexOf('#');const qs=url.indexOf('?');
 const raw=at>=0?url.slice(at+1):qs>=0?url.slice(qs+1):'';
 const p=new URLSearchParams(raw);
 if(p.get('error'))return {token:null,error:p.get('error_reason')==='user_denied'?null:'Facebook recusou o pedido de login.'};
 if(p.get('state')!==expectedState)return {token:null,error:'Resposta do Facebook inválida. Tenta outra vez.'};
 const token=p.get('access_token');
 return {token:token&&token.length<=4096?token:null,error:token?null:'O Facebook não devolveu uma sessão.'};
}

export async function chooseFacebookToken():Promise<string|null>{
 if(DEMO_MODE)throw Error('O login com Facebook não está disponível na demonstração.');
 const appId=await facebookAppId();
 if(!appId)throw Error('O login com Facebook ainda não está disponível.');
 const state='app.'+Crypto.randomUUID().replace(/-/g,'');
 const result=await WebBrowser.openAuthSessionAsync(facebookDialogUrl(appId,state),FACEBOOK_APP_RETURN);
 if(result.type!=='success'||!result.url)return null;
 const parsed=parseFacebookReturn(result.url,state);
 if(parsed.error)throw Error(parsed.error);
 return parsed.token;
}

export async function facebookLoginWithToken(credential:string):Promise<GoogleAuthResponse>{
 if(!credential?.trim())throw Error('O Facebook não devolveu uma sessão.');
 return request<GoogleAuthResponse>('/api/auth/facebook/login',{method:'POST',body:{credential}});
}
export async function facebookRegisterWithToken(credential:string,input:GoogleSignupInput):Promise<GoogleAuthResponse>{
 if(!credential?.trim())throw Error('A sessão do Facebook expirou. Reinicia o início de sessão.');
 if(!input.acceptedLegalTerms)throw Error('Tens de aceitar os Termos e a Política de Privacidade.');
 return request<GoogleAuthResponse>('/api/auth/facebook/register',{method:'POST',body:{credential,...input}});
}
