'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('attendance uses authenticated existing endpoint with only allowed states',()=>{
 const api=read('src/lib/api.ts');
 assert.match(api,/export async function recordSessionAttendance/);
 assert.match(api,/\/api\/sessions\/\$\{sessionId\}\/participants\/\$\{participantId\}\/attendance/);
 assert.match(api,/token,method:'PUT',body:\{status\}/);
 assert.match(api,/status:'ATTENDED'\|'NO_SHOW'/);
 assert.match(api,/if\(DEMO_MODE\|\|!token\)/);
 assert.match(api,/Number\.isSafeInteger\(participantId\)/);
});
test('attendance actions are creator-only after kickoff, with explicit confirmation',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/auth\.token&&!DEMO_MODE&&owner&&detail\.status!=='CANCELLED'/);
 assert.match(screen,/Date\.parse\(detail\.gameDate\)<=Date\.now\(\)/);
 assert.match(screen,/Alert\.alert\(present\?'Confirmar presença\?'\:'Registar falta\?'/);
 assert.match(screen,/recordSessionAttendance\(id,participant\.id,actorToken,status\)/);
 assert.match(screen,/attendanceInFlight\.current=true;[\s\S]*?const actorToken=auth\.token/);
 assert.match(screen,/attendanceInFlight\.current=false/);
 assert.match(screen,/await load\(\)/);
 assert.match(screen,/Registar falta/);
 assert.match(screen,/p\.attendanceStatus/);
 assert.doesNotMatch(screen,/Linking\.openURL/);
});
