'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('authenticated users change password without leaving the app',()=>{
 const screen=read('app/change-password.tsx');
 const profile=read('app/(tabs)/profile.tsx');
 const layout=read('app/_layout.tsx');
 assert.match(layout,/name="change-password"/);
 assert.match(profile,/router\.push\('\/change-password'\)/);
 assert.match(screen,/\/api\/profile\/me\/password/);
 assert.match(screen,/method:'PUT'/);
 assert.match(screen,/currentPassword,newPassword/);
 assert.match(screen,/token:auth\.token/);
 assert.doesNotMatch(screen,/Linking\.openURL|d24sports\.com/);
});
test('password form requires current password, 8-128 characters, and matching confirmation',()=>{
 const screen=read('app/change-password.tsx');
 assert.match(screen,/newPassword\.length<8\|\|newPassword\.length>128/);
 assert.match(screen,/newPassword!==confirmPassword/);
 assert.match(screen,/currentPassword===newPassword/);
 assert.match(screen,/DEMO_MODE/);
 assert.match(screen,/secureTextEntry/g);
 assert.match(screen,/setCurrentPassword\(''\)/);
 assert.match(screen,/setNewPassword\(''\)/);
 assert.doesNotMatch(screen,/console\.log|JSON\.stringify\(.*[pP]assword/);
});
