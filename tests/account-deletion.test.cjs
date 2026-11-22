const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('Account deletion is explicitly confirmed and never auto-retried',()=>{
 const profile=read('app/(tabs)/profile.tsx');
 assert.match(profile,/await request<void>\('\/api\/profile\/me',\{token:auth\.token,method:'DELETE'\}\)/);
 assert.match(profile,/Eliminação não confirmada/);
 assert.match(profile,/const detail=e instanceof ApiError/);
 assert.match(profile,/setDeleting\(false\);\s*return;/);
});
test('Account deletion confirmed by backend cannot be reclassified as failed due to logout',()=>{
 const profile=read('app/(tabs)/profile.tsx');
 const deletedIndex=profile.indexOf("await request<void>('/api/profile/me'");
 const logoutIndex=profile.indexOf('await auth.logout()',deletedIndex);
 const confirmedIndex=profile.indexOf("Alert.alert('Conta eliminada'",logoutIndex);
 assert.ok(deletedIndex>=0 && logoutIndex>deletedIndex && confirmedIndex>logoutIndex);
 assert.match(profile,/O servidor confirmou a eliminação/);
});
test('API success with empty JSON body is parsed safely',()=>{
 const api=read('src/lib/api.ts');
 assert.match(api,/readSuccessfulResponse\(response\)/);
 assert.doesNotMatch(api,/return \(await response\.json\(\)\) as T/);
});
