'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validPage,teamMatchStage,splitTeamMatches,matchScore,matchRound,isTeamInMatch,canListMatches}=require('../src/lib/tournament-fixtures-core.cjs');
const fixtures=[
 {id:1,roundNumber:1,homeTeamId:10,homeTeamName:'A',awayTeamId:11,awayTeamName:'B',status:'COMPLETED',homeScore:2,awayScore:1,groupNumber:1},
 {id:2,roundNumber:1,homeTeamId:12,homeTeamName:'C',awayTeamId:13,awayTeamName:'D',status:'COMPLETED',homeScore:3,awayScore:0,groupNumber:2},
 {id:3,roundNumber:2,homeTeamId:10,homeTeamName:'A',awayTeamId:12,awayTeamName:'C',status:'SCHEDULED',homeScore:null,awayScore:null,groupNumber:null}
];
test('fases de grupo e eliminatórias vêm de groupNumber, sem inferir vencedores',()=>{
 const x=splitTeamMatches([fixtures[2],fixtures[1],fixtures[0]],'GROUP_KNOCKOUT');
 assert.deepEqual(x.groups.map(g=>g.number),[1,2]);
 assert.deepEqual(x.groups[0].matches.map(m=>m.id),[1]);
 assert.deepEqual(x.knockout.map(m=>m.id),[3]);
 assert.equal(teamMatchStage(fixtures[0],'GROUP_KNOCKOUT'),'GROUP');
 assert.equal(teamMatchStage(fixtures[2],'GROUP_KNOCKOUT'),'KNOCKOUT');
});
test('as mesmas partidas não ganham grupos fictícios em formatos simples',()=>{
 assert.equal(splitTeamMatches(fixtures,'KNOCKOUT').knockout.length,3);
 assert.equal(splitTeamMatches(fixtures,'LEAGUE').league.length,3);
 assert.equal(splitTeamMatches([], 'GROUP_KNOCKOUT').groups.length,0);
});
test('resultado só é apresentado quando concluído e com pontuações inteiras',()=>{
 assert.equal(matchScore(fixtures[0]),'2 – 1');
 assert.equal(matchScore(fixtures[2]),'Por disputar');
 assert.equal(matchScore({...fixtures[0],homeScore:null}),'Resultado por confirmar');
 assert.equal(matchScore({...fixtures[0],homeScore:-1}),'Resultado por confirmar');
 assert.equal(matchRound(fixtures[0]),'Ronda 1');
 assert.equal(matchRound({...fixtures[0],roundNumber:0}),'Ronda por definir');
});
test('IDs de equipa permitem mostrar exclusivamente os seus jogos',()=>{
 assert.equal(isTeamInMatch(fixtures[0],10),true);
 assert.equal(isTeamInMatch(fixtures[0],13),false);
});
test('paginação rejeita negativos, frações e entradas inválidas',()=>{
 for(const value of [-1,0.2,10000,'foo','',null,undefined,true])assert.throws(()=>validPage(value));
 assert.equal(validPage(0),0);assert.equal(validPage('3'),3);
});
test('apenas equipas com regras validadas mostram resultados de jogos genéricos',()=>{
 assert.equal(canListMatches({entryType:'TEAM',sport:'Futebol',format:'GROUP_KNOCKOUT'}),true);
 for(const sport of ['Karting','Voleibol','Cricket','Golfe','Ciclismo','Modalidade futura']){
  assert.equal(canListMatches({entryType:'TEAM',sport,format:'KNOCKOUT'}),false,sport);
 }
 assert.equal(canListMatches({entryType:'INDIVIDUAL',sport:'Futebol'}),false);
 assert.equal(canListMatches({entryType:'TEAM',sport:'Futebol',scoringMode:'RACE_POINTS'}),false);
});
test('contratos de grupos, jogos e histórico individual correspondem ao backend',()=>{
 const f=fs.readFileSync(path.join(__dirname,'../src/lib/tournament-fixtures-api.ts'),'utf8');
 assert.ok(f.includes('/groups'));
 assert.ok(f.includes('/matches?page='));
 assert.ok(f.includes('/'+String.fromCharCode(36)+'{id}/matches?page='));
 assert.ok(!f.includes("method:'POST'")&&!f.includes("method:'DELETE'")&&!f.includes("method:'PUT'"));
});
test('ecrãs existem e equipas navegam para a página própria',()=>{
 const root=path.join(__dirname,'../app/tournaments/[communityId]/[id]');
 const list=fs.readFileSync(path.join(root,'teams.tsx'),'utf8');
 const detail=fs.readFileSync(path.join(root,'teams/[teamId].tsx'),'utf8');
 const fixturesScreen=fs.readFileSync(path.join(root,'fixtures.tsx'),'utf8');
 assert.match(list,/Ver plantel e jogos|Abrir página da equipa|Ver equipa/);
 assert.match(detail,/teamProfileMatches/);
 assert.match(detail,/Partilhar convite da equipa/);
 assert.match(fixturesScreen,/teamTournamentGroups/);
 assert.match(fixturesScreen,/knockoutStarted/);
});


test('changing account clears private fixtures before reading new competition data',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/fixtures.tsx'),'utf8');
 assert.match(screen,/if\(!auth\.token\|\|!auth\.username\)/);
 assert.match(screen,/setTournament\(null\);setGroups\(null\);setMatches\(\[\]\);setHasMore\(false\)/);
 assert.match(screen,/version!==generation\.current/);
 assert.match(screen,/setActive\('GROUP'\)/);
});
test('group standings show real server points and accessible team links',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/fixtures.tsx'),'utf8');
 assert.match(screen,/groups\.groups\.map\(g=>/);
 assert.match(screen,/accessibilityLabel=\{'Ver equipa '\+row\.teamName\}/);
 assert.match(screen,/\{row\.points\} pts/);
 assert.match(screen,/\{row\.played\} J/);
 assert.match(screen,/groups\?\.knockoutStarted/);
});


test('individual match screen preserves confirmed server scores and clears stale pages',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/matches.tsx'),'utf8');
 assert.match(screen,/matchScore\(m\)/);
 assert.match(screen,/m\.status==='COMPLETED'&&styles\.scoreBoxFinal/);
 assert.match(screen,/setTournament\(null\);setMatches\(\[\]\);setMore\(false\);setPage\(0\)/);
 assert.match(screen,/if\(version===generation\.current\)\{paging\.current=false;setBusy\(false\);\}/);
});
test('performance results render validated rankings without inferring winners',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/results.tsx'),'utf8');
 assert.match(screen,/validatedRank\(rank\)/);
 assert.match(screen,/style=\{styles\.positionBox\}/);
 assert.match(screen,/style=\{styles\.performance\} numberOfLines=\{2\}/);
 for(const token of ['formatPoints(row.championshipPoints)','formatSeconds(row.bestSeconds)','formatMetres(row.bestMetres)','finalPublished']){
  assert.ok(screen.includes(token),token);
 }
});


test('individual tournament cards use supported React Native font weights',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/matches.tsx'),'utf8');
 assert.doesNotMatch(screen,/fontWeight:\s*['"]850['"]/);
 assert.match(screen,/fontWeight:'800'/);
});
test('performance results reject invalid route IDs before requesting official data',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/results.tsx'),'utf8');
 assert.match(screen,/!Number\.isSafeInteger\(cid\)\|\|cid<=0\|\|!Number\.isSafeInteger\(tid\)\|\|tid<=0/);
 assert.match(screen,/setError\('Competição inválida\.'\)/);
 assert.match(screen,/performanceOverview\(cid,details,auth\.token,auth\.username\)/);
});


test('both participant and team calendars reject broken pagination from the server',()=>{
 const root=path.join(__dirname,'../app/tournaments/[communityId]/[id]');
 const team=fs.readFileSync(path.join(root,'fixtures.tsx'),'utf8');
 const individual=fs.readFileSync(path.join(root,'matches.tsx'),'utf8');
 for(const screen of [team,individual]){
  assert.match(screen,/import \{validateNextFixturePage\} from/);
  assert.match(screen,/version!==generation\.current\)return/);
 }
 assert.match(team,/validateNextFixturePage<TournamentTeamMatch>\(response,next\)/);
 assert.match(individual,/validateNextFixturePage<TournamentIndividualMatch>\(response,p\)/);
});
