'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {validateChatAlbum,MAX_FILES,MAX_TOTAL_BYTES}=require('../src/lib/chat-attachments-core.cjs');
const img=(uri,n=1000)=>({type:'image',uri,mimeType:'image/jpeg',fileSize:n});
const video=(uri,n=2000)=>({type:'video',uri,mimeType:'video/mp4',fileSize:n});
test('private chat accepts mixed media with correct individual and aggregate limits',()=>{
 assert.equal(MAX_FILES,4);
 assert.equal(MAX_TOTAL_BYTES,40*1024*1024);
 assert.equal(validateChatAlbum([img('one'),video('two')]),null);
 assert.equal(validateChatAlbum([video('one'),video('two',undefined)]),null);
 assert.match(validateChatAlbum(Array.from({length:5},(_,i)=>img(String(i)))),/1 e 4/);
 assert.match(validateChatAlbum([video('too-big',21*1024*1024)]),/20 MB/);
 assert.match(validateChatAlbum([img('too-big',6*1024*1024)]),/5 MB/);
 assert.match(validateChatAlbum([video('mov',1000)].map(x=>({...x,mimeType:'video/quicktime'}))),/Formato/);
 assert.match(validateChatAlbum([video('fake',1000)].map(x=>({...x,mimeType:'image/jpeg'}))),/Formato/);
 assert.match(validateChatAlbum([video('1',15*1024*1024),video('2',15*1024*1024),video('3',15*1024*1024)]),/40 MB/);
 assert.equal(validateChatAlbum([video('unknown',0)],{allowUnknownSize:true}),null);
 assert.match(validateChatAlbum([video('empty',0)]),/tamanho/);
});
test('all three screens select videos and use the protected batch endpoint',()=>{
 for(const [file,identifier] of [
  ['app/messages/[peer].tsx','photo'],
  ['app/communities/[id]/chat.tsx','selectedPhoto'],
  ['app/sessions/[id]/chat.tsx','photo']
 ]){
  const s=read(file);
  assert.match(s,/mediaTypes:\['images','videos'\]/,file);
  assert.ok(s.includes(`extraPhotos.length||${identifier}.type==='video'`),file);
  assert.match(s,/validateChatAlbum\(/,file);
  assert.match(s,/▶ Vídeo/,file);
 }
 const uploader=read('src/lib/chat-photo-album.ts');
 assert.match(uploader,/prepareChatMedia/);
 assert.match(uploader,/'video\/mp4':'mp4','video\/webm':'webm'/);
 assert.match(uploader,/form.append\('files'/);
 assert.match(uploader,/MAX_TOTAL_BYTES/);
});
test('prepared video uses local measured file size and cleans copied content URIs',()=>{
 const s=read('src/lib/chat-photo-source.ts');
 assert.match(s,/prepareChatMedia/);
 assert.match(s,/asset.type==='video'\?20\*1024\*1024:5\*1024\*1024/);
 assert.match(s,/source\.copy|original\.copy/);
 assert.doesNotMatch(s,/measuredPhotoSize\(actual,asset.fileSize\)/);
 assert.match(s,/!Number.isSafeInteger\(actual\)\|\|actual<=0/);
 assert.match(s,/const size=actual/);
 assert.match(s,/temporary\?\.exists\)temporary\.delete\(\)/);
});

test('successful batch with unreadable JSON preserves uncertain delivery warning',()=>{
 const uploader=read('src/lib/chat-photo-album.ts');
 const success=uploader.indexOf('const response=await fetch(API_BASE+path');
 const parse=uploader.indexOf('reply=await response.json()');
 const warning=uploader.indexOf("throw Error('O envio não foi confirmado. Consulta o histórico antes de repetir.');",parse);
 const transport=uploader.indexOf("throw Error('Falha de ligação. Consulta o histórico antes de repetir.');");
 assert.ok(success>=0&&parse>success&&warning>parse&&transport>warning);
 assert.match(uploader,/try\{\s*reply=await response\.json\(\) as typeof reply;\s*\}catch\{\s*throw Error\('O envio não foi confirmado\. Consulta o histórico antes de repetir\.'\);/);
 assert.match(uploader,/\^\(A sessão\|Já não tens\|O álbum\|O armazenamento\|O servidor\|O envio\)/);
});
