const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));
test('community API uses real edit and delete-for-everyone routes, never deleting without authorization',()=>{
 const api=read('src/lib/chat-api.ts');
 assert.match(api,/export async function editCommunityChatMessage\(/);
 assert.match(api,/export async function deleteCommunityChatMessageForEveryone\(/);
 assert.match(api,/base\(id\)\+'\/'\+messageId[\s\S]*?method:'PUT',body:\{text:body\}/);
 assert.match(api,/base\(id\)\+'\/'\+messageId\+'\/for-everyone'/);
 assert.match(api,/method:'DELETE'/);
 assert.match(api,/await member\(id,token,username\)/);
 assert.match(api,/existing\.username\.toLowerCase\(\)!==username\.toLowerCase\(\)/);
});
test('community chat exposes edit for own recent plain messages and delete with confirmation',()=>{
 const screen=read('src/components/CommunityChatPanel.tsx');
 assert.match(screen,/function ownMessage\(/);
 assert.match(screen,/message\.username\.toLowerCase\(\)===auth\.username\.toLowerCase\(\)/);
 assert.match(screen,/function editable\(/);
 assert.match(screen,/!message\.attachmentName/);
 assert.match(screen,/!message\.attachments\?\.length/);
 assert.match(screen,/Date\.now\(\)-created<=15\*60\*1000/);
 assert.match(screen,/Alert\.alert\('Apagar mensagem para todos\?'/);
 // Message actions open with a long press on the message, like a messaging app.
 assert.match(screen,/accessibilityLabel=\{'Mensagem de @'\+m\.username\+'\. Mantém pressionado para responder ou reagir\.'\}/);
 assert.match(screen,/accessibilityLabel="Editar ou eliminar a minha mensagem"/);
 assert.match(screen,/accessibilityLabel="Editar mensagem"/);
 assert.match(screen,/m\.editedAt\?' · editada'/);
 assert.match(screen,/m\.deletedAt\?'Mensagem removida'/);
});
test('mutations lock concurrent writes and leave uncertain failures visible',()=>{
 const screen=read('src/components/CommunityChatPanel.tsx');
 assert.match(screen,/mutationLock\.current=true;setMutationBusy\(true\)/);
 assert.match(screen,/if\(mutationLock\.current\|\|sendingNow\.current\|\|uploadingNow\.current/);
 assert.match(screen,/activeChat\.current!==identity/);
 assert.match(screen,/Consulta o histórico antes de repetir/);
 assert.match(screen,/setReply\(current=>current\?\.id===message\.id\?null:current\)/);
 assert.match(screen,/await refresh\(version,true\)/);
});


test('chat mutations and picker cannot unlock the new account or community',()=>{
 const screen=read('src/components/CommunityChatPanel.tsx');
 assert.match(screen,/const mutationOwner=useRef\(''\),mutationEpoch=useRef\(0\)/);
 assert.match(screen,/const pickerInFlight=useRef\(false\),pickerOwner=useRef\(''\),pickerEpoch=useRef\(0\)/);
 assert.match(screen,/if\(changedAccountOrCommunity\)\{[\s\S]*?mutationEpoch\.current\+\+;mutationOwner\.current='';mutationLock\.current=false;setMutationBusy\(false\)/);
 assert.match(screen,/pickerEpoch\.current\+\+;pickerOwner\.current='';pickerInFlight\.current=false/);
 assert.match(screen,/mutationOwner\.current=identity;mutationLock\.current=true;setMutationBusy\(true\)/);
 assert.match(screen,/if\(mutationOwner\.current===identity&&mutationEpoch\.current===operation\)\{\s*mutationLock\.current=false;mutationOwner\.current='';setMutationBusy\(false\)/);
 assert.match(screen,/if\(pickerOwner\.current===identity&&pickerEpoch\.current===operation\)\{\s*pickerInFlight\.current=false;pickerOwner\.current=''/);
});


test('confirmed community messages and photo uploads do not await history refresh',()=>{
 const screen=read('src/components/CommunityChatPanel.tsx');
 assert.match(screen,/setMessages\(current=>mergeMessages\(current,\[confirmed\]\)\);/);
 assert.match(screen,/setDraft\(current=>current===originalDraft\?'':current\)/);
 assert.match(screen,/A confirmed POST is complete even if a subsequent history refresh fails/);
 assert.match(screen,/Reconcile history separately after a confirmed photo\/album upload/);
 assert.equal((screen.match(/void refresh\(version,true\);/g)||[]).length>=2,true);
 assert.doesNotMatch(screen,/setReply\(current=>current\?\.id===originalReplyId\?null:current\);\s*await refresh\(version\)/);
});
