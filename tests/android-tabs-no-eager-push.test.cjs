const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const tabs=path.join(__dirname,'../app/(tabs)');

test('all initial Expo tabs avoid eager Expo notifications imports',()=>{
 for(const file of fs.readdirSync(tabs).filter(name=>/\.tsx$/.test(name))){
  const code=untranslate(fs.readFileSync(path.join(tabs,file),'utf8'));
  assert.doesNotMatch(code,/^import\s+(?:\*\s+as\s+\w+|\{[^}]*\})\s+from\s+['"]expo-notifications['"]/m, file+' eagerly loads native push');
 }
});

test('Messages tab keeps native notification fallback and cleans up safely',()=>{
 const code=untranslate(fs.readFileSync(path.join(tabs,'messages.tsx'),'utf8'));
 assert.match(code,/const Notifications=getNativeNotifications\(\)/);
 assert.match(code,/if\(Notifications\)received=Notifications\.addNotificationReceivedListener/);
 assert.match(code,/try\{received\?\.remove\(\);\}catch\{/);
 assert.match(code,/AppState\.addEventListener\('change',state=>/);
});
