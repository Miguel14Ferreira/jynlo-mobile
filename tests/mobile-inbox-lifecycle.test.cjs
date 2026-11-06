'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/(tabs)/messages.tsx'),'utf8');

test('chat inbox refreshes on foreground push and on app resume',()=>{
 assert.match(source,/Notifications\.addNotificationReceivedListener\(notification=>/);
 assert.match(source,/notification\.request\.content\.data\?\.kind!=='notification'/);
 assert.match(source,/AppState\.addEventListener\('change',state=>/);
 assert.match(source,/state==='active'&&generation\.current===version/);
 assert.match(source,/AppState\.currentState==='active'/);
 assert.match(source,/received\.remove\(\)/);
 assert.match(source,/resume\.remove\(\)/);
});
test('in-flight requests queue exactly one additional inbox reload',()=>{
 assert.match(source,/if\(busyVersion\.current===version\)\{pendingRefresh\.current=true;return;\}/);
 assert.match(source,/if\(pendingRefresh\.current\)\{pendingRefresh\.current=false;void load\(true,version\);\}/);
 assert.match(source,/pendingRefresh\.current=false;\s*generation\.current\+\+/);
 assert.match(source,/if\(version!==generation\.current\)return/);
});
test('account switch resets prior inbox before fetching the next user',()=>{
 assert.match(source,/identity\.current=currentIdentity;setItems\(\[\]\);setInvites\(\[\]\)/);
 assert.match(source,/generation\.current\+\+/);
 assert.match(source,/if\(!auth\.token\|\|!auth\.username\)/);
});
