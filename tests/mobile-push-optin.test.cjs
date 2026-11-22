const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('Expo token permission request is explicitly user initiated and scoped to configured project',()=>{
 const service=read('src/lib/mobile-push.ts');
 const screen=read('app/notifications.tsx');
 assert.match(service,/const easProjectId=projectId\(\)/);
 assert.match(service,/Constants\.easConfig\?\.projectId/);
 assert.match(service,/Notifications\.getPermissionsAsync\(\)/);
 assert.match(service,/Notifications\.requestPermissionsAsync\(\)/);
 assert.match(service,/Notifications\.getExpoPushTokenAsync\(\{projectId:easProjectId\}\)/);
 assert.match(service,/Notifications\.setNotificationChannelAsync\('jynlo-messages'/);
 assert.match(service,/registerPushDevice\(token,/);
 assert.match(service,/Crypto\.randomUUID\(\)/);
 assert.match(service,/SecureStore\.setItemAsync\(REGISTERED_ACCOUNT_KEY/);
 assert.match(screen,/Ativar notificações neste dispositivo/);
 assert.match(screen,/togglePush\(\)/);
 assert.match(screen,/enableMobilePush\(auth\.username,auth\.token\)/);
 assert.doesNotMatch(read('app/_layout.tsx'),/enableMobilePush/);
});
test('registered device is removed before bearer session logout',()=>{
 const service=read('src/lib/mobile-push.ts');
 const auth=read('src/lib/auth.tsx');
 assert.match(service,/await unregisterPushDevice\(token,id\)/);
 assert.match(service,/await SecureStore\.deleteItemAsync\(REGISTERED_ACCOUNT_KEY\)/);
 assert.match(auth,/await disableMobilePush\(nameToRevoke,tokenToRevoke\)/);
 const clearIndex=auth.indexOf('setToken(null)',auth.indexOf('const logout=useCallback'));
 const revokeIndex=auth.indexOf('await disableMobilePush(nameToRevoke,tokenToRevoke)');
 const logoutIndex=auth.indexOf('await logoutServer(tokenToRevoke)');
 assert.ok(clearIndex>=0&&revokeIndex>clearIndex&&logoutIndex>revokeIndex);
});
test('Expo plugin and package dependencies are configured without pretending push delivery is enabled',()=>{
 const pkg=JSON.parse(read('package.json'));
 const config=JSON.parse(read('app.json'));
 assert.equal(pkg.dependencies['expo-notifications'],'~58.1.8');
 assert.equal(pkg.dependencies['expo-crypto'],'~58.0.7');
 assert.ok(config.expo.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-notifications'));
 // The screen never claims delivery: registration ≠ delivery, and server readiness is checked.
 const screen=read('app/notifications.tsx');
 assert.match(screen,/O registo não garante que os avisos sejam entregues/);
 assert.match(screen,/A entrega exige o serviço de envio operacional/);
 assert.match(screen,/O envio push ainda não está ativo no servidor/);
});

test('push taps navigate only to the authenticated notification inbox',()=>{
 const layout=read('app/_layout.tsx');
 assert.match(layout,/Notifications\.addNotificationResponseReceivedListener\(open\)/);
 assert.match(layout,/Notifications\.getLastNotificationResponse\(\)/);
 assert.match(layout,/if\(!auth\.token\|\|!auth\.username\)return/);
 assert.match(layout,/data\?\.kind==='notification'\?pushNotificationId\(data\.id\):null/);
 assert.match(layout,/pushNotificationId\(data\.id\)/);
 assert.match(layout,/lastHandled\.current===handledKey/);
 assert.match(layout,/pathname:'\/notifications',params:\{notificationId:id\}/);
 assert.doesNotMatch(layout,/router\.push\(data/);
});

test('push readiness requires a real public EAS project ID without claiming FCM readiness',()=>{
 const {checkPushReadiness}=require('../scripts/check-push-readiness.cjs');
 const configured=checkPushReadiness({});
 assert.equal(configured.projectIdConfigured,true);
 assert.equal(configured.ready,true);
 assert.equal(configured.issues.length,0);
 // Firebase client configuration is independently required for native FCM.
 const appConfig=read('app.config.js');
 assert.match(appConfig,/GOOGLE_SERVICES_JSON/);
 assert.match(appConfig,/googleServicesFile:firebaseConfigFile/);
 assert.match(read('src/lib/mobile-push.ts'),/if\(!androidPushConfigured\(\)\)throw Error/);
 const code=read('src/lib/mobile-push.ts');
 assert.match(code,/process\.env\.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID/);
 assert.ok(read('package.json').includes('"check:push"'));
});

test('push switch verifies server ownership before displaying enabled state',()=>{
 const client=read('src/lib/push-device-api.ts');
 const push=read('src/lib/mobile-push.ts');
 const screen=read('app/notifications.tsx');
 assert.match(client,/getPushDeviceStatus\(token:string,deviceId:string\)/);
 assert.match(client,/\/api\/notifications\/me\/devices\//);
 assert.match(push,/await getPushDeviceStatus\(token,id\)/);
 assert.match(push,/if\(!actual\)\{/);
 assert.match(push,/if\(pushOperationEpoch===revision&&!pushOptInPending&&latest===registered\)/);
 assert.match(push,/await SecureStore\.deleteItemAsync\(REGISTERED_ACCOUNT_KEY\)/);
 assert.match(screen,/pushRegistrationStatus\(auth\.username,auth\.token\)/);
});

test('EAS push-test APK refuses silent Firebase-free builds',()=>{
 const eas=JSON.parse(read('eas.json'));
 const profile=eas.build['push-test'];
 assert.equal(profile.environment,'preview');
 assert.equal(profile.env.JYNLO_REQUIRE_NATIVE_PUSH,'1');
 assert.equal(profile.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8,'1');
 const config=read('app.config.js');
 assert.match(config,/process\.env\.JYNLO_REQUIRE_NATIVE_PUSH === '1' && !firebaseConfigFile/);
 assert.match(config,/a APK push-test exige GOOGLE_SERVICES_JSON/);
});

test('push-test APK profile always uses real Jynlo API and remains an explicit build',()=>{
 const eas=JSON.parse(read('eas.json'));
 const profile=eas.build['push-test'];
 assert.equal(profile.distribution,'internal');
 assert.equal(profile.android.buildType,'apk');
 assert.equal(profile.env.JYNLO_REQUIRE_REAL_API,'1');
 assert.equal(profile.env.EXPO_PUBLIC_JYNLO_API_URL,'https://desporto24-preview-api.onrender.com');
 assert.ok(!eas.build.production.env.JYNLO_PUSH_ENABLED);
 const workflow=read('.github/workflows/mobile-push-validation.yml');
 assert.match(workflow,/expo export --platform android/);
 assert.doesNotMatch(workflow,/eas build --platform android/);
});

test('push tap resolves only an ID returned by the authenticated notification API',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/useLocalSearchParams/);
 assert.match(screen,/useIsFocused/);
 assert.match(screen,/account\.current!==auth\.username\+'\|'\+auth\.token/);
 assert.match(screen,/\^\[1-9\]\[0-9\]\{0,15\}\$/);
 assert.match(screen,/items\.find\(item=>String\(item\.id\)===notificationId\)/);
 assert.match(screen,/if\(open\(target\)\)\{/);
 assert.match(screen,/router\.setParams\(\{notificationId:''\}\)/);
 assert.match(screen,/loading\|\|!historyReady/);
 assert.match(screen,/setHistoryReady\(true\)/);
 assert.match(screen,/if\(!target\)\{/);
 assert.match(screen,/if\(account\.current!==initialIdentity\)return/);
 assert.doesNotMatch(screen,/router\.push\(\{pathname:notificationId/);
});

test('native push responses are consumed once and cannot replay after logout',()=>{
 const layout=read('app/_layout.tsx');
 assert.match(layout,/nativeNotifications\.clearLastNotificationResponse\(\)/);
 assert.match(layout,/response\.actionIdentifier!==nativeNotifications\.DEFAULT_ACTION_IDENTIFIER/);
 assert.match(layout,/if\(!auth\.token\|\|!auth\.username\)return/);
 assert.match(layout,/let active=true/);
 assert.match(layout,/active=false;\s*try\{listener\?\.remove\(\);\}catch\{/);
 assert.match(layout,/lastHandled\.current===handledKey/);
});

test('logout and token expiry clear previous account notification presentation',()=>{
 const auth=read('src/lib/auth.tsx');
 const native=read('src/lib/mobile-push.ts');
 assert.match(native,/Notifications\.clearLastNotificationResponse\(\)/);
 assert.match(native,/Notifications\.dismissAllNotificationsAsync\(\)/);
 assert.match(auth,/try\{await clearNativePushPresentation\(\);\}catch/);
 assert.match(auth,/void clearNativePushPresentation\(\)\.catch/);
 assert.ok(auth.indexOf('try{await clearNativePushPresentation();}')<
    auth.indexOf('await logoutServer(tokenToRevoke)'));
});

test('cold start processes push only after SecureStore authentication restoration',()=>{
 const layout=read('app/_layout.tsx');
 assert.match(layout,/if\(!auth\.ready\)return/);
 assert.match(layout,/open\(Notifications\.getLastNotificationResponse\(\)\)/);
 assert.match(layout,/\[auth\.ready,auth\.token,auth\.username,router\]/);
 assert.doesNotMatch(layout,/getLastNotificationResponseAsync/);
 assert.ok(layout.indexOf('if(!auth.ready)return')<
           layout.indexOf('Notifications.clearLastNotificationResponse()'));
});

test('stale push-device queries cannot overwrite explicit opt-in or account changes',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/const statusRequest=useRef\(0\)/);
 assert.match(screen,/const requestId=\+\+statusRequest\.current/);
 assert.match(screen,/statusRequest\.current===requestId/);
 assert.match(screen,/statusRequest\.current\+\+;\n  const identity=/);
 assert.match(screen,/generation\.current\+\+;statusRequest\.current\+\+/);
 assert.match(screen,/if\(account\.current===identity&&pushOperation\.current===operation\)setPushEnabled\(true\)/);
 assert.match(screen,/if\(account\.current===identity&&pushOperation\.current===operation\)setPushEnabled\(false\)/);
});

test('push opt-in can be synchronously cancelled before the native permission promise resolves',()=>{
 const push=read('src/lib/mobile-push.ts');
 const auth=read('src/lib/auth.tsx');
 assert.match(push,/export function invalidatePendingPushRegistration\(\):void\{pushOperationEpoch\+\+;\}/);
 assert.match(push,/const operation=\+\+pushOperationEpoch/);
 assert.match(push,/const ensureActive=\(\)=>\{if\(operation!==pushOperationEpoch\)/);
 assert.match(push,/invalidatePendingPushRegistration\(\);\s*if\(!username\|\|!token\|\|DEMO_MODE\)return/);
 assert.match(auth,/import \{disableMobilePush,clearNativePushPresentation,invalidatePendingPushRegistration\}/);
});

test('concurrent Firebase opt-ins are rejected rather than racing registration and revocation',()=>{
 const service=read('src/lib/mobile-push.ts');
 assert.match(service,/let pushOptInPending=false/);
 assert.match(service,/if\(pushOptInPending\)throw Error\('Já existe uma ativação/);
 assert.match(service,/pushOptInPending=true;\s*try\{/);
 assert.match(service,/\}finally\{\s*pushOptInPending=false;/);
});

test('push status query cannot erase a new registration while old HTTP status is pending',()=>{
 const service=read('src/lib/mobile-push.ts');
 assert.match(service,/const revision=pushOperationEpoch/);
 assert.match(service,/if\(pushOptInPending\)return false/);
 assert.match(service,/getPushDeviceStatus\(token,id\)/);
 assert.match(service,/if\(pushOperationEpoch!==revision\|\|pushOptInPending\)return false/);
 assert.match(service,/const latest=await SecureStore\.getItemAsync\(REGISTERED_ACCOUNT_KEY\)/);
 assert.match(service,/if\(pushOperationEpoch===revision&&!pushOptInPending&&latest===registered\)/);
});
test('push switch uses a synchronous lock against double taps',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/const pushBusyRef=useRef\(false\)/);
 assert.match(screen,/if\(!sameAccount\|\|!auth\.username\|\|!auth\.token\|\|pushBusyRef\.current\)return/);
 assert.match(screen,/pushBusyRef\.current=true/);
 assert.match(screen,/pushBusyRef\.current=false/);
});


test('push enrollment locks cannot leak across account switches',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/pushOperation\.current\+\+;inviteOperation\.current\+\+;notificationRevision\.current\+\+/);
 assert.match(screen,/pushBusyRef\.current=false;notificationLock\.current=false;setNotificationBusy\(false\)/);
 assert.match(screen,/if\(account\.current===identity&&pushOperation\.current===operation\)\{\s*pushBusyRef\.current=false;\s*setPushBusy\(false\)/);
 assert.match(screen,/if\(!sameAccount\|\|!auth\.username\|\|!auth\.token\|\|pushBusyRef\.current\)return/);
});
