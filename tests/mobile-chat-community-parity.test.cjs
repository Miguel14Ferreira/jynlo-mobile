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
 assert.match(route,/sendDirectChat\(peer,submittedText,auth\.token\)/);
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
 assert.match(screen,/setInterval\(\(\)=>\{\s*if\(AppState\.currentState==='active'&&!sendingNow\.current\)void refresh\(true,version\);\s*\},15000\)/);
 assert.match(screen,/clearInterval\(timer\);resume\.remove\(\);received\.remove\(\)/);
 assert.match(screen,/if\(refreshing\.current===version\)/);
 assert.match(screen,/if\(!silent\)setLoading\(true\)/);
 assert.match(screen,/sendingNow\.current=true/);
 assert.match(screen,/sendingNow\.current=false/);
 assert.match(screen,/Consulta o histórico antes de repetires o envio/);
});

test('messages inbox refreshes while focused, keeps unread counts, and isolates accounts',()=>{
 const screen=read('app/(tabs)/messages.tsx');
 assert.match(screen,/setInterval\(\(\)=>\{if\(AppState\.currentState==='active'\)void load\(true,version\);\},15000\)/);
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

test('private photo attachment uses authenticated private API and requires explicit confirmation',()=>{
 const api=read('src/lib/direct-photo-attachment.ts');
 const screen=read('app/messages/[peer].tsx');
 assert.match(api,/\/api\/chat\/me\/.*encodeURIComponent\(peer\).*\/attachments/);
 assert.match(api,/\/availability/);
 assert.match(api,/5\*1024\*1024/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/form\.append\('file'/);
 assert.match(api,/Authorization:'Bearer '\+token/);
 assert.match(api,/credentials:'omit'/);
 assert.match(api,/Consulta o histórico antes de repetir/);
 assert.match(screen,/directPhotoAvailable\(peer,auth\.token\)/);
 assert.match(screen,/ImagePicker\.launchImageLibraryAsync/);
 assert.match(screen,/Confirmar envio da fotografia/);
 assert.match(screen,/sendDirectPhoto\(peer,auth\.token,photo\)/);
 assert.match(screen,/setPhoto\(null\)/);
 assert.match(screen,/photoAvailable\?/);
 assert.match(screen,/SecureChatAttachment scope="direct"/);
});

test('community chat photo upload checks private storage and requires confirmation',()=>{
 const api=read('src/lib/chat-photo-attachment.ts');
 const chat=read('app/communities/[id]/chat.tsx');
 assert.match(api,/form\.append\('file'/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/replyToMessageId/);
 assert.match(api,/controller\.abort\(\)/);
 assert.match(chat,/chatPhotoAvailable\('community',id,auth\.token\)/);
 assert.match(chat,/sendChatPhoto\('community',id,auth\.token,photo\)/);
 assert.match(chat,/ImagePicker\.launchImageLibraryAsync/);
 assert.match(chat,/Confirmar envio da fotografia/);
 assert.match(chat,/canSendPhoto/);
 assert.match(chat,/setPhoto\(null\)/);
 assert.match(chat,/SecureChatAttachment scope="community"/);
});
