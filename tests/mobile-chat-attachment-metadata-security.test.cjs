'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chatAttachmentList,recentPreviewMessageIds}=require('../src/lib/chat-attachments-core.cjs');
const file=(index=0,mimeType='image/jpeg',size=1200,filename='photo.jpg')=>({index,mimeType,size,filename});

test('private chat metadata accepts only viewer-supported formats and verified sizes',()=>{
 const types=[
  ['image/jpeg',5],['image/png',5],['image/webp',5],['image/gif',5],
  ['video/mp4',20],['video/webm',20],['application/pdf',5],
  ['audio/webm',12],['audio/ogg',12],['audio/mpeg',12],
  ['audio/mp4',12],['audio/x-m4a',12],['audio/aac',12]
 ];
 for(const [mime,megabytes] of types){
  const limit=megabytes*1024*1024;
  assert.equal(chatAttachmentList({attachments:[file(0,mime,limit)]}).length,1,mime);
  assert.deepEqual(chatAttachmentList({attachments:[file(0,mime,limit+1)]}),[],mime);
 }
 for(const mime of ['text/html','image/svg+xml','application/javascript','audio/x-wav','',null]){
  assert.deepEqual(chatAttachmentList({attachments:[file(0,mime)]}),[],String(mime));
 }
});
test('legacy private attachment metadata also fails closed for malformed size, MIME, and name',()=>{
 assert.deepEqual(chatAttachmentList({attachmentName:'a.jpg',attachmentMimeType:'image/jpeg',attachmentSize:23}),[
  {index:0,name:'a.jpg',mime:'image/jpeg',size:23}
 ]);
 for(const size of [undefined,null,0,-1,5.5,Number.POSITIVE_INFINITY,10*1024*1024]){
  assert.deepEqual(chatAttachmentList({attachmentName:'a.jpg',attachmentMimeType:'image/jpeg',attachmentSize:size}),[],String(size));
 }
 for(const name of ['',' ../file.jpg','../../file.jpg','file\\name.jpg','bad\nname.jpg','a'.repeat(256)])
  assert.deepEqual(chatAttachmentList({attachmentName:name,attachmentMimeType:'image/jpeg',attachmentSize:1}),[],name);
});
test('album entries are deduplicated, sorted, and bounded independently of untrusted metadata',()=>{
 const items=[file(2),file(0),file(0),file(1),file(9),file(-1),null];
 assert.deepEqual(chatAttachmentList({attachments:items}).map(x=>x.index),[0,1,2]);
 assert.deepEqual(chatAttachmentList({attachmentName:'valid.jpg',attachmentMimeType:'image/jpeg',attachmentSize:100,
  attachments:[file(0,'image/svg+xml')]}),[]);
 assert.deepEqual(chatAttachmentList({deletedAt:'2026-11-13T11:00:00Z',attachments:[file()]}),[]);
 assert.deepEqual(recentPreviewMessageIds([{id:1,attachmentName:'wrong.svg',attachmentMimeType:'image/svg+xml',attachmentSize:100}]),[]);
 assert.deepEqual(recentPreviewMessageIds([{id:2,attachments:[file()]}]),[2]);
});
