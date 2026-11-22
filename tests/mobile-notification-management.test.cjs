const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));

test('authenticated notifications API supports owner-scoped deletion, without unsafe retries',()=>{
 const api=read('src/lib/notifications-api.ts');
 assert.match(api,/export async function deleteMyNotification\(id:number,token:string\)/);
 assert.match(api,/Number.isSafeInteger\(id\)/);
 assert.match(api,/request<void>\(`\/api\/notifications\/\$\{id\}`,\{token,method:'DELETE'\}\)/);
 assert.match(api,/export async function deleteAllMyNotifications\(token:string\)/);
 assert.match(api,/request<void>\('\/api\/notifications\/me',\{token,method:'DELETE'\}\)/);
});

test('notifications UI offers unread filter, read-all and confirmed destructive actions',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/\[unreadOnly,setUnreadOnly\]=useState\(false\)/);
 assert.match(screen,/const unreadCount=visibleItems.filter\(item=>!item.read\).length/);
 assert.match(screen,/const filteredItems=unreadOnly\?visibleItems.filter\(item=>!item.read\):visibleItems/);
 assert.match(screen,/accessibilityLabel="Mostrar apenas notificações não lidas"/);
 assert.match(screen,/Marcar todas como lidas/);
 assert.match(screen,/async function markAllRead\(\)/);
 assert.match(screen,/async function removeOne\(item:JynloNotification\)/);
 assert.match(screen,/async function removeAll\(\)/);
 assert.match(screen,/Alert.alert\('Eliminar todas as notificações\?'/);
 assert.match(screen,/Alert.alert\('Eliminar esta notificação\?'/);
 assert.match(screen,/deleteMyNotification\(item.id,auth.token\)/);
 assert.match(screen,/deleteAllMyNotifications\(auth.token\)/);
});

test('account switching and stale polling cannot resurrect deleted private notifications',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/notificationRevision.current\+\+;/);
 assert.match(screen,/notificationLock.current=false;setNotificationBusy\(false\)/);
 assert.match(screen,/const initialNotificationRevision=notificationRevision.current/);
 assert.match(screen,/notificationRevision.current===initialNotificationRevision&&!notificationLock.current/);
 assert.match(screen,/account.current===identity&&notificationRevision.current===revision/);
 assert.match(screen,/setItems\(old=>old.filter\(n=>n.id!==item.id\)\)/);
 assert.match(screen,/setItems\(\[\]\);setNotice\('Notificações eliminadas.'\)/);
 assert.match(screen,/void markNotificationRead\(item.id,originalToken\).then\(/);
 assert.match(screen,/setItems\(old=>old.map\(n=>n.id===item.id\?\{\.\.\.n,read:true\}:n\)\)/);
 assert.match(screen,/notificationLock.current=true;setNotificationBusy\(true\)/);
});

test('messages tab obtains an authenticated unread alert badge without leaking previous accounts',()=>{
 const api=read('src/lib/notifications-api.ts');
 const tab=read('app/(tabs)/messages.tsx');
 assert.match(api,/myUnreadNotificationCount\(token:string\)/);
 assert.match(api,/\/api\/notifications\/me\/unread-count/);
 assert.match(api,/Number.isSafeInteger\(value\)/);
 assert.match(tab,/myUnreadNotificationCount\(auth.token\)/);
 assert.match(tab,/if\(unreadNotifications.status==='fulfilled'\)setNotificationUnread\(unreadNotifications.value\)/);
 assert.match(tab,/setNotificationUnread\(0\)/);
 assert.match(tab,/sameIdentity&&notificationUnread>0/);
 assert.match(tab,/notificationUnread>99\?'99\+'/);
});

test('notification inbox also shows real pending community invites from API',()=>{
 const screen=read('app/notifications.tsx');
 assert.match(screen,/import \{myCommunityInvites\} from '\.\.\/src\/lib\/community-api'/);
 assert.match(screen,/\[communityInvites,setCommunityInvites\]=useState<CommunityInvite\[\]>\(\[\]\)/);
 assert.match(screen,/const visibleCommunityInvites=sameAccount\?communityInvites:\[\]/);
 assert.match(screen,/myCommunityInvites\(auth\.token,auth\.username\)/);
 assert.match(screen,/communityInvitations\.status==='fulfilled'/);
 assert.match(screen,/setCommunityInvites\(communityInvitations\.value\)/);
 assert.match(screen,/Convites para comunidades · \{visibleCommunityInvites\.length\}/);
 assert.match(screen,/Convidado por @\{invite\.invitedByUsername\}/);
 assert.match(screen,/router\.push\('\/communities\/invites'\)/);
 assert.ok(screen.indexOf('Convites para comunidades · {visibleCommunityInvites.length}')<
   screen.indexOf('<View style={styles.pushPanel}>'),'Pending invitations must appear before optional push settings');
 assert.match(screen,/account\.current=identity;setItems\(\[\]\);setInvites\(\[\]\);setCommunityInvites\(\[\]\)/);
});

test('home bell signals server-confirmed community invites without inventing duplicate counts',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/import \{myCommunityInvites\} from '\.\.\/\.\.\/src\/lib\/community-api'/);
 assert.match(feed,/Promise\.allSettled\(\[\s*myNotifications\(token,username\),myCommunityInvites\(token,username\)/);
 assert.match(feed,/communityInvitations\.status==='fulfilled'\?communityInvitations\.value\.length:0/);
 assert.match(feed,/setUnreadNotifications\(Math\.max\(unread,pending\)\)/);
 assert.match(feed,/if\(!active\)return;/);
});
