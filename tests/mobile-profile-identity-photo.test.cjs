'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/(tabs)/profile.tsx'),'utf8');

test('profile photo is cleared immediately when account token changes or screen refocuses',()=>{
 const focus=code.slice(code.indexOf('useFocusEffect(useCallback('),code.indexOf('const [showDelete'));
 const clear=focus.indexOf('setPhotoUrl(null)');
 const guard=focus.indexOf('if(!auth.token||DEMO_MODE)return');
 const request=focus.indexOf("request<{profilePicUrl?:string|null}>('/api/profile/me'");
 assert.ok(clear>=0&&guard>clear&&request>guard);
 assert.match(focus,/return\(\)=>\{active=false;\}/);
 assert.match(focus,/\},\[auth\.token\]\)\)/);
});
