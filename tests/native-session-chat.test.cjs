'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('session chat API is authenticated and correctly scoped',()=>{
 const api=read('src/lib/session-chat-api.ts');
 assert.match(api,/\/api\/sessions\/\$\{validSessionId\(id\)\}\/messages/);
 assert.match(api,/method:'POST',body:\{body:text,replyToMessageId:replyToMessageId\?\?null\}/);
 assert.match(api,/kind:'session'/);
 assert.match(api,/Number\.isSafeInteger\(id\)/);
 assert.match(api,/text\.length>2000/);
 assert.match(api,/DEMO_MODE\|\|!token/);
});
test('native session chat only appears for confirmed participants before kickoff',()=>{
 const detail=read('app/sessions/[id].tsx');
 const screen=read('app/sessions/[id]/chat.tsx');
 const routes=read('app/_layout.tsx');
 assert.match(detail,/owner\|\|detail\.joined/);
 assert.match(detail,/Date\.parse\(s\.gameDate\)>Date\.now\(\)/);
 assert.match(detail,/pathname:'\/sessions\/\[id\]\/chat'/);
 assert.match(screen,/sessionChatHistory\(id,auth\.token\)/);
 assert.match(screen,/postSessionChat\(id,draft,auth\.token,reply\?\.id\)/);
 assert.match(screen,/markSessionChatRead\(id,latest,auth\.token\)/);
 assert.match(screen,/Consulta o histórico antes de voltares a tentar/);
 assert.match(routes,/name="sessions\/\[id\]\/chat"/);
});
