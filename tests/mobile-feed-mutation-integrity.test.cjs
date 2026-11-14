'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const {removedFeedKey,reconcileRemovedFeedKeys}=require('../src/lib/confirmed-feed-removals.cjs');

test('the feed ignores deleted posts even if an older GET finishes later',()=>{
 const removed=new Set([removedFeedKey({type:'POST',postId:10})]);
 const response=reconcileRemovedFeedKeys(removed,[{type:'POST',postId:10},{type:'POST',postId:11}]);
 assert.deepEqual(response.visible.map(x=>x.postId),[11]);
 assert.deepEqual([...response.removed],['post:10']);
 assert.match(source,/confirmedRemovedFeedKeys\.current=reconciled\.removed/);
 assert.match(source,/setPosts\(\[\.\.\.recentlyConfirmedPosts\.current\.map\(entry=>entry\.item\),\.\.\.visibleReceived\]\)/);
});

test('attendance deletion does not remove another player's entry for same session',()=>{
 const mine={type:'SESSION_ATTENDED',sessionId:87,authorUsername:'Miguel'};
 const other={type:'SESSION_ATTENDED',sessionId:87,authorUsername:'Rita'};
 assert.deepEqual(reconcileRemovedFeedKeys(new Set([removedFeedKey(mine)]),[mine,other]).visible,[other]);
 assert.match(source,/const key=removedFeedKey\(item\)/);
 assert.match(source,/confirmedRemovedFeedKeys\.current\.clear\(\)/);
});

test('comment form admits one in-flight submission and checks its server receipt',()=>{
 const start=source.indexOf('async function submitComment(postId:number)');
 const end=source.indexOf('async function sharePost',start);
 assert.ok(start>0&&end>start);
 const submit=source.slice(start,end);
 assert.match(submit,/commentWriteLock\.current\|\|!commentText\.trim\(\)/);
 assert.match(submit,/commentWriteLock\.current=true;setBusyPost\(postId\)/);
 assert.match(submit,/const created=await addPostComment\(postId,body,auth\.token,auth\.username\)/);
 assert.match(submit,/created\.postId!==postId/);
 assert.match(submit,/created\.content\?\.trim\(\)!==body/);
 assert.match(submit,/account===feedIdentity\.current&&requestId===commentsRequest\.current/);
 assert.match(submit,/commentWriteLock\.current=false/);
 assert.match(submit,/setComments\(prev=>prev\.some\(item=>item\.id===created\.id\)\?prev:\[\.\.\.prev,created\]\)/);
});
