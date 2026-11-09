'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/ChatPdfComposer.tsx'),'utf8');

test('PDF picker cannot attach an old file after changing chat or account',()=>{
 assert.match(source,/const generation=useRef\(0\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/if\(generation\.current===version\)generation\.current\+\+/);
 assert.match(source,/if\(!active\.current\|\|generation\.current!==version\)\{cleanup\(asset\);return;\}/);
 assert.match(source,/if\(active\.current&&generation\.current===version\)\s*setError/);
 assert.match(source,/\[reset,target\.scope,target\.id,token\]/);
});

test('PDF send completion cannot mutate the next chat or clear its PDF',()=>{
 assert.match(source,/await sendChatPdf\(target,token,asset,replyId\)/);
 assert.match(source,/if\(!active\.current\|\|generation\.current!==version\)return/);
 assert.match(source,/if\(selectedRef\.current===asset\)reset\(\)/);
 assert.match(source,/if\(active\.current&&generation\.current===version\)\s*setError\('PDF enviado/);
 assert.match(source,/if\(active\.current&&generation\.current===version\)setBusy\(false\)/);
 assert.match(source,/setBusy\(busyRef\.current\);setError\(''\)/);
});

test('uncertain PDF upload remains blocked against immediate duplicate sends',()=>{
 assert.match(source,/busyRef\.current\|\|blocked\.current\)return/);
 assert.match(source,/blocked\.current=true/);
 assert.match(source,/Verifica o histórico antes de escolher novamente o documento/);
});

test('temporary PDF stays present until its original upload settles, including after leaving chat',()=>{
 assert.match(source,/const uploadingRef=useRef<DocumentPicker\.DocumentPickerAsset\|null>\(null\)/);
 assert.match(source,/if\(!asset\|\|uploadingRef\.current===asset\)return/);
 assert.match(source,/busyRef\.current=true;uploadingRef\.current=asset/);
 assert.match(source,/uploadingRef\.current=null;\s*cleanup\(asset\);\s*busyRef\.current=false/);
 assert.match(source,/setBusy\(busyRef\.current\);setError\(''\)/);
 assert.match(source,/disabled=\{busy\|\|busyRef\.current\}/);
});

test('a pending upload explains why another PDF cannot be selected',()=>{
 assert.match(source,/busyRef\.current&&!selected\?<Text/);
 assert.match(source,/Existe um PDF em envio noutra conversa/);
 assert.match(source,/disabled=\{busy\|\|busyRef\.current\}/);
});
