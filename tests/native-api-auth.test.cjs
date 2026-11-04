const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('native API uses bearer tokens without browser refresh cookies',()=>{
  const source=read('src/lib/api.ts');
  assert.match(source,/credentials:'omit'/);
  assert.doesNotMatch(source,/credentials:'include'/);
  assert.match(source,/Authorization.*Bearer /);
  assert.match(source,/if \(DEMO_MODE\) throw new Error/);
});

test('sign in and MFA use POST while read-only discovery remains GET',()=>{
  const source=read('src/lib/api.ts');
  for(const route of ['/api/auth/login','/api/auth/mfa/confirm','/api/auth/mfa/resend']){
    assert.ok(source.includes(route),route);
  }
  assert.match(source,/method:'POST',body:\{username,password\}/);
  assert.match(source,/method:'POST',body:\{challengeId,code\}/);
  assert.match(source,/method:'POST',body:\{challengeId\}/);
  assert.match(source,/never automatically retry a POST/i);
});
