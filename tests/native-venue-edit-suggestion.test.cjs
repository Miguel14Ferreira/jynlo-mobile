const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('native venue suggestion uses authenticated moderated backend API',()=>{
 const screen=read('app/venues/[id]/suggest-edit.tsx');
 assert.match(screen,/\/api\/venues\/\$\{id\}\/edit-suggestions\/mine/);
 assert.match(screen,/\/api\/venues\/\$\{id\}\/edit-suggestions/);
 assert.match(screen,/method:'POST'/);
 assert.match(screen,/token:auth\.token/);
 assert.match(screen,/status==='PENDING'/);
 assert.match(screen,/disabled=\{busy\|\|hasPending\|\|completed\}/);
 assert.doesNotMatch(screen,/Linking\.openURL|d24sports\.com/);
});
test('only allowlisted fields with server compatible evidence rules',()=>{
 const screen=read('app/venues/[id]/suggest-edit.tsx');
 for(const key of ['name','city','district','address','openingHours','website','contact','coordinates'])
  assert.ok(screen.includes("key:'"+key+"'"));
 assert.match(screen,/requiresSource/);
 assert.match(screen,/sourceValid\(sourceUrl\.trim\(\)\)/);
 assert.match(screen,/reason\.trim\(\)\.length<10/);
 assert.match(screen,/latitude:String\(lat\),longitude:String\(lon\)/);
 assert.match(screen,/Nenhuma alteração|alteração válida/);
});
test('navigation from venue detail to native edit suggestion',()=>{
 const root=read('app/_layout.tsx'),detail=read('app/venues/[id].tsx');
 assert.match(root,/name="venues\/\[id\]\/suggest-edit"/);
 assert.match(detail,/pathname:'\/venues\/\[id\]\/suggest-edit'/);
});
