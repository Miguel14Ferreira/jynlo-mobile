const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ENDPOINTS,managedKind,canManageEvents,roundCollections,validateRacePointsCsv}=require('../src/lib/tournament-events-core.cjs');
const draft={id:1,sport:'Karting',entryType:'INDIVIDUAL',scoringMode:'RACE_POINTS',status:'DRAFT',format:'LEAGUE'};
test('apenas corridas, tempos e marcas individuais têm associação de jornadas',()=>{
 assert.equal(managedKind(draft),'RACE');
 assert.equal(managedKind({...draft,sport:'Natação',scoringMode:'SWIM_BEST_TIME'}),'TIMED');
 assert.equal(managedKind({...draft,sport:'Atletismo',scoringMode:'FIELD_BEST_MARK'}),'MEASURED');
 for(const scoringMode of ['RELAY_BEST_TIME','CHESS_HALF_POINTS',null]){
  assert.equal(managedKind({...draft,scoringMode,sport:'Voleibol'}),null);
 }
 assert.equal(managedKind({...draft,entryType:'TEAM'}),null);
 assert.deepEqual(ENDPOINTS,{RACE:'races',TIMED:'times',MEASURED:'marks'});
});
test('apenas OWNER/ADMIN, e nunca membros ou campeonatos concluídos',()=>{
 assert.equal(canManageEvents('OWNER',draft),true);
 assert.equal(canManageEvents('ADMIN',{...draft,status:'IN_PROGRESS'}),true);
 for(const role of [null,'MEMBER','VISITOR'])assert.equal(canManageEvents(role,draft),false);
 assert.equal(canManageEvents('OWNER',{...draft,status:'COMPLETED'}),false);
});
test('exibe somente provas válidas, remove repetidos e exclui já associados',()=>{
 const a={id:12,name:'A'},b={id:13,name:'B'};
 assert.deepEqual(roundCollections({kind:'RACE',data:{linkedRaces:[a,a,null,{id:-1}],availableRaces:[a,b,b]}}),{linked:[a],available:[b]});
 assert.deepEqual(roundCollections({kind:'TIMED',data:{linkedRounds:[a],availableRounds:[b]}}),{linked:[a],available:[b]});
 assert.deepEqual(roundCollections({kind:'MEASURED',data:{linkedRounds:[],availableRounds:[]}}),{linked:[],available:[]});
 assert.deepEqual(roundCollections({kind:'RELAY',data:{}}),{linked:[],available:[]});
});
test('pontos das corridas seguem a validação exata do backend',()=>{
 assert.equal(validateRacePointsCsv('25, 18,15, 0'),'25,18,15,0');
 assert.equal(validateRacePointsCsv('1000,1000,0'),'1000,1000,0');
 for(const value of ['',' ','25,26','-1,0','0.5,0','1001','25,,0',Array(21).fill('1').join(',')])
  assert.throws(()=>validateRacePointsCsv(value));
});
test('endpoints e métodos vêm dos controllers existentes, sem mutações em mount',()=>{
 const api=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/tournament-events-api.ts'),'utf8'));
 const screen=untranslate(fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/events.tsx'),'utf8'));
 assert.match(api,/method:action==='link'\?'PUT':'DELETE'/);
 assert.match(api,/method:'PUT',body:\{pointsByPlace\}/);
 assert.match(api,/DEMO_MODE/);
 assert.match(api,/canManageEvents/);
 assert.doesNotMatch(api,/retry\(|setInterval\(/);
 assert.match(screen,/Alert\.alert/);
 assert.match(screen,/locked\.current/);
 assert.match(screen,/changeTournamentRound/);
 assert.match(screen,/updateTournamentRacePoints/);
 const detail=untranslate(fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id].tsx'),'utf8'));
 assert.match(detail,/\/tournaments\/\[communityId\]\/\[id\]\/events/);
});
