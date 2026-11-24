import * as SecureStore from 'expo-secure-store';
import {API_BASE,DEMO_MODE,NATIVE_REFRESH_HEADER,onNativeRefreshToken} from './api';

/** Keeps the app signed in (like Instagram): a rotating refresh token lives in the device's secure storage. */
const REFRESH_KEY='jynlo.refresh-token.v1';
let writes:Promise<unknown>=Promise.resolve();
const queue=(work:()=>Promise<unknown>)=>{writes=writes.then(work,work);return writes;};

onNativeRefreshToken(token=>{void queue(()=>SecureStore.setItemAsync(REFRESH_KEY,token)).catch(()=>{});});

export async function clearNativeRefreshToken():Promise<void>{
 await queue(()=>SecureStore.deleteItemAsync(REFRESH_KEY)).catch(()=>{});
}

export type RefreshOutcome={token:string;username:string}|'rejected'|'offline';

let inFlight:Promise<RefreshOutcome>|null=null;
/** Trades the stored refresh token for a new access token. Concurrent callers share one request. */
export function refreshNativeSession():Promise<RefreshOutcome>{
 if(DEMO_MODE)return Promise.resolve('rejected');
 if(!inFlight)inFlight=run().finally(()=>{inFlight=null;});
 return inFlight;
}
async function run():Promise<RefreshOutcome>{
 await writes.catch(()=>{});
 const stored=await SecureStore.getItemAsync(REFRESH_KEY).catch(()=>null);
 if(!stored)return 'rejected';
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(`${API_BASE}/api/auth/mobile/refresh`,{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
   headers:{'Accept':'application/json','X-Jynlo-Client':'mobile',[NATIVE_REFRESH_HEADER]:stored}});
  if(response.status>=400&&response.status<500){await clearNativeRefreshToken();return 'rejected';}
  if(!response.ok)return 'offline';
  const rotated=response.headers.get(NATIVE_REFRESH_HEADER);
  if(rotated)await queue(()=>SecureStore.setItemAsync(REFRESH_KEY,rotated)).catch(()=>{});
  const body=await response.json().catch(()=>null) as {token?:string;profile?:{username?:string}}|null;
  if(!body?.token||!body.profile?.username)return 'offline';
  return {token:body.token,username:body.profile.username};
 }catch{return 'offline';}
 finally{clearTimeout(timer);}
}
