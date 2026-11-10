'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/sessions/[id]/chat.tsx'),'utf8');

test('session photo uses reply selected when upload started and preserves later selection',()=>{
 const upload=code.slice(code.indexOf('async function uploadPhoto()'),code.indexOf('return <Page>'));
 assert.match(upload,/const version=generation\.current,originalReplyId=reply\?\.id/);
 assert.match(upload,/sendChatPhoto\('session',id,auth\.token,photo,originalReplyId\)/);
 assert.match(upload,/if\(version!==generation\.current\)return/);
 assert.match(upload,/setReply\(current=>current\?\.id===originalReplyId\?null:current\)/);
 assert.doesNotMatch(upload,/setReply\(null\)/);
});

test('session PDF completion only clears the reply owned by its upload',()=>{
 const pdf=code.slice(code.indexOf('<ChatPdfComposer target='),code.indexOf('{auth.token&&!closed&&photoReady?'));
 assert.match(pdf,/replyId=\{reply\?\.id\}/);
 assert.match(pdf,/onSent=\{async\(\)=>\{/);
 assert.match(pdf,/const originalReplyId=reply\?\.id/);
 assert.match(pdf,/setReply\(current=>current\?\.id===originalReplyId\?null:current\)/);
 assert.doesNotMatch(pdf,/setReply\(null\)/);
});

test('sending text also preserves reply selected while its POST is in flight',()=>{
 assert.match(code,/setReply\(current=>current\?\.id===originalReplyId\?null:current\)/);
});
