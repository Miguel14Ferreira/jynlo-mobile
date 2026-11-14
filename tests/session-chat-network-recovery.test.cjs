'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8');

test('session chat closes only after a confirmed access-denied response',()=>{
 const start=screen.indexOf('}catch(e){',screen.indexOf('const refresh=useCallback'));
 const end=screen.indexOf('}finally{',start);
 assert.ok(start>=0&&end>start);
 const handler=screen.slice(start,end);
 assert.match(handler,/if\(version!==generation\.current\)return/);
 assert.match(handler,/const accessRevoked=e instanceof ApiError&&\[401,403,404,409,410\]\.includes\(e\.status\)/);
 assert.match(handler,/if\(accessRevoked\)\{[\s\S]*?setClosed\(true\);setEntries\(\[\]\)/);
 assert.match(handler,/if\(!silent\)\{const message=e instanceof Error/);
 assert.equal((handler.match(/setClosed\(true\)/g)||[]).length,1);
 assert.equal((handler.match(/setEntries\(\[\]\)/g)||[]).length,1);
});

test('confirmed permission loss clears drafts, reply and selected media',()=>{
 const start=screen.indexOf('if(accessRevoked){');
 const end=screen.indexOf('}else{',start);
 const revoked=screen.slice(start,end);
 for(const cleanup of ["setEntries([])","setDraft('')","setReply(null)","setPhoto(null)","setPhotoReady(false)"]){
  assert.ok(revoked.includes(cleanup),cleanup);
 }
});

test('temporary manual refresh error shows feedback but retains composer and history',()=>{
 const start=screen.indexOf('}else{',screen.indexOf('const refresh=useCallback'));
 const end=screen.indexOf('}finally{',start);
 const temporary=screen.slice(start,end);
 assert.match(temporary,/setError\(/);
 assert.doesNotMatch(temporary,/setClosed\(|setEntries\(|setPhoto\(|setDraft\(/);
});

test('ordinary session refocus does not discard an unsent chat draft or selected photos',()=>{
 const focused=screen.slice(screen.indexOf('useFocusEffect(useCallback('),screen.indexOf('async function send()'));
 assert.match(focused,/const changedAccountOrSession=focusedIdentity\.current!==identity/);
 const reset=focused.slice(focused.indexOf('if(changedAccountOrSession){'),focused.indexOf('setClosed(false)'));
 for(const field of ["setDraft('')","setPhoto(null)","setExtraPhotos([])","setAttachmentCaption('')"])assert.ok(reset.includes(field),field);
 assert.doesNotMatch(focused.slice(focused.indexOf('setClosed(false)'),focused.indexOf('void refresh(false,version)'),/setDraft\(''\)|setPhoto\(null\)/);
});
