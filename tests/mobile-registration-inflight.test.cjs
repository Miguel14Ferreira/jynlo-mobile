'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
for(const file of ['register.tsx','google-onboarding.tsx']){
 test(file+' blocks duplicate registration requests synchronously',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../app',file),'utf8');
  assert.match(src,/const submitInFlight=useRef\(false\)/);
  assert.match(src,/if\([^\n]*submitInFlight\.current[^\n]*\)return;/);
  assert.match(src,/submitInFlight\.current=true;setBusy\(true\)/);
  assert.match(src,/finally\{submitInFlight\.current=false;setBusy\(false\);\}/);
 });
}

test('Google onboarding validates real adult birth dates like native registration',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../app/google-onboarding.tsx'),'utf8');
 assert.match(src,/import \{validAdultDate\} from '\.\.\/src\/lib\/native-registration'/);
 assert.match(src,/validAdultDate\(birth\.trim\(\)\)/);
 assert.doesNotMatch(src,/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
});
