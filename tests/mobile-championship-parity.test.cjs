'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('championship API uses the authenticated backend contract',()=>{
 const api=read('src/lib/championship-api.ts');
 for(const item of ['/api/communities/','/championships','/standings','{token}','Number.isSafeInteger'])
  assert.ok(api.includes(item),item);
});
test('community competitions include native championship navigation and retry',()=>{
 const screen=read('app/communities/[id]/competitions.tsx');
 for(const item of ['communityChampionships','championshipError','Campeonatos','championships/[championshipId]','Tentar carregar campeonatos novamente'])
  assert.ok(screen.includes(item),item);
});
test('championship detail shows competitions and general standings without website redirect',()=>{
 const screen=read('app/communities/[id]/championships/[championshipId].tsx');
 for(const item of ['championshipStandings','fullyScoredCompetitions','winnerOnlyCompetitions','pendingCompetitions','Ver torneio','Classificação geral','useFocusEffect'])
  assert.ok(screen.includes(item),item);
 assert.ok(!screen.includes('Linking.openURL'));
});

test('championships and tournaments have independent failure handling',()=>{
 const screen=read('app/communities/[id]/competitions.tsx');
 assert.match(screen,/Promise\.allSettled\(\[tournamentsForCommunity\(/);
 assert.match(screen,/if\(data\.status==='fulfilled'\)setTournaments\(data\.value\);\s*else setError\(/);
 assert.match(screen,/if\(championshipData\.status==='fulfilled'\)setChampionships\(championshipData\.value\);\s*else setChampionshipError\(/);
 assert.doesNotMatch(screen,/else throw data\.reason/);
});

test('championship creation is native, organizer gated and posts the validated backend payload',()=>{
 const api=read('src/lib/championship-api.ts');
 const create=read('app/communities/[id]/championships/create.tsx');
 const listing=read('app/communities/[id]/competitions.tsx');
 for(const item of ['createCommunityChampionship','method:\'POST\'','name,sport,seasonLabel'])assert.ok(api.includes(item),item);
 for(const item of ['communityDetails','organizer','role===\'OWNER\'||role===\'ADMIN\'','createCommunityChampionship','sports.map','router.replace'])assert.ok(create.includes(item),item);
 assert.ok(listing.includes('championships/create'));
 assert.ok(!create.includes('Linking.openURL'));
});

test('championship detail manages existing tournaments and winner points with server APIs',()=>{
 const api=read('src/lib/championship-api.ts');
 const screen=read('app/communities/[id]/championships/[championshipId].tsx');
 for(const item of ['addChampionshipCompetition','setChampionshipWinnerPoints','/winner-points','method:\'PUT\'','method:\'POST\''])
  assert.ok(api.includes(item),item);
 for(const item of ['tournamentsForCommunity','t.sport===selected.sport','organizer','Associar torneios existentes','Adicionar ao campeonato','Guardar pontuação','setChampionshipWinnerPoints','addChampionshipCompetition'])
  assert.ok(screen.includes(item),item);
 assert.ok(!screen.includes('Linking.openURL'));
});
