const untranslate=require('./untranslate.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/lib/offline-core.cjs');

test('offline only when the system says there is no connection',()=>{
 assert.equal(core.isOffline({isConnected:false}),true);
 assert.equal(core.isOffline({isConnected:true,isInternetReachable:false}),true);
 assert.equal(core.isOffline({isConnected:true,isInternetReachable:null}),false);
 assert.equal(core.isOffline(null),false);
});

test('snapshots are per account, without the username in the file name',()=>{
 const a=core.snapshotName('explore','Ana'),b=core.snapshotName('explore','ana'),c=core.snapshotName('explore','rui');
 assert.equal(a,b);
 assert.notEqual(a,c);
 assert.doesNotMatch(a,/ana/i);
 assert.match(core.snapshotName('../../etc','x'),/^jynlo-offline-etc-/);
});

test('a snapshot is used only for the same account and within 7 days',()=>{
 const now=Date.parse('2026-11-21T20:00:00Z');
 const raw=core.serializeSnapshot([{id:1}],'Ana',now-3600000);
 assert.deepEqual(core.usableSnapshot(raw,'ana',now).data,[{id:1}]);
 assert.equal(core.usableSnapshot(raw,'rui',now),null);
 assert.equal(core.usableSnapshot(raw,'ana',now+8*86400000),null);
 assert.equal(core.usableSnapshot('{bad',  'ana',now),null);
 assert.equal(core.usableSnapshot(JSON.stringify({v:2}),'ana',now),null);
});

test('saved label in Portuguese',()=>{
 const now=Date.parse('2026-11-21T20:00:00Z');
 assert.equal(core.savedLabel(now-20000,now),'agora mesmo');
 assert.equal(core.savedLabel(now-5*60000,now),'há 5 min');
 assert.equal(core.savedLabel(now-3*3600000,now),'há 3 h');
 assert.match(core.savedLabel(now-3*86400000,now),/^a \d{2}\/\d{2}$/);
});

test('Explorar and As minhas sessões fall back to saved data; logout clears it; banner in the root',()=>{
 const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
 assert.match(read('src/lib/api.ts'),/withOfflineSnapshot\('explore'/);
 assert.match(read('src/lib/parity-api.ts'),/withOfflineSnapshot\('my-sessions'/);
 assert.match(read('src/lib/auth.tsx'),/clearOfflineSnapshots\(\)/);
 const layout=read('app/_layout.tsx');
 assert.match(layout,/<OfflineBanner\/>/);
 assert.match(layout,/startNetworkMonitoring\(\);/);
 // Chats and messages are never written to the offline cache.
 for(const f of ['src/lib/chat-api.ts','src/lib/private-groups-api.ts','src/lib/session-chat-api.ts'])assert.doesNotMatch(read(f),/withOfflineSnapshot|saveSnapshot/);
});
