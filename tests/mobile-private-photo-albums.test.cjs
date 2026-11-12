'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const {MAX_FILES,validateChatAlbum,measuredPhotoSize,chatAttachmentList}=require('../src/lib/chat-attachments-core.cjs');
const photo=(uri,size=1200,mimeType='image/jpeg')=>({type:'image',uri,fileSize:size,mimeType});
test('private album respects backend maximum and rejects unsafe media',()=>{
 assert.equal(MAX_FILES,4);
 assert.equal(validateChatAlbum([photo('a'),photo('b'),photo('c'),photo('d')]),null);
 assert.match(validateChatAlbum([]),/1 e 4/);
 assert.match(validateChatAlbum(Array.from({length:5},(_,i)=>photo(String(i)))),/1 e 4/);
 assert.match(validateChatAlbum([photo('x',6*1024*1024)]),/5 MB/);
 assert.match(validateChatAlbum([photo('x',1200,'image/svg+xml')]),/Formato/);
 assert.match(validateChatAlbum([photo('x',0)]),/tamanho/);
 assert.equal(validateChatAlbum([photo('x',0)],{allowUnknownSize:true}),null);
});
test('authorized attachment metadata is ordered, scoped and excludes deleted messages',()=>{
 const message={attachmentName:'one.jpg',attachmentMimeType:'image/jpeg',attachmentSize:1200,
  attachments:[{index:2,filename:'three.mp4',mimeType:'video/mp4',size:12*1024*1024},
   {index:0,filename:'one.jpg',mimeType:'image/jpeg',size:1200},
   {index:1,filename:'two.jpg',mimeType:'image/jpeg',size:1000}]};
 assert.deepEqual(chatAttachmentList(message).map(x=>x.index),[0,1,2]);
 assert.deepEqual(chatAttachmentList({...message,deletedAt:'2026-01-01'}),[]);
 assert.equal(chatAttachmentList({attachmentName:'legacy.png',attachmentMimeType:'image/png',attachmentSize:10})[0].index,0);
 assert.deepEqual(chatAttachmentList({attachments:[{index:4,filename:'bad',mimeType:'image/jpeg',size:10}]}),[]);
});
test('all three chat scopes use one private atomic batch contract',()=>{
 const source=read('src/lib/chat-photo-album.ts');
 assert.match(source,/attachments\/batch/);
 assert.match(source,/messages\/attachments\/batch/);
 assert.match(source,/form\.append\('files'/);
 assert.match(source,/form\.append\('replyToMessageId'/);
 assert.match(source,/prepared\.push\(attachment\)/);
 assert.match(source,/for\(const file of prepared\)file\.cleanup\(\)/);
 assert.match(source,/reply\.attachments\.length!==photos\.length/);
 assert.doesNotMatch(source,/\/media\//);
 for(const [file,scope] of [
  ['app/messages/[peer].tsx','direct'],
  ['app/communities/[id]/chat.tsx','community'],
  ['app/sessions/[id]/chat.tsx','session']
 ]){
  const screen=read(file);
  assert.match(screen,/allowsMultipleSelection:true,selectionLimit:4/);
  assert.match(screen,/setExtraPhotos\(/);
  assert.match(screen,/chatAttachmentList\(m\)/);
  assert.ok(screen.includes("scope:'"+scope+"'"));
  assert.match(screen,/sendChatPhotoAlbum\(/);
 }
});
test('private previews allow indexed download and limit videos and audio independently',()=>{
 const player=read('src/components/SecureChatAttachment.tsx');
 assert.match(player,/messageId\+\(index\?'\/'\+index:''\)/);
 assert.match(player,/maxAttachmentSize\(mime\)/);
 assert.match(player,/20\*1024\*1024/);
 assert.match(player,/12\*1024\*1024/);
 assert.match(player,/ChatVideo uri=\{uri\}/);
 assert.match(player,/Authorization:'Bearer '\+token/);
});

test('actual on-disk photo size takes priority over stale Android picker metadata',()=>{
 assert.equal(measuredPhotoSize(6*1024*1024,1000),6*1024*1024);
 assert.equal(measuredPhotoSize(0,1000),0);
 assert.equal(measuredPhotoSize(-1,1000),1000);
 assert.equal(measuredPhotoSize(-1,undefined),0);
 const source=read('src/lib/chat-photo-source.ts');
 assert.doesNotMatch(source,/measuredPhotoSize\(actualSize,asset\.fileSize\)/);
 assert.match(source,/!Number.isSafeInteger\(actualSize\)\|\|actualSize<=0/);
 assert.match(source,/const size=actualSize/);
 assert.match(source,/size>5\*1024\*1024/);
 assert.match(source,/source\.exists\?source\.size:-1/);
});
