'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

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
 assert.match(auth,/await disableMobilePush\(username,token\)/);
 const revokeIndex=auth.indexOf('await disableMobilePush(username,token)');
 const logoutIndex=auth.indexOf('await logoutServer(token)');
 assert.ok(revokeIndex>0&&logoutIndex>revokeIndex);
});
test('Expo plugin and package dependencies are configured without pretending push delivery is enabled',()=>{
 const pkg=JSON.parse(read('package.json'));
 const config=JSON.parse(read('app.json'));
 assert.equal(pkg.dependencies['expo-notifications'],'~58.1.8');
 assert.equal(pkg.dependencies['expo-crypto'],'~58.0.7');
 assert.ok(config.expo.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-notifications'));
 assert.match(read('app/notifications.tsx'),/envio de notificações ainda depende/);
});

test('push taps navigate only to the authenticated notification inbox',()=>{
 const layout=read('app/_layout.tsx');
 assert.match(layout,/Notifications\.addNotificationResponseReceivedListener\(open\)/);
 assert.match(layout,/Notifications\.getLastNotificationResponseAsync\(\)/);
 assert.match(layout,/if\(!auth\.token\|\|!auth\.username\)return/);
 assert.match(layout,/data\?\.kind!=='notification'/);
 assert.match(layout,/Number\.isSafeInteger\(data\.id\)/);
 assert.match(layout,/lastHandled\.current===identifier/);
 assert.match(layout,/pathname:'\/notifications',params:\{notificationId:String\(data\.id\)\}/);
 assert.doesNotMatch(layout,/router\.push\(data/);
});

test('push readiness requires a real public EAS project ID without claiming FCM readiness',()=>{
 const {checkPushReadiness}=require('../scripts/check-push-readiness.cjs');
 const missing=checkPushReadiness({});
 assert.equal(missing.ready,false);
 assert.equal(missing.projectIdConfigured,false);
 assert.ok(missing.issues.some(issue=>issue.includes('EAS projectId')));
 const configured=checkPushReadiness({EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID:'12345678-1234-4234-8234-123456789012'});
 assert.equal(configured.projectIdConfigured,true);
 assert.equal(configured.ready,true);
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
 assert.match(push,/if\(!actual\)await SecureStore\.deleteItemAsync\(REGISTERED_ACCOUNT_KEY\)/);
 assert.match(screen,/pushRegistrationStatus\(auth\.username,auth\.token\)/);
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
 assert.match(screen,/void open\(target\)/);
 assert.match(screen,/router\.setParams\(\{notificationId:''\}\)/);
 assert.match(screen,/loading\|\|!historyReady/);
 assert.match(screen,/setHistoryReady\(true\)/);
 assert.match(screen,/if\(!target\)\{/);
 assert.match(screen,/if\(account\.current!==initialIdentity\)return/);
 assert.doesNotMatch(screen,/router\.push\(\{pathname:notificationId/);
});

test('native push responses are consumed once and cannot replay after logout',()=>{
 const layout=read('app/_layout.tsx');
 assert.match(layout,/Notifications\.clearLastNotificationResponse\(\)/);
 assert.match(layout,/response\.actionIdentifier!==Notifications\.DEFAULT_ACTION_IDENTIFIER/);
 assert.match(layout,/if\(!auth\.token\|\|!auth\.username\)return/);
 assert.match(layout,/let active=true/);
 assert.match(layout,/active=false;listener\.remove\(\)/);
 assert.match(layout,/lastHandled\.current===identifier/);
});
