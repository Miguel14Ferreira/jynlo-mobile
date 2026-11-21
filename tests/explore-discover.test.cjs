'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('communities and tournaments (no tab of their own) are reachable from Explorar',()=>{
 const tabs=read('app/(tabs)/_layout.tsx');
 const explore=read('app/(tabs)/explore.tsx');
 for(const href of ["'/communities'","'/tournaments'","'/venues'","'/teams'","'/people'","'/live'"])
  assert.ok(explore.includes('href:'+href),href);
 for(const route of ['app/communities/index.tsx','app/tournaments/index.tsx','app/venues.tsx','app/teams/index.tsx','app/people.tsx','app/live/index.tsx'])
  assert.ok(fs.existsSync(path.join(__dirname,'..',route)),route);
 // Real stack screens (not hidden tabs), so a link always lands on them.
 assert.doesNotMatch(tabs,/name="communities"|name="tournaments"/);
 assert.match(read('app/_layout.tsx'),/name="communities\/index"/);
});

test('tab bar shows icons only, but every tab keeps a spoken name',()=>{
 const tabs=read('app/(tabs)/_layout.tsx');
 assert.match(tabs,/tabBarShowLabel:false/);
 for(const t of ['Início','Explorar','Perfil'])assert.ok(tabs.includes("tabBarAccessibilityLabel:'"+t+"'"),t);
 assert.match(tabs,/tabBarAccessibilityLabel:badge\?'Mensagens, '\+badge\+' por ler':'Mensagens'/);
 assert.match(tabs,/accessibilityLabel="Abrir menu de criação"/);
});
