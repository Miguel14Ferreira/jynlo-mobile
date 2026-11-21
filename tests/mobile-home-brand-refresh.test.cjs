'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const home=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const tabs=fs.readFileSync(path.join(__dirname,'../app/(tabs)/_layout.tsx'),'utf8');

// The home became the social feed with "Próximos jogos" (PR #26). The earlier
// hero with quick actions was removed on purpose; these tests guard the current home.
test('Jynlo mobile home retains the officially approved logo instead of concept-art icons',()=>{
 assert.match(home,/require\('\.\.\/\.\.\/assets\/jynlo-icon\.png'\)/);
 assert.match(home,/styles\.brandName}>JYNLO/);
});
test('mobile home actions resolve to screens already registered in Expo Router',()=>{
 assert.match(home,/router\.push\(auth\.token\?'\/live':'\/login'\)/);
 assert.match(home,/router\.push\('\/notifications'\)/);
 assert.match(home,/router\.push\(auth\.token\?'\/\(tabs\)\/profile':'\/login'\)/);
 for(const name of ['explore','communities','profile'])assert.match(tabs,new RegExp('name="'+name+'"'));
});
test('home leads with the next games before Stories and the feed',()=>{
 assert.match(home,/import \{HomeUpNext\} from '\.\.\/\.\.\/src\/features\/home-up-next'/);
 assert.ok(home.indexOf('<HomeUpNext/>')>=0&&home.indexOf('<HomeUpNext/>')<home.indexOf('title="Stories"'));
 assert.match(home,/accessibilityLabel="Criar publicação no Feed" onPress=\{\(\)=>openPostComposer\(\)\}/);
});
test('quick actions are accessible without blocking or replacing the existing Stories, feed or post interactions',()=>{
 assert.match(home,/visibleStoryGroups\.length\?<ScrollView horizontal/);
 assert.match(home,/accessibilityLabel="Criar a minha story" onPress=\{\(\)=>requireLogin\(\)&&openStoryComposer\(\)\}/);
 assert.match(home,/ListHeaderComponent=\{Header\(\)\}/);
 assert.match(home,/renderItem=\{\(\{item\}\)=><View style=\{styles\.feedCardWrap\}>/);
 assert.match(home,/style=\{styles\.postActions\}/);
});
