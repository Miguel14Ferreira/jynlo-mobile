const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));

test('direct conversation exposes server-synced notification preference controls',()=>{
 const direct=read('app/messages/[peer].tsx');
 assert.match(direct,/listConversationMutes\(auth\.token\)/);
 assert.match(direct,/setConversationMuted\('direct',peer,next,token\)/);
 assert.match(direct,/isConversationMuted\(confirmed,'direct',peer\)/);
 assert.match(direct,/Avisos silenciados/);
 assert.match(direct,/Avisos ativos/);
 assert.match(direct,/Silenciar avisos desta conversa/);
 assert.match(direct,/pendingMuteWrites\.current\.has\(identity\)/);
 assert.match(direct,/generation\.current===version&&conversation\.current===identity/);
 assert.match(direct,/setMuteKnown\(false\);setMuted\(false\)/);
});

test('mute controls do not interfere with message delivery or unread cursors',()=>{
 const direct=read('app/messages/[peer].tsx');
 assert.match(direct,/markDirectRead\(peer,latest,auth\.token\)/);
 assert.match(direct,/sendDirectChatReply\(peer,submittedText,auth\.token,originalReply\.id\)/);
 assert.match(direct,/As mensagens e os indicadores de não lidas continuam a funcionar normalmente/);
});
