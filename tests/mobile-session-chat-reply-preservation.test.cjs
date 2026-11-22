const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8'));

test('session photo uses reply selected when upload started and preserves later selection',()=>{
 const upload=code.slice(code.indexOf('async function uploadPhoto()'),code.indexOf('const recentPhotoIds='));
 assert.match(upload,/const version=generation\.current,originalReplyId=reply\?\.id/);
 assert.match(upload,/sendChatPhoto\('session',id,auth\.token,photo,originalReplyId\)/);
 assert.match(upload,/if\(version!==generation\.current\)return/);
 assert.match(upload,/setReply\(current=>current\?\.id===originalReplyId\?null:current\)/);
 assert.doesNotMatch(upload,/setReply\(null\)/);
});

test('session PDF completion only clears the reply owned by its upload',()=>{
 const pdf=code.slice(code.indexOf('<ChatPdfComposer compact target='),code.indexOf('{auth.token&&!closed&&photoReady?'));
 assert.match(pdf,/replyId=\{reply\?\.id\}/);
 assert.match(pdf,/onSent=\{async\(sentReplyId\)=>\{/);
 assert.match(pdf,/setReply\(current=>current\?\.id===\(sentReplyId\?\?undefined\)\?null:current\)/);
 assert.doesNotMatch(pdf,/const originalReplyId=reply\?\.id/);
 assert.doesNotMatch(pdf,/setReply\(null\)/);
});

test('sending text also preserves reply selected while its POST is in flight',()=>{
 assert.match(code,/setReply\(current=>current\?\.id===originalReplyId\?null:current\)/);
});

test('PDF composer forwards the reply captured before its upload begins',()=>{
 const composer=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/ChatPdfComposer.tsx'),'utf8'));
 const send=composer.slice(composer.indexOf('async function send()'),composer.indexOf('if(!enabled||!token)return null'));
 assert.match(composer,/onSent:\(sentReplyId:number\|null\)=>Promise<void>/);
 assert.match(send,/const sentReplyId=replyId\?\?null/);
 assert.match(send,/await sendChatPdf\(target,token,asset,sentReplyId\)/);
 assert.match(send,/await onSent\(sentReplyId\)/);
 assert.ok(send.indexOf('const sentReplyId=replyId??null')<send.indexOf('await sendChatPdf('));
 assert.doesNotMatch(send,/await onSent\(\)/);
});
