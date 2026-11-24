'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('the app stays signed in with a refresh token kept in secure storage',()=>{
 const api=read('src/lib/api.ts'),session=read('src/lib/native-session.ts'),auth=read('src/lib/auth.tsx');
 assert.match(api,/'X-Jynlo-Client':'mobile'/);
 assert.match(api,/path\.startsWith\('\/api\/auth\/'\)\?response\.headers\.get\(NATIVE_REFRESH_HEADER\)/);
 assert.match(session,/SecureStore\.setItemAsync\(REFRESH_KEY,/);
 assert.match(session,/\/api\/auth\/mobile\/refresh/);
 assert.match(session,/if\(response\.status>=400&&response\.status<500\)\{await clearNativeRefreshToken\(\);return 'rejected';\}/);
 // Expiry first tries the refresh token; logout always forgets it.
 assert.match(auth,/restoreFromRefresh\(tokenEpoch\)\.then\(ok=>\{refreshing=false;if\(!ok\)endSession\(\);\}/);
 assert.match(auth,/clearNativeRefreshToken\(\)\]\)/);
});
