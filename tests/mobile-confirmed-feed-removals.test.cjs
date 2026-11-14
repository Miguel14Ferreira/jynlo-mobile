'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {removedFeedKey,reconcileRemovedFeedKeys}=require('../src/lib/confirmed-feed-removals.cjs');
const post=id=>({type:'POST',postId:id,authorUsername:'miguel'});
const attendance=(id,author)=>({type:'SESSION_ATTENDED',sessionId:id,authorUsername:author});

test('a confirmed post deletion cannot be undone by an older in-flight feed response',()=>{
 const oldResponse=[post(10),post(11)];
 const result=reconcileRemovedFeedKeys(new Set(['post:10']),oldResponse);
 assert.deepEqual(result.visible,[post(11)]);
 assert.deepEqual([...result.removed],['post:10']);
});

test('the deletion guard retires as soon as the server confirms removal',()=>{
 const first=reconcileRemovedFeedKeys(new Set(['post:10']),[post(10),post(11)]);
 const second=reconcileRemovedFeedKeys(first.removed,[post(11)]);
 assert.deepEqual(second.visible,[post(11)]);
 assert.equal(second.removed.size,0);
});

test('attendance hides only the exact player, never another participant in the session',()=>{
 const mine=attendance(77,'Miguel'),other=attendance(77,'Rita');
 assert.equal(removedFeedKey(mine),'attendance:77:miguel');
 assert.equal(removedFeedKey(other),'attendance:77:rita');
 const result=reconcileRemovedFeedKeys(new Set([removedFeedKey(mine)]),[mine,other]);
 assert.deepEqual(result.visible,[other]);
 assert.equal(result.removed.has('attendance:77:miguel'),true);
});

test('an account-scoped guard can be cleared without hiding future content',()=>{
 const old=reconcileRemovedFeedKeys(new Set(['post:10']),[post(10)]);
 const onNewAccount=reconcileRemovedFeedKeys(new Set(),[post(10)]);
 assert.deepEqual(old.visible,[]);
 assert.deepEqual(onNewAccount.visible,[post(10)]);
});

test('a failed deletion must not be turned into a tombstone by a feed refresh',()=>{
 const result=reconcileRemovedFeedKeys(new Set(),[post(10)]);
 assert.deepEqual(result.visible,[post(10)]);
});
