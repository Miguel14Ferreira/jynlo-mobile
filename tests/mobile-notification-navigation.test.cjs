'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {notificationDestination}=require('../src/lib/notification-route.cjs');
const screen=fs.readFileSync(path.join(__dirname,'../app/notifications.tsx'),'utf8');
test('notification routes only navigate valid authenticated targets',()=>{
 assert.deepEqual(notificationDestination({type:'COMMUNITY_INVITE'}),{kind:'invites'});
 assert.deepEqual(notificationDestination({type:'COMMUNITY_JOIN_ACCEPTED',communityId:11}),{kind:'community',id:'11'});
 assert.deepEqual(notificationDestination({type:'SESSION_CHAT_MESSAGE',sessionId:23}),{kind:'session-chat',id:'23'});
 assert.deepEqual(notificationDestination({type:'COMMUNITY_CHAT_MESSAGE',communityId:7}),{kind:'community-chat',id:'7'});
 assert.deepEqual(notificationDestination({type:'DIRECT_MESSAGE',relatedUsername:'player_2'}),{kind:'direct-chat',peer:'player_2'});
 assert.deepEqual(notificationDestination({type:'SESSION_INVITE',sessionId:19}),{kind:'session',id:'19'});
 assert.equal(notificationDestination({type:'DIRECT_MESSAGE',relatedUsername:'../bad'}),null);
 assert.equal(notificationDestination({type:'COMMUNITY_CHAT_MESSAGE',communityId:-1}),null);
 assert.equal(notificationDestination({type:'SESSION_CHAT_MESSAGE',sessionId:'2'}),null);
 assert.equal(notificationDestination({type:'UNKNOWN',relatedUsername:'player_2'}),null);
});
test('notifications refresh safely while focused without clearing on partial errors',()=>{
 assert.match(screen,/setInterval\(\(\)=>\{void load\(true,version\);\},20000\)/);
 assert.match(screen,/clearInterval\(timer\)/);
 assert.match(screen,/generation\.current\+\+/);
 assert.match(screen,/version!==generation\.current/);
 assert.match(screen,/inFlight\.current===version/);
 assert.match(screen,/identity!==account\.current/);
 assert.match(screen,/setItems\(\[\]\);setInvites\(\[\]\)/);
 assert.match(screen,/if\(notifs\.status==='fulfilled'&&notificationRevision\.current===initialNotificationRevision&&!notificationLock\.current\)/);
 assert.match(screen,/if\(invitations\.status==='fulfilled'\)/);
 assert.match(screen,/notificationDestination\(item\)/);
 assert.match(screen,/pathname:'\/messages\/\[peer\]'/);
 assert.match(screen,/pathname:'\/communities\/\[id\]\/chat'/);
 assert.match(screen,/pathname:'\/sessions\/\[id\]\/chat'/);
});

test('foreground push refreshes authenticated inbox immediately without dropping concurrent updates',()=>{
 assert.match(screen,/Notifications\.addNotificationReceivedListener\(notification=>/);
 assert.match(screen,/payload\?\.kind!=='notification'/);
 assert.match(screen,/generation\.current!==version/);
 assert.match(screen,/received\.remove\(\)/);
 assert.match(screen,/if\(inFlight\.current===version\)\{pendingRefresh\.current=true;return;\}/);
 assert.match(screen,/if\(pendingRefresh\.current\)\{/);
 assert.match(screen,/pendingRefresh\.current=false;\s*void load\(true,version\)/);
 assert.match(screen,/setInterval\(\(\)=>\{void load\(true,version\);\},20000\)/);
});

test('returning to foreground refreshes the inbox and removes background subscriptions on blur',()=>{
 assert.match(screen,/AppState\.addEventListener\('change',state=>/);
 assert.match(screen,/state==='active'&&generation\.current===version/);
 assert.match(screen,/resume\.remove\(\)/);
 assert.match(screen,/received\.remove\(\)/);
 assert.match(screen,/clearInterval\(timer\)/);
});

test('stale inbox and invitation requests cannot change account after switching users',()=>{
 assert.match(screen,/if\(notifs\.status==='rejected'\)setHistoryReady\(false\)/);
 assert.match(screen,/setHistoryReady\(false\);setLoading\(false\);setItems\(\[\]\)/);
 assert.match(screen,/if\(account\.current!==initialIdentity\|\|inviteOperation\.current!==operation\)return;\s*setInvites\(/);
 assert.match(screen,/if\(account\.current===initialIdentity\)setItems\(/);
 assert.match(screen,/if\(account\.current===initialIdentity\)setError\(/);
});

test('switching accounts releases old pending actions but ignores their eventual replies',()=>{
 assert.match(screen,/pushOperation\.current\+\+;inviteOperation\.current\+\+/);
 assert.match(screen,/setPushBusy\(false\);setBusyInvite\(null\)/);
 assert.match(screen,/const operation=\+\+inviteOperation\.current/);
 assert.match(screen,/const operation=\+\+pushOperation\.current/);
 assert.match(screen,/if\(account\.current===initialIdentity&&inviteOperation\.current===operation\)setBusyInvite\(null\)/);
 assert.match(screen,/if\(pushOperation\.current===operation\)setPushBusy\(false\)/);
});
