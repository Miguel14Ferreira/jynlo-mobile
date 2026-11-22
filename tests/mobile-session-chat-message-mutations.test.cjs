const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));
test('session chat mutation API aligns with server methods and validates IDs',()=>{
 const api=read('src/lib/session-chat-api.ts');
 assert.match(api,/export async function editSessionChatMessage\(/);
 assert.match(api,/export async function deleteSessionChatMessage\(/);
 assert.match(api,/validSessionId\(id\)\}\/messages\/\$\{messageId\}/);
 assert.match(api,/token,method:'PUT',body:\{text:body\}/);
 assert.match(api,/token,method:'DELETE'/);
 assert.match(api,/Number.isSafeInteger\(messageId\)/);
});
test('session chat UI exposes own-message edit policy and confirmed removal',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.match(screen,/function ownMessage\(/);
 assert.match(screen,/!message.senderGuest/);
 assert.match(screen,/message.senderUsername.toLowerCase\(\)===auth.username.toLowerCase\(\)/);
 assert.match(screen,/Date.now\(\)-created<=15\*60\*1000/);
 assert.match(screen,/!message.attachmentName/);
 assert.match(screen,/!message.attachments\?\.length/);
 assert.match(screen,/Alert.alert\(\s*'Apagar mensagem para todos\?'/);
 assert.match(screen,/accessibilityLabel="Opções da minha mensagem"/);
 assert.match(screen,/accessibilityLabel="Editar mensagem"/);
 assert.match(screen,/m.editedAt\?' · editada'/);
 assert.match(screen,/m.deletedAt\?'Mensagem removida'/);
});
test('session mutation lifecycle guards concurrent sends and preserves failed drafts',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.match(screen,/mutationLock.current=true;setMutationBusy\(true\)/);
 assert.match(screen,/if\(mutationLock.current\|\|sendingNow.current/);
 assert.match(screen,/activeChat.current!==identity/);
 assert.match(screen,/Consulta o histórico antes de repetir/);
 assert.match(screen,/await refresh\(true,version\)/);
 assert.match(screen,/setReply\(current=>current\?\.id===message.id\?null:current\)/);
 assert.match(screen,/const renderedMessages=.*\.map\(m=><View/);
});


test('confirmed session chat messages and photo uploads do not await a history read',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 const send=screen.slice(screen.indexOf('async function send(){'),screen.indexOf('function ownMessage('));
 const photo=screen.slice(screen.indexOf('async function uploadPhoto(){'),screen.indexOf('const recentPhotoIds=',screen.indexOf('async function uploadPhoto(){')));
 assert.match(send,/const confirmed=await postSessionChat\(/);
 assert.match(send,/confirmedSessionChatSend\(confirmed,id/);
 assert.match(send,/setEntries\(current=>current\.some\(entry=>entry\.id===confirmed\.id\)/);
 assert.match(send,/void refresh\(true,version\)/);
 assert.doesNotMatch(send,/await refresh\(false,version\)/);
 assert.match(photo,/await sendChatPhotoAlbum\(/);
 assert.match(photo,/else await sendChatPhoto\(/);
 assert.match(photo,/void refresh\(true,version\)/);
 assert.doesNotMatch(photo,/await refresh\(false,version\)/);
 assert.match(screen,/The server already confirmed the write; history is a separate read/);
});
