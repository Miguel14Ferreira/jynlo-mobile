const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {formatSeconds,formatMetres,formatPoints,formatChessPoints,displayPerson,validatedRank,sourceRounds,stageLabel}=require('../src/lib/performance-core.cjs');
const {classificationKind,isPerformanceKind}=require('../src/lib/competition-core.cjs');
function read(file){return untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));}
test('tempos são apresentados em segundos e minutos sem pontuações de futebol',()=>{
 assert.equal(formatSeconds(65.238),'1:05,238 s');
 assert.equal(formatSeconds(59.9999),'1:00 s');
 assert.equal(formatSeconds(3601.5),'1:00:01,5 s');
 assert.equal(formatSeconds(0),'0 s');
 for(const x of [null,undefined,-0.5,Infinity,NaN,'37.2'])assert.equal(formatSeconds(x),'—');
});
test('marcas em metros com unidade; valores inválidos nunca entram na classificação',()=>{
 assert.equal(formatMetres(5.92),'5,92 m');
 assert.equal(formatMetres(0),'0 m');
 assert.equal(formatMetres(-1),'—');
 assert.equal(formatMetres(NaN),'—');
});
test('pontos de corridas preservam zero e rejeitam dados desconhecidos',()=>{
 assert.equal(formatPoints(0),'0 pts');
 assert.equal(formatPoints(null),'—');
 assert.equal(formatPoints(-1),'—');
});
test('xadrez utiliza unidades de meio ponto do backend sem inventar golos',()=>{
 assert.equal(formatChessPoints(3),'1,5');
 assert.equal(formatChessPoints(4),'2');
 assert.equal(formatChessPoints(0),'0');
 assert.equal(formatChessPoints(-1),'—');
 assert.equal(formatChessPoints(1.5),'—');
 assert.equal(classificationKind({scoringMode:'CHESS_HALF_POINTS',sport:'Xadrez'}),'CHESS');
});
test('ranking e identidade só são usados se existirem na resposta',()=>{
 assert.equal(validatedRank(0),'—');
 assert.equal(validatedRank(3),'3');
 assert.equal(displayPerson('  ',null,'Tiago'),'Tiago');
 assert.equal(displayPerson(null),'Participante não identificado');
 assert.deepEqual(sourceRounds([{id:3},{id:-2},{id:null},null,{id:4}]).map(x=>x.id),[3,4]);
 assert.equal(stageLabel('FINAL'),'Final');
 assert.equal(stageLabel('FUTURE'),'Fase não identificada');
});
test('os quatro modos de resultado por prova estão separados',()=>{
 for(const scoringMode of ['SWIM_BEST_TIME','TRACK_BEST_TIME','CANOE_BEST_TIME','ROWING_BEST_TIME']){
  assert.equal(classificationKind({sport:'Natação',scoringMode}),'TIMED');
 }
 assert.equal(classificationKind({sport:'Atletismo',scoringMode:'FIELD_BEST_MARK'}),'MEASURED');
 assert.equal(classificationKind({sport:'Karting',scoringMode:'RACE_POINTS'}),'RACE');
 assert.equal(classificationKind({sport:'Atletismo',scoringMode:'RELAY_BEST_TIME'}),'RELAY');
 for(const x of ['RACE','TIMED','MEASURED','RELAY'])assert.equal(isPerformanceKind(x),true);
 assert.equal(isPerformanceKind('TEAM'),false);
});
test('API de provas consulta apenas endpoints GET do backend existente',()=>{
 const api=read('src/lib/performance-api.ts');
 for(const endpoint of ['races','times','marks','relays'])assert.ok(api.includes(`${endpoint}`));
 assert.match(api,/return request<TournamentIndividualMatchPage>/);
 assert.doesNotMatch(api,/method\s*:\s*['"](?:POST|PUT|DELETE)['"]/);
 assert.match(api,/validTournamentId\(communityId\)/);
});
test('calendário individual tem paginação e não reutiliza equipas',()=>{
 const api=read('src/lib/performance-api.ts');
 assert.match(api,/\/matches\?page=\$\{p\}/);
 const screen=read('app/tournaments/[communityId]/[id]/matches.tsx');
 assert.match(screen,/Carregar mais jogos/);
 assert.match(screen,/matchScore\(m\)/);
 assert.doesNotMatch(screen,/teamTournamentMatches/);
});
test('ecrã de resultados respeita final de estafetas publicada pelo servidor',()=>{
 const screen=read('app/tournaments/[communityId]/[id]/results.tsx');
 assert.match(screen,/overview\.data\.finalPublished/);
 assert.match(screen,/overview\.data\.finalStandings/);
 assert.match(screen,/overview\.data\.qualifyingStandings/);
 assert.doesNotMatch(screen,/calculateWinner|promoteWinners/);
});
test('demo de provas fica sempre isolada da API de produção',()=>{
 const api=read('src/lib/performance-api.ts');
 assert.match(api,/if\(DEMO_MODE\)/);
 assert.match(api,/Prova fictícia não encontrada/);
 const core=read('src/lib/competition-api.ts');
 for(const mode of ['SWIM_BEST_TIME','FIELD_BEST_MARK','RELAY_BEST_TIME'])assert.ok(core.includes(mode));
});
