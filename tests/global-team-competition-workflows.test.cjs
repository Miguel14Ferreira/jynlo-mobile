'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('existing teams can be discovered, created and viewed without creating tournament-specific identities',()=>{
 const api=read('src/lib/sports-teams-api.ts');
 const screen=read('app/teams/index.tsx');
 assert.match(api,/\bdiscoverSportsTeams\b/);
 assert.match(api,/\bmySportsTeams\b/);
 assert.match(api,/\bcreateSportsTeam\b/);
 assert.match(screen,/Criar equipa/);
 assert.match(screen,/Descobrir equipas/);
 assert.match(screen,/Convites para competições/);
});
test('teams are independent of communities and two-sided membership requires approval',()=>{
 const api=read('src/lib/team-community-memberships-api.ts');
 const panel=read('src/components/CommunityTeamsPanel.tsx');
 assert.match(api,/inviteTeamToCommunity/);
 assert.match(api,/requestTeamCommunityMembership/);
 assert.match(api,/answerTeamCommunityMembership/);
 assert.match(panel,/Equipas da comunidade/);
 assert.match(panel,/Pedir adesão/);
 assert.match(panel,/Convidar/);
 assert.match(panel,/não adiciona jogadores individualmente/);
});
test('competition discovery sends an explicit application for selected owned team',()=>{
 const api=read('src/lib/team-competition-applications-api.ts');
 const screen=read('app/teams/competitions.tsx');
 assert.match(api,/discoverTeamCompetitions/);
 assert.match(api,/applyTeamToCompetition/);
 assert.match(screen,/mySportsTeams/);
 assert.match(screen,/applyTeamToCompetition\(competition\.communityId,competition\.type,/);
 assert.match(screen,/Pedir participação/);
 assert.match(screen,/applied\(item,chosen\)/);
});
test('competition admin must approve an application or have an accepted team invite before finalization',()=>{
 const applicants=read('src/components/TeamCompetitionApplications.tsx');
 const invitations=read('src/components/CompetitionTeamSearch.tsx');
 assert.match(applicants,/applicationsVerified&&a\.status==='APPROVED'\?<GlobalTeamEnrollment/);
 assert.match(invitations,/invitation\.status==='ACCEPTED'\?<GlobalTeamEnrollment/);
});
test('global roster is only selected by organizer and players receive individual invitations',()=>{
 const enrollment=read('src/components/GlobalTeamEnrollment.tsx');
 const api=read('src/lib/team-competition-enrollments-api.ts');
 assert.match(enrollment,/finalizeGlobalTeamEntry/);
 assert.match(enrollment,/eligibleGlobalRoster/);
 assert.match(enrollment,/!person\.communityMember/);
 assert.match(enrollment,/inviteGlobalRoster/);
 assert.match(enrollment,/Cada jogador tem de aceitar/);
 assert.match(api,/profileIds:\s*number\[\]/);
 assert.doesNotMatch(api,/registerAllPlayers|autoEnrollPlayers|forceMembership/);
});
test('organizer reloading competition sees previous entry instead of silently duplicating',()=>{
 const enrollment=read('src/components/GlobalTeamEnrollment.tsx');
 const api=read('src/lib/team-competition-enrollments-api.ts');
 assert.match(enrollment,/existingGlobalTeamEntry/);
 assert.match(api,/\/entry/);
 assert.match(enrollment,/operationRef\.current\|\|entry\|\|entryCheck!=='absent'/);
});
test('mobile diagnostics are preserved as artifacts when the runner actually starts',()=>{
 const ci=read('.github/workflows/mobile-develop-integration.yml');
 assert.match(ci,/upload-artifact@v4/);
 assert.match(ci,/if: always\(\)/);
 assert.match(ci,/jynlo-typescript\.log/);
 assert.match(ci,/jynlo-contracts\.log/);
 assert.match(ci,/set -o pipefail/);
});

test('organizer can search teams even if community membership inventory fails',()=>{
 const screen=read('src/components/CompetitionTeamSearch.tsx');
 assert.match(screen,/Promise\.allSettled\(\[/);
 assert.match(screen,/memberships\.status==='fulfilled'/);
 assert.match(screen,/invitations\.status==='fulfilled'/);
 assert.match(screen,/if\(teams\.status==='fulfilled'\)/);
 assert.match(screen,/setInvitesVerified\(false\)/);
 assert.match(screen,/if\(loading\|\|!invitesVerified\|\|existing\.some/);
 assert.match(screen,/disabled=\{loading\|\|!invitesVerified\}/);
 assert.match(screen,/searchVersion\.current\+\+/);
});

test('finalizing a team requires confirmed 404 rather than assuming every API error means absence',()=>{
 const enrollment=read('src/components/GlobalTeamEnrollment.tsx');
 assert.match(enrollment,/import \{ApiError\} from '\.\.\/lib\/api'/);
 assert.match(enrollment,/e instanceof ApiError&&e\.status===404/);
 assert.match(enrollment,/setEntryCheck\('failed'\)/);
 assert.match(enrollment,/entryCheck!=='absent'/);
 assert.match(enrollment,/disabled=\{busy\|\|entryCheck!=='absent'\}/);
 assert.match(enrollment,/setEntryCheck\('present'\)/);
 assert.doesNotMatch(enrollment,/\.catch\(\(\)=>\{ \/\* Team not yet enrolled/);
});

test('global roster selection is limited to 30 eligible players and excludes sent invitations',()=>{
 const screen=read('src/components/GlobalTeamEnrollment.tsx');
 assert.match(screen,/previous\.length<30\?\[\.\.\.previous,id\]:previous/);
 assert.match(screen,/!person\.communityMember\|\|sentIds\.includes\(person\.profileId\)/);
 assert.match(screen,/eligible\.length>30/);
 assert.match(screen,/setSentIds\(current=>\[\.\.\.new Set\(\[\.\.\.current,\.\.\.eligible\]\)\]\)/);
 assert.match(screen,/setRosterLoaded\(false\)/);
 assert.match(screen,/Convite enviado nesta sessão/);
});

test('global roster never silently retries uncertain POST and rechecks after successful invitation',()=>{
 const screen=read('src/components/GlobalTeamEnrollment.tsx');
 assert.match(screen,/const generation=useRef\(0\),operationRef=useRef\(false\)/);
 assert.match(screen,/if\(version!==generation\.current\)return/);
 assert.match(screen,/const refreshed=await eligibleGlobalRoster/);
 assert.match(screen,/Convites enviados, mas não foi possível atualizar o plantel/);
 assert.match(screen,/Confirma o estado dos jogadores antes de repetir/);
 assert.match(screen,/setEntryCheck\('failed'\)/);
 assert.match(screen,/Estado incerto: verifica novamente a inscrição/);
});

test('organizer application settings and submissions fail independently',()=>{
 const panel=read('src/components/TeamCompetitionApplications.tsx');
 assert.match(panel,/Promise\.allSettled\(\[/);
 assert.match(panel,/settings\.status==='fulfilled'/);
 assert.match(panel,/rows\.status==='fulfilled'/);
 assert.match(panel,/setApplicationsVerified\(false\)/);
 assert.match(panel,/if\(version!==generation\.current\)return/);
 assert.match(panel,/return\(\)=>\{generation\.current\+\+;\}/);
});

test('competition decisions require verified pending requests and guard uncertain responses',()=>{
 const panel=read('src/components/TeamCompetitionApplications.tsx');
 assert.match(panel,/!applicationsVerified\|\|!applications\.some\(a=>a\.id===id&&a\.status==='PENDING'\)/);
 assert.match(panel,/operationRef\.current=true/);
 assert.match(panel,/setApplicationsVerified\(false\)/);
 assert.match(panel,/O pedido pode ter sido processado/);
 assert.match(panel,/disabled=\{busy\|\|!applicationsVerified\}/);
 assert.match(panel,/applicationsVerified&&a\.status==='APPROVED'\?<GlobalTeamEnrollment/);
 assert.match(panel,/setLoaded\(false\)/);
});

test('organizer can refresh applications without leaving competition or performing a mutation',()=>{
 const panel=read('src/components/TeamCompetitionApplications.tsx');
 assert.match(panel,/const \[refreshKey,setRefreshKey\]=useState\(0\)/);
 assert.match(panel,/\[communityId,competitionId,type,token,refreshKey\]/);
 assert.match(panel,/title="Atualizar estado das candidaturas"/);
 assert.match(panel,/onPress=\{\(\)=>setRefreshKey\(key=>key\+1\)\}/);
 assert.match(panel,/applicationsVerified\?applications\.length:'—'/);
 assert.match(panel,/!loaded\?<Text/);
 assert.match(panel,/applications\.map\(a=>/);
});

test('unknown global entry is rechecked with GET before another finalize is allowed',()=>{
 const panel=read('src/components/GlobalTeamEnrollment.tsx');
 assert.match(panel,/const \[refreshKey,setRefreshKey\]=useState\(0\)/);
 assert.match(panel,/\[communityId,type,competitionId,globalTeamId,token,refreshKey\]/);
 assert.match(panel,/title="Verificar novamente a inscrição"/);
 assert.match(panel,/entryCheck==='failed'\?<Button/);
 assert.match(panel,/entryCheck!=='absent'/);
 assert.match(panel,/onPress=\{\(\)=>setRefreshKey\(key=>key\+1\)\}/);
});


test('mobile competition applications fail closed until owned teams and prior requests are verified',()=>{
 const screen=read('app/teams/competitions.tsx');
 assert.match(screen,/setOwnedVerified\(false\);setChosen\(null\)/);
 assert.match(screen,/setApplicationsVerified\(false\)/);
 assert.match(screen,/!ownedVerified\|\|!applicationsVerified/);
 assert.match(screen,/!competition\.applicationsOpen/);
 assert.match(screen,/!item\.applicationsOpen\|\|applied\(item,chosen\)/);
 assert.match(screen,/title="Verificar novamente candidaturas e equipas"/);
 assert.match(screen,/O pedido pode ter sido recebido/);
 assert.match(screen,/applyingRef\.current=true/);
 assert.match(screen,/const current=requestVersion\.current,selectedTeamId=chosen/);
 assert.match(screen,/if\(current!==requestVersion\.current\)return/);
});
