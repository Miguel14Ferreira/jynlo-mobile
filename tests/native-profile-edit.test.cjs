'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('authenticated profile editor is native, navigable and uses bearer JSON',()=>{
 const screen=read('app/edit-profile.tsx'),root=read('app/_layout.tsx'),profile=read('app/(tabs)/profile.tsx');
 assert.match(root,/name="edit-profile"/);
 assert.match(profile,/router\.push\('\/edit-profile'\)/);
 assert.match(screen,/\/api\/profile\/me\/mobile/);
 assert.match(screen,/\/api\/profile\/me'/);
 assert.match(screen,/method:'PUT'/);
 assert.match(screen,/token:auth\.token/);
 assert.doesNotMatch(screen,/Linking\.openURL|d24sports\.com/);
});
test('profile editor guards sensitive and required fields',()=>{
 const screen=read('app/edit-profile.tsx');
 assert.match(screen,/dateOfBirth/);
 assert.match(screen,/isAdult\(date\)/);
 assert.match(screen,/indicativePhone/);
 assert.match(screen,/original\.mfa/);
 assert.match(screen,/!auth\.token\|\|DEMO_MODE/);
 assert.doesNotMatch(screen,/username:.*values|password:/);
 assert.doesNotMatch(screen,/console\.log/);
});
