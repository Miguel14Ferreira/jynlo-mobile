'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('all three chat composers attach one caption to a single atomic media message',()=>{
 for(const [screen,scope,media] of [
  ['app/messages/[peer].tsx','direct','photo'],
  ['src/components/CommunityChatPanel.tsx','community','selectedPhoto'],
  ['src/components/SessionChatPanel.tsx','session','photo']
 ]){
  const source=read(screen);
  assert.match(source,/const \[attachmentCaption,setAttachmentCaption\]=useState\(''\)/,screen);
  assert.match(source,/accessibilityLabel="Legenda dos anexos"/,screen);
  assert.match(source,/const captionToSend=attachmentCaption;/,screen);
  assert.ok(source.includes(`extraPhotos.length||${media}.type==='video'||captionToSend.trim()`),screen);
  assert.match(source,new RegExp("sendChatPhotoAlbum\\(\\{scope:'"+scope+"',id"),screen);
  assert.match(source,/setAttachmentCaption\(current=>current===captionToSend\?'':current\)/,screen);
  assert.match(source,/setAttachmentCaption\(''\)/,screen);
 }
});
test('batch request carries caption, validates its limit and preserves uncertain success',()=>{
 const code=read('src/lib/chat-photo-album.ts');
 assert.match(code,/replyToMessageId\?:number\|null,caption\?:string/);
 assert.match(code,/caption.length>2000/);
 assert.match(code,/form.append\('caption',caption.trim\(\)\)/);
 assert.match(code,/form.append\('replyToMessageId',String\(replyToMessageId\)\)/);
 assert.match(code,/O envio não foi confirmado\. Consulta o histórico antes de repetir/);
});
