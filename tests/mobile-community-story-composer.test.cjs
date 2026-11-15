'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8');
test('Mobile offers a personal destination and public communities the user manages',()=>{
 assert.match(source,/storyPublishCommunityId,setStoryPublishCommunityId/);
 assert.match(source,/group\.visibility==='PUBLIC'/);
 assert.match(source,/group\.myRole==='OWNER'\|\|group\.myRole==='ADMIN'/);
 assert.match(source,/Publicar Story no meu perfil/);
 assert.match(source,/Publicar Story na comunidade /);
});
test('Publishing a Story sends the explicitly selected destination to the server',()=>{
 assert.match(source,/const selectedCommunityId=storyPublishCommunityId/);
 assert.match(source,/!storyManagedCommunities\.some\(group=>group\.id===selectedCommunityId\)/);
 assert.match(source,/publishStory\(body,media,actor,username,selectedCommunityId,geometry,details\)/);
 assert.match(api,/communityId\?\{communityId:String\(communityId\)\}/);
});
test('Story composer resets the community on a new or discarded draft',()=>{
 assert.match(source,/setStoryPublishCommunityId\(null\)/);
 assert.match(source,/storyPublishCommunityId===selectedCommunityId&&/);
});
