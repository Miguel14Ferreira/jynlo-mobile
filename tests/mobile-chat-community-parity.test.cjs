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
test('community tournament pages are not silently truncated after four pages',()=>{
 const api=read('src/lib/competition-api.ts');
 assert.match(api,/page<25/);
 assert.match(api,/if\(!result\.hasMore\)return all/);
 assert.match(api,/throw Error\('Esta comunidade tem mais torneios/);
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

test('private conversation polls while focused and never retries sends automatically',()=>{
 const screen=read('app/messages/[peer].tsx');
 assert.match(screen,/setInterval\(\(\)=>\{if\(!sendingNow\.current\)void refresh\(true\);\},15000\)/);
 assert.match(screen,/return \(\)=>clearInterval\(timer\)/);
 assert.match(screen,/if\(refreshing\.current\)return/);
 assert.match(screen,/if\(!silent\)setLoading\(true\)/);
 assert.match(screen,/sendingNow\.current=true/);
 assert.match(screen,/sendingNow\.current=false/);
 assert.match(screen,/Consulta o histórico antes de repetires o envio/);
});

test('messages inbox refreshes while focused, keeps unread counts, and isolates accounts',()=>{
 const screen=read('app/(tabs)/messages.tsx');
 assert.match(screen,/setInterval\(\(\)=>\{void load\(true,version\);\},15000\)/);
 assert.match(screen,/clearInterval\(timer\)/);
 assert.match(screen,/generation\.current\+\+/);
 assert.match(screen,/version!==generation\.current/);
 assert.match(screen,/busyVersion\.current===version/);
 assert.match(screen,/identity\.current!==currentIdentity/);
 assert.match(screen,/setItems\(\[\]\);setInvites\(\[\]\)/);
 assert.match(screen,/previous\.filter\(i=>i\.kind==='direct'\)/);
 assert.match(screen,/previous\.filter\(i=>i\.kind==='community'\)/);
 assert.match(screen,/item\.unreadCount/);
 assert.match(screen,/Push com a app fechada ainda não está implementado/);
});
