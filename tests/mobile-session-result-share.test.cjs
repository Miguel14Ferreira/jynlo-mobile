'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const {publicSessionResultMessage}=require('../src/lib/session-result-share.cjs');

const publicGame={id:7,sport:'Futebol',status:'COMPLETED',canSharePublicly:true};
const verified={sessionId:7,roundId:55,scoreA:3,scoreB:2,contributions:[
 {username:'sensitive',team:'A',goals:1,assists:0}
]};

test('verified final public score can be shared without player names or restricted game details',()=>{
 const result=publicSessionResultMessage({...publicGame,address:'Local privado',meetingPointInstructions:'Porta B'},verified,7);
 assert.ok(result?.includes('Equipa A 3 — 2 Equipa B'));
 assert.ok(result?.includes('https://d24sports.com/sessions/7'));
 assert.doesNotMatch(result,/sensitive|Local privado|Porta B/);
});
test('private, unfinished, mismatched and incomplete results cannot be shared',()=>{
 for(const game of [
  {...publicGame,canSharePublicly:false},
  {...publicGame,status:'OPEN'},
  {...publicGame,canSharePublicly:undefined},
  null
 ]) assert.equal(publicSessionResultMessage(game,verified,7),null);
 for(const result of [
  {...verified,sessionId:8},
  {...verified,scoreA:null},
  {...verified,scoreB:null},
  {...verified,scoreA:-1},
  {...verified,roundId:0},
  null
 ]) assert.equal(publicSessionResultMessage(publicGame,result,7),null);
 assert.equal(publicSessionResultMessage(publicGame,verified,0),null);
});
test('mobile result card shares only validated output and session supplies authority',()=>{
 const card=read('src/components/SessionOfficialResultCard.tsx');
 const screen=read('app/sessions/[id].tsx');
 assert.match(card,/publicSessionResultMessage\(game,result,sessionId\)/);
 assert.match(card,/Share\.share\(\{message\}\)/);
 assert.match(card,/if\(message\)/);
 assert.match(screen,/sessionId=\{id\} token=\{auth\.token\} game=\{detail\}/);
});
