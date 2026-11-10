'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {notificationDestination}=require('../src/lib/notification-route.cjs');
const inbox=fs.readFileSync(path.join(__dirname,'../app/notifications.tsx'),'utf8');

test('new follower opens only a validated related public profile',()=>{
 assert.deepEqual(notificationDestination({type:'SOCIAL_NEW_FOLLOWER',relatedUsername:'jogador_1'}),{kind:'social-profile',peer:'jogador_1'});
 assert.equal(notificationDestination({type:'SOCIAL_NEW_FOLLOWER',relatedUsername:'../../admin'}),null);
 assert.equal(notificationDestination({type:'SOCIAL_NEW_FOLLOWER',relatedUsername:null}),null);
});
test('likes and comments never guess a missing postId from text or unrelated session',()=>{
 for(const type of ['SOCIAL_POST_LIKED','SOCIAL_POST_COMMENTED']){
  assert.deepEqual(notificationDestination({type,relatedUsername:'ana',sessionId:55,message:'Gostou de um post'}),{kind:'social-profile',peer:'ana'});
  assert.equal(notificationDestination({type,relatedUsername:null,sessionId:55}),null);
 }
});
test('new social notifications target their exact positive post ID',()=>{
 for(const type of ['SOCIAL_POST_LIKED','SOCIAL_POST_COMMENTED']){
  assert.deepEqual(notificationDestination({type,postId:128,relatedUsername:'ana',sessionId:55}),{kind:'social-post',id:'128'});
  assert.deepEqual(notificationDestination({type,postId:0,relatedUsername:'ana'}),{kind:'social-profile',peer:'ana'});
  assert.deepEqual(notificationDestination({type,postId:'128',relatedUsername:'ana'}),{kind:'social-profile',peer:'ana'});
  assert.equal(notificationDestination({type,postId:-4,relatedUsername:null}),null);
 }
 assert.deepEqual(notificationDestination({type:'SOCIAL_NEW_FOLLOWER',postId:128,relatedUsername:'ana'}),{kind:'social-profile',peer:'ana'});
});
test('preexisting session, community and message destinations remain unchanged',()=>{
 assert.deepEqual(notificationDestination({type:'COMMUNITY_INVITE'}),{kind:'invites'});
 assert.deepEqual(notificationDestination({type:'SESSION_CANCELLED',sessionId:12}),{kind:'session',id:'12'});
 assert.deepEqual(notificationDestination({type:'CHAT_MESSAGE',relatedUsername:'ana'}),{kind:'direct-chat',peer:'ana'});
});
test('inbox resolves push IDs against own notification history and routes social identities',()=>{
 assert.match(inbox,/const target=items\.find\(item=>String\(item\.id\)===notificationId\)/);
 assert.match(inbox,/sameAccount/);
 assert.match(inbox,/case 'social-profile':router\.push\(\{pathname:'\/social\/\[username\]'/);
 assert.match(inbox,/markNotificationRead\(item\.id,auth\.token\)/);
});

test('social post route uses server lookup, safe account-scoped state and explicit sends',()=>{
 const post=fs.readFileSync(path.join(__dirname,'../app/posts/[postId]/index.tsx'),'utf8');
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8');
 assert.match(inbox,/case 'social-post':router\.push/);
 assert.match(api,/\/api\/feed\/posts\/\$\{postId\}/);
 assert.match(post,/socialPostById\(id,auth\.token\)/);
 assert.match(post,/generation\.current/);
 assert.match(post,/post\.authorUsername/);
 assert.match(post,/await addPostComment\(id,original,auth\.token,auth\.username\)/);
});

test('post detail respects authors hidden liker list without disabling heart',()=>{
 const post=fs.readFileSync(path.join(__dirname,'../app/posts/[postId]/index.tsx'),'utf8');
 const types=fs.readFileSync(path.join(__dirname,'../src/lib/types.ts'),'utf8');
 assert.match(types,/hideLikers\?:boolean/);
 assert.match(post,/post\.hideLikers&&post\.authorUsername\.toLowerCase\(\)!==auth\.username\?\.toLowerCase\(\)/);
 assert.match(post,/disabled=\{Boolean\(post\.hideLikers/);
 assert.match(post,/Gostos privados/);
 assert.match(post,/await likePost\(id,post\.likedByMe,auth\.token,auth\.username\)/);
});

test('older post write cannot clear the in-flight lock of a newly opened account',()=>{
 const post=fs.readFileSync(path.join(__dirname,'../app/posts/[postId]/index.tsx'),'utf8');
 const release='finally{if(version===generation.current){writing.current=false;setBusy(false);}}';
 assert.equal(post.split(release).length-1,2,'likes and comments must guard current screen generation');
 const privacy=post.slice(post.indexOf('async function toggleLikerPrivacy()'),post.indexOf('async function comment()'));
 assert.ok(privacy.includes('finally{\\n   if(version===generation.current){writing.current=false;setBusy(false);}\\n  }'));
 assert.ok(!post.includes('finally{writing.current=false;if(version===generation.current)setBusy(false);}'));
 assert.match(post,/return\(\)=>\{generation\.current\+\+;setPost\(null\);setComments\(\[\]\);\}/);
});

test('post owner can change liker visibility only after server confirmation',()=>{
 const post=fs.readFileSync(path.join(__dirname,'../app/posts/[postId]/index.tsx'),'utf8');
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8');
 assert.match(api,/export async function setPostLikerPrivacy/);
 assert.match(api,/\/api\/feed\/posts\/\$\{postId\}\/likers\/privacy/);
 assert.match(api,/method:'PUT',body:\{hidden\}/);
 assert.match(post,/post\.authorUsername\.toLowerCase\(\)!==auth\.username\.toLowerCase\(\)/);
 assert.match(post,/setPostLikerPrivacy\(id,!Boolean\(post\.hideLikers\),auth\.token\)/);
 assert.match(post,/hideLikers:confirmed/);
 assert.match(post,/Ocultar quem gostou/);
 assert.match(post,/Mostrar quem gostou/);
 assert.match(post,/if\(version===generation\.current\)\{writing\.current=false;setBusy\(false\);\}/);
});
