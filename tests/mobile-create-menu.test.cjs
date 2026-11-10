'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const tabs=read('app/(tabs)/_layout.tsx');
const feed=read('app/(tabs)/index.tsx');
test('centre creation button is a real accessible action with closable sheet',()=>{
 assert.match(tabs,/name="create" options=\{\{title:'Criar',tabBarButton:/);
 assert.match(tabs,/accessibilityLabel="Abrir menu de criação"/);
 assert.match(tabs,/<Modal visible=\{open\} transparent animationType="slide" onRequestClose=\{close\}>/);
 assert.match(tabs,/accessibilityLabel="Fechar menu de criação"/);
 for(const screen of ['index','explore','create','messages','profile'])
  assert.ok(tabs.includes('name="'+screen+'"'),screen);
});
test('creation options reuse existing routes and require authentication',()=>{
 assert.match(tabs,/if\(!auth\.token\|\|!auth\.username\)/);
 assert.match(tabs,/router\.push\('\/sessions\/create'\)/);
 assert.match(tabs,/router\.push\('\/communities\/create'\)/);
 assert.match(tabs,/router\.push\('\/venues\/create'\)/);
 assert.match(tabs,/router\.push\('\/tournaments\/create'\)/);
 assert.match(tabs,/params:\{compose:destination\}/);
 assert.match(feed,/useLocalSearchParams<\{compose\?:string\}>\(\)/);
 assert.match(feed,/if\(compose==='post'\)setComposerOpen\(true\)/);
 assert.match(feed,/else setStoryComposer\(true\)/);
 assert.match(feed,/router\.setParams\(\{compose:undefined\}\)/);
 assert.ok(feed.indexOf('useFocusEffect(useCallback(()=>{if(!auth.ready')<feed.indexOf('  // The central + action reuses'), 'initial identity reset precedes opening composer');
});
test('tournament is gated by owned or administrated communities, not membership alone',()=>{
 assert.match(tabs,/myCommunities\(auth\.token,auth\.username\)/);
 assert.match(tabs,/groups\.filter\(c=>c\.myRole==='OWNER'\|\|c\.myRole==='ADMIN'\)/);
 assert.match(tabs,/eligible\.length>0/);
 assert.match(tabs,/checkError\?/);
 assert.match(tabs,/Para criar torneios, precisas de administrar uma comunidade/);
 assert.match(tabs,/Campeonatos exigem uma comunidade e gestão própria/);
});
