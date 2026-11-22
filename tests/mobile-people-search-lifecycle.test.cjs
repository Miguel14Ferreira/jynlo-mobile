const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/people.tsx'),'utf8'));

test('people search clears prior identities and filters delayed responses',()=>{
 assert.match(code,/const generation=useRef\(0\)/);
 assert.match(code,/const requestId=\+\+generation\.current/);
 assert.match(code,/setPeople\(\[\]\);setLoading\(true\);setError\(''\)/);
 assert.match(code,/if\(requestId===generation\.current\)setPeople\(next\)/);
 assert.match(code,/if\(requestId===generation\.current\)setError/);
 assert.match(code,/if\(requestId===generation\.current\)setLoading\(false\)/);
});

test('leaving people screen invalidates outstanding requests and clears results',()=>{
 assert.match(code,/useFocusEffect\(useCallback\(\(\)=>\{/);
 assert.match(code,/return\(\)=>\{generation\.current\+\+;setPeople\(\[\]\);\}/);
 assert.match(code,/\},\[load\]\)\)/);
});

test('people API only presents backend-authorized suggestions for current authenticated token',()=>{
 assert.match(code,/discoverPeople\(auth\.token\)/);
 assert.match(code,/\},\[auth\.token\]\)/);
});
