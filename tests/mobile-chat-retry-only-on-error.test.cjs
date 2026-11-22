const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('direct messages only offer manual retry after a failed synchronization',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/\{syncWarning\?<Pressable[^\n]+accessibilityLabel="Tentar sincronizar novamente"/);
 assert.match(source,/setSyncWarning\(''\)/);
 assert.doesNotMatch(source,/accessibilityLabel="Atualizar conversa"/);
});
test('community messages only offer retry for sync failures, never revoked access',()=>{
 const source=read('src/components/CommunityChatPanel.tsx');
 assert.match(source,/\{refreshWarning&&!accessRevoked\?<Button secondary title="Tentar novamente"/);
 assert.match(source,/setRefreshWarning\(''\)/);
 assert.doesNotMatch(source,/title="Atualizar mensagens"/);
});
test('session messages automatically clear offline warning after successful sync',()=>{
 const source=read('src/components/SessionChatPanel.tsx');
 assert.match(source,/setEntries\(history\);setClosed\(false\);setSyncWarning\(''\)/);
 assert.match(source,/setSyncWarning\('Sem sincronização neste momento/);
 assert.match(source,/\{syncWarning&&!closed\?<Button title="Tentar novamente"/);
 assert.doesNotMatch(source,/title="Atualizar conversa"/);
});
