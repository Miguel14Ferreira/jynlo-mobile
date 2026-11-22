const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

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
 assert.match(route,/markDirectRead\(peer,latest,auth\.token\)/);
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
 // WebSocket first: poll every 5 s only while offline, otherwise reconcile every 30 s.
 assert.match(screen,/setInterval\(\(\)=>\{\s*if\(active&&(version===generation\.current|generation\.current===version)&&AppState\.currentState==='active'&&!sendingNow\.current\)\{\s*pollTicks\+\+;\s*if\(!socketOnline\|\|pollTicks%6===0\)void refresh\(true,version\);\s*\}\s*\},5000\)/);
 // The private chat also closes its WebSocket on blur.
 assert.match(screen,/clearInterval\(timer\);(disconnect\(\);)?resume\.remove\(\)/);
 assert.match(screen,/received\?\.remove\(\)/);
 assert.match(screen,/if\(refreshing\.current===version\)/);
 assert.match(screen,/if\(!silent\)\{setLoading\(true\);setError\(''\);\}/);
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
 assert.match(screen,/accessibilityLabel="Abrir notificações"/);
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
 assert.match(screen,/Enviar ficheiros/);
 assert.match(screen,/sendDirectPhoto\(peer,auth\.token,photo,originalReplyId\)/);
 assert.match(screen,/setPhoto\(null\)/);
 assert.match(screen,/photoAvailable/);
 assert.match(screen,/<SecureChatAttachment key=\{attachment\.index\} index=\{attachment\.index\} scope="direct"/);
});

test('community chat photo upload checks private storage and requires confirmation',()=>{
 const api=read('src/lib/chat-photo-attachment.ts');
 const chat=read('src/components/CommunityChatPanel.tsx');
 assert.match(api,/form\.append\('file'/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/replyToMessageId/);
 assert.match(api,/controller\.abort\(\)/);
 assert.match(chat,/chatPhotoAvailable\('community',id,auth\.token\)/);
 assert.match(chat,/sendChatPhoto\('community',id,token,selectedPhoto,originalReplyId\)/);
 assert.match(chat,/ImagePicker\.launchImageLibraryAsync/);
 assert.match(chat,/Enviar ficheiros/);
 assert.match(chat,/canSendPhoto/);
 assert.match(chat,/setPhoto\(null\)/);
 assert.match(chat,/<SecureChatAttachment key=\{attachment\.index\} index=\{attachment\.index\} scope="community"/);
});

test('session chat discards stale responses after navigation and never auto-retries sends',()=>{
 const screen=read('src/components/SessionChatPanel.tsx');
 for(const marker of [
  'generation=useRef(0)', 'const version=++generation.current',
  'version!==generation.current', 'generation.current++',
  "AppState.currentState==='active'", "void refresh(true,version)",
  'refreshing.current===version', 'if(activeChat.current===identity){sendingNow.current=false',
  "Consulta o histórico antes de voltares a tentar."
 ])assert.ok(screen.includes(marker),marker);
 assert.ok(screen.includes("postSessionChat(id,originalDraft,auth.token,originalReplyId)"));
 assert.ok(!screen.includes("setInterval(()=>{if(!sendingNow.current)void refresh(true);},15000)"));
});

test('community chat clears only the submitted draft and never renders invalid timestamps',()=>{
 const screen=read('src/components/CommunityChatPanel.tsx');
 assert.ok(screen.includes('const originalDraft=draft'));
 assert.ok(screen.includes("setDraft(current=>current===originalDraft?'':current)"));
 assert.ok(screen.includes('Number.isFinite(Date.parse(m.createdAt))'));
 assert.ok(screen.includes('version!==generation.current'));
});

test('queued session history refreshes and pending send do not erase new edits',()=>{
 const session=read('src/components/SessionChatPanel.tsx');
 for(const item of ['pendingRefresh=useRef(false)','pendingRefresh.current=true',
  'pendingRefresh.current=false;void refresh(true,version)',
  'const version=generation.current,originalDraft=draft,originalReplyId=reply?.id',
  "setDraft(current=>current===originalDraft?'':current)",
  'setReply(current=>current?.id===originalReplyId?null:current)'])
  assert.ok(session.includes(item),item);
 assert.ok(session.includes("if(!silent)setError('')"));
});
test('private send does not erase unsent text with a different original value',()=>{
 const direct=read('app/messages/[peer].tsx');
 assert.ok(direct.includes('const originalDraft=draft'));
 assert.ok(direct.includes('const submittedText=originalDraft.trim()'));
 assert.ok(direct.includes("setDraft(current=>current===originalDraft?'':current)"));
});

test('private attachment downloads ignore responses from previous chat identities',()=>{
 const attachment=read('src/components/SecureChatAttachment.tsx');
 for(const item of [
  'generation=useRef(0)','const version=++generation.current',
  'if(generation.current===version)generation.current++',
  'generation.current!==version','[cleanup,scope,conversationId,messageId,index,kind,token]',
  'if(generation.current===version){pending.current=false'
 ])assert.ok(attachment.includes(item),item);
 assert.ok(attachment.includes("if(file?.exists)try{file.delete();}catch{}"));
});
test('PDF composer stale upload completion must not clear busy flag of new conversation',()=>{
 const composer=read('src/components/ChatPdfComposer.tsx');
 assert.ok(composer.includes('if(active.current&&generation.current===version)setBusy(false)'));
 assert.ok(composer.includes('generation.current!==version'));
});

test('confirmed outbound community and session messages appear before history reconciliation',()=>{
 const community=read('src/components/CommunityChatPanel.tsx');
 const session=read('src/components/SessionChatPanel.tsx');
 const verifiedCommunity=community.indexOf('if(!confirmedCommunityChatSend(confirmed,');
 const visibleCommunity=community.indexOf('setMessages(current=>mergeMessages(current,[confirmed]))',verifiedCommunity);
 // Reconciliation is now fire-and-forget: a failed refresh cannot undo a confirmed send.
 const reloadCommunity=community.indexOf('void refresh(version,true);',visibleCommunity);
 assert.ok(verifiedCommunity>=0&&visibleCommunity>verifiedCommunity&&reloadCommunity>visibleCommunity);
 const verifiedSession=session.indexOf('if(!confirmedSessionChatSend(confirmed,');
 const visibleSession=session.indexOf('setEntries(current=>current.some(entry=>entry.id===confirmed.id)',verifiedSession);
 const reloadSession=session.indexOf('void refresh(true,version);',visibleSession);
 assert.ok(verifiedSession>=0&&visibleSession>verifiedSession&&reloadSession>visibleSession);
 assert.ok(community.includes('if(version!==generation.current)return;'));
 assert.ok(session.includes('if(version!==generation.current)return;'));
});
