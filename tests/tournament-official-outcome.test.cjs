const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const {officialTournamentOutcome}=require('../src/lib/tournament-outcome-core.cjs');

test('never invents a champion while tournament is unfinished',()=>{
 assert.equal(officialTournamentOutcome({status:'IN_PROGRESS',championTeamId:4,championTeamName:'Antiga'}),null);
 assert.equal(officialTournamentOutcome({status:'DRAFT'}),null);
 assert.equal(officialTournamentOutcome(null),null);
});
test('displays confirmed winning team only with matching official identity',()=>{
 const winner=officialTournamentOutcome({
  status:'COMPLETED',entryType:'TEAM',championTeamId:12,championTeamName:' Os Campeões '
 });
 assert.equal(winner.winner,true);
 assert.equal(winner.title,'Campeão oficial: Os Campeões');
 for(const item of [{championTeamId:0,championTeamName:'Equipa'},
  {championTeamId:12,championTeamName:null},{championTeamName:'Equipa'}]){
  assert.equal(officialTournamentOutcome({status:'COMPLETED',entryType:'TEAM',...item}).winner,false);
 }
});
test('individual winner requires an official profile and respects tied champion',()=>{
 assert.equal(officialTournamentOutcome({
  status:'COMPLETED',entryType:'INDIVIDUAL',
  championProfileId:7,championDisplayName:'Joana'
 }).title,'Campeão oficial: Joana');
 const tied=officialTournamentOutcome({
  status:'COMPLETED',entryType:'TEAM',
  championTeamId:4,championTeamName:'Falso vencedor',championTied:true
 });
 assert.equal(tied.winner,false);
 assert.match(tied.title,/sem campeão único/);
});
test('both mobile tournament screens display the same authoritative result',()=>{
 for(const screen of ['app/tournaments/[communityId]/[id].tsx','app/tournaments/[communityId]/[id]/manage.tsx']){
  const source=read(screen);
  assert.match(source,/officialTournamentOutcome\(tournament\)/);
  assert.match(source,/officialOutcome\.title/);
  assert.match(source,/officialOutcome\.detail/);
 }
 const types=read('src/lib/types.ts');
 for(const field of ['championTied?:boolean','championTeamId?:number|null',
  'championProfileId?:number|null','championPoints?:number|null'])
  assert.ok(types.includes(field),field);
});
