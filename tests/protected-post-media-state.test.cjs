const untranslate=require('./untranslate.cjs');
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/ProtectedPostMedia.tsx'),'utf8'));

test('private post media never hangs on a failed download',()=>{
 assert.match(src,/\.catch\(\(\)=>\{if\(alive\)setError\(true\);\}\)/);
 assert.match(src,/if\(!token\)\{setError\(true\);/);
 assert.match(src,/\{error\?</);
 assert.match(src,/Tentar novamente/);
 assert.match(src,/onPress=\{\(\)=>setAttempt\(n=>n\+1\)\}/);
});
test('retry and unmount do not retain unauthorized private local media',()=>{
 assert.match(src,/setUri\(null\);setError\(false\)/);
 assert.match(src,/\[src,token,attempt\]/);
 assert.match(src,/if\(alive\)setUri\(file.uri\)/);
 assert.match(src,/else releasePrivateProfileMedia\(file\)/);
 assert.match(src,/if\(privateFile\)releasePrivateProfileMedia\(privateFile\)/);
});
