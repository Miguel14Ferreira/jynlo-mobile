'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const api=read('src/lib/championship-owned-events-api.ts');
const list=read('app/communities/[id]/championships/events.tsx');
const fixture=read('app/communities/[id]/championships/fixture.tsx');
const detail=read('app/communities/[id]/championships/[championshipId].tsx');

test('championship detail opens actual mobile-owned league and cup route',()=>{
 assert.match(detail,/pathname:'\/communities\/\[id\]\/championships\/events'/);
 assert.match(list,/pathname:'\/communities\/\[id\]\/championships\/fixture'/);
 assert.match(list,/eventId:String\(activeEvent\.id\),fixtureId:String\(fixture\.id\)/);
});
test('all league and cup actions map to backend-controlled scoped endpoints',()=>{
 for(const suffix of [
  "/owned-events","+'/teams'","+'/fixtures'","+'/schedule'","+'/cup-draw'","+'/cup-advance'","+'/score'",
  "/finalize-league","+'/standings'"
 ])assert.ok(api.includes(suffix),suffix);
 for(const action of [
  'listOwnedEvents','createOwnedEvent','deleteOwnedEvent',
  'listOwnedEventTeams','registerOwnedEventTeam','removeOwnedEventTeam',
  'listOwnedFixtures','scheduleOwnedLeague','drawOwnedCup','advanceOwnedCup','recordOwnedFixtureScore',
  'finishOwnedLeague','getOwnedLeagueStandings'
 ])assert.match(api,new RegExp('export async function '+action+'\\('),action);
 assert.match(api,/Number\.isSafeInteger\(id\)\|\|id<=0/);
 assert.match(api,/if\(DEMO_MODE\|\|!token\)/);
});
test('managers cannot edit completed competitions, inactive leagues or unsupported sports',()=>{
 assert.match(list,/const canManage=organizer&&!closed&&Boolean\(auth\.token\)/);
 assert.match(list,/const football=sport==='Futebol'\|\|sport==='Futsal'/);
 assert.match(list,/const canSchedule=canManage&&football&&activeEvent\?\.status==='DRAFT'/);
 assert.match(list,/const canScore=canManage&&football&&activeEvent\?\.status==='SCHEDULED'/);
 assert.match(fixture,/event\.format==='LEAGUE'&&event\.status==='SCHEDULED'&&match\.homeScore!=null&&match\.awayScore!=null/);
});
test('fixture controls use confirmed team rosters and server validated events',()=>{
 assert.match(fixture,/championshipTeamPlayers\(cid,chid,match\.homeTeamId,token\)/);
 assert.match(fixture,/championshipTeamPlayers\(cid,chid,match\.awayTeamId,token\)/);
 assert.match(fixture,/selectedRoster=roster\.filter\(p=>p\.teamId===selectedTeam\)/);
 for(const action of ['addOwnedFixtureGoal','addOwnedFixtureCard','setOwnedFixtureLineup','addOwnedFixtureSubstitution']){
  assert.ok(fixture.includes(action+'('),action);
  assert.ok(api.includes('export async function '+action+'('),action);
 }
 assert.match(api,/minute<0\|\|minute>200/);
 assert.match(api,/outProfileId===inProfileId/);
 assert.match(api,/cardType!=='YELLOW'&&cardType!=='RED'/);
});
test('scores, cup progression, league closure, and deletion require confirmation and a synchronous write lock',()=>{
 assert.match(list,/const generation=useRef\(0\),pending=useRef\(false\)/);
 assert.match(list,/if\(pending\.current\|\|!canManage\|\|loading\)return/);
 assert.match(list,/pending\.current=true/);
 assert.match(list,/finally\{\s*pending\.current=false/);
 assert.match(list,/confirm\('Finalizar liga\?'/);
 assert.match(list,/confirm\('Avançar Taça\?'/);
 assert.match(list,/confirm\('Eliminar esta prova\?'/);
 assert.match(fixture,/if\(!canWrite\|\|pending\.current\|\|!fixture\)return/);
 assert.match(fixture,/Alert\.alert\('Confirmar '/);
});
test('league classification uses the actual backend DTO and retains tied-place warning',()=>{
 assert.match(api,/firstPlaceTied:boolean/);
 assert.match(api,/wins:number;draws:number/);
 assert.match(api,/goalsFor:number;goalsAgainst:number;goalDifference:number/);
 assert.match(list,/standings\.firstPlaceTied/);
 assert.match(list,/row\.goalsFor/);
 assert.match(list,/row\.goalDifference/);
});

test('organizers can correct previously recorded goals, cards, lineups and substitutions',()=>{
 for(const method of [
  'removeOwnedFixtureGoal','removeOwnedFixtureCard','removeOwnedFixtureLineup','removeOwnedFixtureSubstitution'
 ]){
  assert.match(api,new RegExp('export async function '+method+'\\('));
  assert.ok(fixture.includes(method+'('),method+' must be accessible from fixture actions');
 }
 assert.match(fixture,/Alert\.alert\('Remover acontecimento\?'/);
 assert.match(fixture,/style:'destructive'/);
 assert.match(api,/method:'DELETE'/);
});
test('team registrations and draft competition deletion are restricted to organizers',()=>{
 assert.match(list,/canManage&&activeEvent\.status==='DRAFT'/);
 assert.match(list,/removeOwnedEventTeam\(cid,chid,activeEvent\.id,team\.id,auth\.token!\)/);
 assert.match(list,/deleteOwnedEvent\(cid,chid,activeEvent\.id,auth\.token!\)/);
 assert.match(list,/confirm\('Eliminar esta prova\?'/);
});

test('event details reload only for selected competition or confirmed mutation',()=>{
 assert.match(list,/const \[detailsRefresh,setDetailsRefresh\]=useState\(0\)/);
 assert.match(list,/setDetailsRefresh\(value=>value\+1\)/);
 assert.match(list,/\[cid,chid,eventId,auth\.token,activeEvent\?\.format,detailsRefresh\]/);
 assert.doesNotMatch(list,/\[cid,chid,eventId,auth\.token,loading,events\]/);
});

test('fixtures are grouped by collapsible rounds rather than rendering an endless flat list',()=>{
 assert.match(list,/const groupedFixtures=Array\.from\(new Set\(fixtures\.map\(f=>f\.round\)\)\)/);
 assert.match(list,/accessibilityState=\{\{expanded:expandedRounds\.includes\(group\.round\)\}\}/);
 assert.match(list,/setExpandedRounds\(current=>current\.includes\(group\.round\)/);
 assert.match(list,/Expandir todas as jornadas/);
 assert.match(list,/Recolher todas as jornadas/);
});
