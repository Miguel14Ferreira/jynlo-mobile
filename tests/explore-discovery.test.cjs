const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Explorar usa catalogo completo em vez de chips exclusivos de tres desportos',()=>{
 const file=read('app/(tabs)/explore.tsx'),catalog=read('src/lib/sports.ts');
 assert.match(file,/import \{SPORTS\} from/);
 assert.match(file,/SPORTS\.filter\(/);
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
test('Acesso a torneios e criacao de sessao mantem login quando necessario',()=>{
 const file=read('app/(tabs)/explore.tsx');
 assert.match(file,/\/(tabs)\/tournaments/);
 assert.match(file,/redirect:'\/sessions\/create'/);
 assert.equal(require('../src/lib/routes.cjs').safeRedirect('/sessions/create'),'/sessions/create');
});
