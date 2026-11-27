'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('o dispositivo envia a língua da app no registo push',()=>{
 const push=read('src/lib/mobile-push.ts');
 assert.match(push,/language:currentLanguage\(\)==='en'\?'en':'pt'/);
 assert.match(push,/export async function refreshPushLanguage/);
 // Never prompts or registers a device that was not already registered for this account.
 assert.match(push,/!==username\.toLowerCase\(\)\)return;/);
 assert.match(push,/if\(!\(await Notifications\.getPermissionsAsync\(\)\)\.granted\)return;/);
 const layout=read('app/_layout.tsx');
 assert.match(layout,/<PushLanguageSync\/>/);
 assert.match(layout,/void refreshPushLanguage\(auth\.username,auth\.token\)/);
});
test('notificações ligadas por omissão: regista sempre que a permissão existe e volta a pedir no máximo uma vez por semana',()=>{
 const push=read('src/lib/mobile-push.ts');
 assert.match(push,/export async function keepPushRegistered/);
 assert.match(push,/current\.canAskAgain===false/);
 assert.match(push,/REASK_MS=7\*24\*60\*60\*1000/);
 // Never takes over a device registered to another account.
 assert.match(push,/if\(other&&other!==username\.toLowerCase\(\)\)return 'skipped';/);
 const layout=read('app/_layout.tsx');
 assert.match(layout,/<PushAutoOptIn\/>/);
 assert.match(layout,/first-steps/);
 assert.match(layout,/pushDeliveryReady\(token\)\.then\(ready=>\{if\(ready\)void keepPushRegistered/);
 assert.match(layout,/state==='active'/);
 assert.match(read('app/(tabs)/index.tsx'),/<PushOffBanner\/>/);
});
