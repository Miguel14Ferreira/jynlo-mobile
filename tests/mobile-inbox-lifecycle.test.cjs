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

test('chat inbox reports freshness without erasing loaded conversations on partial API failure',()=>{
 assert.match(source,/const \[lastSyncedAt,setLastSyncedAt\]=useState<Date\|null>\(null\)/);
 assert.match(source,/const partial=groups\.status==='rejected'\|\|privateChats\.status==='rejected'\|\|requests\.status==='rejected'/);
 assert.match(source,/if\(!partial\)setLastSyncedAt\(new Date\(\)\)/);
 assert.match(source,/Os dados anteriores podem estar desatualizados/);
 assert.match(source,/else setChatWarning\('A atualização automática falhou/);
 assert.match(source,/setLastSyncedAt\(null\);setChatWarning\(''\);setError\(''\)/);
 assert.match(source,/Última sincronização completa:/);
 assert.match(source,/title="Atualizar conversas" disabled=\{loading\} onPress=\{\(\)=>\{void load\(false\);\}\}/);
});
