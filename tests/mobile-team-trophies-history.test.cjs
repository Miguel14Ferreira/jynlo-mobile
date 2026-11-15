'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const api=read('src/lib/sports-teams-api.ts'),screen=read('app/teams/[id].tsx');
const promotion=read('app/tournaments/[communityId]/[id]/teams/[teamId].tsx');
test('team trophy tab uses official server history instead of manually entered claims',()=>{
 assert.match(api,/\/api\/teams\/.*\/history/);
 assert.match(screen,/history\.filter\(item=>item\.champion&&/);
 assert.match(screen,/Troféus/);
 assert.match(screen,/Histórico de torneios/);
});
test('completed temporary teams are archived without deleting results',()=>{
 assert.match(promotion,/promotion\?\.archived/);
 assert.match(promotion,/Equipa temporária arquivada/);
 assert.match(promotion,/resultados e o plantel histórico continuam preservados/);
});

test('championship trophies are linked to immutable verified League Cup and season awards',()=>{
 assert.match(api,/export async function sportsTeamChampionshipHonours/);
 assert.match(api,/\/api\/teams\/.*\/honours/);
 assert.match(screen,/championshipHonours\.map\(item=>/);
 assert.match(screen,/item\.format==='LEAGUE'\?'Liga'/);
 assert.match(screen,/item\.format==='KNOCKOUT'\?'Taça'/);
 assert.match(screen,/item\.format==='CHAMPIONSHIP'\?'Campeonato'/);
 assert.match(screen,/seasonTournamentIds/);
 assert.match(screen,/!seasonTournamentIds\.has\(item\.tournamentId\)/);
});

test('team profile has dedicated navigation rather than mixing trophies into the overview',()=>{
 assert.match(screen,/setActiveTab\('TROPHIES'\)/);
 assert.match(screen,/activeTab==='TROPHIES'\?/);
 assert.match(screen,/activeTab==='OVERVIEW'\?/);
 assert.doesNotMatch(screen,/activeTab='(?:TROPHIES|OVERVIEW)'\?/);
});
