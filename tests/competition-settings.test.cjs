'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {sportFamily,teamPoints,racketRule,racePoints}=require('../src/lib/competition-settings-core.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('competition settings: sport families match the server',()=>{
 assert.equal(sportFamily('Futebol'),'team');assert.equal(sportFamily('padel'),'racket');
 assert.equal(sportFamily('Karting'),'race');assert.equal(sportFamily('Yoga'),'other');
});
test('competition settings: points are validated before sending',()=>{
 assert.deepEqual(teamPoints({win:'3',draw:'1',loss:'0'}),{winPoints:3,drawPoints:1,lossPoints:0});
 assert.throws(()=>teamPoints({win:'x',draw:'1',loss:'0'}));
 assert.throws(()=>teamPoints({win:'1001',draw:'1',loss:'0'}));
 assert.deepEqual(racketRule({win:'2',loss:'0',tieBreak:'SCORE_FIRST'}),{winPoints:2,lossPoints:0,tieBreak:'SCORE_FIRST'});
 assert.throws(()=>racketRule({win:'1',loss:'1',tieBreak:'SETS_FIRST'}));
 assert.equal(racePoints('25, 18 15;12'),'25,18,15,12');
 assert.throws(()=>racePoints('10, 12'));
 assert.throws(()=>racePoints(''));
});
test('competition settings: screen reachable from results and uses the phone import endpoints',()=>{
 const ui=read('app/communities/[id]/competition-settings.tsx'),api=read('src/lib/competition-settings-api.ts');
 assert.match(read('app/communities/[id]/results.tsx'),/competition-settings/);
 assert.match(api,/\/competition\/import\/auto\//);assert.match(api,/\/habitual-location'/);
 assert.match(api,/\/sport-points'/);assert.match(api,/\/racket-rules'/);assert.match(api,/\/race-rules'/);
 assert.match(ui,/Importar histórico/);assert.match(ui,/Local habitual/);
});
