'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {standingTabs,seasonDraft,defaultSeasonName}=require('../src/lib/community-season-core.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('seasons: Geral comes first, then one tab per sport with results',()=>{
 const tabs=standingTabs({
  overallStandings:[{position:1,profileId:2,username:'rui',fullName:'Rui',games:10,wins:5,sports:2,winRate:50}],
  sportStandings:[{sport:'Futebol',standings:[{position:1,username:'ana',games:4,wins:3,draws:0,losses:1,points:9}]},
   {sport:'Basquetebol',standings:[{position:1,username:'eva',games:0,wins:0}]}],
  racketStandings:[{sport:'Padel',matchFormat:'DOUBLES',standings:[{position:1,username:'rui',matches:6,wins:4,losses:2,setDifference:3}]}]
 });
 assert.deepEqual(tabs.map(t=>t.kind),['overall','team','racket']);
 assert.equal(tabs[0].rows[0].wins,5);
 assert.equal(tabs[1].rows[0].points,9);
 assert.equal(tabs[2].rows[0].matches,6);
 assert.equal(standingTabs(null).length,0);
});
test('seasons: new season needs a name and a sport of the community, blank sport is all sports',()=>{
 assert.deepEqual(seasonDraft({name:'  Época   2026 ',sport:''},['Futebol']),{name:'Época 2026',sport:null});
 assert.deepEqual(seasonDraft({name:'Padel',sport:'Padel'},['Futebol','Padel']),{name:'Padel',sport:'Padel'});
 assert.throws(()=>seasonDraft({name:' '},['Futebol']));
 assert.throws(()=>seasonDraft({name:'X',sport:'Ténis'},['Futebol']));
 assert.throws(()=>seasonDraft({name:'x'.repeat(121)},[]));
 assert.match(defaultSeasonName(null,new Date(2026,0,1)),/2026/);
});
test('seasons: organizers create and end seasons and toggle Geral from the app',()=>{
 const api=read('src/lib/community-results-api.ts'),ui=read('app/communities/[id]/results.tsx');
 assert.match(api,/\/seasons',\{token,method:'POST'/);
 assert.match(api,/\/seasons\/'\+seasonId\+'\/close'/);
 assert.match(api,/\/competition\/settings',\{token,method:'PUT'/);
 assert.match(ui,/role==='OWNER'\|\|role==='ADMIN'/);
 assert.match(ui,/Todas as modalidades/);
 assert.match(ui,/Alert\.alert\(t\('Encerrar época\?'\)/);
 assert.match(ui,/standingTabs\(/);
});
