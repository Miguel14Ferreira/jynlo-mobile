const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('create sheet starts with core actions, advanced tools require deliberate expansion',()=>{
 const src=read('app/(tabs)/_layout.tsx');
 assert.match(src,/const \[moreOpen,setMoreOpen\]=useState\(false\)/);
 assert.match(src,/accessibilityLabel="Mostrar outras ferramentas de criação"/);
 assert.match(src,/accessibilityState=\{\{expanded:moreOpen\}\}/);
 assert.match(src,/\{moreOpen\?<><Pressable|\{moreOpen\?<>\s*<Pressable/);
 assert.match(src,/setMoreOpen\(false\)/);
 assert.match(src,/action\('session'\)/);assert.match(src,/action\('post'\)/);assert.match(src,/action\('community'\)/);
});
test('unconfigured Android shows geographic pin schematic rather than a long list disguised as a map',()=>{
 const screen=read('app/(tabs)/explore.tsx'),fallback=read('src/components/OfflineSessionMap.tsx');
 assert.match(screen,/NATIVE_MAP_READY\?<Suspense/);
 assert.match(screen,/<OfflineSessionMap sessions=\{mappedSessions\} selectedId=\{selectedPin\} onSelect=\{setSelectedPin\}/);
 assert.match(screen,/\{currentPin\?<View style=\{styles\.pinCard\}>/);
 assert.doesNotMatch(screen,/!NATIVE_MAP_READY\?mappedSessions\.map\(s=><SessionCard/);
 assert.match(fallback,/sessions\.filter\(isMainland\)/);
 assert.match(fallback,/onPress=\{\(\)=>onSelect\(s\.id\)\}/);
 assert.match(fallback,/Sem fundo cartográfico nem ruas/);
});
