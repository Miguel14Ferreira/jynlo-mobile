'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const {pushNotificationId}=require('../src/lib/push-notification-id.cjs');

test('Expo push notification IDs accept canonical positive numbers and decimal strings',()=>{
 for(const id of [1,42,8099,9007199254740991]){
  assert.equal(pushNotificationId(id),String(id));
  assert.equal(pushNotificationId(String(id)),String(id));
 }
});
test('native push IDs reject routes, unsafe numeric values and malformed input',()=>{
 for(const bad of [null,undefined,0,-1,NaN,Infinity,1.4,9007199254740992,
  '0','01','-1','1.0','1e4','+1',' 1','1 ','/messages/alice','https://evil.test','',{},[],true])
   assert.equal(pushNotificationId(bad),null,String(bad));
});
test('a native push only navigates to the authenticated inbox and never uses an untrusted URL',()=>{
 const root=read('app/_layout.tsx');
 const inbox=read('app/notifications.tsx');
 assert.match(root,/data\?\.kind==='notification'\?pushNotificationId\(data\.id\):null/);
 assert.match(root,/router\.push\(\{pathname:'\/notifications',params:\{notificationId:id\}\}\)/);
 assert.match(root,/auth\.ready/);
 assert.match(root,/auth\.token\|\|!auth\.username/);
 assert.match(root,/lastHandled\.current===handledKey/);
 assert.match(inbox,/const target=items\.find\(item=>String\(item\.id\)===notificationId\)/);
 assert.match(inbox,/if\(open\(target\)\)/);
});
