'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');
test('background direct chat failures disclose stale history without clearing messages',()=>{
 assert.match(source,/if\(silent\)setSyncWarning\('Não foi possível atualizar as mensagens/);
 assert.match(source,/syncWarning\?<Message tone="error">\{syncWarning\}<\/Message>/);
 assert.match(source,/setMessages\(results\);setSyncWarning\(''\)/);
});
test('changing identity clears warnings and stale messages',()=>{
 assert.match(source,/setMessages\(\[\]\);setDraft\(''\);setPhoto\(null\);setError\(''\);setSyncWarning\(''\)/);
 assert.match(source,/if\(version!==generation\.current\)return/);
});
