const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8'));

test('WebSocket delivery does not mark community messages as read',()=>{
 const start=source.indexOf('onMessage:(_msg)=>');
 const end=source.indexOf('// Real-time events normally update',start);
 assert.ok(start>=0&&end>start,'community WebSocket message handler exists');
 const handler=source.slice(start,end);
 assert.match(handler,/void refresh\(version,true\)/);
 assert.doesNotMatch(handler,/setMessages\(|markCommunityRead\(/);
 // HTTP access control is rechecked on each hint before rendering content.
 assert.match(source,/communityMessages\(id,auth\.token,auth\.username\)/);
});

test('embedded community read receipts require measured message visibility',()=>{
 assert.match(source,/const inlineNearBottom=useRef\(false\)/);
 assert.match(source,/inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
 assert.match(source,/const lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
 assert.match(source,/lastMessageVisible&&AppState\.currentState==='active'/);
 assert.match(source,/lastAcknowledgedMessageId\.current=latest/);
 assert.match(source,/markCommunityRead\(id,latest,auth\.token,auth\.username\)/);
});
