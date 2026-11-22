const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8'));
test('community chat does not discard messages after a failed refresh',()=>{
 assert.match(source,/setRefreshWarning\('Não foi possível sincronizar o chat/);
 assert.doesNotMatch(source,/catch\(e\)\{if\(version===generation\.current\)\{setError\([^\n]+setMessages\(\[\]\)/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\)/);
 assert.match(source,/if\(detailsResult\.status==='fulfilled'\)setName\(detailsResult\.value\.name\)/);
 assert.match(source,/setRefreshWarning\(''\)/);
 assert.match(source,/if\(!silent\)\{const message=e instanceof Error/);
});
test('community chat does not advertise empty history after a loading error',()=>{
 assert.match(source,/!loading&&!error&&messages\.length===0/);
 assert.match(source,/setMessages\(\[\]\);setName\('Comunidade'\);setError\(''\);setRefreshWarning\(''\)/);
});
