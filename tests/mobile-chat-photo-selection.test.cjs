'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('photo preflight rejects oversized and unsupported formats, deferring missing Android size to upload',()=>{
 const source=read('src/lib/chat-photo-validation.ts');
 assert.match(source,/MAX_CHAT_PHOTO_BYTES=5\*1024\*1024/);
 assert.match(source,/Number\.isSafeInteger\(asset\.fileSize\)/);
 assert.match(source,/asset\.fileSize!=null/);
 assert.match(read('src/lib/chat-photo-source.ts'),/verifiedLocalChatMediaSize\(actualSize,'image'\)/);
 assert.match(source,/SUPPORTED_CHAT_PHOTO_MIMES\.has\(asset\.mimeType\|\|''\)/);
 assert.match(source,/JPG, PNG, WebP ou GIF/);
});

for(const file of ['app/messages/[peer].tsx','src/components/CommunityChatPanel.tsx','src/components/SessionChatPanel.tsx']){
 test(file+' refuses invalid photo immediately after picker selection',()=>{
  const screen=read(file);
  assert.match(screen,/import \{validateChatPhoto\} from /);
  assert.match(screen,/for\(const asset of (?:chosen|selected)\.assets\)\{if\(asset\.type==='image'\)validateChatPhoto\(asset\);\}/);
  assert.match(screen,/setError\(e instanceof Error\?e\.message:'Não foi possível abrir a câmara ou a galeria\.'\)/);
  assert.match(screen,/send(?:DirectPhoto|ChatPhoto)\(/);
 assert.match(screen,/sendChatPhotoAlbum\(/);
 assert.match(screen,/allowsMultipleSelection:true,selectionLimit:remaining/);
 });
}
