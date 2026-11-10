'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/sessions/[id]/chat.tsx'),'utf8');

test('session chat closes only after a confirmed access-denied response',()=>{
 const start=screen.indexOf('}catch(e){',screen.indexOf('const refresh=useCallback'));
 const end=screen.indexOf('}finally{',start);
 assert.ok(start>=0&&end>start);
 const handler=screen.slice(start,end);
 assert.match(handler,/if\(version!==generation\.current\)return/);
 assert.match(handler,/const accessRevoked=e instanceof ApiError&&\[401,403,404,409,410\]\.includes\(e\.status\)/);
 assert.match(handler,/if\(accessRevoked\)\{[\s\S]*?setClosed\(true\);setEntries\(\[\]\)/);
 assert.match(handler,/\}else if\(!silent\)\{/);
 assert.equal((handler.match(/setClosed\(true\)/g)||[]).length,1);
 assert.equal((handler.match(/setEntries\(\[\]\)/g)||[]).length,1);
});

test('confirmed permission loss clears drafts, reply and selected media',()=>{
 const start=screen.indexOf('if(accessRevoked){');
 const end=screen.indexOf('}else if(!silent)',start);
 const revoked=screen.slice(start,end);
 for(const cleanup of ["setEntries([])","setDraft('')","setReply(null)","setPhoto(null)","setPhotoReady(false)"]){
  assert.ok(revoked.includes(cleanup),cleanup);
 }
});

test('temporary manual refresh error shows feedback but retains composer and history',()=>{
 const start=screen.indexOf('}else if(!silent)');
 const end=screen.indexOf('}finally{',start);
 const temporary=screen.slice(start,end);
 assert.match(temporary,/setError\(/);
 assert.doesNotMatch(temporary,/setClosed\(|setEntries\(|setPhoto\(|setDraft\(/);
});
