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
