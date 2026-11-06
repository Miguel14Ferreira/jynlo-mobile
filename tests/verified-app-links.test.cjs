'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {nativeRouteForWebLink:route}=require('../src/lib/native-app-links.cjs');
const token=['123e4567','e89b','12d3','a456','426614174000'].join('-');
test('signed Jynlo confirmation and reset links route to Android screens',()=>{
 assert.equal(route('https://d24sports.com/?confirmRegistration='+token),'/confirm-email?token='+token);
 assert.equal(route('https://d24sports.com/login/registerNewUser/confirmTokenRegistration/'+token),'/confirm-email?token='+token);
 assert.equal(route('https://d24sports.com/login/resetPassword/'+token),'/reset-password?token='+token);
 assert.equal(route('https://d24sports.com/sessions/12'),'/sessions/12');
 assert.equal(route('https://d24sports.com/venues/33'),'/venues/33');
 assert.equal(route('https://d24sports.com/privacy'),'/legal?document=privacy');
 assert.equal(route('https://d24sports.com/terms'),'/legal?document=terms');
});
test('never reroute untrusted hosts or invalid tokens',()=>{
 assert.equal(route('https://attacker.example/?confirmRegistration='+token),'https://attacker.example/?confirmRegistration='+token);
 assert.equal(route('http://d24sports.com/?confirmRegistration='+token),'http://d24sports.com/?confirmRegistration='+token);
 assert.equal(route('https://d24sports.com/?confirmRegistration=../../bad'),'https://d24sports.com/?confirmRegistration=../../bad');
 assert.equal(route('/(tabs)/explore'),'/(tabs)/explore');
});
test('asset link config is scoped to Jynlo package and verified HTTPS paths',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../app.json'),'utf8'));
 const filters=cfg.expo.android.intentFilters;
 assert.ok(filters.some(f=>f.autoVerify===true&&f.data.some(d=>d.host==='d24sports.com'&&d.scheme==='https')));
 assert.equal(cfg.expo.android.package,'com.jynlo.app');
});
