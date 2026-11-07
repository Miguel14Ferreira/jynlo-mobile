'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/_layout.tsx'),'utf8');

test('cold-start notification is retained until authentication is available',()=>{
 const authGuard=source.indexOf('if(!auth.token||!auth.username)return;',source.indexOf('function open(response:'));
 const consumed=source.indexOf('Notifications.clearLastNotificationResponse();',source.indexOf('function open(response:'));
 assert.ok(authGuard>=0,'authentication guard is required');
 assert.ok(consumed>authGuard,'do not consume notification before authentication');
 assert.match(source,/if\(!auth\.ready\)return/);
 assert.match(source,/data\?\.kind!=='notification'/);
 assert.match(source,/Number\.isSafeInteger\(data\.id\)/);
 assert.match(source,/router\.push\(\{pathname:'\/notifications'/);
});
