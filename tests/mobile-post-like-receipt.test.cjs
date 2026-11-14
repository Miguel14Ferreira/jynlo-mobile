'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verifiedPostLikeReceipt}=require('../src/lib/social-like-receipt.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('accepts authoritative liked and unliked states including zero likes',()=>{
 assert.deepEqual(verifiedPostLikeReceipt({likedByMe:true,likeCount:15}),{likedByMe:true,likeCount:15});
 assert.deepEqual(verifiedPostLikeReceipt({likedByMe:false,likeCount:0}),{likedByMe:false,likeCount:0});
});
test('rejects empty, malformed, negative or fractional receipts',()=>{
 for(const value of [null,undefined,{},'ok',{likedByMe:'true',likeCount:1},
  {likedByMe:true,likeCount:-1},{likedByMe:false,likeCount:1.5},
  {likedByMe:false,likeCount:Infinity},{likedByMe:false,likeCount:Number.MAX_SAFE_INTEGER+1}]){
  assert.equal(verifiedPostLikeReceipt(value),null);
 }
});
test('post likes use the backend response instead of a stale full-feed refresh',()=>{
 const api=read('src/lib/social-feed-api.ts'),feed=read('app/(tabs)/index.tsx');
 assert.match(api,/const verified=verifiedPostLikeReceipt\(response\)/);
 assert.match(api,/if\(!verified\|\|verified\.likedByMe===liked\)/);
 assert.match(feed,/const receipt=await likePost\(postId,item\.likedByMe,auth\.token,auth\.username\)/);
 assert.match(feed,/const apply=\(post:FeedItem\)=>post\.postId===postId\?\{\.\.\.post,\.\.\.receipt\}:post/);
 assert.match(feed,/setPosts\(current=>current\.map\(apply\)\)/);
 assert.match(feed,/recentlyConfirmedPosts\.current=recentlyConfirmedPosts\.current\.map\(entry=>\(\{\.\.\.entry,item:apply\(entry\.item\)\}\)\)/);
});
test('a single post mutation lock guards like, delete and hide actions',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/const postActionInFlight=useRef\(false\)/);
 assert.match(feed,/postActionInFlight\.current\|\|feedIdentity\.current!==identity/);
 assert.match(feed,/postActionInFlight\.current\|\|item\.type!=='SESSION_ATTENDED'/);
 assert.match(feed,/postActionInFlight\.current=true;setBusyPost\(postId\)/);
 assert.match(feed,/postActionInFlight\.current=false/);
 assert.match(feed,/if\(feedIdentity\.current!==account\)return/);
});
