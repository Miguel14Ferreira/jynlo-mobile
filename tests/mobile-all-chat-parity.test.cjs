const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const screens={
 direct:read('app/messages/[peer].tsx'),
 community:read('src/components/CommunityChatPanel.tsx'),
 session:read('src/components/SessionChatPanel.tsx')
};
test('all three conversations offer message replies, edits, deletion and secure media',()=>{
 for(const [kind,s] of Object.entries(screens)){
  for(const re of [/ChatPdfComposer/,/SecureChatAttachment/,/sendChatPhotoAlbum\(/,/choosePhoto\('camera'\)/,
   /accessibilityLabel="Editar mensagem"/,/replyToMessageId|replyTarget|setReply/,/deleteMessage\(/]){
   assert.match(s,re,kind+': '+re);
  }
 }
});
test('all three conversations support mute, location and safe GIF rendering',()=>{
 for(const [kind,s] of Object.entries(screens)){
  for(const re of [/setConversationMuted\(/,/listConversationMutes\(/,/Partilhar localização atual/,/requestForegroundPermissionsAsync\(/,/giphyImageUrl\(/]){
   assert.match(s,re,kind+': '+re);
  }
 }
 for(const kind of ['community','session']){
  assert.match(screens[kind],/chatLocationUrl\(/);
  assert.match(screens[kind],/Abrir localização no mapa/);
  assert.match(screens[kind],/m\.deletedAt\?'Mensagem removida':giphyImageUrl\(m\.body\)\?'GIF'/);
 }
});
test('chat messages use the same API-compatible 2000-character composer maximum',()=>{
 assert.match(screens.direct,/maxLength=\{2000\} accessibilityLabel="Mensagem privada/);
 assert.match(screens.community,/maxLength=\{2000\} accessibilityLabel="Mensagem para a comunidade"/);
 assert.match(screens.session,/maxLength=\{2000\}\s+accessibilityLabel="Mensagem da sessão"/);
 assert.doesNotMatch(screens.community,/maxLength=\{4000\}/);
});
test('community and session access stays server-authorized without independent chat invites',()=>{
 for(const kind of ['community','session']){
  const s=screens[kind];
  assert.doesNotMatch(s,/Convidar participantes|inviteChatMember|addChatMember/);
  assert.match(s,/const (accessRevoked|forbidden)=e instanceof ApiError/);
 }
 assert.match(screens.session,/!closed/);
 assert.match(screens.community,/!accessRevoked/);
});
test('group chat mute is persisted server-side and verified with readback',()=>{
 assert.match(screens.community,/setConversationMuted\('community',String\(id\),next,token\)/);
 assert.match(screens.session,/setConversationMuted\('session',String\(id\),next,token\)/);
 for(const kind of ['community','session']){
  const s=screens[kind];
  assert.match(s,/muteWrites\.current\.add\(identity\)/);
  assert.match(s,/muteWrites\.current\.delete\(identity\)/);
  assert.match(s,/activeChat\.current===identity/);
  assert.match(s,/muteKnown&&!/);
 }
});

test('group chat has compact icon controls and standalone route keeps legacy tray',()=>{
 for(const kind of ['community','session']){
  const source=screens[kind];
  assert.match(source,/<ChatPdfComposer compact/);
  assert.match(source,/accessibilityLabel="Abrir câmara"/);
  assert.match(source,/accessibilityLabel="Selecionar fotografias ou vídeos"/);
  assert.match(source,kind==='community'?/auth\.token&&!accessRevoked&&attachmentsOpen\?<View style=\{styles\.attachmentOptions\}>/:/auth\.token&&!(?:closed|accessRevoked)&&attachmentsOpen\?<View style=\{styles\.quickActions\}>/);
  assert.match(source,/<ChatPdfComposer compact/);
 }
 assert.match(screens.direct,/accessibilityLabel=\{attachmentsOpen\?'Fechar anexos':'Abrir anexos'\}/);
});

test('PDF permission is independent of camera/photo availability in group conversations',()=>{
 for(const kind of ['community','session']){
  const source=screens[kind];
  const pdf=source.match(/<ChatPdfComposer[\s\S]{0,450}?enabled=\{([^}]+)\}/);
  assert.ok(pdf,'PDF composer must exist: '+kind);
  assert.doesNotMatch(pdf[1],/canSendPhoto|photoReady/);
  assert.match(pdf[1],/!sending&&!uploading/);
  assert.match(pdf[1],/!pendingWrites\.current\.has/);
 }
});

test('all group and direct chats revalidate membership immediately after a secure media denial',()=>{
 const expected={
  direct:/onAuthorizationError=\{\(\)=>\{setMessages\(\[\]\);void refresh\(false,generation\.current\);\}\}/,
  community:/onAuthorizationError=\{\(\)=>\{setMessages\(\[\]\);void refresh\(generation\.current,false\);\}\}/,
  session:/onAuthorizationError=\{\(\)=>\{setEntries\(\[\]\);void refresh\(false,generation\.current\);\}\}/
 };
 for(const [kind,pattern] of Object.entries(expected)){
  const screen=screens[kind];
  assert.match(screen,pattern,kind+' should hide cached media and recheck permissions');
 }
 const viewer=read('src/components/SecureChatAttachment.tsx');
 assert.match(viewer,/\[401,403,409\]\.includes\(response\.status\)&&active\.current/);
 assert.match(viewer,/generation\.current===version&&!controller\.signal\.aborted/);
 assert.match(viewer,/onAuthorizationError\?\.\(response\.status\)/);
});
