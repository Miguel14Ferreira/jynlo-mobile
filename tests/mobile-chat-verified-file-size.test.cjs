'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {verifiedLocalChatMediaSize}=require('../src/lib/chat-attachments-core.cjs');

test('private media accepts only native-measured, safe, positive integer sizes',()=>{
 const MB=1024*1024;
 for(const type of ['image','video']){
  for(const bad of [-1,0,null,undefined,NaN,Infinity,1.2,Number.MAX_SAFE_INTEGER+1])
   assert.throws(()=>verifiedLocalChatMediaSize(bad,type),/tamanho real|até/,type);
  assert.equal(verifiedLocalChatMediaSize(1,type),1);
  assert.equal(verifiedLocalChatMediaSize((type==='video'?20:5)*MB,type),(type==='video'?20:5)*MB);
  assert.throws(()=>verifiedLocalChatMediaSize((type==='video'?20:5)*MB+1,type),/até/,type);
 }
 assert.throws(()=>verifiedLocalChatMediaSize(1,'application/pdf'),/Tipo/);
});

test('native URI copies are measured and cleaned in all private chat upload paths',()=>{
 const source=read('src/lib/chat-photo-source.ts');
 assert.match(source,/if\(!uri.startsWith\('file:\/\/'\)\)/);
 assert.match(source,/source.copy\(temporary\)/);
 assert.match(source,/original.copy\(temporary\)/);
 assert.match(source,/const actualSize=temporary\?/);
 assert.match(source,/const actual=temporary\?/);
 assert.match(source,/verifiedLocalChatMediaSize\(actualSize,'image'\)/);
 assert.match(source,/verifiedLocalChatMediaSize\(actual,asset.type\)/);
 assert.doesNotMatch(source,/measuredPhotoSize\(/);
 assert.match(source,/temporary\.delete\(\)/);
 assert.match(source,/temporary\?\.exists\)temporary\.delete\(\)/);
});

test('single and atomic batch senders share the same fail-closed native size path',()=>{
 const direct=read('src/lib/direct-photo-attachment.ts');
 const community=read('src/lib/chat-photo-attachment.ts');
 const album=read('src/lib/chat-photo-album.ts');
 for(const one of [direct,community])assert.match(one,/prepareChatPhoto\(asset,extension\)/);
 assert.match(album,/prepareChatMedia\(photo,extension\)/);
 assert.match(album,/total\+=attachment.size/);
 assert.match(album,/if\(total>MAX_TOTAL_BYTES\)/);
 assert.match(album,/for\(const file of prepared\)file.cleanup\(\)/);
});
