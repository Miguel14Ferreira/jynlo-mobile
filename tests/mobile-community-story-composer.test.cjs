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

test('Story targeting and profile suggestions cannot survive an account switch',()=>{
 assert.match(source,/setStoryPublishCommunityId\(null\);setStoryManagedCommunities\(\[\]\);setStorySearchedProfiles\(\[\]\);setStoryFriendSearch\(''\)/);
 assert.match(source,/let active=true;/);
 assert.match(source,/if\(active\)setStorySearchedProfiles\(profiles\)/);
 assert.match(source,/if\(active\)setStoryManagedCommunitiesLoading\(false\)/);
});
test('Mobile searches existing discoverable profiles for Story mentions',()=>{
 const relation=fs.readFileSync(path.join(__dirname,'../src/lib/social-relations-api.ts'),'utf8');
 assert.match(relation,/export async function searchStoryMentionProfiles/);
 assert.match(relation,/\/api\/profile\/name\//);
 assert.match(source,/searchStoryMentionProfiles\(term,auth\.token\)/);
 assert.match(source,/storySearchedProfiles/);
 assert.match(source,/toggleStoryMention\(storyTagsRef\.current,friend\.username\)/);
});
