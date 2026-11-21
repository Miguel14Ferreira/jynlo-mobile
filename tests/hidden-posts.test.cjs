'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('hidden posts use the account endpoints shared with the web',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/'\/api\/feed\/posts\/hidden'/);
 assert.match(api,/\/api\/feed\/posts\/\$\{feedPostId\(postId\)\}\/hide`,\{token,method:'PUT'\}/);
 assert.match(api,/\/api\/feed\/posts\/\$\{feedPostId\(postId\)\}\/hide`,\{token,method:'DELETE'\}/);
});

test('hiding a post in the feed also hides it in the account, and undo restores it',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/if\(item\.type==='POST'&&item\.postId\)\{[\s\S]*hideFeedPost\(item\.postId,auth\.token\)/);
 assert.match(feed,/restoreFeedPost\(Number\(postMatch\[1\]\),auth\.token\)/);
 assert.match(feed,/router\.push\('\/feed-hidden'\)/);
});

test('restoring from the list also clears the copy kept on the phone',()=>{
 const screen=read('app/feed-hidden.tsx');
 assert.match(screen,/restoreFeedPost\(postId,auth\.token\)/);
 assert.match(screen,/writeHiddenFeedEntries\(auth\.username,showEntry\(local,'post:'\+postId\)\)/);
 assert.match(read('app/_layout.tsx'),/name="feed-hidden"/);
});
