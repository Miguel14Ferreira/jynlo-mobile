const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
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

test('placement scoring mirrors backend validation and is only editable for draft competitions',()=>{
 const api=read('src/lib/championship-api.ts');
 const screen=read('app/communities/[id]/championships/[championshipId].tsx');
 for(const item of ['validateChampionshipPlacementPoints','raw.length<2||raw.length>20','value>10000||value>previous','/placement-points','pointsByPlace:validateChampionshipPlacementPoints'])
  assert.ok(api.includes(item),item);
 for(const item of ["item.status==='DRAFT'",'Guardar pontos por posição','setChampionshipPlacementPoints'])
  assert.ok(screen.includes(item),item);
});

test('numeric score validation recognizes digits rather than literal backslash-d',()=>{
 const api=read('src/lib/championship-api.ts');
 const screen=read('app/communities/[id]/championships/[championshipId].tsx');
 assert.ok(api.includes(String.raw`/^\d{1,5}$/`),'placement points must match 1–5 digits');
 assert.ok(screen.includes(String.raw`/^\d+$/`),'winner score must match digits');
 assert.ok(!api.includes(String.raw`/^\\d{1,5}$/`),'do not double-escape digit classes');
 assert.ok(!screen.includes(String.raw`/^\\d+$/`),'do not double-escape digit classes');
});

test('championship finalization is explicit, organizer-only and archives become read-only',()=>{
 const api=read('src/lib/championship-api.ts');
 const screen=read('app/communities/[id]/championships/[championshipId].tsx');
 for(const token of ['closeCommunityChampionship','/close','method:\'POST\'','closedAt:string|null','championDisplayName:string|null'])
  assert.ok(api.includes(token),token);
 for(const token of ['Encerrar definitivamente','style:\'destructive\'','closeCommunityChampionship','!championship.closedAt','Campeonato encerrado','item.status===\'DRAFT\''])
  assert.ok(screen.includes(token),token);
 assert.match(screen,/if\(savingRef\.current\|\|saving\|\|!auth\.token\|\|!organizer\|\|!championship\|\|championship\.closedAt\)return;/,'closed championship must reject local mutation attempts');
 assert.ok(!screen.includes('Linking.openURL'));
});

test('season teams are managed with native championship endpoints and confirmed writes',()=>{
 const api=read('src/lib/championship-api.ts');
 const screen=read('app/communities/[id]/championships/teams.tsx');
 const detail=read('app/communities/[id]/championships/[championshipId].tsx');
 for(const token of ['getChampionshipTeams','createChampionshipTeam','linkChampionshipTeam','/teams','/competition-teams/','championshipTeamId','method:\'PUT\''])
  assert.ok(api.includes(token),token);
 for(const token of ['communityDetails','role===\'OWNER\'||role===\'ADMIN\'','closedAt','Alert.alert','createChampionshipTeam','linkChampionshipTeam','competitionTeams','setSelected'])
  assert.ok(screen.includes(token),token);
 assert.ok(detail.includes('championships/teams'),'championship detail links to native team management');
 assert.ok(!screen.includes('Linking.openURL'),'must not send users back to the website');
});

test('championship honours use official closed season results and preserve team identity boundaries',()=>{
 const api=read('src/lib/championship-api.ts');
 const screen=read('app/communities/[id]/championships/honours.tsx');
 const listing=read('app/communities/[id]/competitions.tsx');
 for(const token of ['championshipHonours','/honours','completedSeasons','individualHonours','championName','championshipId'])
  assert.ok(api.includes(token),token);
 for(const token of ['championshipHonours','useFocusEffect','honours.titles.map','individualHonours.map','entryType','router.push'])
  assert.ok(screen.includes(token),token);
 assert.ok(screen.includes('Equipas de épocas diferentes não são associadas apenas pelo nome.'));
 assert.ok(listing.includes('championships/honours'));
 assert.ok(!screen.includes('Linking.openURL'));
});

test('championship section stays visible if only tournament retrieval fails',()=>{
 const listing=read('app/communities/[id]/competitions.tsx');
 assert.ok(listing.includes('{!loading&&!!role?<View style={styles.section}>'),'championships must not depend on tournament request failure');
 assert.ok(listing.includes("else setChampionshipError("),'championship errors remain independent');
 assert.ok(listing.includes("else setError("),'tournament errors remain independent');
});

test('season team selection blocks duplicate mappings within one tournament only',()=>{
 const screen=read('app/communities/[id]/championships/teams.tsx');
 for(const token of ['conflictingTeamIds','other.tournamentId===entry.tournamentId','other.id!==entry.id','conflictingTeamIds.has(team.id)','conflictingTeamIds.has(picked)','Já utilizada nesta prova'])
  assert.ok(screen.includes(token),token);
});
test('championships remain covered by manual mobile validation without consuming GitHub quota',()=>{
 const workflow=read('codemagic.yaml');
 const github=read('.github/workflows/mobile-push-validation.yml');
 assert.match(workflow,/jynlo-mobile-validacao:/);
 assert.match(workflow,/npm run typecheck/);
 assert.match(workflow,/npm run test:all/);
 assert.match(github,/workflow_dispatch:/);
 assert.doesNotMatch(github,/^  push:/m);
});

test('community championship list labels archived seasons and official champion',()=>{
 const listing=read('app/communities/[id]/competitions.tsx');
 assert.ok(listing.includes("championship.closedAt?'Encerrado':'Em curso'"));
 assert.ok(listing.includes('championship.championDisplayName'));
 assert.ok(listing.includes('Campeão:'));
});
