'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {communityResults,officialRoundScore,roundPlayerContributions}=require('../src/lib/community-results-core.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const round=(id,date,score=null,entries=[],eventType='FOOTBALL_FINAL')=>({id,name:'Jornada '+id,playedAt:date,sport:'Futebol',eventType,teamScore:score,entries});
test('history sorts by playedAt descending without mutating or inventing older rounds',()=>{
 const input={rounds:[round(1,'2026-10-01T15:00:00Z'),round(2,'2026-11-02T15:00:00Z'),round(3,'2026-11-02T15:00:00Z')],standings:[],seasons:[]};
 assert.deepEqual(communityResults(input).rounds.map(r=>r.id),[3,2,1]);
 assert.deepEqual(input.rounds.map(r=>r.id),[1,2,3]);
 assert.equal(officialRoundScore(input.rounds[0]),null);
});
test('official team totals only display a verified football final, not unrelated sports or unsupported events',()=>{
 const match=round(1,'2026-11-01T10:00:00Z',{sideA:3,sideB:1});
 assert.deepEqual(officialRoundScore(match),{a:3,b:1,label:'3–1'});
 assert.equal(officialRoundScore({...match,eventType:null}),null);
 assert.equal(officialRoundScore({...match,sport:'Andebol'}),null);
 assert.equal(officialRoundScore({...match,teamScore:{sideA:3,sideB:-1}}),null);
 assert.equal(officialRoundScore({...match,teamScore:{sideA:'3',sideB:1}}),null);
});
test('known goal and assist contributions must be positive and have actual players',()=>{
 const match=round(1,'2026-11-01T10:00:00Z',null,[
  {username:'ana',fullName:'Ana',team:'A',goals:2,assists:1},
  {username:'bea',fullName:null,team:'B',goals:0,assists:1},
  {username:'carlos',fullName:null,team:'A',goals:0,assists:0},
  {username:null,fullName:null,team:'B',goals:1,assists:0}
 ]);
 assert.deepEqual(roundPlayerContributions(match),[
  {name:'Ana',team:'A',goals:2,assists:1},
  {name:'bea',team:'B',goals:0,assists:1}
 ]);
});
test('standings respect backend rank and exclude malformed records without recomputing points',()=>{
 const result=communityResults({rounds:[],seasons:[{id:1,name:'2026/2027'}],standings:[
  {position:2,username:'Bea',points:3,games:2},
  {position:1,username:'Ana',points:4,games:2},
  {position:-1,username:'inválido',points:999,games:1}
 ]},1);
 assert.deepEqual(result.standings.map(s=>s.username),['Ana','Bea']);
 assert.equal(result.standings[0].points,4);
 assert.equal(result.seasons[0].name,'2026/2027');
 assert.equal(result.selection,1);
});
test('screen fetches backend competition overview with login, season switching and safe account change',()=>{
 const api=read('src/lib/community-results-api.ts'),ui=read('app/communities/[id]/results.tsx');
 const parent=read('app/communities/[id].tsx');
 assert.match(api,/communityResultsOverview\(communityId:number,token:string\|null,seasonId\?:number\|null\)/);
 assert.match(api,/\/api\/communities\/'\+communityId\+'\/competition'/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)/);
 assert.match(ui,/loadedAccount===account/);
 assert.match(ui,/communityResultsOverview\(id,auth.token,seasonId\)/);
 assert.match(ui,/setSeasonId\(season.id\)/);
 assert.match(ui,/Resultados e classificações|Histórico da comunidade/);
 assert.match(ui,/Ver todas as jornadas/);
 assert.match(ui,/Marcador oficial/);
 assert.match(parent,/pathname:'\/communities\/\[id\]\/results'/);
});
