'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/lib/relay-organizer-core.cjs');
const t={entryType:'TEAM',scoringMode:'RELAY_BEST_TIME',status:'IN_PROGRESS'};
const team={id:4,players:[{profileId:11},{profileId:12},{profileId:13},{profileId:14}]};
test('relay: role and tournament guards',()=>{
 assert.equal(core.canManageRelay('OWNER',t),true);
 assert.equal(core.canManageRelay('MEMBER',t),false);
 assert.equal(core.canManageRelay('ADMIN',{...t,status:'COMPLETED'}),false);
});
test('relay: valid ordered runners must match exact roster',()=>{
 assert.deepEqual(core.validateRunners('14, 11, 13, 12',team),[14,11,13,12]);
 assert.throws(()=>core.validateRunners('11,11,13,14',team));
 assert.throws(()=>core.validateRunners('11,12,13,99',team));
});
test('relay: heat and time validation',()=>{
 assert.equal(core.validateHeatNumber('20'),20);
 assert.throws(()=>core.validateHeatNumber('21'));
 assert.equal(core.validateElapsedSeconds('45,320'),45.32);
 assert.throws(()=>core.validateElapsedSeconds('0'));
 assert.throws(()=>core.validateElapsedSeconds('45.1234'));
});
test('relay: final freezes qualification; decisions require reasons',()=>{
 assert.equal(core.canRecordStage({finalPublished:false},'QUALIFICATION',t),true);
 assert.equal(core.canRecordStage({finalPublished:true},'QUALIFICATION',t),false);
 assert.equal(core.canRecordStage({finalPublished:true},'FINAL',t),true);
 assert.equal(core.decisionAllowed({finalPublished:true},{stage:'QUALIFICATION'},t),false);
 assert.equal(core.decisionAllowed({finalPublished:true},{stage:'FINAL'},t),true);
 assert.deepEqual(core.validateDecision('DISQUALIFIED','Falsa partida'),{status:'DISQUALIFIED',reason:'Falsa partida'});
 assert.throws(()=>core.validateDecision('VALID','x'));
});

test('relay: reorder athlete slots without mutating roster',()=>{
 const original=[11,12,13,14];
 assert.deepEqual(core.moveRunner(original,1,-1),[12,11,13,14]);
 assert.deepEqual(original,[11,12,13,14]);
 assert.deepEqual(core.moveRunner(original,0,-1),original);
 assert.throws(()=>core.moveRunner([11,11,13,14],1,1));
});
test('relay: jury history is newest first',()=>{
 const overview={decisions:[{id:1,heatId:5},{id:3,heatId:5},{id:2,heatId:9}]};
 assert.deepEqual(core.decisionHistory(overview).map(x=>x.id),[3,2,1]);
 assert.equal(overview.decisions[0].id,1);
});

test('relay: identify exact existing series by phase, team and number',()=>{
 const overview={heats:[{id:5,teamId:4,heatNumber:1,stage:'QUALIFICATION',elapsedSeconds:49},
  {id:9,teamId:4,heatNumber:1,stage:'FINAL',elapsedSeconds:48}]};
 assert.equal(core.existingHeat(overview,'QUALIFICATION','1',4).id,5);
 assert.equal(core.existingHeat(overview,'FINAL','1',4).id,9);
 assert.equal(core.existingHeat(overview,'FINAL','2',4),null);
});
