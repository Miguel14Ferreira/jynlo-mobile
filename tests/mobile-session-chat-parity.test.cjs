'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('session chat supports the same messages and authorized attachments as normal chat',()=>{
 const view=read('src/components/SessionChatPanel.tsx');
 for(const pattern of [/postSessionChat\(id,originalDraft/,/editSessionChatMessage\(/,/deleteSessionChatMessage\(/,
  /sendChatPhotoAlbum\(\{scope:'session',id\}/,/ChatPdfComposer target=\{\{scope:'session',id\}\}/,
  /SecureChatAttachment key=\{attachment.index\}/,/onPress=\{\(\)=>setReply\(m\)\}/])
  assert.match(view,pattern);
});
test('session chat mutes notification alerts with server-owned settings and readback',()=>{
 const view=read('src/components/SessionChatPanel.tsx');
 assert.match(view,/listConversationMutes\(auth.token\)/);
 assert.match(view,/setConversationMuted\('session',String\(id\),next,token\)/);
 assert.match(view,/isConversationMuted\(updated,'session',String\(id\)\)/);
 assert.match(view,/muteWrites.current.has\(identity\)/);
 assert.match(view,/title=\{muteBusy\?'A guardar…':muted\?'Ativar avisos':'Silenciar avisos'\}/);
});
test('location sharing requires foreground permission and an explicit send',()=>{
 const view=read('src/components/SessionChatPanel.tsx');
 assert.match(view,/requestForegroundPermissionsAsync\(\)/);
 assert.match(view,/Location.Accuracy.Balanced/);
 assert.match(view,/Math.abs\(lat\)>90\|\|Math.abs\(lng\)>180/);
 assert.match(view,/setDraft\(current=>\[current.trim\(\),url\].filter\(Boolean\).join\('\\n'\)\)/);
 assert.match(view,/Partilhar localização atual/);
 assert.match(view,/Abrir localização no mapa/);
 assert.match(view,/chatLocationUrl\(m.body\)/);
 assert.doesNotMatch(view,/postSessionChat\(id,url/);
});
test('historic GIFs are safely decoded and only valid media URL is displayed',()=>{
 const view=read('src/components/SessionChatPanel.tsx');
 const decoder=read('src/lib/chat-giphy.cjs');
 assert.match(view,/giphyImageUrl\(m.body\)/);
 assert.match(view,/resizeMode="contain" style=\{styles.gif\}/);
 assert.match(decoder,/\^\[a-zA-Z0-9_-\]\{4,100\}\$/);
 assert.doesNotMatch(view,/source=\{\{uri:m.body\}\}/);
});
test('session chat does not permit invitations or bypass closed access',()=>{
 const view=read('src/components/SessionChatPanel.tsx');
 assert.doesNotMatch(view,/Convidar participantes|inviteMember|addChatMember/);
 assert.match(view,/auth.token&&muteKnown&&!closed/);
 assert.match(view,/auth.token&&!closed\?<Button title=\{locationBusy/);
 assert.match(view,/const accessRevoked=e instanceof ApiError/);
});

test('map links inside messages have bounded coordinates and safe HTTPS host',()=>{
 const {chatLocationUrl}=require('../src/lib/chat-location.cjs');
 const link='https://www.google.com/maps?q=38.71667,-9.13333';
 assert.equal(chatLocationUrl('Vamos jogar aqui:\n'+link),link);
 assert.equal(chatLocationUrl('https://www.google.com/maps?q=123,-9'),null);
 assert.equal(chatLocationUrl('http://www.google.com/maps?q=38,-9'),null);
 assert.equal(chatLocationUrl('https://evil.example/maps?q=38,-9'),null);
 assert.equal(chatLocationUrl('https://www.google.com/maps?q=38,-181'),null);
 assert.equal(chatLocationUrl(null),null);
});

test('cancelled sessions show an automatic notification status, never a manual share panel',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/cancelSession\(id,actorToken,actorUsername\|\|undefined\)/);
 assert.match(screen,/detail\?\.status==='CANCELLED'\?<View style=\{styles\.panel\}>/);
 assert.match(screen,/A Jynlo envia automaticamente o aviso aos participantes inscritos/);
 assert.match(screen,/Convidados externos devem ser informados pelo canal utilizado/);
 assert.match(screen,/×  Sessão cancelada/);
 assert.doesNotMatch(screen,/cancelledShareText/);
 assert.doesNotMatch(screen,/Partilhar aviso de cancelamento/);
});
