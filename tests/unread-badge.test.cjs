const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
const {badgeTotal}=require('../src/lib/unread-badge-core.cjs');
test('badge sums unread messages and ignores muted conversations',()=>{
 const direct=[{kind:'direct',id:'Ana',unreadCount:2},{kind:'direct',id:'rui',unreadCount:0}];
 const community=[{kind:'community',id:'7',unreadCount:5}];
 const session=[{kind:'session',id:'9',unreadCount:1},{kind:'session',id:'10',unreadCount:-3}];
 assert.equal(badgeTotal([direct,community,session],[]),8);
 assert.equal(badgeTotal([direct,community,session],[{kind:'community',id:'7'},{kind:'direct',id:'ana'}]),1);
 assert.equal(badgeTotal([null,undefined],null),0);
});
test('Messages tab shows the badge and refreshes on focus, foreground, live events and every 30 seconds',()=>{
 const tabs=read('app/(tabs)/_layout.tsx');
 assert.match(tabs,/tabBarBadge:badge\|\|undefined/);
 assert.match(tabs,/screenListeners=\{\{focus:\(\)=>\{void unread\.refresh\(\);\}\}\}/);
 const hook=read('src/lib/use-unread-messages.ts');
 assert.match(hook,/POLL_MS=30_000/);
 // One request to the server total; the old per-source sum only if the endpoint does not exist.
 assert.match(hook,/'\/api\/messages\/inbox\/unread-count'/);
 assert.match(hook,/e\.status===404\|\|e\.status===405\)\)return null;/);
 // Only an account switch discards a result (an early tab-focus refresh must still count).
 assert.match(hook,/if\(who!==identityRef\.current\)return;/);
 assert.doesNotMatch(hook,/generation/);
 assert.match(hook,/AppState\.addEventListener\('change'/);
 // A failed refresh keeps the last value instead of hiding real unread messages.
 assert.match(hook,/direct\.status==='rejected'&&community\.status==='rejected'&&session\.status==='rejected'\)return;/);
});
