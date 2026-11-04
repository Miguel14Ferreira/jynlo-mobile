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
