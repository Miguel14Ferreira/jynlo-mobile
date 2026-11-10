'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const chat=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');
const focus=chat.slice(chat.indexOf('useFocusEffect(useCallback('),chat.indexOf('async function updateBlock()'));

test('direct chat tolerates unavailable native notification registration',()=>{
 assert.match(focus,/let received:ReturnType<typeof NotificationTypes\.addNotificationReceivedListener>\|null=null/);
 assert.match(focus,/const Notifications=getNativeNotifications\(\)/);
 assert.match(focus,/try\{\s*const Notifications=getNativeNotifications\(\)/);
 assert.match(focus,/if\(Notifications\)received=Notifications\.addNotificationReceivedListener\(/);
 assert.match(focus,/\}catch\{\s*\/\/ The 15-second poll and app-resume refresh/);
 assert.match(focus,/if\(notification\.request\?\.content\?\.data\?\.kind!=='notification'/);
});
test('direct chat listener removal is failure-safe during navigation',()=>{
 assert.match(focus,/active=false;clearInterval\(timer\);resume\.remove\(\)/);
 assert.match(focus,/try\{received\?\.remove\(\);\}catch\{/);
 assert.match(focus,/pendingRefresh\.current=false;generation\.current\+\+;blockCheckRequest\.current\+\+/);
});
test('direct chat retains read-only fallback when native notifications are unavailable',()=>{
 assert.match(focus,/setInterval\(\(\)=>\{/);
 assert.match(focus,/AppState\.addEventListener\('change',state=>/);
 assert.match(focus,/void refresh\(true,version\)/);
});
