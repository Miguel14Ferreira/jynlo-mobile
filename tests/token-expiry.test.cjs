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
