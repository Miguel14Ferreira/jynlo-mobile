'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const feed=read('app/(tabs)/index.tsx');
const viewer=feed.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0];
const api=read('src/lib/social-feed-api.ts');

test('stories offer server-backed like and unlike with active account context',()=>{
 assert.ok(viewer);
 assert.match(viewer,/await toggleStoryLike\(story\.id,Boolean\(story\.likedByMe\),token,username\)/);
 assert.match(api,/\/api\/stories\/\$\{storyId\}\/likes/);
 assert.match(api,/method:liked\?'DELETE':'POST'/);
 assert.match(viewer,/story\.likeCount\|\|0/);
});

test('story replies go privately to author as notifications not public comments',()=>{
 assert.match(viewer,/await replyToStory\(story\.id,message,token,username\)/);
 assert.match(api,/\/api\/stories\/\$\{storyId\}\/replies/);
 assert.match(api,/body:\{content:message\}/);
 assert.match(viewer,/!ownStory\?<View style=\{styles\.storyReplyRow\}>/);
 assert.match(viewer,/maxLength=\{500\}/);
 assert.match(viewer,/A resposta vai apenas para o autor/);
 assert.doesNotMatch(viewer,/addPostComment\(story/);
});

test('story sharing uses native share sheet without fabricated permanent URL',()=>{
 assert.match(viewer,/await Share\.share\(\{message:/);
 assert.match(viewer,/uri\?\.startsWith\('https:\/\/'\)/);
 assert.doesNotMatch(viewer,/d24sports\.com\/stories\//);
});

test('reply draft belongs to current story and videos pause while composing',()=>{
 assert.match(viewer,/React\.useEffect\(\(\)=>\{setReplyText\(''\);setReplyFocused\(false\);\},\[story\?\.id\]\)/);
 assert.match(viewer,/paused\|\|replyFocused\|\|storyBusy/);
 assert.match(viewer,/if\(!story\|\|story\.video\|\|paused\|\|replyFocused\|\|storyBusy\)return/);
});
