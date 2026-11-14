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
 test(name+' chat does not mark unseen embedded history as read during polling',()=>{
  const source=read(file);
  assert.match(source,/const inlineNearBottom=useRef\(true\)/);
  assert.match(source,/const lastAcknowledgedMessageId=useRef\(0\)/);
  assert.match(source,/!embedded\|\|inlineNearBottom\.current/);
  assert.match(source,/lastAcknowledgedMessageId\.current=latest/);
  assert.match(source,/if\(inlineNearBottom\.current\)\{/);
  assert.ok(source.includes(api+'(id,latest,'));
 });
 test(name+' chat allows read cursor retry after a failed acknowledgement',()=>{
  const source=read(file);
  assert.match(source,/\.catch\(\(\)=>\{if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0;\}\)/);
  assert.match(source,/lastAcknowledgedMessageId\.current=0;/);
 });
}
