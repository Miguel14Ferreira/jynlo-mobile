'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('session and community details contain the real chat without opening another route',()=>{
 const session=read('app/sessions/[id].tsx'),community=read('app/communities/[id].tsx');
 assert.match(session,/import SessionChatPanel from/);
 assert.match(session,/<SessionChatPanel embedded\/>/);
 assert.doesNotMatch(session,/title="Abrir chat da sessão"/);
 assert.match(community,/import CommunityChatPanel from/);
 assert.match(community,/<CommunityChatPanel embedded\/>/);
 assert.doesNotMatch(community,/title="Abrir chat da comunidade"/);
});
test('old deep links still render exactly the same chat component',()=>{
 assert.match(read('app/sessions/[id]/chat.tsx'),/<SessionChatPanel\/>/);
 assert.match(read('app/communities/[id]/chat.tsx'),/<CommunityChatPanel\/>/);
});
test('inline chats have independently scrollable history and show earlier messages on demand',()=>{
 for(const name of ['Session','Community']){
  const src=read('src/components/'+name+'ChatPanel.tsx');
  assert.match(src,/embedded\?<ScrollView style=\{styles.inlineHistory\} nestedScrollEnabled/);
  assert.match(src,/setHistoryLimit\(count=>count\+40\)/);
  assert.match(src,/inlineHistory:\{height:290,/);
  assert.match(src,/return embedded\?<View style=\{styles.inline\}>/);
 }
});
test('inline composer uses icon-only actions with accessible names',()=>{
 for(const name of ['Session','Community']){
  const src=read('src/components/'+name+'ChatPanel.tsx');
  assert.match(src,/accessibilityLabel="Selecionar fotografias ou vídeos"/);
  assert.match(src,/accessibilityLabel="Abrir câmara"/);
  assert.match(src,/accessibilityLabel="Partilhar localização atual"/);
  assert.match(src,/name="gallery"/);
  assert.match(src,/name="camera"/);
  assert.match(src,/name="location"/);
  assert.match(src,/accessibilityLabel=\{muted\?'Ativar avisos deste chat':'Silenciar avisos deste chat'\}/);
  assert.match(src,/<ChatPdfComposer compact/);
  assert.match(src,/name="send"/);
 }
 const pdf=read('src/components/ChatPdfComposer.tsx');
 assert.match(pdf,/accessibilityLabel="Anexar documento PDF"/);
 assert.match(pdf,/name="document"/);
 assert.match(pdf,/compact\?\(selected\?styles.compactExpanded:styles.compactPanel\)/);
});
test('chat scopes remain backed by their own access-authorized APIs',()=>{
 const session=read('src/components/SessionChatPanel.tsx');
 const community=read('src/components/CommunityChatPanel.tsx');
 assert.match(session,/sessionChatHistory\(id,auth.token\)/);
 assert.match(community,/communityMessages\(id,auth.token,auth.username\)/);
 assert.match(session,/closed/);
 assert.match(community,/accessRevoked/);
});

test('inline history follows new messages only while near latest items',()=>{
 for(const name of ['Session','Community']){
  const src=read('src/components/'+name+'ChatPanel.tsx');
  assert.match(src,/const inlineNearBottom=useRef\(true\)/);
  assert.match(src,/onScroll=\{event=>\{const \{contentOffset,layoutMeasurement,contentSize\}=event.nativeEvent/);
  assert.match(src,/inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
  assert.match(src,/onContentSizeChange=\{\(\)=>\{if\(inlineNearBottom\.current\)inlineHistoryRef\.current\?\.scrollToEnd/);
  assert.match(src,/inlineNearBottom\.current=false;setHistoryLimit\(count=>count\+40\)/);
 }
});
