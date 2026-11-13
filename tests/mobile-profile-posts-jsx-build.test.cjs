'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('profile grid media fallback closes JSX ternary before album counter',()=>{
 const src=read('src/components/ProfilePosts.tsx');
 assert.match(src,/<View style=\{styles\.placeholder\}><Text style=\{styles\.content\} numberOfLines=\{5\}>\{item\.content\}<\/Text><\/View>\}/);
 assert.match(src,/\{album\.length>1\?<View style=\{styles\.albumMark\}>/);
 assert.match(src,/\}\)\(\)\}/);
});
test('profile gallery opens actual post detail, not a raw route or ID',()=>{
 const src=read('src/components/ProfilePosts.tsx');
 assert.match(src,/pathname:'\/posts\/\[postId\]'/);
 assert.match(src,/resolveJynloMedia\(first\.url\)/);
});
