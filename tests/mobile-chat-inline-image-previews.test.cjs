'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {recentPreviewMessageIds}=require('../src/lib/chat-attachments-core.cjs');
const source=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
const image=(id,deletedAt=null)=>({
 id,deletedAt,attachments:[{index:0,filename:'a.jpg',mimeType:'image/jpeg',size:1200},
 {index:1,filename:'b.jpg',mimeType:'image/jpeg',size:1500}]
});
test('recent preview selects only last two authorized image albums, not stale or deleted attachments',()=>{
 const messages=[
  image(1),
  {id:2,body:'text',attachments:[]},
  image(3,'2026-11-12T00:00:00Z'),
  {id:4,attachments:[{index:0,filename:'v.mp4',mimeType:'video/mp4',size:2000}]},
  image(5),image(6)
 ];
 assert.deepEqual(recentPreviewMessageIds(messages),[5,6]);
 assert.deepEqual(recentPreviewMessageIds(messages,1),[6]);
 assert.deepEqual(recentPreviewMessageIds(messages,0),[]);
 assert.deepEqual(recentPreviewMessageIds(messages,5),[]);
 assert.deepEqual(recentPreviewMessageIds(null),[]);
});
test('malformed or oversized attachments are never prefetched',()=>{
 assert.deepEqual(recentPreviewMessageIds([
  {id:2,attachments:[{index:0,filename:'bad.jpg',mimeType:'image/jpeg',size:999999999}]},
  {id:3,attachments:[{index:0,filename:'bad.jpg',mimeType:'text/plain',size:123}]},
  image(4)
 ]),[4]);
});
test('direct, community and session chats render recent authenticated album images inline',()=>{
 for(const [file,collection] of [
  ['app/messages/[peer].tsx','messages'],
  ['app/communities/[id]/chat.tsx','messages'],
  ['app/sessions/[id]/chat.tsx','entries']
 ]){
  const s=source(file);
  assert.ok(s.includes('recentPreviewMessageIds('+collection+')'),file);
  assert.match(s,/autoPreview=\{recentPhotoIds\.has\(m\.id\)&&attachment\.mime\?\.startsWith\('image\/'\)===true\}/,file);
  assert.match(s,/SecureChatAttachment/,file);
 }
 const viewer=source('src/components/SecureChatAttachment.tsx');
 assert.match(viewer,/Authorization:'Bearer '\+token/);
 assert.match(viewer,/if\(!autoPreview\|\|!token\|\|!mime\?\.startsWith\('image\/'\)/);
 assert.match(viewer,/if\(old\?\.exists\)old\.delete\(\)/);
});
