'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {confirmedTextPostReceipt:confirmed}=require('../src/lib/social-text-post-receipt.cjs');
const valid={type:'POST',postId:42,authorUsername:'joao',content:'Vamos jogar',location:'Benfica',createdAt:'2026-11-13T13:00:00Z'};
test('text post must carry exact persisted identity, author and content',()=>{
 assert.equal(confirmed(valid,'Joao',' Vamos jogar ',' Benfica '),true);
 for(const update of [{postId:null},{postId:0},{type:'ACTIVITY'},{authorUsername:'someone_else'},
                       {content:'Outra coisa'},{location:'Outra cidade'},{createdAt:'bad'}]){
  assert.equal(confirmed({...valid,...update},'joao','Vamos jogar','Benfica'),false,JSON.stringify(update));
 }
 assert.equal(confirmed(null,'joao','Vamos jogar','Benfica'),false);
});
test('optional location is normalized without requiring location on simple posts',()=>{
 assert.equal(confirmed({...valid,location:null},'joao','Vamos jogar',''),true);
 assert.equal(confirmed({...valid,location:''},'joao','Vamos jogar',''),true);
 assert.equal(confirmed({...valid,location:null},'joao','Vamos jogar','Benfica'),false);
});
test('mobile checks text-only receipt before reporting successful publication',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8');
 const creation=api.slice(api.indexOf('export async function createTextPost('),api.indexOf('async function sendMedia('));
 assert.match(creation,/confirmedTextPostReceipt\(result,username!,body,location\)/);
 assert.match(creation,/não confirmou a publicação de texto/);
});
