const untranslate=require('./untranslate.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=untranslate(fs.readFileSync('src/lib/private-profile-media.ts','utf8'));
test('protected mobile downloads are restricted to authenticated Jynlo endpoints',()=>{
 assert.match(source,/API_BASE\+path/);
 assert.match(source,/Authorization:/);
 assert.match(source,/protectedPath\.test\(path\)/);
 // expo/fetch does not accept the web-only cache property. Prevent credential
 // leakage via redirects instead of supplying an unsupported option.
 assert.match(source,/credentials:'omit'/);
 assert.match(source,/redirect:'error'/);
 assert.doesNotMatch(source,/cache:'no-store'/);
});
test('downloaded private media must be deleted after its viewer closes',()=>{
 assert.match(source,/releasePrivateProfileMedia/);
 assert.match(source,/\.delete\(\)/);
 assert.match(source,/60\*1024\*1024/);
});
