'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');

test('authentication and root navigator do not eagerly evaluate optional push native module',()=>{
 const auth=read('src/lib/auth.tsx');
 const mobile=read('src/lib/mobile-push.ts');
 const root=read('app/_layout.tsx');
 assert.match(auth,/import \{disableMobilePush,clearNativePushPresentation\} from '\.\/mobile-push'/);
 for(const source of [mobile,root])
  assert.doesNotMatch(source,/^import \* as Notifications from 'expo-notifications'/m);
 assert.match(mobile,/const Notifications=await import\('expo-notifications'\)/);
 assert.match(root,/const Notifications=getNativeNotifications\(\)/);
 assert.match(root,/if\(!Notifications\)return/);
});

test('optional native module loader catches missing or incompatible notification native bindings',()=>{
 const loader=read('src/lib/optional-notifications.cjs');
 assert.match(loader,/try\s*\{\s*return require\('expo-notifications'\)/);
 assert.match(loader,/catch\s*\{\s*return null/);
});

test('notifications and direct chat keep read-only fallbacks without eager push imports',()=>{
 const inbox=read('app/notifications.tsx');
 const direct=read('app/messages/[peer].tsx');
 for(const source of [inbox,direct]){
  assert.doesNotMatch(source,/^import \* as Notifications from 'expo-notifications'/m);
  assert.match(source,/getNativeNotifications\(\)/);
  assert.match(source,/if\(Notifications\)received=Notifications\.addNotificationReceivedListener/);
  assert.match(source,/received\?\.remove\(\)/);
 }
 assert.match(inbox,/setInterval\(\(\)=>\{void load\(true,version\)/);
 assert.match(direct,/setInterval\(\(\)=>\{/);
});
