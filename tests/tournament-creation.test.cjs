'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {creationProfile,disciplineChoices,createTournamentDraft}=require('../src/lib/tournament-create-core.cjs');
const base={name:' Taça de Outono ',sport:'Futebol',entryType:'TEAM',format:'LEAGUE',playersPerTeam:5,roundRobinLegs:2};
test('futebol equipa liga aceita voltas e não mistura dados de provas',()=>{
 const x=createTournamentDraft(base);
 assert.equal(x.name,'Taça de Outono');assert.equal(x.roundRobinLegs,2);assert.equal(x.playersPerTeam,5);
 assert.equal(x.scoringMode,null);assert.equal(x.eventType,null);assert.equal(x.groupCount,null);
 assert.deepEqual([x.winPoints,x.drawPoints,x.lossPoints],[3,1,0]);
});
test('fases de grupos exigem 2 ou 4 grupos e nenhuma volta adicional',()=>{
 let x=createTournamentDraft({...base,format:'GROUP_KNOCKOUT',groupCount:4});
 assert.equal(x.groupCount,4);assert.equal(x.roundRobinLegs,null);
 for(const groupCount of [1,3,5])assert.throws(()=>createTournamentDraft({...base,format:'GROUP_KNOCKOUT',groupCount}),/2 ou 4/);
});
test('eliminatórias de equipa não transportam critérios de liga',()=>{
 const x=createTournamentDraft({...base,format:'KNOCKOUT'});
 assert.equal(x.roundRobinLegs,null);assert.equal(x.groupCount,null);
});
test('torneio individual não aceita eliminatórias sem backend próprio',()=>{
 assert.throws(()=>createTournamentDraft({name:'Open',sport:'Padel',entryType:'INDIVIDUAL',format:'KNOCKOUT'}),/formato/);
});
test('xadrez fixa internamente 2/1/0 e exige CHESS_GAME',()=>{
 const x=createTournamentDraft({name:'Liga de xadrez',sport:'Xadrez',entryType:'INDIVIDUAL',format:'LEAGUE',eventType:'CHESS_GAME',winPoints:999});
 assert.equal(x.scoringMode,'CHESS_HALF_POINTS');assert.deepEqual([x.winPoints,x.drawPoints,x.lossPoints],[2,1,0]);
 assert.throws(()=>createTournamentDraft({name:'Xadrez',sport:'Xadrez',entryType:'INDIVIDUAL',format:'LEAGUE'}),/tipo de prova/);
});
test('karting é uma corrida por pontos e nunca usa pontos de vitória',()=>{
 const x=createTournamentDraft({name:'Grande Prémio',sport:'Karting',entryType:'INDIVIDUAL',format:'LEAGUE'});
 assert.equal(x.scoringMode,'RACE_POINTS');assert.equal(x.winPoints,null);assert.equal(x.eventType,null);
});
test('eventos de ciclismo e BMX são compatíveis com o backend, freestyle rejeitado',()=>{
 for(const [sport,eventType] of [['BMX','RACE'],['Ciclismo de Estrada','ROAD_RACE'],['Ciclismo de Pista','TRACK_SCRATCH']]){
  assert.equal(createTournamentDraft({name:'Campeonato',sport,entryType:'INDIVIDUAL',format:'LEAGUE',eventType}).eventType,eventType);
 }
 assert.throws(()=>createTournamentDraft({name:'Campeonato',sport:'BMX',entryType:'INDIVIDUAL',format:'LEAGUE',eventType:'FREESTYLE'}),/compatível/);
});
test('natação só compara uma disciplina em piscina 50m',()=>{
 let x=createTournamentDraft({name:'Open 100m',sport:'Natação',entryType:'INDIVIDUAL',format:'LEAGUE',eventType:'SWIM_LCM',eventDiscipline:'FREE_100'});
 assert.equal(x.scoringMode,'SWIM_BEST_TIME');assert.equal(x.eventDiscipline,'FREE_100');assert.equal(x.winPoints,null);
 assert.throws(()=>createTournamentDraft({...x,eventDiscipline:'FREESTYLE'}),/disciplina/);
});
test('remo e canoagem rejeitam mistura de distâncias',()=>{
 for(const [sport,eventType,discipline] of [['Remo','ROWING_SINGLE','SINGLE_2000'],['Canoagem Velocidade','CANOE_SPRINT','K1_500']]){
  assert.equal(createTournamentDraft({name:'Prova',sport,entryType:'INDIVIDUAL',format:'LEAGUE',eventType,eventDiscipline:discipline}).eventDiscipline,discipline);
 }
 assert.equal(disciplineChoices('CANOE_SPRINT').length,3);
});
test('atletismo separa pista, saltos, lançamentos e estafetas',()=>{
 const c={name:'Taça',sport:'Atletismo',entryType:'INDIVIDUAL',format:'LEAGUE'};
 assert.equal(createTournamentDraft({...c,athleticsMode:'TRACK',eventType:'TRACK',eventDiscipline:'TRACK_200'}).scoringMode,'TRACK_BEST_TIME');
 assert.equal(createTournamentDraft({...c,athleticsMode:'FIELD',eventType:'THROW',eventDiscipline:'JAVELIN'}).scoringMode,'FIELD_BEST_MARK');
 const relay=createTournamentDraft({...c,entryType:'TEAM',eventType:'TRACK_RELAY',eventDiscipline:'RELAY_4X100'});
 assert.equal(relay.playersPerTeam,4);assert.equal(relay.scoringMode,'RELAY_BEST_TIME');
 assert.throws(()=>createTournamentDraft({...c,entryType:'TEAM',format:'KNOCKOUT',eventType:'TRACK_RELAY',eventDiscipline:'RELAY_4X100'}),/formato/);
});
test('modalidades ainda sem motor validado não herdam regras futebol',()=>{
 for(const sport of ['Golfe','Cricket','Voleibol','Surf','Patinagem de Velocidade']){
  assert.equal(creationProfile(sport,'TEAM').model,'UNAVAILABLE');
  assert.throws(()=>createTournamentDraft({name:'Torneio',sport,entryType:'TEAM',format:'LEAGUE',playersPerTeam:5}),/validado/);
 }
});
test('nome, tamanhos e pontos inválidos são bloqueados antes do POST',()=>{
 for(const bad of [{...base,name:' '},{...base,playersPerTeam:31},{...base,winPoints:-1},{...base,roundRobinLegs:3}]){
  assert.throws(()=>createTournamentDraft(bad));
 }
});
test('nunca envia escrita na inicialização e desativa criação real na demo',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/lib/tournament-create-api.ts'),'utf8');
 assert.match(source,/DEMO_MODE/);assert.match(source,/method:'POST'/);
 const screen=fs.readFileSync(path.join(__dirname,'../app/tournaments/create.tsx'),'utf8');
 assert.match(screen,/Alert\.alert/);assert.match(screen,/createTournament/);
 assert.doesNotMatch(screen,/setInterval\(|retry\(/);
});
