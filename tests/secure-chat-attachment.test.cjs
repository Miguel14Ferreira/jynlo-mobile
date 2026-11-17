'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('private chat attachment preview only uses authorized scoped API routes',()=>{
 const screen=read('src/components/SecureChatAttachment.tsx');
 assert.match(screen,/encodeURIComponent\(peer\)/);
 assert.match(screen,/\/api\/chat\/me\//);
 assert.match(screen,/\/messages\/attachments\//);
 assert.match(screen,/Number\.isSafeInteger\(messageId\)/);
 assert.match(screen,/Number\.isSafeInteger\(numeric\)/);
 assert.match(screen,/Authorization:'Bearer '\+token/);
 assert.match(screen,/redirect:'error'/);
 assert.doesNotMatch(screen,/Linking\.openURL/);
 assert.doesNotMatch(screen,/\/media\//);
});
test('preview only fetches on user action and removes private local files',()=>{
 const screen=read('src/components/SecureChatAttachment.tsx');
 assert.match(screen,/onPress=\{\(\)=>\{void open\(\);\}\}/);
 assert.match(screen,/File\(Paths\.cache/);
 assert.match(screen,/await file\.write\(bytes\)/);
 assert.match(screen,/if\(old\?\.exists\)old\.delete\(\)/);
 assert.match(screen,/active\.current=false;setUri\(null\)/);
 assert.match(screen,/if\(!pdfPreview\.current\)cleanup\(\)/);
 assert.match(screen,/onRequestClose=\{close\}/);
 assert.match(screen,/const bytes=await response\.bytes\(\)/);
 assert.match(screen,/bytes\.length>maxBytes/);
 assert.match(screen,/type!==mime/);
 assert.match(screen,/maxAttachmentSize\(mime\)/);
 assert.match(screen,/index\?\'\/\'\+index:\'\'/);
 assert.match(screen,/!active\.current\|\|controller\.signal\.aborted/);
});
test('all chat kinds only expose attachments from non-deleted messages',()=>{
 for(const file of ['app/messages/[peer].tsx','src/components/CommunityChatPanel.tsx','src/components/SessionChatPanel.tsx']){
  const screen=read(file);
  assert.match(screen,/SecureChatAttachment/);
  assert.match(screen,/!m\.deletedAt\?chatAttachmentList\(m\)\.map/);
  assert.match(screen,/token=\{auth\.token\}/);
  assert.match(screen,/mime=\{attachment\.mime\}/);
  assert.match(screen,/size=\{attachment\.size\}/);
 }
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['expo-file-system'],'~58.0.11');
});

test('PDF attachments use authenticated byte download and platform native preview',()=>{
 const screen=read('src/components/SecureChatAttachment.tsx');
 assert.match(screen,/['"]application\/pdf['"]:['"]pdf['"]/);
 assert.match(screen,/Authorization:'Bearer '\+token/);
 assert.match(screen,/redirect:'error'/);
 assert.match(screen,/File\.canPreview\(cached\.current,\{mimeType:'application\/pdf'\}\)/);
 assert.match(screen,/File\.preview\(cached\.current,\{mimeType:'application\/pdf',title:'Documento privado'\}\)/);
 assert.match(screen,/AppState\.addEventListener\('change'/);
 assert.match(screen,/state==='active'&&wasBackgrounded\.current&&pdfPreview\.current/);
 assert.match(screen,/Limpar PDF temporário/);
 assert.match(screen,/bytes\.length>maxBytes/);
 assert.doesNotMatch(screen,/Sharing\.shareAsync/);
 assert.doesNotMatch(screen,/Linking\.openURL/);
});

test('team chat and feed never reuse a cached private attachment when kind changes',()=>{
 const screen=read('src/components/SecureChatAttachment.tsx');
 assert.match(screen,/if\(scope==='team'\)return '\/api\/teams\/'\+numeric\+'\/'\+kind\+'\/attachments\/'/);
 assert.match(screen,/\[cleanup,scope,conversationId,messageId,index,kind,token\]/);
 assert.match(screen,/if\(generation\.current===version\)generation\.current\+\+/);
 assert.match(screen,/active\.current=false;setUri\(null\);setExpanded\(false\)/);
 assert.match(screen,/abort\.current\?\.abort\(\)/);
});
