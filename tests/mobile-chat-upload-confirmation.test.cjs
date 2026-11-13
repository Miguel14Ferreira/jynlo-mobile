'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {confirmedChatAlbumReply}=require('../src/lib/chat-attachments-core.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const mimes=['image/jpeg','video/mp4'];
const valid={id:123,attachments:[
 {index:0,filename:'one.jpg',mimeType:'image/jpeg',size:123},
 {index:1,filename:'two.mp4',mimeType:'video/mp4',size:10000}
]};
test('only complete, server-persisted album metadata confirms a private upload',()=>{
 assert.equal(confirmedChatAlbumReply(valid,mimes),true);
 assert.equal(confirmedChatAlbumReply({...valid,attachments:[...valid.attachments].reverse()},mimes),true);
 for(const reply of [
  null,{}, {...valid,id:0},{...valid,id:'123'},
  {...valid,attachments:valid.attachments.slice(0,1)},
  {...valid,attachments:[valid.attachments[0],valid.attachments[0]]},
  {...valid,attachments:[valid.attachments[0],{...valid.attachments[1],mimeType:'image/jpeg'}]},
  {...valid,attachments:[valid.attachments[0],{...valid.attachments[1],size:21*1024*1024}]},
  {...valid,attachments:[valid.attachments[0],{...valid.attachments[1],index:5}]},
  {...valid,attachments:[valid.attachments[0],{...valid.attachments[1],filename:''}]}
 ])assert.equal(confirmedChatAlbumReply(reply,mimes),false);
 assert.equal(confirmedChatAlbumReply(valid,[]),false);
 assert.equal(confirmedChatAlbumReply(valid,['image/jpeg','image/jpeg']),false);
});
test('composer only clears on exact validated response, with failed delivery left uncertain',()=>{
 const uploader=read('src/lib/chat-photo-album.ts');
 const types=read('src/lib/chat-attachments-core.d.cts');
 assert.match(uploader,/confirmedChatAlbumReply\(reply,photos\.map\(photo=>photo\.mimeType\|\|''\)\)/);
 assert.match(uploader,/O envio não foi confirmado\. Consulta o histórico antes de repetir/);
 assert.match(uploader,/for\(const file of prepared\)file\.cleanup\(\)/);
 assert.match(types,/export declare function confirmedChatAlbumReply\(/);
});
