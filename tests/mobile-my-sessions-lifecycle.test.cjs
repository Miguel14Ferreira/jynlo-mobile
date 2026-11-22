const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/my-sessions.tsx'),'utf8'));

test('my-sessions invalidates stale responses after account or focus change',()=>{
 assert.match(code,/const generation=useRef\(0\)/);
 assert.match(code,/const requestId=\+\+generation\.current/);
 assert.match(code,/if\(requestId===generation\.current\)\{setData\(next\);setLoadedIdentity\(identity\);\}/);
 assert.match(code,/if\(requestId===generation\.current\)setError/);
 assert.match(code,/if\(requestId===generation\.current\)setLoading\(false\)/);
 assert.match(code,/\},\[auth\.token,auth\.username,identity\]\)/);
});

test('my-sessions removes previously visible roster immediately and on screen exit',()=>{
 assert.match(code,/setData\(\{created:\[\],joined:\[\],waitlisted:\[\]\}\);setLoadedIdentity\(''\);setError\(''\)/);
 assert.match(code,/return\(\)=>\{generation\.current\+\+;setData\(\{created:\[\],joined:\[\],waitlisted:\[\]\}\);\}/);
});

test('my-sessions never loads private roster without both auth credentials',()=>{
 assert.match(code,/if\(!auth\.token\|\|!auth\.username\)\{setLoading\(false\);return;\}/);
 assert.match(code,/mySessions\(auth\.token,auth\.username\)/);
});

test('personal sessions never show the previous account while a different user loads',()=>{
 assert.match(code,/const identity=\(auth\.username\|\|''\)\+'\|'\+\(auth\.token\|\|''\)/);
 assert.match(code,/const \[loadedIdentity,setLoadedIdentity\]=useState\(''\)/);
 assert.match(code,/setLoadedIdentity\(''\)/);
 assert.match(code,/organizeMySessions\(loadedIdentity===identity\?data:null\)/);
});
