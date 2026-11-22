const untranslate=require('./untranslate.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {accessTokenExpiresAt,isAccessTokenUsable}=require('../src/lib/token-expiry.cjs');
const jwt=exp=>'header.'+Buffer.from(JSON.stringify({exp})).toString('base64url')+'.signature';
test('reject missing and malformed tokens',()=>{
  for(const input of [null,'','header.payload','x.???.z',jwt('wrong'),jwt(0),jwt(-1)]){
    assert.equal(accessTokenExpiresAt(input),null);
    assert.equal(isAccessTokenUsable(input),false);
  }
});
test('expires near boundary without trusting an unsigned token for authorization',()=>{
  const now=1750000000000;
  assert.equal(isAccessTokenUsable(jwt(Math.floor(now/1000)+60),now),true);
  assert.equal(isAccessTokenUsable(jwt(Math.floor(now/1000)+10),now),false);
  assert.equal(isAccessTokenUsable(jwt(Math.floor(now/1000)-10),now),false);
  assert.equal(accessTokenExpiresAt(jwt(Math.floor(now/1000)+60)),now+60000);
});

test('authentication re-arms long-lived expiry timers rather than abandoning future expiry checks',()=>{
 const fs=require('node:fs');
 const path=require('node:path');
 const auth=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/auth.tsx'),'utf8'));
 const lifecycle=auth.slice(auth.indexOf('const expiresAt=accessTokenExpiresAt(token)'),auth.indexOf('},[token]);'));
 assert.match(lifecycle,/const schedule=\(\)=>\{/);
 assert.match(lifecycle,/timer=setTimeout\(schedule,Math\.max\(1,Math\.min\(2147483647,remaining\)\)\)/);
 assert.match(lifecycle,/if\(!isAccessTokenUsable\(token\)\)\{expire\(\);return;\}/);
 assert.match(lifecycle,/if\(state==='active'\)\{if\(timer\)clearTimeout\(timer\);schedule\(\);\}/);
 assert.match(lifecycle,/active=false;if\(timer\)clearTimeout\(timer\);sub\.remove\(\)/);
 assert.doesNotMatch(lifecycle,/setTimeout\(expire,delay\)/);
});

test('expired JWT cancels pending push activation before clearing in-memory login',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const auth=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/auth.tsx'),'utf8'));
 const expire=auth.slice(auth.indexOf('const expire=()=>{'),auth.indexOf('const expiresAt=accessTokenExpiresAt(token)'));
 assert.match(expire,/invalidatePendingPushRegistration\(\)/);
 assert.ok(expire.indexOf('invalidatePendingPushRegistration()')<expire.indexOf('setToken(null)'));
});

test('expiry invalidates old login responses and queues secure cleanup after writes',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const auth=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/auth.tsx'),'utf8'));
 const expire=auth.slice(auth.indexOf('const expire=()=>{'),auth.indexOf('const expiresAt=accessTokenExpiresAt(token)'));
 assert.match(expire,/authEpoch\.current\+\+/);
 assert.match(expire,/credentialQueue\.current=credentialQueue\.current\.then\(clear,clear\)/);
 const save=auth.slice(auth.indexOf('const save=useCallback'),auth.indexOf('const login=useCallback'));
 assert.match(save,/if\(epoch!==authEpoch\.current\)/);
 assert.match(save,/credentialQueue\.current=work\.then\(\(\)=>\{\},\(\)=>\{\}\)/);
});
