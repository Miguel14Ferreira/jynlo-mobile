'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../src/lib/auth.tsx'),'utf8');
const logout=code.slice(code.indexOf('const logout=useCallback'),code.indexOf('const value=useMemo'));

test('logout removes in-memory identity before remote network cleanup',()=>{
 const clearToken=logout.indexOf('setToken(null)');
 const clearUsername=logout.indexOf('setUsername(null)');
 const clearPush=logout.indexOf('await clearNativePushPresentation()');
 const remotePush=logout.indexOf('await disableMobilePush(');
 const revoke=logout.indexOf('await logoutServer(');
 assert.ok(clearToken>=0&&clearUsername>=0&&clearToken<clearPush&&clearUsername<clearPush);
 assert.ok(clearPush<remotePush&&remotePush<revoke);
});

test('logout does not wait for server to revoke before deleting persisted credentials',()=>{
 const storage=logout.indexOf('SecureStore.deleteItemAsync(TOKEN_KEY)');
 const revoke=logout.indexOf('await logoutServer(');
 assert.ok(storage>=0&&storage<revoke);
 assert.match(logout,/const tokenToRevoke=token/);
 assert.match(logout,/const nameToRevoke=username/);
 assert.match(logout,/Promise\.allSettled/);
});

test('logout resets MFA and OAuth registration state synchronously',()=>{
 for(const value of ['setChallengeId(null)','setPendingUsername(null)','setGooglePending(null)','setBrowsingAsGuest(false)']){
  assert.ok(logout.indexOf(value)>0&&logout.indexOf(value)<logout.indexOf('await clearNativePushPresentation()'),value);
 }
});
