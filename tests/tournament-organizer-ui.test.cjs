'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('ecrã exige confirmação antes de escrever resultados e iniciar ou terminar torneio',()=>{
 const file=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 for(const label of ['Publicar calendário?','Confirmar resultado?','Encerrar a liga?'])assert.ok(file.includes(label),label);
 assert.match(file,/canGenerateSchedule/);assert.match(file,/canRecordTournamentResult/);assert.match(file,/canCompleteTournament/);
 assert.match(file,/allVisibleFinished/);assert.match(file,/DEMO_MODE/);
 assert.doesNotMatch(file,/setInterval\(|retry\(/);
});
test('integra só as rotas reais e preserva bloqueio de publicação na demonstração',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/src\/lib\/performance-api/);
 assert.match(screen,/src\/lib\/tournament-fixtures-api/);
 assert.match(screen,/!DEMO_MODE/);
 assert.match(screen,/resultados nunca são calculados/);
});

test('organizer editor validates the actual match and explains special scoring rules',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 const types=fs.readFileSync(path.join(root,'src/lib/tournament-organizer-core.d.cts'),'utf8');
 assert.match(screen,/validateTournamentMatchScore\(tournament,match,home,away\)/);
 assert.match(screen,/const match=matches\.find\(item=>item\.id===id\)/);
 assert.match(screen,/groupNumber:m\.groupNumber/);
 assert.match(screen,/groupNumber:null/);
 assert.match(screen,/tournament\.scoringMode==='CHESS_HALF_POINTS'/);
 assert.match(screen,/Eliminatória: indica o resultado após desempate/);
 assert.match(screen,/match=\{m\} tournament=\{tournament\}/);
 assert.match(types,/export function validateTournamentMatchScore\(/);
});

test('guardar um marcador atualiza calendário, classificação e fases da competição',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 for(const token of [
  'tournamentTable(cid,info,auth.token,auth.username)',
  'teamTournamentGroups(cid,tid,auth.token,auth.username)',
  'Promise.allSettled([',
  'setMatches(response.matches.map',
  'setStandings(table.value)',
  'setGroups(groupState.value)',
  'Classificação oficial',
  'Fases da competição',
  'groups.knockoutStarted',
  'const refreshed=await load(version,true)'
 ]) assert.ok(screen.includes(token),token);
 assert.match(screen,/if\(version!==generation\.current\|\|request!==readVersion\.current\)return false/);
 assert.match(screen,/return \(\)=>\{generation\.current\+\+;readVersion\.current\+\+;\}/);
 assert.match(screen,/if\(fixtures\.status==='rejected'\)throw fixtures\.reason/);
 assert.match(screen,/if\(table\.status==='fulfilled'\)\{setStandings\(table\.value\);\}/);
 assert.match(screen,/else\{setStandings\(null\);setStandingsError\(/);
 assert.match(screen,/setNotice\(refreshed\?success:/);
 assert.match(screen,/if\(silent\)setSyncing\(true\)/);
 assert.match(screen,/if\(silent\)setSyncing\(false\)/);
 assert.doesNotMatch(screen,/setStandings\(.*\.reduce\(/);
});

test('finalized cups retain read-only match results and official outcome',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/tournament\.status!=='DRAFT'\?<View style=\{styles\.panel\}>/);
 assert.match(screen,/tournament\.status==='COMPLETED'\?'Jogos e resultados finais'/);
 assert.match(screen,/canRecord\?<ScoreEditor/);
 assert.match(screen,/officialTournamentOutcome\(tournament\)/);
 assert.match(screen,/allVisibleFinished/);
});

test('failed post-result refresh blocks stale scores and premature league closure',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/\[fixturesVerified,setFixturesVerified\]=useState\(false\)/);
 assert.match(screen,/setFixturesVerified\(false\);setSnapshotVerified\(false\);/);
 assert.match(screen,/setFixturesVerified\(true\);setSnapshotVerified\(true\);\s*setMatches\(response\.matches\.map/);
 assert.match(screen,/const canRecord=fixturesVerified&&canRecordTournamentResult/);
 assert.match(screen,/const allVisibleFinished=fixturesVerified&&matches\.length>0/);
 assert.match(screen,/!type\|\|!fixturesVerified\|\|!auth\.token/);
 assert.match(screen,/Não foi possível confirmar os dados atuais:/);
 assert.match(screen,/Os jogos apresentados não estão confirmados pelo servidor/);
 assert.match(screen,/!loading&&!syncing&&!fixturesVerified&&tournament\.status==='IN_PROGRESS'/);
});

test('organizer can recover from an uncertain server result without replaying the write',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/title="Voltar a sincronizar dados"/);
 assert.match(screen,/onPress=\{\(\)=>\{void load\(generation\.current,!!tournament\);\}\}/);
 assert.match(screen,/setFixturesVerified\(false\);setSnapshotVerified\(false\);/);
 assert.match(screen,/!loading&&!syncing&&!busy&&auth\.token/);
 assert.match(screen,/!fixturesVerified/);
 assert.match(screen,/Não foi possível confirmar os dados atuais:/);
 assert.match(screen,/const canRecord=fixturesVerified&&canRecordTournamentResult/);
 assert.match(screen,/const allVisibleFinished=fixturesVerified&&matches\.length>0/);
});

test('unconfirmed results and tables are never presented as current during recovery',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/setFixturesVerified\(false\);setSnapshotVerified\(false\);\s*setStandings\(null\);setGroups\(null\)/);
 assert.match(screen,/fixturesVerified&&standings\?<View/);
 assert.match(screen,/fixturesVerified&&tournament\.format==='GROUP_KNOCKOUT'&&type==='TEAM'&&groups/);
 assert.match(screen,/fixturesVerified\?matches\.map\(m=><View/);
 assert.match(screen,/fixturesVerified&&matches\.length===0/);
 assert.match(screen,/fixturesVerified&&hasMore\?<Button/);
 assert.match(screen,/fixturesVerified\?matches\.length:0/);
});

test('unconfirmed schedule publishing cannot be repeated after stale status',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/\[snapshotVerified,setSnapshotVerified\]=useState\(false\)/);
 assert.match(screen,/setFixturesVerified\(false\);setSnapshotVerified\(false\)/);
 assert.match(screen,/setStandings\(null\);setGroups\(null\);\s*setSnapshotVerified\(true\);\s*return true/);
 assert.match(screen,/setFixturesVerified\(true\);setSnapshotVerified\(true\)/);
 assert.match(screen,/const canPublish=snapshotVerified&&canGenerateSchedule/);
 assert.match(screen,/setSyncing\(false\);setFixturesVerified\(false\);setSnapshotVerified\(false\)/);
});
