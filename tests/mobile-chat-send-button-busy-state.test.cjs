'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('private chat does not display a tappable send action during photo or pending writes',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/disabled=\{sending\|\|photoBusy\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(peer\+'\|'\+auth\.token\)\|\|!draft\.trim\(\)\}/);
 assert.match(source,/if\(sending\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(identity\)/);
});

test('session chat send button respects active photo upload and identity-scoped writes',()=>{
 const source=read('src/components/SessionChatPanel.tsx');
 assert.match(source,/disabled=\{sending\|\|uploading\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(id\+'\|'\+auth\.token\)\|\|!draft\.trim\(\)\}/);
 assert.match(source,/if\(sendingNow\.current\|\|pendingWrites\.current\.has\(identity\)/);
});
