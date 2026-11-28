const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('logout explicitly detects SecureStore removal failures and still revokes remotely',()=>{
 const code=read('src/lib/auth.tsx');
 const logout=code.slice(code.indexOf('const logout=useCallback'),code.indexOf('const value=useMemo'));
 assert.match(logout,/const removals=await Promise\.allSettled\(/);
 assert.match(logout,/localRemovalFailed=removals\.some\(result=>result\.status==='rejected'\)/);
 assert.match(logout,/let serverRevokeFailed=false/);
 assert.match(logout,/try\{await logoutServer\(tokenToRevoke\);\}catch\{serverRevokeFailed=true;\}/);
 assert.match(logout,/if\(localRemovalFailed\)\{\s*throw new Error\(/);
 assert.ok(logout.indexOf('await logoutServer(tokenToRevoke)')<logout.indexOf('if(localRemovalFailed){'));
});

test('logout UI never silently redirects on a failed secure storage deletion',()=>{
 const profile=read('app/(tabs)/profile.tsx');
 const idx=profile.indexOf('title="Terminar sessão"');
 const block=profile.slice(idx,idx+700);
 assert.ok(idx>=0);
 assert.match(block,/auth\.logout\(\)\.then\(/);
 assert.match(block,/error=>\{/);
 assert.match(block,/Alert\.alert\('Verifica o jogo'/);
 assert.match(block,/router\.replace\('\/welcome'\)/);
});
