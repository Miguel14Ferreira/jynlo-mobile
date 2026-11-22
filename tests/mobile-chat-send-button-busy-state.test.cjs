const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('private chat does not display a tappable send action during photo or pending writes',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/disabled=\{mutationBusy\|\|sending\|\|photoBusy\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(peer\+'\|'\+auth\.token\)\|\|!blockStatusKnown\|\|!draft\.trim\(\)(\}|\|\|\(uncertainSend)/);
 assert.match(source,/if\(mutationLock\.current\|\|sending\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(identity\)/);
});

test('session chat send button respects active photo upload and identity-scoped writes',()=>{
 const source=read('src/components/SessionChatPanel.tsx');
 assert.match(source,/disabled=\{sending\|\|uploading\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(id\+'\|'\+auth\.token\)\|\|!draft\.trim\(\)(\}|\|\|\(uncertainSend)/);
 assert.match(source,/if\(mutationLock\.current\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(identity\)/);
});
