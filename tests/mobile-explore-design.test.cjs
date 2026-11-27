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
 assert.match(source,/<ExploreEmpty sport=\{sport\} city=\{debouncedCity\}/);
 const empty=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/features/explore-empty.tsx'),'utf8');
 assert.match(empty,/Ainda não encontrámos jogos/);
 assert.match(empty,/Ver todas as modalidades/);
 // No games: the next step is to set up the first one (sport kept) and real venues are shown.
 assert.match(empty,/pathname:'\/sessions\/create',params:\{\.\.\.\(sport\?\{sport\}:\{\}\)/);
 assert.match(empty,/searchVenues\(\{sport,city\}\)/);
 assert.match(empty,/pathname:'\/login'/);
 assert.match(source,/setMapArea\(null\);setDisplay\('list'\)/);
});
