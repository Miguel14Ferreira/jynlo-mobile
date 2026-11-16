'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {organizerFixtureType,canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,validateTournamentScore,validateTournamentMatchScore,organizerMatchWriteGuard}=require('../src/lib/tournament-organizer-core.cjs');
const team={id:1,sport:'Futebol',entryType:'TEAM',format:'GROUP_KNOCKOUT',status:'DRAFT'};
const individual={id:2,sport:'Xadrez',entryType:'INDIVIDUAL',scoringMode:'CHESS_HALF_POINTS',format:'LEAGUE',status:'DRAFT'};
test('só OWNER/ADMIN publicam calendários DRAFT de modalidades suportadas',()=>{
 assert.equal(canGenerateSchedule('OWNER',team),true);
 assert.equal(canGenerateSchedule('ADMIN',individual),true);
 assert.equal(canGenerateSchedule('MEMBER',team),false);
 assert.equal(canGenerateSchedule('OWNER',{...team,status:'IN_PROGRESS'}),false);
 assert.equal(canGenerateSchedule('OWNER',{...team,sport:'Voleibol'}),false);
 assert.equal(canGenerateSchedule('OWNER',{...team,sport:'Karting',scoringMode:'RACE_POINTS'}),false);
 assert.equal(canGenerateSchedule('OWNER',{...individual,format:'KNOCKOUT'}),false);
});
test('sem extrapolar futebol a partir de entryType TEAM',()=>{
 for(const sport of ['Voleibol','Cricket','Golfe'])assert.equal(organizerFixtureType({...team,sport}),null);
 assert.equal(organizerFixtureType({...team,sport:'Futsal'}),'TEAM');
 assert.equal(organizerFixtureType(individual),'INDIVIDUAL');
});
test('resultados só durante a competição e finalização só para ligas',()=>{
 assert.equal(canRecordTournamentResult('ADMIN',{...team,status:'IN_PROGRESS'}),true);
 assert.equal(canRecordTournamentResult('MEMBER',{...team,status:'IN_PROGRESS'}),false);
 assert.equal(canCompleteTournament('ADMIN',{...team,status:'IN_PROGRESS'}),false);
 assert.equal(canCompleteTournament('ADMIN',{...team,format:'LEAGUE',status:'IN_PROGRESS'}),true);
 assert.equal(canCompleteTournament('ADMIN',{...team,format:'LEAGUE',status:'COMPLETED'}),false);
});
test('resultados apenas inteiros positivos ou zero até 999',()=>{
 assert.deepEqual(validateTournamentScore('0','999'),{homeScore:0,awayScore:999});
 for(const invalid of ['-1','1.5','1e2','','1000','  ','abc'])assert.throws(()=>validateTournamentScore(invalid,'2'));
});
test('mutações exigem ação explícita, endpoint e verbo correspondem ao backend',()=>{
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/tournament-organizer-api.ts'),'utf8');
 for(const route of ['/teams/schedule','/schedule','/teams/complete','/complete','/teams/matches/${validTournamentId(matchId)}/result','/matches/${validTournamentId(matchId)}/result'])assert.ok(api.includes(route),route);
 assert.match(api,/method:type==='TEAM'\?'POST':'PUT'/);
 assert.doesNotMatch(api,/retry\(|setTimeout\(|setInterval\(/);
 assert.match(api,/DEMO_MODE/);
});

test('xadrez só permite 1–0, 0–1 ou 0–0 segundo as regras do backend',()=>{
 const game={id:10,groupNumber:null};
 for(const [a,b] of [['1','0'],['0','1'],['0','0']])
  assert.deepEqual(validateTournamentMatchScore(individual,game,a,b),{homeScore:Number(a),awayScore:Number(b)});
 for(const [a,b] of [['1','1'],['2','0'],['0','2'],['3','3']])
  assert.throws(()=>validateTournamentMatchScore(individual,game,a,b),/Xadrez/);
});
test('eliminatórias por equipas exigem vencedor, mas os grupos e ligas aceitam empate',()=>{
 const knockout={...team,format:'KNOCKOUT'};
 const game={id:25,groupNumber:null};
 assert.throws(()=>validateTournamentMatchScore(knockout,game,'2','2'),/eliminatória/);
 assert.deepEqual(validateTournamentMatchScore(knockout,game,'3','2'),{homeScore:3,awayScore:2});
 assert.throws(()=>validateTournamentMatchScore(team,game,'0','0'),/eliminatória/);
 assert.deepEqual(validateTournamentMatchScore(team,{id:26,groupNumber:1},'2','2'),{homeScore:2,awayScore:2});
 assert.deepEqual(validateTournamentMatchScore({...team,format:'LEAGUE'},game,'0','0'),{homeScore:0,awayScore:0});
});
test('não aceita jogo inexistente para registo de resultado',()=>{
 assert.throws(()=>validateTournamentMatchScore(team,null,'1','0'),/Jogo não encontrado/);
 assert.throws(()=>validateTournamentMatchScore(team,{id:0},'1','0'),/Jogo não encontrado/);
});

test('grupos fechados e rondas anteriores não podem ser corrigidos',()=>{
 const cup={...team,status:'IN_PROGRESS'};
 const groupMatch={id:10,roundNumber:1,groupNumber:1};
 assert.equal(organizerMatchWriteGuard(cup,groupMatch,[groupMatch],{knockoutStarted:false},true).allowed,true);
 assert.equal(organizerMatchWriteGuard(cup,groupMatch,[groupMatch],{knockoutStarted:true},true).allowed,false);
 assert.equal(organizerMatchWriteGuard(cup,groupMatch,[groupMatch],null,false).allowed,false);
 const semifinal={id:11,roundNumber:2,groupNumber:null};
 const final={id:12,roundNumber:3,groupNumber:null};
 assert.equal(organizerMatchWriteGuard(cup,semifinal,[semifinal,final],{knockoutStarted:true},true).allowed,false);
 assert.equal(organizerMatchWriteGuard(cup,final,[semifinal,final],{knockoutStarted:true},true).allowed,true);
 assert.equal(organizerMatchWriteGuard(cup,final,[final],null,false).allowed,true);
});
test('ligas permitem correção durante a prova mas não após o fecho',()=>{
 const league={...team,format:'LEAGUE',status:'IN_PROGRESS'};
 const game={id:1,roundNumber:1,groupNumber:null};
 assert.equal(organizerMatchWriteGuard(league,game,[game],null,false).allowed,true);
 assert.equal(organizerMatchWriteGuard({...league,status:'COMPLETED'},game,[game],null,false).allowed,false);
 assert.equal(organizerMatchWriteGuard(league,null,[game],null,false).allowed,false);
});
