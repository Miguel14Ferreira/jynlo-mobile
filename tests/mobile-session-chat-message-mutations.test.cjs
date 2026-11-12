'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
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
 const screen=read('app/sessions/[id]/chat.tsx');
 assert.match(screen,/function ownMessage\(/);
 assert.match(screen,/!message.senderGuest/);
 assert.match(screen,/message.senderUsername.toLowerCase\(\)===auth.username.toLowerCase\(\)/);
 assert.match(screen,/Date.now\(\)-created<=15\*60\*1000/);
 assert.match(screen,/!message.attachmentName/);
 assert.match(screen,/!message.attachments\?\.length/);
 assert.match(screen,/Alert.alert\('Apagar mensagem para todos\?'/);
 assert.match(screen,/accessibilityLabel="Opções da minha mensagem"/);
 assert.match(screen,/accessibilityLabel="Editar mensagem"/);
 assert.match(screen,/m.editedAt\?' · editada'/);
 assert.match(screen,/m.deletedAt\?'Mensagem removida'/);
});
test('session mutation lifecycle guards concurrent sends and preserves failed drafts',()=>{
 const screen=read('app/sessions/[id]/chat.tsx');
 assert.match(screen,/mutationLock.current=true;setMutationBusy\(true\)/);
 assert.match(screen,/if\(mutationLock.current\|\|sendingNow.current/);
 assert.match(screen,/activeChat.current!==identity/);
 assert.match(screen,/Consulta o histórico antes de repetir/);
 assert.match(screen,/await refresh\(true,version\)/);
 assert.match(screen,/setReply\(current=>current\?\.id===message.id\?null:current\)/);
 assert.match(screen,/entries.map\(m=><View/);
});
