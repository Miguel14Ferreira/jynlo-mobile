'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Google login button renders a branded Google icon and keeps real auth action',()=>{
 const source=read('app/login.tsx');
 assert.match(source,/g-logo\.png/);
 assert.match(source,/accessibilityLabel="Continuar com Google"/);
 assert.match(source,/void doGoogleLogin\(\)/);
 assert.match(source,/styles\.googleButton/);
});
test('mobile messages includes private conversations and community chats',()=>{
 const screen=read('app/(tabs)/messages.tsx');
 const api=read('src/lib/chat-api.ts');
 assert.match(screen,/directInbox\(auth\.token\)/);
 assert.match(screen,/communityInbox\(auth\.token,auth\.username\)/);
 assert.doesNotMatch(screen,/setItems\(inbox\.filter\(c=>c\.kind==='community'\)\)/);
 assert.match(screen,/pathname:'\/messages\/\[peer\]'/);
 assert.match(api,/\/api\/chat\/me\/peers/);
 assert.match(api,/\/api\/messages\/inbox\/summaries/);
 assert.match(api,/kind:'direct'/);
 assert.match(api,/\/api\/chat\/me\/.*encodeURIComponent\(peer\)/);
 const route=read('app/messages/[peer].tsx');
 assert.match(route,/sendDirectChat\(peer,draft,auth\.token\)/);
 assert.match(route,/directChatHistory\(peer,auth\.token\)/);
 assert.match(route,/markDirectRead\(peer,last,auth\.token\)/);
 assert.match(route,/Verifica|Consulta o histórico antes de repetires/);
});
test('member community links to session creation with authenticated preselection',()=>{
 const community=read('app/communities/[id].tsx');
 const wizard=read('app/sessions/create.tsx');
 assert.match(community,/title="Criar sessão nesta comunidade"/);
 assert.match(community,/communityId:String\(id\)/);
 assert.match(wizard,/useLocalSearchParams/);
 assert.match(wizard,/const chosen=groups\.find\(c=>c\.id===requestedCommunityId\)/);
 assert.match(wizard,/setCommunityMode\('SINGLE'\)/);
 assert.match(wizard,/communitySports\(chosen\)/);
 assert.match(wizard,/sports\.length===1/);
 assert.match(wizard,/preselectionApplied\.current=true/);
});
