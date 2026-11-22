const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verifiedCommentReceipt}=require('../src/lib/social-comment-receipt.cjs');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8'));

const original={id:21,postId:10,authorUsername:'Miguel',content:'Foi um bom jogo!',likedByMe:false,likeCount:2};
test('creation receipts require the real post author and submitted content',()=>{
 assert.deepEqual(verifiedCommentReceipt(original,{postId:10,username:'miguel',content:'Foi um bom jogo!'}),original);
 assert.equal(verifiedCommentReceipt({...original,postId:11},{postId:10,username:'miguel',content:original.content}),null);
 assert.equal(verifiedCommentReceipt({...original,authorUsername:'Outro'},{postId:10,username:'miguel'}),null);
 assert.equal(verifiedCommentReceipt({...original,content:'outro'},{postId:10,content:original.content}),null);
});
test('editing requires same comment ID as well as author, text and post',()=>{
 assert.deepEqual(verifiedCommentReceipt(original,{postId:10,commentId:21,username:'Miguel',content:original.content}),original);
 assert.equal(verifiedCommentReceipt(original,{postId:10,commentId:22}),null);
 assert.equal(verifiedCommentReceipt({...original,id:0},{postId:10}),null);
});
test('likes must return the intended state and a nonnegative integer count',()=>{
 const liked={...original,likedByMe:true,likeCount:3};
 assert.deepEqual(verifiedCommentReceipt(liked,{postId:10,commentId:21,likedByMe:true}),liked);
 for(const other of [{...liked,likedByMe:false},{...liked,likeCount:-1},
  {...liked,likeCount:2.5},{...liked,likeCount:'3'},{...liked,postId:11}]){
  assert.equal(verifiedCommentReceipt(other,{postId:10,commentId:21,likedByMe:true}),null);
 }
});
test('mobile API uses verified receipts for all three comment mutations',()=>{
 const occurrences=source.match(/verifiedCommentReceipt\(result,/g)||[];
 assert.equal(occurrences.length,3);
 assert.match(source,/verifiedCommentReceipt\(result,\{postId,username,content:message\}\)/);
 assert.match(source,/verifiedCommentReceipt\(result,\{postId,commentId,username,content:message\}\)/);
 assert.match(source,/verifiedCommentReceipt\(result,\{postId,commentId:comment\.id,likedByMe:!Boolean\(comment\.likedByMe\)\}\)/);
});
