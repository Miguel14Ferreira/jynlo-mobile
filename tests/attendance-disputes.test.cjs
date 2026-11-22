const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
const core=require('../src/lib/reliability-core.cjs');

test('labels match the web wording',()=>{
 assert.equal(core.attendanceLabel('NO_SHOW'),'Faltou');
 assert.equal(core.attendanceLabel('ATTENDED'),'Presente');
 assert.equal(core.attendanceLabel('LATE_CANCELLED'),'Cancelamento tardio');
 assert.equal(core.attendanceLabel(undefined),'Pendente');
 assert.equal(core.disputeLabel('OPEN'),'Em análise');
 assert.equal(core.disputeLabel(null),null);
});

test('history leaves out sessions the user organises and shows newest first',()=>{
 const items=[{participantId:1,sessionId:10,gameDate:'2026-10-01T10:00:00Z'},{participantId:2,sessionId:11,gameDate:'2026-11-01T10:00:00Z'},
  {participantId:3,sessionId:12,gameDate:'2026-09-01T10:00:00Z'}];
 assert.deepEqual(core.externalHistory(items,[12]).map(i=>i.participantId),[2,1]);
 assert.deepEqual(core.externalHistory(null,[]),[]);
});

test('dispute reason is required, trimmed and capped like the server',()=>{
 assert.throws(()=>core.validateDisputeReason('   '),/Explica/);
 assert.throws(()=>core.validateDisputeReason('x'.repeat(2001)),/2000/);
 assert.equal(core.validateDisputeReason('  estive lá \u0000 '),'estive lá');
});

test('after a dispute the item is under review and cannot be disputed again',()=>{
 const next=core.markDisputed([{participantId:5,canDispute:true,disputeStatus:null},{participantId:6,canDispute:true,disputeStatus:null}],5);
 assert.deepEqual(next[0],{participantId:5,canDispute:false,disputeStatus:'OPEN'});
 assert.equal(next[1].canDispute,true);
});

test('rate is shown as a rounded, bounded percentage',()=>{
 assert.equal(core.formatRate(87.6),'88%');assert.equal(core.formatRate(140),'100%');assert.equal(core.formatRate(NaN),'—');
});

test('app uses the server endpoints and shows the history in Minhas sessões',()=>{
 const api=read('src/lib/reliability-api.ts');
 assert.match(api,/'\/api\/attendance\/me'/);
 assert.match(api,/'\/api\/attendance-disputes',\{token,method:'POST',body:\{participantId,reason:text\}\}/);
 assert.match(api,/\/api\/profiles\/\$\{encodeURIComponent\(username\)\}\/reliability/);
 const screen=read('app/my-sessions.tsx');
 assert.match(screen,/<AttendanceHistory /);
 assert.doesNotMatch(screen,/assiduidade individual continua pendente/);
 assert.match(read('src/components/AttendanceHistory.tsx'),/Contestar falta/);
});
