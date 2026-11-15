'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

for(const [name,file,api] of [
 ['session','src/components/SessionChatPanel.tsx','markSessionChatRead'],
 ['community','src/components/CommunityChatPanel.tsx','markCommunityRead']
]){
 test(name+' embedded chat only acknowledges messages at a measured visible end',()=>{
  const source=read(file);
  // Fail closed until a real scroll measurement is available.
  assert.match(source,/const inlineNearBottom=useRef\(false\)/);
  assert.match(source,/const lastAcknowledgedMessageId=useRef\(0\)/);
  assert.match(source,/const lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
  assert.match(source,/lastMessageVisible&&AppState\.currentState==='active'/);
  assert.match(source,/if\(inlineNearBottom\.current\)\{/);
  assert.ok(source.includes(api+'(id,latest,'));
  assert.match(source,/lastAcknowledgedMessageId\.current=latest/);
 });
 test(name+' resets read cursor on a failed acknowledgement',()=>{
  const source=read(file);
  assert.match(source,/\.catch\(\(\)=>\{if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0;\}\)/);
  assert.match(source,/lastAcknowledgedMessageId\.current=0;/);
 });
}

test('direct chat marks read only after measured viewport reaches the bottom',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/const nearBottom=useRef\(false\)/);
 assert.match(source,/const lastAcknowledgedMessageId=useRef\(0\)/);
 assert.match(source,/historyViewportMeasured\.current&&contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
 assert.match(source,/nearBottom\.current&&auth\.token&&AppState\.currentState==='active'/);
 assert.match(source,/markDirectRead\(peer,latest,auth\.token\)/);
 assert.match(source,/if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0/);
});
