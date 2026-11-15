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

test('an unavailable invitation endpoint does not hide owned or discovered teams',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/Promise\.allSettled\(\[/);
 assert.match(screen,/if\(discovery\.status==='fulfilled'\)setTeams\(discovery\.value\)/);
 assert.match(screen,/if\(mine\.status==='fulfilled'\)setOwned\(mine\.value\)/);
 assert.match(screen,/if\(memberships\.status==='fulfilled'\)setInvites\(memberships\.value\)/);
 assert.match(screen,/if\(competitions\.status==='fulfilled'\)setCompetitionInvites\(competitions\.value\.filter/);
 assert.match(screen,/As restantes secções continuam disponíveis/);
 assert.doesNotMatch(screen,/await Promise\.all\(\[mySportsTeamInvitations/);
});

test('team requests ignore stale results and navigation-away responses',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/const requestVersion=useRef\(0\)/);
 assert.match(screen,/const version=\+\+requestVersion\.current/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/return \(\)=>\{requestVersion\.current\+\+;\}/);
 assert.match(screen,/if\(version===requestVersion\.current\)setLoading\(false\)/);
 assert.doesNotMatch(screen,/failed\.push\('pesquisa'\);setTeams\(\[\]\)/);
 assert.doesNotMatch(screen,/failed\.push\('as tuas equipas'\);setOwned\(\[\]\)/);
});

test('membership invitations cannot be submitted repeatedly while saving',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/if\(!auth\.token\|\|saving\)return;/);
 assert.match(screen,/try\{await respondSportsTeamInvitation\(teamId,accept,auth\.token\);await load\(\);\}/);
 assert.match(screen,/finally\{setSaving\(false\);\}/);
 assert.match(screen,/title="Aceitar convite" disabled=\{saving\} onPress=\{\(\)=>void respond\(x\.teamId,true\)\}/);
 assert.match(screen,/title="Recusar convite" disabled=\{saving\} onPress=\{\(\)=>void respond\(x\.teamId,false\)\}/);
});

test('competition discovery submits filters explicitly and survives partial API failure',()=>{
 const screen=read('app/teams/competitions.tsx');
 assert.match(screen,/const \[filters,setFilters\]=useState\(\{query:'',sport:''\}\)/);
 assert.match(screen,/discoverTeamCompetitions\(filters\.query,filters\.sport,/);
 assert.match(screen,/Promise\.allSettled\(\[/);
 assert.match(screen,/if\(competitions\.status==='fulfilled'\)setRows\(competitions\.value\)/);
 assert.match(screen,/if\(requests\.status==='fulfilled'\)setApplications\(requests\.value\)/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/return \(\)=>\{requestVersion\.current\+\+;\}/);
 assert.match(screen,/onSubmitEditing=\{search\}/);
 assert.match(screen,/onPress=\{search\}/);
 assert.doesNotMatch(screen,/\},\[query,sport,auth\.token,teamId\]\)/);
});

test('competition selection stays within owned teams and anonymous users cannot apply',()=>{
 const screen=read('app/teams/competitions.tsx');
 assert.match(screen,/owned\.value\.some\(t=>t\.id===current\)\?current:null/);
 assert.match(screen,/disabled=\{!auth\.token\|\|!chosen\|\|busy\|\|applied\(item,chosen\)\}/);
 assert.match(screen,/setApplications\(current=>\[next,\.\.\.current\.filter\(item=>item\.id!==next\.id\)\]\)/);
});

test('team profile displays an identity hero with verified roster and competition stats',()=>{
 const screen=read('app/teams/[id].tsx');
 for(const text of ['JYNLO · EQUIPA DESPORTIVA','heroCrest','heroIdentity','statsRow','Jogadores',
  'Comunidades','Troféus','Explorar competições','playerCard','Responsável'])
   assert.ok(screen.includes(text),text);
 assert.match(screen,/communities\.filter\(m=>m\.status==='ACTIVE'\)\.length/);
 assert.match(screen,/standaloneTrophies\.length\+championshipHonours\.length/);
});

test('team profile survives partial API failures and ignores late results after navigation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/Promise\.allSettled\(\[/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/return \(\)=>\{requestVersion\.current\+\+;searchVersion\.current\+\+;\}/);
 assert.match(screen,/details\.status==='fulfilled'/);
 assert.match(screen,/roster\.status==='fulfilled'/);
 assert.match(screen,/pastEvents\.status==='fulfilled'/);
 assert.match(screen,/awards\.status==='fulfilled'/);
 assert.match(screen,/linked\.status==='fulfilled'/);
 assert.match(screen,/version===searchVersion\.current/);
 assert.match(screen,/if\(!auth\.token\|\|saving\|\|!Number\.isSafeInteger\(profileId\)/);
});

test('team rosters and competition data refresh on foreground resume without flashing skeletons',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const load=useCallback\(async\(silent=false\)=>/);
 assert.match(screen,/if\(!silent\)\{setLoading\(true\);setError\(''\);\}/);
 assert.match(screen,/if\(reading\.current===requestVersion\.current\|\|savingRef\.current\)return/);
 assert.match(screen,/setInterval\(\(\)=>\{/);
 assert.match(screen,/AppState\.currentState==='active'&&!savingRef\.current/);
 assert.match(screen,/AppState\.addEventListener\('change',state=>/);
 assert.match(screen,/state==='active'&&!savingRef\.current/);
 assert.match(screen,/clearInterval\(timer\);resume\.remove\(\)/);
 assert.match(screen,/requestVersion\.current\+\+;searchVersion\.current\+\+;/);
 assert.match(screen,/if\(!silent\)setTeam\(null\)/);
});
