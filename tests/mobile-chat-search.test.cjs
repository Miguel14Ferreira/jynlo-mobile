const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('message search is inline across private, community and session chats',()=>{
 const screens=[
  ['app/messages/[peer].tsx','direct','peer'],
  ['src/components/CommunityChatPanel.tsx','community','String(id)'],
  ['src/components/SessionChatPanel.tsx','session','String(id)']
 ];
 for(const [file,kind,conversation] of screens){
  const source=read(file);
  assert.match(source,/import ChatSearchPanel from/);
  assert.match(source,new RegExp('<ChatSearchPanel kind="'+kind+'" conversationId=\\{'+conversation.replace(/[()]/g,'\\$&')+'\\}'));
  assert.match(source,/token=\{auth.token\}/);
 }
});
test('search uses authorized endpoints, literal query and backend bounds',()=>{
 const api=read('src/lib/chat-search-api.ts');
 assert.ok(api.includes("/api/messages/inbox/search?"));
 assert.ok(api.includes("/api/messages/inbox/context?"));
 assert.match(api,/if\(term.length<2\|\|term.length>80\)/);
 assert.match(api,/if\(!Number.isSafeInteger\(page\)\|\|page<0\|\|page>50\)/);
 assert.match(api,/encodeURIComponent\(term\)/);
 assert.match(api,/encodeURIComponent\(id\)/);
 assert.match(api,/response.results.slice\(0,20\).filter\(validateHit\)/);
 assert.match(api,/context.slice\(0,41\).filter\(validateHit\)/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)throw Error/);
});
test('results are explicit, paginated and context never navigates to another chat page',()=>{
 const panel=read('src/components/ChatSearchPanel.tsx');
 assert.match(panel,/onSubmitEditing=\{\(\)=>\{void run\(0,query\);\}\}/);
 assert.match(panel,/setHits\(previous=>nextPage===0\?response.results:/);
 assert.match(panel,/setSelected\(messageId\);setContext\(around\)/);
 assert.match(panel,/onPress=\{\(\)=>\{void run\(page\+1,searched\);\}\}/);
 assert.match(panel,/accessibilityLabel="Fechar contexto"/);
 assert.match(panel,/accessibilityLabel=\{open\?'Fechar pesquisa de mensagens':'Pesquisar mensagens'\}/);
 assert.doesNotMatch(panel,/router\.push|Linking\.openURL/);
});
test('late search replies cannot mix accounts or old conversation messages',()=>{
 const panel=read('src/components/ChatSearchPanel.tsx');
 assert.match(panel,/const identity=kind\+'\|'\+conversationId\+'\|'\+\(token\|\|''\)/);
 assert.match(panel,/generation.current\+\+;working.current=false/);
 assert.match(panel,/const version=\+\+generation.current/);
 assert.match(panel,/if\(version!==generation.current\)return/);
 assert.match(panel,/if\(version===generation.current\)\{setBusy\(false\);working.current=false;\}/);
});
