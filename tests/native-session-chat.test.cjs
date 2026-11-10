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
 assert.match(screen,/postSessionChat\(id,originalDraft,auth\.token,originalReplyId\)/);
 assert.match(screen,/markSessionChatRead\(id,latest,auth\.token\)/);
 assert.match(screen,/Consulta o histórico antes de voltares a tentar/);
 assert.match(routes,/name="sessions\/\[id\]\/chat"/);
});

test('session chat refreshes read-only while focused without overlapping a send',()=>{
 const screen=read('app/sessions/[id]/chat.tsx');
 assert.match(screen,/setInterval\(\(\)=>\{if\(AppState\.currentState==='active'&&!sendingNow\.current\)void refresh\(true,version\);\},15000\)/);
 assert.match(screen,/clearInterval\(timer\)/);
 assert.match(screen,/if\(refreshing\.current===version\)\{pendingRefresh\.current=true;return;\}/);
 assert.match(screen,/if\(!silent\)setLoading\(true\)/);
 assert.match(screen,/sendingNow\.current=true/);
 assert.match(screen,/sendingNow\.current=false/);
});

test('session chat preserves messages on transient polling errors but closes revoked access',()=>{
 const screen=read('app/sessions/[id]/chat.tsx');
 assert.match(screen,/import \{ApiError\} from/);
 assert.match(screen,/const accessRevoked=e instanceof ApiError&&\[401,403,404,409,410\]\.includes\(e\.status\)/);
 assert.match(screen,/if\(accessRevoked\)\{/);
 assert.match(screen,/setClosed\(true\);setEntries\(\[\]\);setDraft\(''\);setReply\(null\)/);
 assert.match(screen,/\}else if\(!silent\)\{/);
});

test('session chat photo upload uses private scoped endpoint with confirmation',()=>{
 const api=read('src/lib/chat-photo-attachment.ts');
 const screen=read('app/sessions/[id]/chat.tsx');
 assert.match(api,/kind==='community'\?'communities':'sessions'/);
 assert.match(api,/\/messages\/attachments/);
 assert.match(api,/\/availability/);
 assert.match(api,/5\*1024\*1024/);
 assert.match(api,/form\.append\('file'/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/credentials:'omit'/);
 assert.match(screen,/chatPhotoAvailable\('session',id,auth\.token\)/);
 assert.match(screen,/sendChatPhoto\('session',id,auth\.token,photo,reply\?\.id\)/);
 assert.match(screen,/Confirmar envio da fotografia/);
 assert.match(screen,/photoReady/);
 assert.match(screen,/!closed/);
});
