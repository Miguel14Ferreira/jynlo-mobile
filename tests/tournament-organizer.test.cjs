'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {organizerFixtureType,canGenerateSchedule,canRecordTournamentResult,canCompleteTournament,validateTournamentScore}=require('../src/lib/tournament-organizer-core.cjs');
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
