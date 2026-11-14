'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8');
const focused=source.slice(source.indexOf('useFocusEffect(useCallback('),source.indexOf('async function send()'));
const send=source.slice(source.indexOf('async function send()'),source.indexOf('async function choosePhoto()'));
const photo=source.slice(source.indexOf('async function uploadPhoto()'),source.indexOf('return <Page>'));

test('session chat keeps a write lock by session and account across refocus',()=>{
 assert.match(source,/pendingWrites=useRef\(new Map<string,'text'\|'photo'>\(\)\),activeChat=useRef\(''\)/);
 assert.match(focused,/const identity=id\+'\|'\+auth\.token/);
 assert.match(focused,/const pending=pendingWrites\.current\.get\(identity\)/);
 assert.match(focused,/sendingNow\.current=Boolean\(pending\)/);
 assert.match(focused,/setSending\(pending==='text'\);setUploading\(pending==='photo'\)/);
 assert.doesNotMatch(focused,/sendingNow\.current=false/);
 assert.match(focused,/const changedAccountOrSession=focusedIdentity\.current!==identity/);
 assert.match(focused,/if\(changedAccountOrSession\)\{/);
});
test('text and photo writes acquire lock before server POST',()=>{
 assert.match(send,/pendingWrites\.current\.has\(identity\)/);
 assert.match(photo,/pendingWrites\.current\.has\(identity\)/);
 assert.ok(send.indexOf("pendingWrites.current.set(identity,'text')")<send.indexOf('await postSessionChat('));
 assert.ok(photo.indexOf("pendingWrites.current.set(identity,'photo')")<photo.indexOf('await sendChatPhoto('));
});
test('only the originating request releases its lock and current chat UI',()=>{
 for(const action of [send,photo]){
  assert.match(action,/finally\{\s*pendingWrites\.current\.delete\(identity\)/);
  assert.match(action,/if\(activeChat\.current===identity\)\{/);
 }
 assert.match(focused,/if\(activeChat\.current===identity\)activeChat\.current=''/);
 assert.match(send,/if\(version!==generation\.current\)return/);
 assert.match(photo,/if\(version!==generation\.current\)return/);
});
