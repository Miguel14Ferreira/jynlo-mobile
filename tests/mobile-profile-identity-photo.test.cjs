const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/profile.tsx'),'utf8'));

test('profile details and avatar are cleared immediately on account change or refocus',()=>{
 const focus=code.slice(code.indexOf('useFocusEffect(useCallback('),code.indexOf('const favoriteSports='));
 const clear=focus.indexOf('setProfile(null)');
 const guard=focus.indexOf('if(!auth.token||DEMO_MODE)');
 const request=focus.indexOf("request<ProfilePresentation>('/api/profile/me/mobile'");
 assert.ok(clear>=0&&guard>clear&&request>guard);
 assert.match(focus,/if\(active\)setProfile\(result\)/);
 assert.match(focus,/return\(\)=>\{active=false;\}/);
 assert.match(focus,/\},\[auth.token,auth.username\]\)\)/);
});
