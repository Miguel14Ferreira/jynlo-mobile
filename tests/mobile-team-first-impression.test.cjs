'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=filename=>fs.readFileSync(path.join(__dirname,'..',filename),'utf8');

test('team discovery prioritizes identity and CTA over a long creation form',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/O teu clube\. A tua história\./);
 assert.match(screen,/const \[createOpen,setCreateOpen\]=useState\(false\)/);
 assert.match(screen,/auth\.token&&createOpen\?/);
 assert.match(screen,/Encontrar torneios e campeonatos/);
 assert.match(screen,/As minhas equipas/);
 assert.match(screen,/Criar nova equipa/);
});

test('team lookup waits for explicit submit instead of sending requests per keystroke',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/const \[submittedQuery,setSubmittedQuery\]=useState\(''\)/);
 assert.match(screen,/discoverSportsTeams\(submittedQuery,/);
 assert.match(screen,/\},\[submittedQuery,auth\.token\]\)/);
 assert.match(screen,/onSubmitEditing=\{search\}/);
 assert.match(screen,/onPress=\{search\}/);
});

test('tournament rosters have structured cards, a bounded progress indicator and a real empty state',()=>{
 const screen=read('app/tournaments/[communityId]/[id]/teams.tsx');
 assert.match(screen,/Ainda sem equipas/);
 assert.match(screen,/heroSub/);
 assert.match(screen,/progressTrack/);
 assert.match(screen,/Math\.min\(100,Math\.round\(t\.players\.length\/t\.playersPerTeam\*100\)\)/);
 assert.match(screen,/Ver plantel e jogos/);
 assert.match(screen,/CompetitionTeamSearch/);
 assert.match(screen,/TeamCompetitionApplications/);
});
