const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
test('Jogar reaches venues, Comunidades has its own tab and teams stay in the profile',()=>{
 const tabs=read('app/(tabs)/_layout.tsx');
 const play=read('app/(tabs)/explore.tsx');
 assert.ok(play.includes("router.push('/venues' as never)"));
 assert.ok(play.includes("router.push('/search' as never)"));
 assert.match(tabs,/name="groups"/);
 assert.ok(read('app/(tabs)/profile.tsx').includes("router.push('/teams')"));
 for(const route of ['app/communities/index.tsx','app/tournaments/index.tsx','app/venues.tsx','app/teams/index.tsx','app/people.tsx','app/live/index.tsx'])
  assert.ok(fs.existsSync(path.join(__dirname,'..',route)),route);
});

test('tab bar shows icons only, but every tab keeps a spoken name',()=>{
 const tabs=read('app/(tabs)/_layout.tsx');
 assert.match(tabs,/tabBarShowLabel:false/);
 for(const t of ['Início','Jogar','Comunidades'])assert.ok(tabs.includes("tabBarAccessibilityLabel:'"+t+"'"),t);
 assert.match(tabs,/tabBarAccessibilityLabel:badge\?'Mensagens, '\+badge\+' por ler':'Mensagens'/);
 assert.match(tabs,/accessibilityLabel="Abrir menu de criação"/);
});
