const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {buildSessionCompetitionResult,editableCompetitionRoster,confirmedPlayerStatistics}=require('../src/lib/session-competition-result.cjs');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
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
 assert.match(api,/entries\?:Array<\{username:string;goals:number;assists:number\}>/);
});
test('post-game editor never posts before explicit user approval and keeps session/account isolation',()=>{
 const s=read('app/sessions/[id]/result.tsx');
 assert.match(s,/buildSessionCompetitionResult\(outcome,roster,sport,scoreA,scoreB\)/);
 assert.match(s,/Alert.alert\('Registar resultado oficial\?'/);
 assert.match(s,/if\(writing.current\|\|version!==generation.current\|\|actor!==identityRef.current\)return/);
 assert.match(s,/Promise.all\(\[/);
 assert.match(s,/recordedIds.includes\(sessionId\)/);
 assert.match(s,/setRecorded\(true\);setRoster\(\[\]\)/);
 assert.match(s,/confirmedPlayerStatistics\(payload,reply\)/);
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
 assert.match(view,/buildSessionCompetitionResult\(outcome,roster,sport,scoreA,scoreB\)/);
 assert.match(view,/accessibilityLabel=\{'Golos de '\+player.username\}/);
 assert.match(view,/accessibilityLabel=\{'Assistências de '\+player.username\}/);
 assert.match(view,/roster.filter\(player=>player.selected\)/);
 assert.match(detail,/sport:detail.sport/);
 assert.match(community,/sport:s.sport/);
});

test('a round acknowledgement never falsely confirms unsupported football statistics',()=>{
 const payload={outcome:'A',players:[
  {username:'Ana',team:'A',goals:2,assists:0},
  {username:'Bruno',team:'B',goals:1}
 ]};
 assert.equal(confirmedPlayerStatistics(payload,{entries:[
  {username:'ana',goals:2,assists:0},{username:'BRUNO',goals:1,assists:0}]}),true);
 assert.equal(confirmedPlayerStatistics(payload,{id:123}),false);
 assert.equal(confirmedPlayerStatistics(payload,{entries:[
  {username:'ana',goals:0,assists:0},{username:'Bruno',goals:0,assists:0}]}),false);
 assert.equal(confirmedPlayerStatistics(payload,{entries:[
  {username:'ana',goals:2,assists:0}]}),false);
 assert.equal(confirmedPlayerStatistics({outcome:'DRAW',players:[
  {username:'Ana',team:'A'},{username:'Bruno',team:'B'}]}, {id:123}),true);
});
test('result UI tells the difference between creating a round and verifying scorer data',()=>{
 const s=read('app/sessions/[id]/result.tsx');
 assert.match(s,/confirmedPlayerStatistics\(payload,reply\)/);
 assert.match(s,/setRecorded\(true\);setRoster\(\[\]\)/);
 assert.match(s,/não foi possível confirmar o marcador ou os golos e assistências guardados/);
});

test('new football stats require an authenticated capability preflight before any POST',()=>{
 const ui=read('app/sessions/[id]/result.tsx');
 const api=read('src/lib/session-competition-api.ts');
 const resultAction=ui.slice(ui.indexOf('writing.current=true;setBusy(true)'),ui.indexOf('}).finally(()=>{writing.current=false'));
 assert.match(api,/competitionSessionCapabilities\(communityId:number,sessionId:number,token:string\|null\)/);
 assert.match(api,/competition-result\/capabilities/);
 assert.match(api,/resource\(communityId,sessionId\)/);
 assert.match(resultAction,/payload.players.some\(player=>player.goals!==undefined\|\|player.assists!==undefined\)/);
 assert.match(resultAction,/capabilities=await competitionSessionCapabilities\(communityId,sessionId,token\)/);
 assert.match(resultAction,/capabilities\?\.version!==1\|\|/);
 assert.match(resultAction,/capabilities.footballGoalsAssists!==true/);
 assert.match(resultAction,/capabilities.footballFinalScore!==true/);
 assert.match(resultAction,/Nenhuma jornada foi enviada/);
 assert.match(resultAction,/if\(version!==generation.current\|\|actor!==identityRef.current\)return null/);
 assert.match(resultAction,/submitted=true;\s*return recordCompetitionSessionResult/);
 assert.ok(resultAction.indexOf('competitionSessionCapabilities(communityId,sessionId,token)')<
  resultAction.indexOf('return recordCompetitionSessionResult('));
 assert.match(resultAction,/submitted\?' Consulta as jornadas antes de repetir, para evitar resultados duplicados\.':''/);
});
test('legacy winner-only match reporting skips stats negotiation and keeps real round verification',()=>{
 const api=read('src/lib/session-competition-api.ts');
 const ui=read('app/sessions/[id]/result.tsx');
 const roster=editableCompetitionRoster(members);
 const payload=buildSessionCompetitionResult('B',roster);
 assert.ok(payload.players.every(p=>!Object.hasOwn(p,'goals')&&!Object.hasOwn(p,'assists')));
 assert.match(ui,/if\(payload.players.some\(player=>player.goals!==undefined\|\|player.assists!==undefined\)\|\|payload.scoreA!==undefined\)\{/);
 assert.match(api,/return request<\{id:number;entries\?:Array<\{username:string;goals:number;assists:number\}>;teamScore\?:\{sideA:number;sideB:number\}\|null\}>\(/);
 assert.match(ui,/if\(!Number.isSafeInteger\(reply\?\.id\)\|\|reply.id<=0\)/);
});

test('result editor negotiates football fields at load and preserves legacy winner-only submissions',()=>{
 const view=read('app/sessions/[id]/result.tsx');
 assert.match(view,/const \[playerStatsSupported,setPlayerStatsSupported\]=useState\(false\)/);
 assert.match(view,/football\?competitionSessionCapabilities\(communityId,sessionId,auth.token\)\.catch\(\(\)=>null\):Promise.resolve\(null\)/);
 assert.match(view,/setPlayerStatsSupported\(football&&capabilities\?\.version===1&&capabilities.footballGoalsAssists===true\)/);
 assert.match(view,/setPlayerStatsSupported\(false\)/);
 assert.match(view,/football&&playerStatsSupported\?roster.filter\(player=>player.selected\)/);
 assert.match(view,/Ainda não é possível registar o marcador/);
 assert.match(view,/Podes registar vitória ou empate/);
 assert.match(view,/return recordCompetitionSessionResult\(communityId,sessionId,token,payload\)/);
});

test('football official score is optional and never derived from player statistics',()=>{
 const roster=editableCompetitionRoster(members);
 assert.deepEqual(buildSessionCompetitionResult('A',roster,'Futebol','3','1'),{
  outcome:'A',players:[{username:'Ana',team:'A'},{username:'Bruno',team:'B'}],
  scoreA:3,scoreB:1
 });
 assert.deepEqual(buildSessionCompetitionResult('DRAW',roster,'Futebol','0','0'),{
  outcome:'DRAW',players:[{username:'Ana',team:'A'},{username:'Bruno',team:'B'}],
  scoreA:0,scoreB:0
 });
 assert.deepEqual(buildSessionCompetitionResult('B',roster,'Futebol'),{
  outcome:'B',players:[{username:'Ana',team:'A'},{username:'Bruno',team:'B'}]
 });
});
test('score must be complete, consistent with winner and not below known player goals',()=>{
 const roster=editableCompetitionRoster(members);
 for(const invalid of [['','1'],['1',''],['100','1'],['-1','0'],['1.5','1']]){
  assert.throws(()=>buildSessionCompetitionResult('A',roster,'Futebol',...invalid));
 }
 assert.throws(()=>buildSessionCompetitionResult('A',roster,'Futebol','0','1'),/vencedor|empate/);
 assert.throws(()=>buildSessionCompetitionResult('A',roster,'Futebol','1','1'),/vencedor|empate/);
 assert.throws(()=>buildSessionCompetitionResult('A',roster,'Andebol','2','1'),/Futebol/);
 const scorers=roster.map((p,i)=>i===0?{...p,goals:'3'}:p);
 assert.throws(()=>buildSessionCompetitionResult('A',scorers,'Futebol','2','1'),/excedem/);
 assert.equal(buildSessionCompetitionResult('A',scorers,'Futebol','3','1').scoreA,3);
});
test('official score success requires the backend to return the exact persisted team score',()=>{
 const {confirmedOfficialScore}=require('../src/lib/session-competition-result.cjs');
 const payload=buildSessionCompetitionResult('B',editableCompetitionRoster(members),'Futebol','1','4');
 assert.equal(confirmedOfficialScore(payload,{teamScore:{sideA:1,sideB:4}}),true);
 assert.equal(confirmedOfficialScore(payload,{teamScore:{sideA:1,sideB:3}}),false);
 assert.equal(confirmedOfficialScore(payload,{teamScore:null}),false);
 assert.equal(confirmedOfficialScore(payload,{id:31}),false);
 assert.equal(confirmedOfficialScore(buildSessionCompetitionResult('B',editableCompetitionRoster(members)),{id:31}),true);
});
test('official score fields are visible only if authenticated backend confirms football score capability',()=>{
 const screen=read('app/sessions/[id]/result.tsx');
 const api=read('src/lib/session-competition-api.ts');
 assert.match(screen,/const \[scoreA,setScoreA\]=useState\(''\),\[scoreB,setScoreB\]=useState\(''\)/);
 assert.match(screen,/setScoreSupported\(football&&capabilities\?\.version===1&&capabilities.footballFinalScore===true\)/);
 assert.match(screen,/football&&scoreSupported\?<View style=\{styles.scorePanel\}>/);
 assert.match(screen,/accessibilityLabel="Golos oficiais Equipa A"/);
 assert.match(screen,/accessibilityLabel="Golos oficiais Equipa B"/);
 assert.match(screen,/confirmedOfficialScore\(payload,reply\)/);
 assert.match(api,/footballFinalScore\?:boolean/);
 assert.match(api,/teamScore\?:\{sideA:number;sideB:number\}/);
});
