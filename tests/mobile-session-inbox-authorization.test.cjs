'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const api=read('src/lib/chat-api.ts');
const screen=read('app/(tabs)/messages.tsx');

test('session inbox only uses authenticated created or joined sessions',()=>{
 assert.match(api,/const mine=await mySessions\(token,username\)/);
 assert.match(api,/\[\.\.\.mine\.created,\.\.\.mine\.joined\]/);
 assert.doesNotMatch(api,/\[\.\.\.mine\.created,\.\.\.mine\.joined,\.\.\.mine\.waitlisted\]/);
 assert.match(api,/Number\.isSafeInteger\(session\.id\)/);
 assert.match(api,/\['CANCELLED','COMPLETED'\]\.includes\(session\.status\)/);
 assert.match(api,/conversations:ids\.slice\(i,i\+100\)\.map\(id=>\(\{kind:'session',id\}\)\)/);
 assert.match(api,/filterAuthorizedSummaries\('session',allowed,summaries,'Sessão desportiva'\)/);
 assert.match(api,/The server omits closed\/revoked chats/);
 assert.doesNotMatch(api,/if\(!returned\.has\(id\)\)visible\.push\(\{kind:'session'/);
});

test('messages tab handles session inbox failure independently of other chats',()=>{
 assert.match(screen,/sessionInbox\(auth\.token,auth\.username\)/);
 assert.match(screen,/sessionChats\.status==='fulfilled'\?sessionChats\.value:previous\.filter\(i=>i\.kind==='session'\)/);
 assert.match(screen,/sessionChats\.status==='rejected'\?\['sessões'\]:\[\]/);
 assert.match(screen,/pathname:'\/sessions\/\[id\]\/chat'/);
});
