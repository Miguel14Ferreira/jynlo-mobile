'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('src/lib/social-feed-api.ts');
const composer=read('app/(tabs)/index.tsx');

test('authenticated post and Story uploads reject redirects and ambient credentials',()=>{
 const start=source.indexOf('async function sendMedia(');
 const end=source.indexOf('export async function publishPost(',start);
 assert.ok(start>=0&&end>start);
 const upload=source.slice(start,end);
 assert.match(upload,/expoFetch\(\x60\$\{API_BASE\}\$\{path\}\x60/);
 assert.match(upload,/credentials:'omit',redirect:'error'/);
 assert.match(upload,/Authorization:\x60Bearer \$\{token\}\x60/);
 assert.match(upload,/new AbortController\(\)/);
 assert.match(upload,/uploadTimeoutMs=path\.startsWith\('\/api\/feed\/posts'\)\?180000:90000/);
 assert.match(upload,/controller\.abort\(\),uploadTimeoutMs/);
 assert.match(upload,/if\(!confirmedSocialMediaReceipt/);
 assert.match(upload,/for\(const file of temporary\)/);
 assert.doesNotMatch(upload,/cache:'no-store'/);
});

test('Story community destination must be a positive safe integer',()=>{
 const start=source.indexOf('export async function publishStory(');
 const end=source.indexOf('export async function discoverPeople(',start);
 const story=source.slice(start,end);
 assert.match(story,/communityId!=null&&\(!Number\.isSafeInteger\(communityId\)\|\|communityId<=0\)/);
 assert.match(story,/communityId\?\{communityId:String\(communityId\)\}/);
 assert.match(composer,/!storyManagedCommunities\.some\(group=>group\.id===selectedCommunityId\)/);
});

test('publish failures preserve composer drafts and require server receipt',()=>{
 assert.match(composer,/postInFlight\.current=true;setPublishing\(true\);setPostPublishError\(''\)/);
 assert.match(composer,/storyInFlight\.current=true;setStoryPublishing\(true\);setStoryPublishError\(''\)/);
 assert.match(composer,/setPostPublishError\(message\)/);
 assert.match(composer,/setStoryPublishError\(message\)/);
 assert.match(composer,/const created=await publishPost\(body,media,actor,username,place,linkedSessionId\?\?undefined\)/);
 assert.match(composer,/const created=await publishStory\(body,media,actor,username,selectedCommunityId,geometry,details,appearance,showTime,altText,selectedTeamId\)/);
 assert.match(composer,/feedIdentity\.current===\x60\$\{username\}:\$\{actor\}\x60/);
});
