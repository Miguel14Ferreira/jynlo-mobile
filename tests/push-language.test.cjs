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
test('notificações ligadas por omissão: pede uma vez, depois dos primeiros passos',()=>{
 const push=read('src/lib/mobile-push.ts');
 assert.match(push,/export async function autoEnablePushOnce/);
 assert.match(push,/if\(await SecureStore\.getItemAsync\(key\)\)return;/);
 assert.match(push,/current\.canAskAgain===false/);
 // Never takes over a device registered to another account.
 assert.match(push,/if\(other&&other!==username\.toLowerCase\(\)\)return;/);
 const layout=read('app/_layout.tsx');
 assert.match(layout,/<PushAutoOptIn\/>/);
 assert.match(layout,/first-steps/);
 assert.match(layout,/pushDeliveryReady\(token\)\.then\(ready=>\{if\(ready\)void autoEnablePushOnce/);
});
