'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {rememberPostEdit,reconcilePostEdits,RECEIPT_TTL_MS}=require('../src/lib/feed-interaction-reconciliation.cjs');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8');
const post=(content,location=null)=>({type:'POST',postId:20,content,location,likeCount:1,commentCount:4});

test('pre-edit GET cannot overwrite a confirmed text and location change',()=>{
 const edits=rememberPostEdit(new Map(),post('Novo texto','Lisboa'),1000);
 const result=reconcilePostEdits(edits,[post('Texto antigo','Porto')],1500);
 assert.deepEqual(result.posts,[post('Novo texto','Lisboa')]);
 assert.equal(result.edits.size,1);
});

test('edits do not freeze likes, comments or other post fields',()=>{
 const edits=rememberPostEdit(new Map(),post('Novo texto','Lisboa'),1000);
 const server={...post('Texto antigo','Porto'),likeCount:8,commentCount:12};
 const result=reconcilePostEdits(edits,[server],1500);
 assert.deepEqual(result.posts,[{...server,content:'Novo texto',location:'Lisboa'}]);
});

test('backend convergence retires the edit guard and permits later changes',()=>{
 const edits=rememberPostEdit(new Map(),post('Novo texto','Lisboa'),1000);
 const synced=reconcilePostEdits(edits,[post('Novo texto','Lisboa')],1500);
 assert.equal(synced.edits.size,0);
 assert.deepEqual(reconcilePostEdits(synced.edits,[post('Outra edição','Lisboa')],1700).posts,[post('Outra edição','Lisboa')]);
});

test('multiple edits prefer latest receipt, and stale entries expire',()=>{
 const first=rememberPostEdit(new Map(),post('Versão 1'),1000);
 const second=rememberPostEdit(first,post('Versão 2'),1500);
 assert.deepEqual(reconcilePostEdits(second,[post('Original')],1600).posts,[post('Versão 2')]);
 const expired=reconcilePostEdits(second,[post('Original')],1500+RECEIPT_TTL_MS+1);
 assert.equal(expired.edits.size,0);
 assert.deepEqual(expired.posts,[post('Original')]);
});

test('a different account has no leftover edit data',()=>{
 const previous=rememberPostEdit(new Map(),post('Privado'),1000);
 assert.equal(previous.size,1);
 assert.deepEqual(reconcilePostEdits(new Map(),[post('Público')],1100).posts,[post('Público')]);
 assert.match(feed,/confirmedPostEdits\.current\.clear\(\)/);
 assert.match(feed,/confirmedPostEdits\.current\.delete\(id\)/);
});

test('feed integrates edit guard after likes and comment counts',()=>{
 assert.match(feed,/const edits=reconcilePostEdits\(confirmedPostEdits\.current,comments\.posts\)/);
 assert.match(feed,/setPosts\(edits\.posts\)/);
 assert.match(feed,/confirmedPostEdits\.current=rememberPostEdit\(confirmedPostEdits\.current,updated\)/);
 assert.match(feed,/recentlyConfirmedPosts\.current=recentlyConfirmedPosts\.current\.map\(entry=>\(\{/);
 assert.match(feed,/const applyEdit=\(item:FeedItem\)=>item\.postId===updated\.postId\?/);
 assert.match(feed,/\{\.\.\.item,content:updated\.content,location:updated\.location\}:item/);
 assert.match(feed,/setPosts\(current=>current\.map\(applyEdit\)\)/);
 assert.match(api,/updated\?\.postId!==postId\|\|!confirmedTextPostReceipt\(updated,username!,description,place\)/);
});
