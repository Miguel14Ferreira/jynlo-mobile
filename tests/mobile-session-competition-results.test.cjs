'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {buildSessionCompetitionResult,editableCompetitionRoster}=require('../src/lib/session-competition-result.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const members=[
 {id:1,username:'Ana',teamCode:'A'},
 {id:2,username:'Bruno',teamCode:'B'},
 {id:3,username:'Carla',teamCode:null}
];
test('quick results include only checked, eligible players and explicit outcome, never invented goals',()=>{
 const roster=editableCompetitionRoster(members);
 assert.deepEqual(roster.map(p=>[p.id,p.team,p.selected]),[[1,'A',true],[2,'B',true],[3,null,false]]);
 assert.deepEqual(buildSessionCompetitionResult('A',roster),{
  outcome:'A',players:[{username:'Ana',team:'A'},{username:'Bruno',team:'B'}]
 });
 assert.deepEqual(buildSessionCompetitionResult('DRAW',roster),{
  outcome:'DRAW',players:[{username:'Ana',team:'A'},{username:'Bruno',team:'B'}]
 });
});
test('cannot register a winner without one eligible player on each team',()=>{
 const roster=editableCompetitionRoster(members);
 assert.throws(()=>buildSessionCompetitionResult(null,roster),/Escolhe/);
 assert.throws(()=>buildSessionCompetitionResult('C',roster),/Escolhe/);
 assert.throws(()=>buildSessionCompetitionResult('A',roster.filter(p=>p.team==='A')),/equipa/);
 assert.throws(()=>buildSessionCompetitionResult('B',[{...roster[0],team:null},roster[1]]),/equipa/);
});
test('duplicate usernames, invalid team types and malformed roster entries fail closed',()=>{
 const roster=editableCompetitionRoster([null,members[0],members[0],{id:5,username:'',teamCode:'B'},members[1]]);
 assert.deepEqual(roster.map(p=>p.username),['Ana','Bruno']);
 assert.throws(()=>buildSessionCompetitionResult('A',[...roster,{...roster[0],id:4,username:'ANA'}]),/jogadores/);
 assert.throws(()=>buildSessionCompetitionResult('A',[{...roster[0],team:'C'},roster[1]]),/jogadores/);
 assert.throws(()=>editableCompetitionRoster(null),/inscritos/);
});
test('result API uses only existing server endpoints and server-side community administrator authorization',()=>{
 const api=read('src/lib/session-competition-api.ts');
 assert.match(api,/competition-result\/roster/);
 assert.match(api,/sessions\/competition-results/);
 assert.match(api,/method:'POST',body:payload/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)/);
 assert.doesNotMatch(api,/goals|assists|score:/);
});
test('post-game editor never posts before explicit user approval and keeps session/account isolation',()=>{
 const s=read('app/sessions/[id]/result.tsx');
 assert.match(s,/buildSessionCompetitionResult\(outcome,roster\)/);
 assert.match(s,/Alert.alert\('Registar resultado oficial\?'/);
 assert.match(s,/if\(writing.current\|\|version!==generation.current\|\|actor!==identityRef.current\)return/);
 assert.match(s,/Promise.all\(\[/);
 assert.match(s,/recordedIds.includes\(sessionId\)/);
 assert.match(s,/setRecorded\(true\);setRoster\(\[\]\);setSuccess/);
 assert.match(s,/if\(version!==generation.current\|\|actor!==identityRef.current\)return/);
 assert.match(s,/if\(!Number.isSafeInteger\(reply\?\.id\)\|\|reply.id<=0\)/);
 assert.match(s,/confirmedIdentity&&!recorded&&!loading/);
 assert.match(s,/setLoadedIdentity\(''\)/);
});
test('session details only offer entry for community games that have actually taken place',()=>{
 const s=read('app/sessions/[id].tsx');
 assert.match(s,/detail\?\.communityId&&owner&&detail.status!=='CANCELLED'/);
 assert.match(s,/Date.parse\(detail.gameDate\)<Date.now\(\)/);
 assert.match(s,/pathname:'\/sessions\/\[id\]\/result'/);
 assert.match(s,/Registar resultado da sessão/);
});

test('absent and late-cancelled players cannot be inserted into a quick result',()=>{
 const eligible=editableCompetitionRoster([
  {...members[0],attendanceStatus:'ATTENDED'},
  {...members[1],attendanceStatus:'PENDING'},
  {id:4,username:'Falta',teamCode:'A',attendanceStatus:'NO_SHOW'},
  {id:5,username:'Tardio',teamCode:'B',attendanceStatus:'LATE_CANCELLED'}
 ]);
 assert.deepEqual(eligible.map(p=>p.username),['Ana','Bruno']);
 assert.equal(buildSessionCompetitionResult('B',eligible).players.length,2);
});
test('community administrators also receive the official result entry for played ranked sessions',()=>{
 const community=read('app/communities/[id].tsx');
 assert.match(community,/owner&&isMember\(community\)&&community.rankingsEnabled&&s.status!=='CANCELLED'/);
 assert.match(community,/Date.parse\(s.gameDate\)<Date.now\(\)/);
 assert.match(community,/title="Registar resultado do jogo"/);
 assert.match(community,/pathname:'\/sessions\/\[id\]\/result'/);
});

test('football stats are optional and preserve explicitly entered zero versus unknown',()=>{
 const roster=editableCompetitionRoster(members);
 assert.equal(roster[0].goals,'');
 assert.equal(roster[0].assists,'');
 assert.deepEqual(buildSessionCompetitionResult('DRAW',roster,'Futebol'),{
  outcome:'DRAW',players:[{username:'Ana',team:'A'},{username:'Bruno',team:'B'}]
 });
 const withStats=roster.map(p=>p.username==='Ana'?{...p,goals:'2',assists:'0'}:
  {...p,goals:'',assists:'1'});
 assert.deepEqual(buildSessionCompetitionResult('A',withStats,'Futebol'),{
  outcome:'A',players:[
   {username:'Ana',team:'A',goals:2,assists:0},
   {username:'Bruno',team:'B',assists:1}
  ]
 });
});
test('reject invalid football goals and assists or individual statistics from other sports',()=>{
 const roster=editableCompetitionRoster(members);
 for(const bad of ['-1','100','2.5','1a','  ', '5e2']){
  const wrong=roster.map((p,i)=>i===0?{...p,goals:bad}:p);
  if(bad==='  ')continue;
  assert.throws(()=>buildSessionCompetitionResult('A',wrong,'Futebol'),/Golos/);
 }
 assert.throws(()=>buildSessionCompetitionResult('A',roster.map((p,i)=>i===1?{...p,assists:'100'}:p),'Futebol'),/Assistências/);
 assert.throws(()=>buildSessionCompetitionResult('A',roster.map((p,i)=>i===0?{...p,goals:'1'}:p),'Andebol'),/Futebol/);
});
test('post game football-only form is gated by sport and passed through session navigation',()=>{
 const view=read('app/sessions/[id]/result.tsx');
 const detail=read('app/sessions/[id].tsx');
 const community=read('app/communities/[id].tsx');
 assert.match(view,/const football=sport==='Futebol'/);
 assert.match(view,/buildSessionCompetitionResult\(outcome,roster,sport\)/);
 assert.match(view,/accessibilityLabel=\{'Golos de '\+player.username\}/);
 assert.match(view,/accessibilityLabel=\{'Assistências de '\+player.username\}/);
 assert.match(view,/roster.filter\(player=>player.selected\)/);
 assert.match(detail,/sport:detail.sport/);
 assert.match(community,/sport:s.sport/);
});
