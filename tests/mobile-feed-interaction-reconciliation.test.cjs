'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {rememberPostLike,reconcilePostLikes,RECEIPT_TTL_MS}=require('../src/lib/feed-interaction-reconciliation.cjs');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const post=(id,liked=false,count=0)=>({type:'POST',postId:id,likedByMe:liked,likeCount:count,content:'olá'});

test('old feed response cannot undo a confirmed post like',()=>{
 const receipts=rememberPostLike(new Map(),42,{likedByMe:true,likeCount:5},1000);
 const result=reconcilePostLikes(receipts,[post(42,false,4),post(43,false,7)],2000);
 assert.deepEqual(result.posts[0],post(42,true,5));
 assert.deepEqual(result.posts[1],post(43,false,7));
 assert.equal(result.receipts.size,1);
});

test('old feed response cannot undo unlike or its zero count',()=>{
 const receipts=rememberPostLike(new Map(),42,{likedByMe:false,likeCount:0},1000);
 const result=reconcilePostLikes(receipts,[post(42,true,1)],1100);
 assert.deepEqual(result.posts,[post(42,false,0)]);
});

test('backend convergence retires the verified receipt',()=>{
 const first=reconcilePostLikes(rememberPostLike(new Map(),42,{likedByMe:true,likeCount:5},1000),[post(42,false,4)],1500);
 const second=reconcilePostLikes(first.receipts,[post(42,true,5)],2000);
 assert.equal(second.receipts.size,0);
 assert.deepEqual(second.posts,[post(42,true,5)]);
});

test('new interactions from other users do not freeze a converged like count',()=>{
 const receipts=rememberPostLike(new Map(),42,{likedByMe:true,likeCount:5},1000);
 const result=reconcilePostLikes(receipts,[post(42,true,9)],2000);
 assert.equal(result.receipts.size,0);
 assert.deepEqual(result.posts,[post(42,true,9)]);
});

test('expired receipts are not persisted forever',()=>{
 const receipts=rememberPostLike(new Map(),42,{likedByMe:true,likeCount:5},1000);
 const result=reconcilePostLikes(receipts,[post(42,false,4)],1000+RECEIPT_TTL_MS+1);
 assert.equal(result.receipts.size,0);
 assert.deepEqual(result.posts,[post(42,false,4)]);
});

test('newer verified receipt wins and malformed receipts cannot replace it',()=>{
 const before=rememberPostLike(new Map(),42,{likedByMe:true,likeCount:4},1000);
 const updated=rememberPostLike(before,42,{likedByMe:false,likeCount:3},2000);
 assert.deepEqual(reconcilePostLikes(updated,[post(42,true,4)],2100).posts,[post(42,false,3)]);
 assert.deepEqual([...rememberPostLike(updated,42,{likedByMe:'yes',likeCount:-1},2200)],[...updated]);
});

test('account change drops old confirmations and the feed integrates reconciliation',()=>{
 assert.match(feed,/verifiedPostLikes\.current\.clear\(\)/);
 assert.match(feed,/const likes=reconcilePostLikes\(verifiedPostLikes\.current,merged\)/);
 assert.match(feed,/verifiedPostLikes\.current=likes\.receipts/);
 assert.match(feed,/verifiedPostLikes\.current=rememberPostLike\(verifiedPostLikes\.current,postId,receipt\)/);
 assert.match(feed,/verifiedPostLikes\.current\.delete\(id\)/);
 assert.match(feed,/setPosts\(likes\.posts\)/);
});
