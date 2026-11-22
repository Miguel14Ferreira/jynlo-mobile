const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
for(const [file,count] of [['reset-password.tsx',2],['confirm-email.tsx',2],['mfa.tsx',2]]){
 test(file+' serializes verification requests',()=>{
  const src=untranslate(fs.readFileSync(path.join(__dirname,'../app',file),'utf8'));
  assert.match(src,/const requestInFlight=useRef\(false\)/);
  assert.equal((src.match(/requestInFlight\.current=true/g)||[]).length,count);
  assert.equal((src.match(/finally\{requestInFlight\.current=false;setBusy\(false\);\}/g)||[]).length,count);
  assert.ok((src.match(/if\(requestInFlight\.current/g)||[]).length>=count);
 });
}
