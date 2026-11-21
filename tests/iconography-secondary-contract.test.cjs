'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('session cards and details use accessible vector navigation/location icons',()=>{
 const card=read('src/components/UI.tsx');
 const session=read('app/sessions/[id].tsx');
 for(const name of ['location','chevron-right'])assert.ok(card.includes('name="'+name+'"'),name);
 for(const name of ['location','community','chevron-right'])assert.ok(session.includes('name="'+name+'"'),name);
 assert.doesNotMatch(card,/>⌖\s/);
 assert.doesNotMatch(session,/>◎ Abrir comunidade/);
});
test('profile and explore use unified vector icons without Unicode location markers',()=>{
 const profile=read('app/(tabs)/profile.tsx');
 const explore=read('app/(tabs)/explore.tsx');
 assert.match(profile,/name="location"/);
 assert.match(profile,/name="chevron-right"/);
 for(const name of ['location','search'])
   assert.ok(explore.includes('name="'+name+'"'),name);
 assert.doesNotMatch(explore,/⌖|⌕|＋/);
});
