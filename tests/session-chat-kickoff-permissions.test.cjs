const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8'));

test('a 409 kickoff or revoked send immediately revalidates session-chat access',()=>{
 assert.match(source,/async function send\(\)/);
 assert.match(source,/e instanceof ApiError&&\[401,403,404,409,410\]\.includes\(e\.status\)/);
 assert.match(source,/await refresh\(true,version\);return/);
 assert.match(source,/setClosed\(true\);setEntries\(\[\]\)/);
});

test('edit and delete operations revalidate revoked access instead of leaving stale controls',()=>{
 assert.match(source,/async function saveEdit\(\)/);
 assert.match(source,/async function deleteMessage\(/);
 const matches=source.match(/if\(e instanceof ApiError&&\[401,403,404,409,410\]\.includes\(e\.status\)\)await refresh\(true,version\)/g)||[];
 assert.equal(matches.length,2);
});

test('failed multipart media never retries an uncertain POST and rechecks access',()=>{
 assert.match(source,/async function uploadPhoto\(\)/);
 assert.match(source,/Multipart failures may surface as text instead of ApiError/);
 assert.match(source,/permissão para enviar\|sessão expirou/);
 assert.match(source,/await refresh\(true,version\)/);
 assert.doesNotMatch(source,/catch\(e\)\{[^}]*sendChatPhotoAlbum\(/);
});

test('all session attachment transports identify the kickoff conflict',()=>{
 const photo=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/chat-photo-attachment.ts'),'utf8'));
 const album=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/chat-photo-album.ts'),'utf8'));
 const pdf=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/chat-pdf-attachment.ts'),'utf8'));
 assert.match(photo,/kind==='session'&&response\.status===409/);
 assert.match(album,/target\.scope==='session'&&response\.status===409/);
 assert.match(pdf,/target\.scope==='session'&&response\.status===409/);
 for(const content of [photo,album,pdf])assert.match(content,/O chat do jogo está encerrado/);
});

test('PDF composer tells session chat to recheck permission after a rejected upload',()=>{
 const pdf=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/ChatPdfComposer.tsx'),'utf8'));
 assert.match(pdf,/onPermissionError\?:\(reason\?:'disabled'\|'forbidden'\)=>void/);
 assert.match(pdf,/onPermissionError\?\.\(\/chat da equipa está desativado\/i\.test\(e\.message\)\?'disabled':'forbidden'\)/);
 const matches=source.match(/onPermissionError=\{\(\)=>\{void refresh\(true,generation\.current\);\}\}/g)||[];
 assert.equal(matches.length,2);
});
