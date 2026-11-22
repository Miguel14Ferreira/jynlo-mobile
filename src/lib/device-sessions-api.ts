import {DEMO_MODE,request} from './api';

/** A signed-in browser of this account (the app itself uses short bearer tokens and is not listed). */
export type DeviceSession={id:string;device:string;createdAt:string;expiresAt:string;current:boolean};

function need(token:string|null|undefined):string{
  if(!token||DEMO_MODE)throw new Error('Inicia sessão para gerir os dispositivos.');
  return token;
}
export async function listDeviceSessions(token:string|null|undefined):Promise<DeviceSession[]>{
  const list=await request<unknown>('/api/auth/sessions',{token:need(token)});
  if(!Array.isArray(list))return [];
  return list.filter((s):s is DeviceSession=>!!s&&typeof (s as DeviceSession).id==='string')
    .map(s=>({id:s.id,device:String(s.device||'Navegador'),createdAt:String(s.createdAt||''),expiresAt:String(s.expiresAt||''),current:s.current===true}));
}
export async function endDeviceSession(token:string|null|undefined,id:string):Promise<void>{
  await request<void>('/api/auth/sessions/'+encodeURIComponent(id),{token:need(token),method:'DELETE'});
}
/** From the app this ends every browser session of the account. */
export async function endAllBrowserSessions(token:string|null|undefined):Promise<void>{
  await request<void>('/api/auth/sessions/others',{token:need(token),method:'DELETE'});
}
