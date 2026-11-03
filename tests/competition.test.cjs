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

test('equipas de modalidades sem regras confirmadas não recebem tabela de futebol',()=>{
 for(const sport of ['Voleibol','Cricket','Golfe','Hóquei em Patins','Desporto Novo']){
  const kind=classificationKind({sport,entryType:'TEAM',format:'LEAGUE'});
  assert.equal(kind,'UNSUPPORTED',sport);
  assert.ok(!standingsColumns(kind).includes('Pts'));
 }
});
test('um scoringMode desconhecido nunca é silenciosamente interpretado como futebol',()=>{
 assert.equal(classificationKind({sport:'Futebol',entryType:'TEAM',scoringMode:'FUTURE_CUSTOM_MODE'}),'UNSUPPORTED');
});
test('listagem não se limita às primeiras 12 comunidades',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/competition-api.ts'),'utf8');
 assert.doesNotMatch(api,/communities\.slice\(0,12\)/);
 assert.match(api,/offset\+=4/);
});
