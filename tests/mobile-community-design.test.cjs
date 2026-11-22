const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const screen=untranslate(fs.readFileSync(path.join(__dirname,'../app/communities/index.tsx'),'utf8'));
const card=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/CommunityUI.tsx'),'utf8'));

test('community cards display server-backed media and membership without inventing metrics',()=>{
 assert.match(card,/community\.photoUrl\?resolveJynloMedia\(community\.photoUrl\)/);
 assert.match(card,/<Image source=\{\{uri:image\}\}/);
 assert.match(card,/communitySports\(community\)/);
 assert.match(card,/describeCommunitySports\(community\)/);
 assert.match(card,/typeof memberCount==='number'&&Number\.isFinite\(memberCount\)/);
 assert.match(card,/community\.visibility==='PRIVATE'/);
 assert.match(card,/role==='OWNER'/);
 assert.match(card,/accessibilityRole="button"/);
 assert.match(card,/onPress=\{onPress\}/);
});
test('discovery handles stale network requests and debounces typing',()=>{
 assert.match(screen,/requestVersion=useRef\(0\)/);
 assert.match(screen,/setTimeout\(\(\)=>setDebouncedTerm\(term\.trim\(\)\),350\)/);
 assert.match(screen,/searchCommunities\(debouncedTerm,sportFilter\)/);
 assert.match(screen,/if\(request===requestVersion\.current\)setResults\(data\)/);
 assert.match(screen,/if\(request===requestVersion\.current\)setMine\(data\)/);
 assert.match(screen,/requestVersion\.current\+\+/);
});
test('community access rules and navigation stay intact',()=>{
 assert.match(screen,/myCommunities\(auth\.token,auth\.username\)/);
 assert.match(screen,/redirect:'\/communities\/create'/);
 assert.match(screen,/pathname:'\/communities\/\[id\]'/);
 assert.match(screen,/accessibilityLabel="Limpar filtros das comunidades"/);
 assert.match(screen,/setSportFilter\(''\)/);
 assert.match(screen,/setMode\('explore'\)/);
});

test('community discovery keeps readable helper text and accessible category tabs',()=>{
 assert.match(screen,/segmentTab:\{[^\n]*minHeight:44/);
 assert.match(screen,/note:\{color:C\.muted,fontSize:13,lineHeight:20/);
 assert.match(screen,/inboxLabel:\{fontSize:12/);
 assert.match(screen,/accessibilityRole="tab" accessibilityState=\{\{selected:mode===tab\}\}/);
});
