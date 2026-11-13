'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {prepareStoryDetails:parse}=require('../src/lib/story-details.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Story details support any location text and up to five accepted-friend usernames',()=>{
 assert.deepEqual(parse(' Benfica, Lisboa ',' @Joao, @ana_2 '),{locationLabel:'Benfica, Lisboa',taggedUsernames:'joao,ana_2'});
 assert.deepEqual(parse('',''),{locationLabel:'',taggedUsernames:''});
 assert.throws(()=>parse('A'.repeat(161),''),/160/);
 assert.throws(()=>parse('Rua\nCasa',''),/única linha/);
 assert.throws(()=>parse('',Array.from({length:6},(_,i)=>'user'+i).join(',')),/máximo 5/);
 assert.throws(()=>parse('','@Joao,joao'),/repitas/);
 assert.throws(()=>parse('','@'),/nomes de perfil/);
});
test('Story metadata is transmitted as backend multipart fields, not appended to caption',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/locationLabel:safeDetails\.locationLabel/);
 assert.match(api,/taggedUsernames:safeDetails\.taggedUsernames/);
 assert.match(api,/prepareStoryDetails\(details\?\.locationLabel\|\|'',details\?\.taggedUsernames\|\|''\)/);
});
test('Story composer keeps location and tags if edited during upload and shows them after publishing',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/const \[storyLocation,setStoryLocation\]=useState\(''\)/);
 assert.match(home,/\[storyTags,setStoryTags\]=useState\(''\)/);
 assert.match(home,/storyLocationRef\.current===locationDraft/);
 assert.match(home,/storyTagsRef\.current===tagsDraft/);
 assert.match(home,/locationLabel=\{story\.locationLabel\}/);
 assert.match(home,/taggedUsernames=\{story\.taggedUsernames\}/);
});

test('Story receipt confirms stored location and profile tags, even when empty',()=>{
 const {confirmedStoryDetailsReceipt:confirmed}=require('../src/lib/social-text-post-receipt.cjs');
 const expected={locationLabel:'Benfica, Lisboa',taggedUsernames:'ana,joao'};
 assert.equal(confirmed({...expected},expected),true);
 assert.equal(confirmed({locationLabel:'Benfica, Lisboa',taggedUsernames:'ana'},expected),false);
 assert.equal(confirmed({locationLabel:'Outra cidade',taggedUsernames:'ana,joao'},expected),false);
 assert.equal(confirmed({},expected),false);
 assert.equal(confirmed({locationLabel:null,taggedUsernames:null},{locationLabel:'',taggedUsernames:''}),true);
});
test('changing account removes Story locations and mentions together with previous media',()=>{
 const home=read('app/(tabs)/index.tsx');
 const reset=home.slice(home.indexOf('const identityChanged=feedIdentity.current!==identity'),home.indexOf('setLoading(true);setError('));
 assert.match(reset,/setStoryLocation\(''\);setStoryTags\(''\);storyLocationRef\.current='';storyTagsRef\.current=''/);
 assert.match(reset,/setStoryTextGeometry\(\{x:50,y:78,rotation:0,zoom:1\}\)/);
});
test('real Story multipart receipt confirms metadata before reporting success',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/confirmedStoryDetailsReceipt\(confirmed,safeDetails\)/);
});

test('published Story mentions open their corresponding profile',()=>{
 const view=read('src/components/StoryDetailsView.tsx'),home=read('app/(tabs)/index.tsx');
 assert.match(view,/onOpenProfile\?:\(username:string\)=>void/);
 assert.match(view,/onPress=\{\(\)=>onOpenProfile\(username\)\}/);
 assert.match(home,/onOpenProfile=\{profile=>/);
 assert.match(home,/pathname:'\/social\/\[username\]'/);
 assert.ok(home.indexOf('<StoryDetailsView locationLabel={story.locationLabel}')>home.indexOf('<View style={styles.storyTapZones}'));
});
test('friend list is authenticated and only unblocked friends offered',()=>{
 const home=read('app/(tabs)/index.tsx'),api=read('src/lib/social-relations-api.ts');
 assert.match(api,/request<StoryFriend\[]>\('\/api\/friends\/me',\{token\}\)/);
 assert.match(api,/!person\.chatBlocked&&!person\.blockedByMe/);
 assert.match(home,/storyMentionFriends\(auth\.token\)/);
 assert.match(home,/toggleStoryMention\(storyTagsRef\.current,friend\.username\)/);
});
