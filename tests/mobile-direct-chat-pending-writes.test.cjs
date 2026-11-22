const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8'));
const focus=code.slice(code.indexOf('useFocusEffect(useCallback('),code.indexOf('async function updateBlock()'));
const send=code.slice(code.indexOf('async function send()'),code.indexOf('async function choosePhoto()'));
const photo=code.slice(code.indexOf('async function uploadPhoto()'),code.indexOf('return <SafeAreaView'));

test('pending text and photo writes remain locked by conversation identity',()=>{
 assert.match(code,/pendingWrites=useRef\(new Map<string,'text'\|'photo'>\(\)\)/);
 assert.match(send,/pendingWrites\.current\.has\(identity\)/);
 assert.match(photo,/pendingWrites\.current\.has\(identity\)/);
 assert.match(send,/pendingWrites\.current\.set\(identity,'text'\)/);
 assert.match(photo,/pendingWrites\.current\.set\(identity,'photo'\)/);
 assert.ok(send.indexOf("pendingWrites.current.set(identity,'text')")<send.indexOf('await sendDirectChat('));
 assert.ok(photo.indexOf("pendingWrites.current.set(identity,'photo')")<photo.indexOf('await sendDirectPhoto('));
});

test('returning to a chat restores pending lock instead of allowing another POST',()=>{
 assert.match(focus,/const pending=pendingWrites\.current\.get\(identity\)/);
 assert.match(focus,/sendingNow\.current=Boolean\(pending\)/);
 assert.match(focus,/setSending\(pending==='text'\);setPhotoBusy\(pending==='photo'\)/);
 assert.doesNotMatch(focus,/sendingNow\.current=false/);
});

test('settled sends release their own lock without modifying another chat',()=>{
 for(const action of [send,photo]){
  assert.match(action,/finally\{\s*pendingWrites\.current\.delete\(identity\)/);
  assert.match(action,/if\(conversation\.current===identity\)\{/);
 }
 assert.match(send,/setSending\(false\)/);
 assert.match(photo,/setPhotoBusy\(false\)/);
});
