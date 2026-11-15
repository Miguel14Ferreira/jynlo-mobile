'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('profile gallery renders complete images, labels videos and preserves album counts',()=>{
 const s=read('src/components/ProfilePosts.tsx');
 assert.match(s,/postMediaItems\(item\)/);
 assert.match(s,/resizeMode="contain"/);
 assert.doesNotMatch(s,/resizeMode="cover"/);
 assert.match(s,/name="video"[\s\S]*?>Vídeo<\/Text>/);
 assert.match(s,/album.length>1\?<View style=\{styles.albumMark\}>/);
 assert.match(s,/router.push\(\{pathname:'\/posts\/\[postId\]'/);
 assert.match(s,/const visibleItems=sameProfile\?items:\[\]/);
});
test('post detail has device-width album pager, full-screen image and safe route teardown',()=>{
 const s=read('app/posts/[postId]/index.tsx');
 assert.match(s,/useWindowDimensions\(\)/);
 assert.match(s,/Math.max\(220,screenWidth-64\)/);
 assert.match(s,/<ScrollView horizontal pagingEnabled/);
 assert.match(s,/resizeMode="contain"/);
 assert.match(s,/label=\{'Ampliar fotografia '\+\(index\+1\)/);
 assert.match(s,/setExpandedImage\(uri\)/);
 assert.match(s,/visible=\{!!expandedImage&&!!post&&!!auth.token\}/);
 assert.match(s,/onRequestClose=\{\(\)=>setExpandedImage\(null\)\}/);
 assert.match(s,/accessibilityLabel="Fechar fotografia ampliada"/);
 assert.match(s,/return\(\)=>\{generation.current\+\+;setPost\(null\);setComments\(\[\]\);setExpandedImage\(null\);\}/);
});
test('all three entry points use shared server album metadata rather than separate media copies',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const profile=read('src/components/ProfilePosts.tsx');
 const detail=read('app/posts/[postId]/index.tsx');
 for(const code of [feed,profile,detail])assert.match(code,/postMediaItems\(/);
 assert.match(detail,/socialPostById\(id,auth.token\)/);
 assert.match(profile,/profilePosts\(username,token,page\)/);
});

test('feed links server-backed posts to the same full post details used by profiles',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const details=read('app/posts/[postId]/index.tsx');
 assert.match(feed,/accessibilityLabel="Abrir detalhe completo da publicação"/);
 assert.match(feed,/Number.isSafeInteger\(item.postId\)&&item.postId!>0/);
 assert.match(feed,/router.push\(\{pathname:'\/posts\/\[postId\]',params:\{postId:String\(item.postId\)\}\}\)/);
 assert.match(feed,/Ver publicação ›/);
 assert.match(details,/socialPostById\(id,auth.token\)/);
});
