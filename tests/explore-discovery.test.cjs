const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Explorar usa catalogo completo em vez de chips exclusivos de tres desportos',()=>{
 const file=read('app/(tabs)/explore.tsx'),catalog=read('src/lib/sports.ts');
 assert.match(file,/import \{SPORTS\} from/);
 assert.match(file,/const all=\[\.\.\.SPORTS,\.\.\.discoveredCustomSports\]/);
 assert.match(file,/all\.filter\(/);
 assert.match(file,/setDiscoveredCustomSports\(/);
 assert.match(file,/canSearchCustomSport/);
 assert.match(file,/chooseSport\(typedCustomSport\)/);
 assert.match(file,/SPORTS\.length/);
 assert.match(file,/sportSuggestions\.map\(/);
 for(const sport of ["'Badminton'","'Padel'","'Cricket'","'Karting'","'Jiu-Jitsu'","'Teqball'"])assert.ok(catalog.includes(sport),sport);
 assert.doesNotMatch(file,/const CHIPS=\['Todas','Futebol','Voleibol','Karting'\]/);
});
test('Pesquisa de cidade usa debounce e ignora resultados atrasados',()=>{
 const file=read('app/(tabs)/explore.tsx');
 assert.match(file,/setTimeout\(\(\)=>setDebouncedCity\(city\.trim\(\)\),350\)/);
 assert.match(file,/version===loadVersion\.current/);
});
test('Explorar mostra Comunidades aos visitantes e preserva login na criação de sessão',()=>{
 const file=read('app/(tabs)/explore.tsx');
 // Explore is now only "find games"; creating lives in the central Criar tab
 // (which sends guests to login), and Communities open from Home "Próximos jogos".
 const tabs=read('app/(tabs)/_layout.tsx');
 assert.doesNotMatch(file,/🏆 Torneios/);
 assert.match(tabs,/if\(!auth\.token\|\|!auth\.username\)\{\s*router\.push\(\{pathname:'\/login',params:\{redirect:'\/'\}\}\);/);
 assert.match(tabs,/if\(destination==='session'\)router\.push\('\/sessions\/create'\)/);
 assert.ok(read('src/features/home-up-next.tsx').includes("router.push('/(tabs)/communities')"));
 assert.equal(require('../src/lib/routes.cjs').safeRedirect('/sessions/create'),'/sessions/create');
});
