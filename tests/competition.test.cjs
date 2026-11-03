'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {classificationKind,label,standingsColumns,validTournamentId}=require('../src/lib/competition-core.cjs');
test('Karting e outros desportos motorizados usam tabela de corridas, não futebol',()=>{
 for(const sport of ['Karting','Automobilismo','Motociclismo']){
   const kind=classificationKind({sport,entryType:'INDIVIDUAL',format:'LEAGUE'});
   assert.equal(kind,'RACE');
   assert.equal(standingsColumns(kind).includes('Golos'),false);
   assert.equal(standingsColumns(kind).includes('Pódios'),true);
 }
});
test('RACE_POINTS prevalece mesmo quando o formato de competição é equipa',()=>{
 assert.equal(classificationKind({sport:'Karting',entryType:'TEAM',scoringMode:'RACE_POINTS'}),'RACE');
});
test('Futebol por equipas usa classificação de jogos e pontos',()=>{
 const kind=classificationKind({sport:'Futebol',entryType:'TEAM',format:'GROUP_KNOCKOUT'});
 assert.equal(kind,'TEAM');assert.ok(standingsColumns(kind).includes('Pts'));
});
test('Natação por tempo e xadrez não usam classificação de futebol',()=>{
 assert.equal(classificationKind({sport:'Natação',scoringMode:'SWIM_BEST_TIME'}),'TIMED');
 assert.equal(classificationKind({sport:'Xadrez',scoringMode:'CHESS_HALF_POINTS'}),'CHESS');
});
test('modalidades desconhecidas não são tratadas como futebol',()=>{
 assert.equal(classificationKind({sport:'Modalidade Nova',entryType:'INDIVIDUAL'}),'UNSUPPORTED');
 assert.match(label('UNSUPPORTED'),/indisponível/);
});
test('identificadores de torneio inválidos são rejeitados',()=>{
 for(const value of [0,-1,1.5,Infinity,'abc',null])assert.throws(()=>validTournamentId(value));
 assert.equal(validTournamentId('123'),123);
});
