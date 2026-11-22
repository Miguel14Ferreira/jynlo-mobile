const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/explore.tsx'),'utf8'));
test('Explore uses shared mobile tokens and keeps real session navigation',()=>{
 assert.match(source,/import \{C,MobileTheme\} from '\.\.\/\.\.\/src\/lib\/theme'/);
 assert.match(source,/backgroundColor:MobileTheme\.colors\.background/);
 assert.match(source,/discoverSessions\(/);
 assert.match(source,/pathname:'\/sessions\/\[id\]'/);
});
test('Explore focuses on finding games without duplicating primary tabs',()=>{
 // Creation (sessions, venues, communities…) moved to the central Criar tab.
 const tabs=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/_layout.tsx'),'utf8'));
 assert.match(tabs,/else if\(destination==='venue'\)router\.push\('\/venues\/create'\)/);
 assert.doesNotMatch(source,/router\.push\('\/feed'\)/);
 assert.match(source,/accessibilityLabel="Filtrar por cidade"/);
 assert.match(source,/<SessionCard key=\{s\.id\} session=\{s\}/);
});
test('Explore has accessible filters and reset from the empty state',()=>{
 assert.match(source,/accessibilityRole="checkbox" accessibilityState=\{\{checked:availableOnly\}\}/);
 assert.match(source,/accessibilityLabel="Limpar filtros de pesquisa"/);
 assert.match(source,/Ainda não encontrámos jogos/);
 assert.match(source,/Ver todas as modalidades/);
 assert.match(source,/setMapArea\(null\);setDisplay\('list'\)/);
});
