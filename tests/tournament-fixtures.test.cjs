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
