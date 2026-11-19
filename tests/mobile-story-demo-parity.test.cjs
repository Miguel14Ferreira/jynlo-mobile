'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const api=read('src/lib/social-feed-api.ts');
const feed=read('app/(tabs)/index.tsx');
const inbox=read('app/stories/replies.tsx');

test('demo story likes are viewer scoped, including list and notification deep links',()=>{
 assert.match(api,/export async function storyFeed\(token:string\|null,username:string\|null=null\)/);
 assert.match(api,/likedByMe:Boolean\(username&&demoStoryLikes\.get\(story\.id\)\?\.has\(username\)\)/);
 assert.match(api,/export async function storyById\(storyId:number,token:string\|null,username:string\|null=null\)/);
 assert.match(api,/likedByMe:Boolean\(username&&demoStoryLikes\.get\(storyId\)\?\.has\(username\)\)/);
 assert.match(feed,/storyFeed\(auth\.token,auth\.username\)/);
 assert.match(feed,/storyById\(Number\(storyId\),originalToken,auth\.username\)/);
});
test('demo replies remain private to Story author and survive Story deletion',()=>{
 assert.match(api,/const demoStoryReplies:Array<PrivateStoryReply&\{recipientUsername:string\}>=\[\]/);
 assert.match(api,/demoStoryReplies\.unshift\(\{id:nextDemoStoryReplyId\+\+,storyId,senderUsername:username!/);
 assert.match(api,/recipientUsername:story\.authorUsername,content:message/);
 assert.match(api,/demoStoryReplies\.filter\(reply=>reply\.recipientUsername\.toLowerCase\(\)===username\.toLowerCase\(\)\)/);
 assert.match(api,/if\(story\.authorUsername\.toLowerCase\(\)===username!\.toLowerCase\(\)\)throw Error/);
 assert.doesNotMatch(api,/demoStoryReplies\.splice/);
 assert.match(inbox,/myStoryReplies\(auth\.token,requestedPage,auth\.username\)/);
});
test('demo stories expire after 24 hours and cannot receive late replies or likes',()=>{
 assert.match(api,/demoStories\.filter\(story=>Date\.parse\(story\.expiresAt\)>Date\.now\(\)\)/);
 assert.match(api,/if\(!story\|\|Date\.parse\(story\.expiresAt\)<=Date\.now\(\)\)throw Error\('Story indisponível\.'\)/);
 assert.match(api,/demoStoryLikes\.delete\(storyId\)/);
});
test('old account Story actions cannot mutate the new account or show stale completion alerts',()=>{
 const viewer=feed.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0];
 assert.match(viewer,/const activeAccount=useRef\(token\)/);
 assert.match(viewer,/activeAccount\.current=token/);
 assert.match(viewer,/if\(current\(\)&&activeStoryIdRef\.current===id\)onUpdated\(updated\)/);
 assert.match(viewer,/activeAccount\.current!==actorToken\|\|activeStoryIdRef\.current!==storyId\)return/);
 assert.match(viewer,/if\(current\(\)&&activeStoryIdRef\.current===storyId\)\{onClose\(\);onDeleted\(\);\}/);
 assert.match(viewer,/A tua resposta ficou guardada em privado/);
});
