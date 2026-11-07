'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('PDF picker uses app cache and explicit send confirmation',()=>{
 const composer=read('src/components/ChatPdfComposer.tsx');
 assert.match(composer,/DocumentPicker\.getDocumentAsync/);
 assert.match(composer,/type:'application\/pdf',copyToCacheDirectory:true,multiple:false/);
 assert.match(composer,/checkPdfAsset\(asset\)/);
 assert.match(composer,/Confirmar envio do PDF/);
 assert.match(composer,/sendChatPdf\(target,token,asset,replyId\)/);
 assert.match(composer,/blocked\.current=true/);
 assert.match(composer,/if\(!active\.current\|\|generation\.current!==version\)\{cleanup\(asset\);return;\}/);
 assert.match(composer,/if\(file\.exists\)file\.delete\(\)/);
});
test('PDF API uses private authenticated scoped endpoints and signed PDF bytes',()=>{
 const api=read('src/lib/chat-pdf-attachment.ts');
 assert.match(api,/\/api\/chat\/me\//);
 assert.match(api,/encodeURIComponent\(peer\)/);
 assert.match(api,/\/messages\/attachments/);
 assert.match(api,/Number\.isSafeInteger\(numeric\)/);
 assert.match(api,/asset\.mimeType!=='application\/pdf'/);
 assert.match(api,/asset\.size>MAX_BYTES/);
 assert.match(api,/bytes\[0\]!==37/);
 assert.match(api,/bytes\[4\]!==45/);
 assert.match(api,/form\.append\('file'/);
 assert.match(api,/Authorization:'Bearer '\+token/);
 assert.match(api,/credentials:'omit',redirect:'error'/);
 assert.match(api,/controller\.abort\(\)/);
 assert.match(api,/result\.attachmentMimeType!=='application\/pdf'/);
 assert.doesNotMatch(api,/\/media\//);
});
test('PDF sending integrated in private, community and session chats only when permitted',()=>{
 const cases=[
  ['app/messages/[peer].tsx',"scope:'direct'"],
  ['app/communities/[id]/chat.tsx',"scope:'community'"],
  ['app/sessions/[id]/chat.tsx',"scope:'session'"]
 ];
 for(const [file,scope] of cases){
  const src=read(file);
  assert.match(src,/ChatPdfComposer/);
  assert.ok(src.includes(scope));
  assert.match(src,/token=\{auth\.token\}/);
  assert.match(src,/onSent=\{async\(\)=>\{/);
 }
 const session=read('app/sessions/[id]/chat.tsx');
 assert.match(session,/enabled=\{!closed&&photoReady&&!sending&&!uploading\}/);
 assert.match(session,/replyId=\{reply\?\.id\}/);
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['expo-document-picker'],'~58.0.4');
});
