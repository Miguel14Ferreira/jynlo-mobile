'use strict';
const untranslate=require('./untranslate.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('Facebook login is server-gated, browser-based and checks the state',()=>{
 const fb=read('src/lib/facebook-auth.ts');
 assert.ok(fb.includes("'/api/auth/facebook/config'"),'app id comes from the server');
 assert.ok(fb.includes("'/api/auth/facebook/login'")&&fb.includes("'/api/auth/facebook/register'"));
 assert.ok(fb.includes('WebBrowser.openAuthSessionAsync'),'uses the system browser session');
 assert.ok(fb.includes("p.get('state')!==expectedState"),'rejects a foreign state');
 assert.ok(fb.includes("scope:'public_profile,email'"),'only basic permissions (no App Review needed)');
 assert.ok(!/app.?secret/i.test(fb),'the app secret never ships in the app');
});

test('login shows the Facebook button only when configured and reuses onboarding',()=>{
 const login=read('app/login.tsx');const auth=read('src/lib/auth.tsx');const ret=read('app/auth/facebook.tsx');
 assert.ok(login.includes('{facebookReady?<Pressable'));
 assert.ok(login.includes('auth.loginFacebook(token)'));
 assert.ok(auth.includes("provider:'facebook'"));
 assert.ok(auth.includes('facebookRegisterWithToken(googlePending.credential,input)'));
 assert.ok(ret.includes('router.back()'),'the return deep link does not leave a blank screen');
});
