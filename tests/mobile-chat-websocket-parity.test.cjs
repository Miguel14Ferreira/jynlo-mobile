const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('private chat connects once per focused account and conversation, not per render',()=>{
 const screen=read('app/messages/[peer].tsx');
 assert.match(screen,/observeDirectChat\(\{/);
 assert.match(screen,/peer,self:auth\.username,token:auth\.token/);
 assert.match(screen,/if\(active&&generation\.current===version&&AppState\.currentState==='active'&&!sendingNow\.current\)/);
 assert.match(screen,/disconnect\(\);resume\.remove\(\)/);
 assert.match(screen,/\},\[refresh,peer,auth\.token,auth\.username\]\)\)/);
 assert.match(screen,/if\(!socketOnline\|\|pollTicks%6===0\)void refresh\(true,version\)/);
});

test('private WebSocket hints reject untrusted chat events for other peers',()=>{
 const stream=read('src/lib/direct-chat-realtime.ts');
 assert.match(stream,/type:'AUTH',token/);
 assert.match(stream,/envelope\.type==='AUTHENTICATED'/);
 assert.match(stream,/envelope\.type!=='CHAT_MESSAGE'/);
 assert.match(stream,/sender===other&&recipient===me/);
 assert.match(stream,/sender===me&&recipient===other/);
 assert.match(stream,/lastHint<150/);
 assert.match(stream,/CHAT_READ_RECEIPT/);
 assert.doesNotMatch(stream,/setMessages\(|setDraft\(|setState\(/);
 assert.match(stream,/if\(e\.code===1003\)\{active=false;return;\}/);
});

test('session chat uses WebSocket-first sync and a fallback after missed events',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.match(screen,/observeSessionChat\(\{sessionId:id,token:auth\.token,onInvalidated:/);
 assert.match(screen,/onStatus:status=>\{/);
 assert.match(screen,/if\(!socketOnline\|\|pollTicks%6===0\)void refresh\(true,version\)/);
 assert.match(screen,/\},5000\)/);
 assert.match(screen,/resume\.remove\(\);disconnect\(\)/);
});
