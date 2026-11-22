const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/messages.tsx'),'utf8'));
const effect=source.slice(source.indexOf('useFocusEffect(useCallback('),source.indexOf('return <Page>'));

test('initial tab navigator cannot eagerly load native notifications from Messages',()=>{
 assert.doesNotMatch(source,/^import \* as Notifications from 'expo-notifications';/m);
 assert.match(source,/import type \* as NotificationTypes from 'expo-notifications'/);
 assert.match(source,/getNativeNotifications\(\)/);
});

test('Messages preserves inbox fallback if native listener registration fails',()=>{
 assert.match(effect,/let received:ReturnType<typeof NotificationTypes\.addNotificationReceivedListener>\|null=null/);
 assert.match(effect,/try\{\s*const Notifications=getNativeNotifications\(\)/);
 assert.match(effect,/if\(Notifications\)received=Notifications\.addNotificationReceivedListener/);
 assert.match(effect,/notification\.request\?\.content\?\.data\?\.kind/);
 assert.match(effect,/catch\{\s*\/\/ Polling and the app-resume listener remain the fallback/);
 assert.match(effect,/setInterval\(\(\)=>\{if\(AppState\.currentState==='active'\)void load\(true,version\)/);
 assert.match(effect,/AppState\.addEventListener\('change',state=>/);
});

test('native listener teardown cannot crash navigation away from Messages',()=>{
 assert.match(effect,/try\{received\?\.remove\(\);\}catch\{/);
 assert.match(effect,/pendingRefresh\.current=false;generation\.current\+\+/);
});
