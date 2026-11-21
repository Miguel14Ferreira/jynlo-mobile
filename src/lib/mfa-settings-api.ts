import {DEMO_MODE,request} from './api';
import {normalizeTotp} from './mfa-settings-core.cjs';
export interface MfaSetup{secret:string;qrCodeDataUrl:string;otpauthUri:string;}
const need=(t:string|null|undefined)=>{if(DEMO_MODE||!t)throw Error('Inicia sessão para gerires a segurança da conta.');return t;};
export async function mfaEnabled(token:string):Promise<boolean>{
 const me=await request<{mfa?:boolean|null}>('/api/profile/me',{token:need(token)});
 return me?.mfa===true;
}
/** Starts a new setup (new key). The server refuses while MFA is already active. */
export async function startMfaSetup(token:string):Promise<MfaSetup>{
 return request<MfaSetup>('/api/profile/me/mfa/setup',{token:need(token),method:'POST'});
}
export async function confirmMfaSetup(code:string,token:string):Promise<void>{
 await request<unknown>('/api/profile/me/mfa/confirm',{token:need(token),method:'POST',body:{code:normalizeTotp(code)}});
}
/** Turning it off always needs a current code from the authenticator, never just the session. */
export async function disableMfa(code:string,token:string):Promise<void>{
 await request<unknown>('/api/profile/me/mfa',{token:need(token),method:'DELETE',body:{code:normalizeTotp(code)}});
}
