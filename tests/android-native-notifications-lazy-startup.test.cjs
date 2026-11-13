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
 assert.match(auth,/import \{disableMobilePush,clearNativePushPresentation,invalidatePendingPushRegistration\} from '\.\/mobile-push'/);
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

test('guest sessions never initialize native push before authentication',()=>{
 const root=read('app/_layout.tsx');
 const gate=root.indexOf('if(!auth.token||!auth.username)return;');
 const nativeLoad=root.indexOf('const Notifications=getNativeNotifications()');
 assert.ok(gate>=0&&nativeLoad>gate);
 assert.match(root,/if\(!auth\.ready\)return/);
});

test('deferred push callback uses a non-null native module snapshot for strict TypeScript',()=>{
 const root=read('app/_layout.tsx');
 const start=root.indexOf('function PushNavigation()');
 const end=root.indexOf('function Navigation()');
 const push=root.slice(start,end);
 assert.match(push,/if\(!Notifications\)return;\s*[\s\S]*?const nativeNotifications=Notifications;/);
 const callback=push.slice(push.indexOf('function open('),push.indexOf('let listener:'));
 assert.match(callback,/nativeNotifications\.DEFAULT_ACTION_IDENTIFIER/);
 assert.match(callback,/nativeNotifications\.clearLastNotificationResponse\(\)/);
 assert.doesNotMatch(callback,/\bNotifications\.DEFAULT_ACTION_IDENTIFIER|\bNotifications\.clearLastNotificationResponse\(\)/);
});

test('optional native CommonJS loader exposes a strict TypeScript declaration',()=>{
 const declaration=read('src/lib/optional-notifications.d.cts');
 assert.match(declaration,/import type \* as Notifications from 'expo-notifications'/);
 assert.match(declaration,/export function getNativeNotifications\(\): typeof Notifications \| null/);
 const root=read('app/_layout.tsx');
 const inbox=read('app/notifications.tsx');
 const messages=read('app/(tabs)/messages.tsx');
 for(const source of [root,inbox,messages]){
  assert.match(source,/getNativeNotifications/);
 }
});

test('native crypto is loaded only when push opt-in needs a new installation ID',()=>{
 const mobile=read('src/lib/mobile-push.ts');
 assert.doesNotMatch(mobile,/^import \* as Crypto from 'expo-crypto'/m);
 assert.match(mobile,/const Crypto=await import\('expo-crypto'\)/);
 const installer=mobile.indexOf('async function installId()');
 const saved=mobile.indexOf('if(saved)return saved;');
 const load=mobile.indexOf("await import('expo-crypto')");
 const create=mobile.indexOf('Crypto.randomUUID()');
 assert.ok(installer>=0&&saved>installer&&load>saved&&create>load);
 assert.match(mobile,/SecureStore\.setItemAsync\(INSTALL_ID_KEY,id\)/);
});

test('logout notification cleanup tolerates absent or broken native bindings',()=>{
 const mobile=read('src/lib/mobile-push.ts');
 const cleanup=mobile.slice(mobile.indexOf('export async function clearNativePushPresentation'));
 assert.match(cleanup,/try\{Notifications=await import\('expo-notifications'\);\}/);
 assert.match(cleanup,/catch\{return;\}/);
 assert.match(cleanup,/try\{await Notifications\.clearLastNotificationResponse\(\);\}catch\{\}/);
 assert.match(cleanup,/try\{await Notifications\.dismissAllNotificationsAsync\(\);\}catch\{\}/);
});
