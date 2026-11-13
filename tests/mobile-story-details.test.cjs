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
