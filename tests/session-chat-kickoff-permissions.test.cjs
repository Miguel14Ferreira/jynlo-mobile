'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8');

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
