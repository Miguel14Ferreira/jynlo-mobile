'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const layout=fs.readFileSync(path.join(__dirname,'../app/_layout.tsx'),'utf8');

test('Android native notification listener errors cannot interrupt root navigation',()=>{
 assert.match(layout,/let listener:ReturnType<typeof Notifications\.addNotificationResponseReceivedListener>\|null=null/);
 assert.match(layout,/try\{\s*listener=Notifications\.addNotificationResponseReceivedListener\(open\)/);
 assert.match(layout,/open\(Notifications\.getLastNotificationResponse\(\)\)/);
 assert.match(layout,/\}catch\{[\s\S]*?notification module error/);
 assert.match(layout,/return \(\)=>\{\s*active=false;\s*try\{listener\?\.remove\(\);\}catch\{/);
});

test('native notification cleanup failing cannot stop opening authenticated inbox',()=>{
 const callback=layout.slice(layout.indexOf('function open(response:'),layout.indexOf('let listener:ReturnType'));
 assert.match(callback,/try\{nativeNotifications\.clearLastNotificationResponse\(\);\}catch\{/);
 assert.match(callback,/router\.push\(\{pathname:'\/notifications',params:\{notificationId:String\(data\.id\)\}\}\)/);
 assert.ok(callback.indexOf("router.push({pathname:'/notifications'")<callback.indexOf('clearLastNotificationResponse()'),
  'Do not clear a native tap until inbox navigation succeeds');
});

test('push navigation remains gated behind restored authentication',()=>{
 assert.match(layout,/if\(!auth\.ready\)return/);
 assert.match(layout,/if\(!auth\.token\|\|!auth\.username\)return/);
 assert.match(layout,/data\?\.kind!=='notification'/);
 assert.match(layout,/lastHandled\.current===handledKey/);
 assert.match(layout,/const handledKey=auth\.username\+'\|'\+auth\.token\+'\|'\+identifier/);
});

test('malformed native push responses cannot dereference missing notification data',()=>{
 const callback=layout.slice(layout.indexOf('function open(response:'),layout.indexOf('let listener:ReturnType'));
 assert.match(callback,/response\.notification\?\.request\?\.content\?\.data/);
 assert.match(callback,/response\.notification\?\.request\?\.identifier/);
 assert.match(callback,/typeof identifier!=='string'\|\|!identifier/);
 assert.match(callback,/data\?\.kind!=='notification'/);
});

test('unavailable native listener removal cannot interrupt navigator teardown',()=>{
 assert.match(layout,/try\{listener\?\.remove\(\);\}catch\{/);
 assert.match(layout,/native module must never break navigator cleanup/);
});
