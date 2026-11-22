const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>untranslate(fs.readFileSync(path.join(__dirname,'..','src/lib',name),'utf8'));

test('strict TypeScript can resolve the new social CommonJS modules',()=>{
 const modules=[
  'feed-interaction-reconciliation',
  'confirmed-feed-removals',
  'social-like-receipt',
  'social-comment-receipt'
 ];
 for(const name of modules){
  assert.ok(fs.existsSync(path.join(__dirname,'..','src/lib',name+'.cjs')));
  assert.ok(fs.existsSync(path.join(__dirname,'..','src/lib',name+'.d.cts')));
 }
});

test('post feed reconciliation types preserve feed entries and receipt expiries',()=>{
 const types=read('feed-interaction-reconciliation.d.cts');
 assert.match(types,/import type \{FeedItem\} from '\.\/types'/);
 assert.match(types,/interface PendingLikeReceipt extends VerifiedLikeReceipt \{until:number;\}/);
 assert.match(types,/receipts:Map<number,PendingLikeReceipt>;posts:FeedItem\[\]/);
});

test('server receipt typing permits unknown responses but returns validated objects',()=>{
 assert.match(read('social-like-receipt.d.cts'),/response:unknown\):VerifiedPostLike\|null/);
 assert.match(read('social-comment-receipt.d.cts'),/result:unknown,expected:ExpectedCommentReceipt/);
 assert.match(read('social-comment-receipt.d.cts'),/SocialComment\|null/);
 assert.match(read('confirmed-feed-removals.d.cts'),/visible:FeedItem\[\]/);
});
