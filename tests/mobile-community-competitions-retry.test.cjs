'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/competitions.tsx'),'utf8');
test('failed community competition requests show retry instead of empty tournaments',()=>{
 assert.match(source,/error\?<Message tone="error">\{error\}<\/Message>/);
 assert.match(source,/error&&auth\.token\?<Button secondary title="Tentar carregar competições novamente"/);
 assert.match(source,/setRetryCount\(current=>current\+1\)/);
 assert.match(source,/!loading&&!error&&!!role&&sections\.length===0/);
 assert.match(source,/!loading&&!error&&!!role\?sections\.map/);
});
test('retry refreshes both membership and competitions without stale focus results',()=>{
 assert.match(source,/\[id,auth\.token,auth\.username,retryCount\]/);
 assert.match(source,/let active=true/);
 assert.match(source,/if\(!active\)return/);
 assert.match(source,/return\(\)=>\{active=false;\}/);
});

test('sign-out and invalid community identifiers clear stale competition data',()=>{
 assert.match(source,/if\(!auth\.token\|\|!auth\.username\)\{if\(active\)\{setLoading\(false\);setError\(''\);setCommunity\(null\);setTournaments\(\[\]\);\}return;\}/);
 assert.match(source,/if\(!Number\.isSafeInteger\(id\)\|\|id<=0\)\{if\(active\)\{setLoading\(false\);setCommunity\(null\);setTournaments\(\[\]\);setError\('Comunidade inválida\.'\);\}return;\}/);
});
