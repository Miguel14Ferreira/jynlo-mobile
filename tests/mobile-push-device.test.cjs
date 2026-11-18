'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('push registration never runs implicitly or invents a device token',()=>{
 const api=read('src/lib/push-device-api.ts');
 assert.match(api,/registerPushDevice\(token:string,device:MobileDeviceRegistration\)/);
 assert.match(api,/unregisterPushDevice\(token:string,deviceId:string\)/);
 assert.match(api,/method:'PUT',body:device/);
 assert.match(api,/method:'DELETE'/);
 assert.match(api,/\/api\/notifications\/me\/devices/);
 assert.match(api,/Expo\|Exponent/);
 assert.match(api,/result\?\.registered!==true/);
 assert.doesNotMatch(api,/getExpoPushTokenAsync/);
 assert.doesNotMatch(api,/setInterval/);
});

test('push readiness is separate from device registration and never exposes credentials',()=>{
 const api=read('src/lib/push-device-api.ts');
 const screen=read('app/notifications.tsx');
 assert.match(api,/export async function pushDeliveryReady\(token:string\):Promise<boolean>/);
 assert.match(api,/\/api\/notifications\/me\/devices\/delivery-status/);
 assert.match(api,/status\?\.ready===true/);
 assert.match(screen,/pushDeliveryReady\(auth\.token\)/);
 assert.match(screen,/\[deliveryReady,setDeliveryReady\]=useState<boolean\|null>\(null\)/);
 assert.match(screen,/O envio push ainda não está ativo no servidor/);
 assert.match(screen,/disabled=\{pushBusy\|\|\(!pushEnabled&&deliveryReady===false\)\}/);
 assert.match(screen,/pushEnabled\?'Este dispositivo está registado para notificações push\. O registo não garante/);
});
