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
