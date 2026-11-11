'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/chat.tsx'),'utf8');
test('community chat does not discard messages after a failed refresh',()=>{
 assert.match(source,/setRefreshWarning\('Não foi possível sincronizar o chat/);
 assert.doesNotMatch(source,/catch\(e\)\{if\(version===generation\.current\)\{setError\([^\n]+setMessages\(\[\]\)/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\);setName\(community\.name\);setRefreshWarning\(''\)/);
 assert.match(source,/if\(!silent\)setError\(/);
});
test('community chat does not advertise empty history after a loading error',()=>{
 assert.match(source,/!loading&&!error&&messages\.length===0/);
 assert.match(source,/setMessages\(\[\]\);setName\('Comunidade'\);setError\(''\);setRefreshWarning\(''\)/);
});
