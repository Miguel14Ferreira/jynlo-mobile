const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));
test('direct-message edit/delete APIs use actor-authenticated backend contracts',()=>{
 const api=read('src/lib/chat-api.ts');
 assert.match(api,/export async function editDirectChatMessage\(/);
 assert.match(api,/export async function deleteDirectChatMessage\(/);
 assert.match(api,/encodeURIComponent\(peer\)\+'\/messages\/'\+messageId/);
 assert.match(api,/token,method:'PUT',body:\{text:body\}/);
 assert.match(api,/token,method:'DELETE'/);
 assert.match(api,/Number.isSafeInteger\(messageId\)/);
 assert.match(api,/body\.startsWith\('\[JYNLO:GIPHY:1\]'\)/);
});
test('direct chat can edit own text within 15 minutes and confirm soft delete',()=>{
 const screen=read('app/messages/[peer].tsx');
 assert.match(screen,/function ownMessage\(/);
 assert.match(screen,/m\.username1\.toLowerCase\(\)===auth\.username\.toLowerCase\(\)/);
 assert.match(screen,/Date\.now\(\)-created<=15\*60\*1000/);
 assert.match(screen,/!m\.attachmentName&&!m\.attachments\?\.length/);
 assert.match(screen,/Alert\.alert\(\s*'Apagar mensagem para todos\?'/);
 assert.match(screen,/onOptions=\{ownMessage\(m\)&&!blocked/);
 assert.match(screen,/accessibilityLabel="Editar mensagem"/);
 assert.match(screen,/edited=\{!!m\.editedAt\}/);
 assert.match(screen,/m\.deletedAt\?<Text style=\{styles.body\}>Mensagem removida/);
});
test('direct edit/delete mutations preserve drafts on uncertain network outcomes',()=>{
 const screen=read('app/messages/[peer].tsx');
 assert.match(screen,/mutationLock\.current=true;setMutationBusy\(true\)/);
 assert.match(screen,/if\(mutationLock\.current\|\|sending\|\|sendingNow\.current/);
 assert.match(screen,/conversation\.current!==identity/);
 assert.match(screen,/Consulta o histórico antes de repetir/);
 assert.match(screen,/setReplyTarget\(current=>current\?\.id===m.id\?null:current\)/);
 assert.match(screen,/await refresh\(true,version\)/);
});
