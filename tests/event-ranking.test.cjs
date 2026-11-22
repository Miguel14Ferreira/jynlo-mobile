const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {parseEventValue,formatEventValue,buildResults,draftRows}=require('../src/lib/event-ranking-core.cjs');
const {creationProfile,createTournamentDraft}=require('../src/lib/tournament-create-core.cjs');
const {classificationKind}=require('../src/lib/competition-core.cjs');
const {registrationAction,canConfirmParticipant}=require('../src/lib/tournament-registration-core.cjs');

test('parses times, scores and positions',()=>{
 assert.equal(parseEventValue('1:02:03','TIME'),3723);
 assert.equal(parseEventValue('1:02,5','TIME'),62.5);
 assert.equal(parseEventValue('87,5','SCORE'),87.5);
 assert.equal(parseEventValue('','SCORE'),null);
 assert.ok(Number.isNaN(parseEventValue('2.5','POSITION')));
 assert.ok(Number.isNaN(parseEventValue('0','POSITION')));
 assert.ok(Number.isNaN(parseEventValue('abc','SCORE')));
 assert.ok(Number.isNaN(parseEventValue('-3','SCORE')));
 assert.equal(formatEventValue(3723,'TIME'),'1:02:03,00');
 assert.equal(formatEventValue(62.4,'TIME'),'1:02,40');
 assert.equal(formatEventValue(null,'TIME'),'—');
});

test('builds results: skips absentees, keeps DNF, rejects bad values',()=>{
 const rows=[{participantId:1,name:'Ana',raw:'1:01,5',dnf:false},{participantId:2,name:'Rui',raw:'',dnf:true},{participantId:3,name:'Zé',raw:'',dnf:false}];
 assert.deepEqual(buildResults(rows,'TIME'),[
  {participantId:1,didNotFinish:false,value:61.5,position:null},
  {participantId:2,value:null,position:null,didNotFinish:true}]);
 assert.throws(()=>buildResults([{participantId:1,name:'Ana',raw:'x',dnf:false}],'SCORE'),/Ana/);
 assert.throws(()=>buildResults([{participantId:1,name:'Ana',raw:'',dnf:false}],'SCORE'),/pelo menos/);
 assert.deepEqual(buildResults([{participantId:4,name:'Li',raw:'2',dnf:false}],'POSITION'),[{participantId:4,didNotFinish:false,value:null,position:2}]);
});

test('editing an event pre-fills values',()=>{
 const rows=draftRows([{id:1,name:'Ana'},{id:2,name:'Rui'},{id:3,name:'Zé'}],
  {results:[{participantId:1,value:62.4,place:1,didNotFinish:false},{participantId:2,value:null,place:null,didNotFinish:true}]},'TIME');
 assert.deepEqual(rows.map(r=>[r.raw,r.dnf]),[['62,4',false],['',true],['',false]]);
});

test('individual sports without a dedicated engine create a classificação por provas',()=>{
 for(const sport of ['Golfe','Ginástica','Surf','Triatlo','Escalada','Tiro com Arco'])
  assert.equal(creationProfile(sport,'INDIVIDUAL').model,'EVENT_RANKING',sport);
 assert.equal(creationProfile('Yoga','INDIVIDUAL').model,'UNAVAILABLE');
 assert.equal(creationProfile('Golfe','TEAM').model,'UNAVAILABLE');
 assert.equal(creationProfile('Karting','INDIVIDUAL').model,'RACE_POINTS');
 const payload=createTournamentDraft({name:'Circuito de Golfe',sport:'Golfe',entryType:'INDIVIDUAL',format:'LEAGUE'});
 assert.equal(payload.scoringMode,'EVENT_RANKING');
 assert.equal(payload.format,'LEAGUE');
 assert.equal(payload.winPoints,null);
 assert.equal(payload.eventType,null);
 assert.equal(classificationKind({scoringMode:'EVENT_RANKING',entryType:'INDIVIDUAL'}),'EVENT_RANKING');
});

test('event series accept entries while in progress, but leaving only before the start',()=>{
 const running={entryType:'INDIVIDUAL',status:'IN_PROGRESS',scoringMode:'EVENT_RANKING'};
 assert.equal(registrationAction(running,[],'ana',false),'JOIN');
 assert.equal(registrationAction(running,[{username:'ana',status:'PENDING'}],'ana',false),'NONE');
 assert.equal(canConfirmParticipant('ADMIN',running,{status:'PENDING'}),true);
 assert.equal(registrationAction({...running,scoringMode:'RACE_POINTS'},[],'ana',false),'NONE');
 assert.equal(registrationAction({...running,status:'COMPLETED'},[],'ana',false),'NONE');
});

test('mobile sport list matches the web list',()=>{
 const {EVENT_RANKING_SPORTS}=require('../src/lib/tournament-create-core.cjs');
 const sports=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/sports.ts'),'utf8'));
 for(const sport of EVENT_RANKING_SPORTS)assert.ok(sports.includes(`'${sport}'`),sport+' missing from catalog');
 assert.equal(EVENT_RANKING_SPORTS.size,47);
});

test('public share links only point to the two public pages',()=>{
 const {publicShareUrl,shareMessage}=require('../src/lib/public-share-core.cjs');
 assert.equal(publicShareUrl('/torneio/12'),'https://d24sports.com/torneio/12');
 assert.equal(publicShareUrl('/classificacao/3'),'https://d24sports.com/classificacao/3');
 for(const bad of ['https://evil.example/x','/torneio/0','/torneio/1?x=1','//evil.com/torneio/1',''])
  assert.throws(()=>publicShareUrl(bad),bad);
 assert.match(shareMessage('TOURNAMENT','Taça',publicShareUrl('/torneio/12')),/Taça[\s\S]*d24sports\.com\/torneio\/12/);
 const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/PublicShareCard.tsx'),'utf8'));
 assert.match(source,/\(!setting\.enabled&&!canManage\)\)return null/);
});
