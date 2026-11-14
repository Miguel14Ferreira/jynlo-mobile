'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8');

test('embedded community chat does not acknowledge WebSocket delivery as reading',()=>{
 const socket=source.match(/onMessage:\(msg\)=>\{[\s\S]*?\n\s*\}\);/);
 assert.ok(socket,'community WebSocket message handler exists');
 assert.match(socket[0],/setMessages\(old=>mergeMessages\(old,\[msg\]\)\)/);
 assert.match(socket[0],/!embedded\s*&&\s*AppState\.currentState==='active'/);
 assert.doesNotMatch(socket[0],/if\(msg\.username!==auth\.username\)void markCommunityRead/);
});

test('embedded community read receipts require the reader to reach the end',()=>{
 assert.match(source,/inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
 assert.match(source,/if\(inlineNearBottom\.current\)\{/);
 assert.match(source,/lastAcknowledgedMessageId\.current=latest/);
});
