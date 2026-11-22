const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/login.tsx'),'utf8'));

test('Google and password login share a synchronous in-flight guard',()=>{
 assert.match(source,/const loginInFlight=useRef\(false\)/);
 assert.match(source,/async function doGoogleLogin\(\)\{\s*if\(loginInFlight\.current\|\|auth\.username\)return;\s*loginInFlight\.current=true/);
 assert.match(source,/async function doLogin\(\)\{\s*if\(loginInFlight\.current\|\|auth\.username\)return;\s*loginInFlight\.current=true/);
 assert.equal((source.match(/finally\{loginInFlight\.current=false;setBusy\(false\);\}/g)||[]).length,2);
});
