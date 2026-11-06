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
