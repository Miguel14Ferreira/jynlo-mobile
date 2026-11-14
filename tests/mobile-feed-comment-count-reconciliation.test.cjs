'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {rememberCommentFloor,reconcileCommentCounts,RECEIPT_TTL_MS}=require('../src/lib/feed-interaction-reconciliation.cjs');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const post=(id,count)=>({type:'POST',postId:id,commentCount:count,likedByMe:false,likeCount:0});

test('a confirmed comment never disappears from the aggregate after a stale GET',()=>{
 const floors=rememberCommentFloor(new Map(),12,4,1000);
 const result=reconcileCommentCounts(floors,[post(12,3),post(13,6)],1500);
 assert.deepEqual(result.posts,[post(12,4),post(13,6)]);
 assert.equal(result.floors.get(12).count,4);
});

test('a new comment from another player can raise the count without being frozen',()=>{
 const floors=rememberCommentFloor(new Map(),12,4,1000);
 const result=reconcileCommentCounts(floors,[post(12,7)],1500);
 assert.deepEqual(result.posts,[post(12,7)]);
 assert.equal(result.floors.size,0);
});

test('two consecutive confirmed comments increase the protected minimum',()=>{
 const first=rememberCommentFloor(new Map(),12,4,1000);
 const second=rememberCommentFloor(first,12,5,1500);
 const result=reconcileCommentCounts(second,[post(12,3)],1700);
 assert.deepEqual(result.posts,[post(12,5)]);
 assert.equal(result.floors.get(12).count,5);
});

test('count reconciliation retires on convergence or expiry',()=>{
 const floors=rememberCommentFloor(new Map(),12,4,1000);
 assert.equal(reconcileCommentCounts(floors,[post(12,4)],1500).floors.size,0);
 const expired=reconcileCommentCounts(floors,[post(12,2)],1000+RECEIPT_TTL_MS+1);
 assert.deepEqual(expired.posts,[post(12,2)]);
 assert.equal(expired.floors.size,0);
});

test('invalid IDs, counts and account transitions cannot leak protected counts',()=>{
 const previous=rememberCommentFloor(new Map(),12,4,1000);
 assert.deepEqual([...rememberCommentFloor(previous,12,-1,2000)],[...previous]);
 assert.deepEqual([...rememberCommentFloor(previous,-1,9,2000)],[...previous]);
 assert.deepEqual(reconcileCommentCounts(new Map(),[post(12,1)],2000).posts,[post(12,1)]);
});

test('feed updates confirmed counters immediately and clears them for another account',()=>{
 assert.match(feed,/confirmedCommentFloors\.current\.clear\(\)/);
 assert.match(feed,/const comments=reconcileCommentCounts\(confirmedCommentFloors\.current,likes\.posts\)/);
 assert.match(feed,/const edits=reconcilePostEdits\(confirmedPostEdits\.current,comments\.posts\)/);
 assert.match(feed,/setPosts\(edits\.posts\)/);
 assert.match(feed,/const previousCount=posts\.find\(item=>item\.type==='POST'&&item\.postId===postId\)\?\.commentCount\?\?0/);
 assert.match(feed,/rememberCommentFloor\(confirmedCommentFloors\.current,postId,floor\)/);
 assert.match(feed,/confirmedCommentFloors\.current\.delete\(id\)/);
});
