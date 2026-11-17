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
 const screen=read('src/components/SessionChatPanel.tsx');
 const routes=read('app/_layout.tsx');
 assert.match(detail,/owner\|\|detail\.joined/);
 assert.match(detail,/Date\.parse\(s\.gameDate\)>Date\.now\(\)/);
 assert.match(detail,/<SessionChatPanel embedded\/>/);
 assert.match(screen,/sessionChatHistory\(id,auth\.token\)/);
 assert.match(screen,/const confirmed=await postSessionChat\(id,originalDraft,auth\.token,originalReplyId\)/);
 assert.match(screen,/markSessionChatRead\(id,latest,auth\.token\)/);
 assert.match(screen,/Consulta o histórico antes de voltares a tentar/);
 assert.match(routes,/name="sessions\/\[id\]\/chat"/);
});

test('session chat refreshes read-only while focused without overlapping a send',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.match(screen,/setInterval\(\(\)=>\{[\s\S]*?AppState\.currentState==='active'&&!sendingNow\.current\)[\s\S]*?void refresh\(true,version\);[\s\S]*?\},15000\)/);
 assert.match(screen,/clearInterval\(timer\)/);
 assert.match(screen,/if\(refreshing\.current===version\)\{pendingRefresh\.current=true;return;\}/);
 assert.match(screen,/if\(!silent\)setLoading\(true\)/);
 assert.match(screen,/sendingNow\.current=true/);
 assert.match(screen,/sendingNow\.current=false/);
});

test('session chat preserves messages on transient polling errors but closes revoked access',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.match(screen,/import \{ApiError\} from/);
 assert.match(screen,/const accessRevoked=e instanceof ApiError&&\[401,403,404,409,410\]\.includes\(e\.status\)/);
 assert.match(screen,/if\(accessRevoked\)\{/);
 assert.match(screen,/setClosed\(true\);setEntries\(\[\]\);setDraft\(''\);setReply\(null\)/);
 assert.match(screen,/if\(!silent\)\{const message=e instanceof Error/);
});

test('session chat photo upload uses private scoped endpoint with confirmation',()=>{
 const api=read('src/lib/chat-photo-attachment.ts');
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.match(api,/kind==='community'\?'communities':'sessions'/);
 assert.match(api,/\/messages\/attachments/);
 assert.match(api,/\/availability/);
 assert.match(api,/5\*1024\*1024/);
 assert.match(api,/form\.append\('file'/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/credentials:'omit'/);
 assert.match(screen,/chatPhotoAvailable\('session',id,auth\.token\)/);
 assert.match(screen,/sendChatPhoto\('session',id,auth\.token,photo,originalReplyId\)/);
 assert.match(screen,/title=\{uploading\?'A enviar…':'Enviar ficheiros'\}/);
 assert.match(screen,/photoReady/);
 assert.match(screen,/!closed/);
});

test('session photo picker loads only on request and ignores results from previous session',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 assert.doesNotMatch(screen,/^import \* as ImagePicker from 'expo-image-picker'/m);
 assert.match(screen,/const ImagePicker=await import\('expo-image-picker'\)/);
 assert.match(screen,/pickerInFlight\.current=true/);
 assert.match(screen,/activeChat\.current!==identity\|\|auth\.token!==token/);
 assert.match(screen,/finally\{pickerInFlight\.current=false;\}/);
});

test('session text send clears drafts only after server receipt confirms exact message',()=>{
 const s=read('src/components/SessionChatPanel.tsx');
 assert.match(s,/const confirmed=await postSessionChat\(id,originalDraft,auth\.token,originalReplyId\)/);
 assert.match(s,/confirmedSessionChatSend\(confirmed,id,auth\.username\|\|'',originalDraft,originalReplyId\)/);
 assert.ok(s.indexOf('confirmedSessionChatSend(confirmed')<s.indexOf("setDraft(current=>current===originalDraft?'':current)"));
});

test('session chat receives live authenticated WebSocket signals and rechecks private history',()=>{
 const panel=read('src/components/SessionChatPanel.tsx');
 const realtime=read('src/lib/session-chat-realtime.ts');
 assert.match(panel,/import \{observeSessionChat\} from '\.\.\/lib\/session-chat-realtime'/);
 assert.match(panel,/observeSessionChat\(\{sessionId:id,token:auth\.token,onInvalidated:/);
 assert.match(panel,/version===generation\.current&&AppState\.currentState==='active'&&!sendingNow\.current/);
 assert.match(panel,/void refresh\(true,version\)/);
 assert.match(panel,/resume\.remove\(\);disconnect\(\)/);
 assert.match(realtime,/\{type:'AUTH',token\}/);
 assert.match(realtime,/envelope\.type==='AUTHENTICATED'/);
 assert.match(realtime,/!authenticated\|\|envelope\.type!=='SESSION_CHAT_MESSAGE'/);
 assert.match(realtime,/sessionId!==sessionId/);
 assert.match(realtime,/onInvalidated\(\)/);
 assert.doesNotMatch(realtime,/onMessage\(message\)|setEntries\(/);
});
