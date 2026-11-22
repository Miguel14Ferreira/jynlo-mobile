const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sharedPostLink}=require('../src/lib/shared-post-link.cjs');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('post links target a post, while session activity links to its session',()=>{
 assert.equal(sharedPostLink({type:'POST',postId:44,sessionId:null}),'https://d24sports.com/posts/44');
 assert.equal(sharedPostLink({type:'SESSION_ATTENDED',postId:null,sessionId:18}),'https://d24sports.com/sessions/18');
 assert.equal(sharedPostLink({type:'POST',postId:-1}),'https://d24sports.com');
});
test('feed and detail share the canonical post URL, not the Jynlo homepage',()=>{
 const feed=read('app/(tabs)/index.tsx'),detail=read('app/posts/[postId]/index.tsx');
 assert.match(feed,/sharedPostLink\(item\)/);assert.match(detail,/sharedPostLink\(post\)/);
 assert.match(feed,/accessibilityLabel="Partilhar publicação" style=\{styles\.(postAction|postPrimaryAction)\}/);
});
test('comments can be liked and their authors can edit, via verified backend endpoints',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/method:'PUT',body:\{content:message\}/);
 assert.match(api,/\/comments\/\$\{comment\.id\}\/likes/);
 assert.match(api,/method:comment\.likedByMe\?'DELETE':'POST'/);
 for(const file of ['app/(tabs)/index.tsx','app/posts/[postId]/index.tsx']){
  const src=read(file);
  assert.match(src,/togglePostCommentLike/);assert.match(src,/editPostComment/);
  assert.match(src,/accessibilityLabel="Editar o meu comentário"/);
  assert.match(src,/accessibilityLabel=\{c\.likedByMe\?'Retirar gosto do comentário':'Gostar do comentário'\}/);
 }
});
