const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/auth.tsx'),'utf8'));
test('every async authentication flow invalidates stale responses before writing session state',()=>{
 for(const name of ['apiSignIn(name,password)','googleLoginWithIdToken(credential)','googleRegisterWithIdToken(googlePending.credential,input)','confirmMfa(challengeId,code)','apiResendMfa(challengeId)']){
  const offset=source.indexOf('await '+name);
  assert.ok(offset>=0,name);
  assert.match(source.slice(offset,offset+260),/if\(epoch!==authEpoch\.current\)throw Error/);
 }
});
test('secure writes are serialized and checked after completion before becoming visible',()=>{
 const save=source.slice(source.indexOf('const save=useCallback'),source.indexOf('const login=useCallback'));
 assert.match(save,/const work=credentialQueue\.current\.then\(async\(\)=>\{/);
 assert.match(save,/await Promise\.all\(\[SecureStore\.setItemAsync\(TOKEN_KEY,accessToken\),SecureStore\.setItemAsync\(USER_KEY,name\)\]\)/);
 assert.ok(save.indexOf('if(epoch!==authEpoch.current)',save.indexOf('await Promise.all('))<save.indexOf('setUsername(name)'));
});
test('logout immediately cancels old login responses and deletes after pending storage writes',()=>{
 const logout=source.slice(source.indexOf('const logout=useCallback'),source.indexOf('const value=useMemo'));
 assert.ok(logout.indexOf('authEpoch.current++')<logout.indexOf('setToken(null)'));
 assert.match(logout,/const cleanup=credentialQueue\.current\.then\(clear,clear\)/);
 assert.match(logout,/credentialQueue\.current=cleanup/);
 assert.match(logout,/await cleanup/);
 assert.ok(logout.indexOf('await cleanup')<logout.indexOf('await logoutServer(tokenToRevoke)'));
});

test('startup session restoration cannot revive an account after logout',()=>{
 const startup=source.slice(source.indexOf('useEffect(()=>{let active=true;const restoreEpoch'),source.indexOf('},[]);'));
 assert.match(startup,/const restoreEpoch=authEpoch\.current/);
 assert.match(startup,/if\(active&&restoreEpoch===authEpoch\.current\)/);
 assert.match(startup,/credentialQueue\.current=credentialQueue\.current\.then\(clear,clear\)/);
 assert.match(startup,/await credentialQueue\.current/);
});

test('successful credential commit invalidates stale SecureStore restoration before publishing login',()=>{
 const save=source.slice(source.indexOf('const save=useCallback'),source.indexOf('const login=useCallback'));
 const commit=save.indexOf('authEpoch.current++');
 assert.ok(commit>save.indexOf('await Promise.all([SecureStore.setItemAsync'));
 assert.ok(commit<save.indexOf('setUsername(name);setToken(accessToken)'));
 const restore=source.slice(source.indexOf('useEffect(()=>{let active=true;const restoreEpoch'),source.indexOf('},[]);'));
 assert.match(restore,/if\(!active\|\|restoreEpoch!==authEpoch\.current\)return/);
});
test('old JWT timer and serialized expiry cleanup cannot invalidate a newer Google login',()=>{
 const lifecycle=source.slice(source.indexOf('useEffect(()=>{\n    if(DEMO_MODE||!token)return;'),source.indexOf('},[token]);'));
 assert.match(lifecycle,/const tokenEpoch=authEpoch\.current/);
 assert.match(lifecycle,/if\(tokenEpoch!==authEpoch\.current\|\|isAccessTokenUsable\(token\)\)return/);
 assert.match(lifecycle,/if\(!active\|\|tokenEpoch!==authEpoch\.current\)return/);
 assert.match(lifecycle,/if\(expireEpoch!==authEpoch\.current\)return/);
});
