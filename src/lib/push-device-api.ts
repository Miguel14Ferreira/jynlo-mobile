import {DEMO_MODE,request} from './api';

/** Device registration is opt-in and requires a real OS-issued Expo push token. */
export type MobileDeviceRegistration={
 deviceId:string;expoPushToken:string;platform:'android'|'ios'
};
export async function registerPushDevice(token:string,device:MobileDeviceRegistration):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para ativar notificações.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(device.deviceId))
  throw Error('Identificador de dispositivo inválido.');
 if(!/^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]{16,200}\]$/.test(device.expoPushToken))
  throw Error('Token push inválido.');
 if(device.platform!=='android'&&device.platform!=='ios')
  throw Error('Plataforma não suportada.');
 const result=await request<{registered:boolean}>('/api/notifications/me/devices',{
  token,method:'PUT',body:device
 });
 if(result?.registered!==true)throw Error('O servidor não confirmou o registo do dispositivo.');
}
export async function unregisterPushDevice(token:string,deviceId:string):Promise<void>{
 if(DEMO_MODE||!token)return;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId))
  throw Error('Identificador de dispositivo inválido.');
 await request<void>('/api/notifications/me/devices/'+encodeURIComponent(deviceId),{
  token,method:'DELETE'
 });
}

export async function getPushDeviceStatus(token:string,deviceId:string):Promise<boolean>{
 if(DEMO_MODE||!token)return false;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId))
  throw Error('Identificador de dispositivo inválido.');
 const result=await request<{registered:boolean}>(
  '/api/notifications/me/devices/'+encodeURIComponent(deviceId),{token});
 return result?.registered===true;
}

/** Reports server configuration only, not proof of provider delivery. */
export async function pushDeliveryReady(token:string):Promise<boolean>{
 if(DEMO_MODE||!token)return false;
 const status=await request<{ready:boolean}>('/api/notifications/me/devices/delivery-status',{token});
 return status?.ready===true;
}
