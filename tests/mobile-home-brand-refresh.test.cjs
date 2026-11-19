'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const tabs=fs.readFileSync(path.join(__dirname,'../app/(tabs)/_layout.tsx'),'utf8');

test('Jynlo mobile home retains the officially approved logo instead of concept-art icons',()=>{
 assert.match(home,/require\('\.\.\/\.\.\/assets\/jynlo-icon\.png'\)/);
 assert.match(home,/styles\.brandName}>JYNLO/);
 assert.match(home,/jynloDiscoverPanel/);
 assert.match(home,/Encontra as tuas pessoas\./);
});
test('mobile home actions resolve to screens already registered in Expo Router',()=>{
 for(const name of ["Explorar","Equipas","Torneios","Diretos","Publicar","Comunidades"])
  assert.match(home,new RegExp("label:'"+name+"'"));
 assert.match(home,/router\.push\('\/\(tabs\)\/explore'\)/);
 assert.match(home,/router\.push\('\/\(tabs\)\/tournaments'\)/);
 assert.match(home,/router\.push\('\/\(tabs\)\/communities'\)/);
 assert.match(home,/router\.push\('\/teams'\)/);
 assert.match(home,/router\.push\(auth\.token\?'\/live':'\/login'\)/);
 assert.match(tabs,/name="tournaments"/);
 assert.match(tabs,/name="communities"/);
 assert.match(tabs,/name="explore"/);
});
test('new hero routes authenticated users to real session creation and guests to sign in',()=>{
 assert.match(home,/router\.push\(auth\.token\?'\/sessions\/create':'\/login'\)/);
 assert.match(home,/onPress=\{\(\)=>requireLogin\(\)&&openPostComposer\(\)\}/);
 assert.match(home,/accessibilityLabel="Criar uma nova sessão desportiva"/);
});
test('quick actions are accessible without blocking or replacing the existing Stories, feed or post interactions',()=>{
 assert.match(home,/accessibilityLabel="Acessos rápidos Jynlo"/);
 assert.match(home,/accessibilityRole="button"\s*accessibilityLabel=\{item\.label\}/);
 assert.match(home,/visibleStoryGroups\.map\(group/);
 assert.match(home,/ListHeaderComponent=\{Header\(\)\}/);
 assert.match(home,/renderItem=\{\(\{item\}\)=><View style=\{styles\.feedCardWrap\}>/);
 assert.match(home,/style=\{styles\.postActions\}/);
 assert.match(home,/minHeight:48,backgroundColor:TEAL/);
});
