'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('all chat types normalize content URIs with temporary cleanup',()=>{
 const helper=read('src/lib/chat-photo-source.ts');
 const direct=read('src/lib/direct-photo-attachment.ts');
 const community=read('src/lib/chat-photo-attachment.ts');
 assert.match(helper,/!uri\.startsWith\('file:\/\/'\)/);
 assert.match(helper,/source\.copy\(temporary\)/);
 assert.match(helper,/temporary\.delete\(\)/);
 assert.match(helper,/verifiedLocalChatMediaSize\(actualSize,'image'\)/);
 for(const source of [direct,community]){
  assert.match(source,/prepareChatPhoto\(asset,extension\)/);
  assert.match(source,/new File\(prepared\.uri\) as unknown as Blob/);
  assert.doesNotMatch(source,/form\.append\('file',\{uri:/);
  assert.match(source,/prepared\.cleanup\(\)/);
 }
});
