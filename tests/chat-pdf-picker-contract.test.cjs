'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('PDF picker opens at most once while native document selection is pending',()=>{
 const composer=read('src/components/ChatPdfComposer.tsx');
 assert.match(composer,/pickerRef=useRef\(false\)/);
 assert.match(composer,/if\(!enabled\|\|!token\|\|busyRef\.current\|\|pickerRef\.current\)return/);
 assert.match(composer,/pickerRef\.current=true;/);
 assert.match(composer,/finally\{pickerRef\.current=false;\}/);
 assert.match(composer,/disabled=\{busy\|\|busyRef\.current\|\|pickerRef\.current\}/);
});
test('PDF picker discards results from a previous chat without leaking cached files',()=>{
 const composer=read('src/components/ChatPdfComposer.tsx');
 assert.match(composer,/const version=generation\.current;/);
 assert.match(composer,/if\(!active\.current\|\|generation\.current!==version\)\{cleanup\(asset\);return;\}/);
 assert.match(composer,/catch\(e\)\{cleanup\(asset\);throw e;\}/);
 assert.match(composer,/selectedRef\.current=asset/);
});
test('all chat modes use the same PDF composer and authenticated attachment delivery',()=>{
 const files=['src/components/SessionChatPanel.tsx','src/components/CommunityChatPanel.tsx','app/messages/[peer].tsx'];
 for(const name of files){
  const content=read(name);
  assert.match(content,/<ChatPdfComposer /,name);
  assert.match(content,/<SecureChatAttachment /,name);
 }
});
