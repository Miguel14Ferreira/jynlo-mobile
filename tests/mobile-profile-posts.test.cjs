'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('authenticated profile only loads author posts in pages',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const component=read('src/components/ProfilePosts.tsx');
 assert.match(api,/\/api\/feed\/users\/.*encodeURIComponent\(username\).*\/posts\?page=/);
 assert.match(component,/await profilePosts\(username,token,page\)/);
 assert.match(component,/setHasMore\(records\.length===20\)/);
 assert.match(component,/accessibilityLabel=\{'Ver publicação de '\+item\.authorUsername\}/);
});
test('own and other athlete profiles include persistent post history',()=>{
 assert.match(read('app/(tabs)/profile.tsx'),/<ProfilePosts username=\{auth\.username\} token=\{auth\.token\}/);
 assert.match(read('app/social/[username]/index.tsx'),/<ProfilePosts username=\{name\} token=\{auth\.token\}/);
});
