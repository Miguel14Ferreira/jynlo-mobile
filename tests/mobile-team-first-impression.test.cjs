'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=filename=>fs.readFileSync(path.join(__dirname,'..',filename),'utf8');

test('team discovery prioritizes identity and CTA over a long creation form',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/As tuas equipas/);
 assert.match(screen,/Explorar competições/);
 assert.match(screen,/joinedOnly=joined\.filter\(team=>!owned\.some/);
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
 for(const status of ['discovery','mine','memberTeams','memberships','competitions'])
  assert.ok(screen.includes(status+".status==='fulfilled'"),status);
 assert.match(screen,/if\(discovery\.status==='fulfilled'\)setTeams\(discovery\.value\)/);
 assert.match(screen,/if\(mine\.status==='fulfilled'\)setOwned\(mine\.value\)/);
 assert.match(screen,/else\{setInvites\(\[\]\);failed\.push\('convites de jogadores'\);\}/);
 assert.match(screen,/else\{setCompetitionInvites\(\[\]\);failed\.push\('convites para competições'\);\}/);
 assert.match(screen,/As secções afetadas foram ocultadas até uma nova verificação/);
 assert.doesNotMatch(screen,/await Promise\.all\(\[mySportsTeamInvitations/);
});

test('team requests ignore stale results and navigation-away responses',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/const requestVersion=useRef\(0\)/);
 assert.match(screen,/const version=\+\+requestVersion\.current/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/return \(\)=>\{clearInterval\(timer\);resume\.remove\(\);requestVersion\.current\+\+;\}/);
 assert.match(screen,/if\(!silent&&version===requestVersion\.current\)setLoading\(false\)/);
 assert.doesNotMatch(screen,/failed\.push\('pesquisa'\);setTeams\(\[\]\)/);
 assert.doesNotMatch(screen,/failed\.push\('as tuas equipas'\);setOwned\(\[\]\)/);
});

test('membership invitations cannot be submitted repeatedly while saving',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/savingRef\.current\|\|!invites\.some\(item=>item\.teamId===teamId\)/);
 assert.match(screen,/const action=\+\+actionVersion\.current/);
 assert.match(screen,/savingRef\.current=true;setSaving\(true\)/);
 assert.match(screen,/await respondSportsTeamInvitation\(teamId,accept,auth\.token\)/);
 assert.match(screen,/if\(action!==actionVersion\.current\)return/);
 assert.match(screen,/await load\(false,true\)/);
 assert.match(screen,/if\(action===actionVersion\.current\)\{savingRef\.current=false;setSaving\(false\);\}/);
 assert.match(screen,/respond\(x\.teamId,true\)/);
 assert.match(screen,/respond\(x\.teamId,false\)/);
});

test('competition discovery submits filters explicitly and survives partial API failure',()=>{
 const screen=read('app/teams/competitions.tsx');
 assert.match(screen,/const \[filters,setFilters\]=useState\(\{query:'',sport:''\}\)/);
 assert.match(screen,/discoverTeamCompetitions\(filters\.query,filters\.sport,/);
 assert.match(screen,/Promise\.allSettled\(\[/);
 assert.match(screen,/if\(competitions\.status==='fulfilled'\)setRows\(competitions\.value\)/);
 assert.match(screen,/if\(requests\.status==='fulfilled'&&auth\.token\)/);
 assert.match(screen,/setApplications\(requests\.value\);setApplicationsVerified\(true\)/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/requestVersion\.current\+\+;applyGeneration\.current\+\+;applyingRef\.current=false/);
 assert.match(screen,/onSubmitEditing=\{search\}/);
 assert.match(screen,/onPress=\{search\}/);
 assert.doesNotMatch(screen,/\},\[query,sport,auth\.token,teamId\]\)/);
});

test('competition selection stays within owned teams and anonymous users cannot apply',()=>{
 const screen=read('app/teams/competitions.tsx');
 assert.match(screen,/owned\.value\.some\(t=>t\.id===wanted\)/);
 assert.match(screen,/owned\.value\.some\(t=>t\.id===current\)\?current:null/);
 assert.match(screen,/!auth\.token\|\|!chosen\|\|busy\|\|loading\|\|applyingRef\.current\|\|!ownedVerified\|\|!applicationsVerified/);
 assert.match(screen,/!teams\.some\(team=>team\.id===chosen\)/);
 assert.match(screen,/a\.communityId===competition\.communityId/);
 assert.match(screen,/setApplications\(previous=>\[next,\.\.\.previous\.filter\(item=>item\.id!==next\.id\)\]\)/);
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
 assert.match(screen,/requestVersion\.current\+\+;searchVersion\.current\+\+;actionGeneration\.current\+\+/);
 for(const status of ['details','roster','pastEvents','awards','linked'])
  assert.ok(screen.includes(status+".status==='fulfilled'"),status);
 assert.match(screen,/else\{setMembers\(\[\]\);setRosterVerified\(false\)/);
 assert.match(screen,/setCandidates\(\[\]\);setSearchName\(''\)/);
 assert.match(screen,/pendingPlayers\.some\(p=>p\.profileId===profileId\)/);
 assert.match(screen,/if\(!auth\.token\|\|saving\|\|actionRef\.current\|\|!rosterVerified/);
});

test('team rosters and competition data refresh on foreground resume without flashing skeletons',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const load=useCallback\(async\(silent=false,force=false\)=>/);
 assert.match(screen,/if\(!silent\)\{setLoading\(true\);setError\(''\);\}/);
 assert.match(screen,/if\(!force&&\(reading\.current===requestVersion\.current\|\|savingRef\.current\)\)return/);
 assert.match(screen,/setInterval\(\(\)=>\{/);
 assert.match(screen,/AppState\.currentState==='active'&&!savingRef\.current/);
 assert.match(screen,/AppState\.addEventListener\('change',state=>/);
 assert.match(screen,/state==='active'&&!savingRef\.current/);
 assert.match(screen,/clearInterval\(timer\);resume\.remove\(\)/);
 assert.match(screen,/requestVersion\.current\+\+;searchVersion\.current\+\+;/);
 assert.match(screen,/if\(!silent\)setTeam\(null\)/);
});

test('team directory keeps invitations updated when returning to the app without manual refresh',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/const load=useCallback\(async\(silent=false,force=false\)=>/);
 assert.match(screen,/AppState\.addEventListener\('change',state=>/);
 assert.match(screen,/state==='active'&&!savingRef\.current/);
 assert.match(screen,/clearInterval\(timer\);resume\.remove\(\);requestVersion\.current\+\+/);
 assert.match(screen,/if\(!force&&\(reading\.current===requestVersion\.current\|\|savingRef\.current\)\)return/);
 assert.match(screen,/if\(competitions\.status==='fulfilled'\)setCompetitionInvites\(competitions\.value\.filter/);
 assert.match(screen,/if\(memberships\.status==='fulfilled'\)setInvites\(memberships\.value\)/);
 assert.doesNotMatch(screen.slice(screen.indexOf('const timer=setInterval('),screen.indexOf('const resume=AppState.addEventListener(')),/respondSportsTeamInvitation/);
});

test('permanent team chat and feed use authorized, feature-gated server timelines',()=>{
 const team=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-team-content-api.ts');
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(team,/team\.feedEnabled&&isMember&&auth\.token&&auth\.username/);
 assert.match(team,/team\.chatEnabled&&isMember&&auth\.token&&auth\.username/);
 assert.match(team,/<SportsTeamContentPanel teamId=\{teamId\} kind="feed"/);
 assert.match(team,/<SportsTeamContentPanel teamId=\{teamId\} kind="chat"/);
 assert.doesNotMatch(team,/Mensagens de equipa ainda indisponíveis/);
 assert.doesNotMatch(team,/Publicações de equipa ainda indisponíveis/);
 assert.match(api,/\/api\/teams\//);
 assert.match(api,/method:'POST',body:\{body:message,replyToId\}/);
 assert.match(panel,/teamContentHistory\(teamId,kind,token\)/);
 assert.match(panel,/sendTeamContent\(teamId,kind,message,token,submittedReply\)/);
 assert.match(panel,/AppState\.addEventListener\('change',state=>/);
 assert.match(panel,/clearInterval\(timer\);resume\.remove\(\)/);
 assert.match(panel,/Consulta o histórico antes de repetires/);
});

test('team conversations support replies, author edits and owner moderated deletion',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const api=read('src/lib/sports-team-content-api.ts');
 assert.match(panel,/replyTo/);
 assert.match(panel,/sendTeamContent\(teamId,kind,message,token,submittedReply\)/);
 assert.match(panel,/item\.canEdit/);
 assert.match(panel,/item\.canManage/);
 assert.match(panel,/editTeamContent\(teamId,kind,editingId,body,token\)/);
 assert.match(panel,/deleteTeamContent\(teamId,kind,item\.id,token\)/);
 assert.match(panel,/Alert\.alert\('Eliminar conteúdo'/);
 assert.match(panel,/Consulta o histórico antes de repetires/);
 assert.match(api,/method:'PATCH',body:\{body:message\}/);
 assert.match(api,/method:'DELETE'/);
});

test('team chat search is on-demand and does not replace live conversation state',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const api=read('src/lib/sports-team-content-api.ts');
 assert.match(panel,/searchTeamContent\(teamId,kind,term,token\)/);
 assert.match(panel,/searchVersion\.current/);
 assert.match(panel,/searchActive\?searchResults:entries/);
 assert.match(panel,/setSearchActive\(false\)/);
 assert.match(panel,/maxLength=\{80\}/);
 assert.match(api,/encodeURIComponent\(term\)/);
 assert.match(api,/term\.length<2\|\|term\.length>80/);
 assert.match(api,/endpoint\(teamId,kind\)\+'\/search\?q='/);
});

test('team reactions persist one member choice and render server counts',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const api=read('src/lib/sports-team-content-api.ts');
 assert.match(panel,/teamReactionSummaries\(teamId,kind,ids,token\)/);
 assert.match(panel,/setTeamReaction\(teamId,kind,item\.id,emoji,token\)/);
 assert.match(panel,/removeTeamReaction\(teamId,kind,item\.id,token\)/);
 assert.match(panel,/emojis\.map\(emoji=>/);
 assert.match(panel,/reactions\[item\.id\]\?\.mine===emoji/);
 assert.match(panel,/reactionVersion\.current\+\+/);
 assert.match(panel,/setReactions\(previous=>\(\{\.\.\.previous,\.\.\.updated\}\)\)/);
 assert.match(api,/method:'PUT',body:\{emoji\}/);
 assert.match(api,/method:'DELETE'/);
 assert.match(api,/ids\.length>100/);
});

test('team chat private media reuses authenticated viewer and verified native uploads',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const api=read('src/lib/sports-team-content-api.ts');
 const album=read('src/lib/chat-photo-album.ts');
 const pdf=read('src/lib/chat-pdf-attachment.ts');
 const viewer=read('src/components/SecureChatAttachment.tsx');
 assert.match(panel,/teamPrivateAttachmentsAvailable\(teamId,kind,token\)/);
 assert.match(panel,/sendChatPhotoAlbum\(\{scope:'team',id:teamId,kind\},token,selection,submittedReply,submittedDraft\)/);
 assert.match(panel,/<ChatPdfComposer target=\{\{scope:'team',id:teamId,kind\}\}/);
 assert.match(panel,/<SecureChatAttachment key=\{file\.index\} scope="team" kind=\{kind\}/);
 assert.match(panel,/setMedia\(previous=>previous===media\?\[\]:previous\)/);
 assert.match(api,/\/attachments\/availability/);
 assert.match(album,/target\.scope==='team'/);
 assert.match(album,/\/attachments\/batch/);
 assert.match(pdf,/target\.scope==='team'\?'files':'file'/);
 assert.match(pdf,/target\.scope==='team'\?result\.attachments/);
 assert.match(viewer,/if\(scope==='team'\)/);
 assert.match(viewer,/if\(scope==='team'\)return '\/api\/teams\//);
 assert.match(viewer,/credentials:'omit'/);
 assert.match(viewer,/redirect:'error'/);
});

test('switching team chats cannot be blocked by an in-flight request from the previous chat',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/reading=useRef<number\|null>\(null\)/);
 assert.match(panel,/if\(reading\.current===expected\)\{pendingRefresh\.current=true;return;\}/);
 assert.match(panel,/reading\.current=expected/);
 assert.match(panel,/if\(reading\.current===expected&&readRequestVersion\.current===readRequest\)/);
 assert.match(panel,/expected!==version\.current\|\|writeVersion!==mutationVersion\.current/);
 assert.match(panel,/return\(\)=>\{clearInterval\(timer\);resume\.remove\(\);stopObserving\(\)/);
 assert.doesNotMatch(panel,/if\(reading\.current\|\|sendingNow\.current\)return/);
});

test('team chat drops history fetched before a write and avoids overlapping refresh cleanup',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/mutationVersion=useRef\(0\),readRequestVersion=useRef\(0\)/);
 assert.match(panel,/const writeVersion=mutationVersion\.current/);
 assert.match(panel,/expected!==version\.current\|\|writeVersion!==mutationVersion\.current/);
 assert.match(panel,/const readRequest=\+\+readRequestVersion\.current/);
 assert.match(panel,/if\(reading\.current===expected&&readRequestVersion\.current===readRequest\)/);
 assert.match(panel,/pendingRefresh\.current=false/);
 assert.match(panel,/if\(state==='active'\)void refresh\(true,current,true\)/);
 assert.match(panel,/if\(!socketOnline\|\|pollTicks%6===0\)void refresh\(true,current,true\)/);
});

test('team chat uses member-scoped WebSocket hints with polling only as fallback',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const realtime=read('src/lib/team-content-realtime.ts');
 assert.match(panel,/observeTeamContent\(\{teamId,kind,token/);
 assert.match(panel,/onInvalidated:\(\)=>\{if\(version\.current===current&&AppState\.currentState==='active'\)void refresh\(true,current,true\)/);
 assert.match(panel,/if\(!socketOnline\|\|pollTicks%6===0\)void refresh\(true,current,true\)/);
 assert.match(panel,/if\(AppState\.currentState!=='active'\)return/);
 assert.match(panel,/stopObserving\(\)/);
 assert.match(realtime,/type:'AUTH',token/);
 assert.match(realtime,/envelope\.type==='AUTHENTICATED'/);
 assert.match(realtime,/if\(!authenticated\|\|envelope\.type!=='TEAM_CONTENT_INVALIDATED'\)return/);
 assert.match(realtime,/envelope\.teamId!==teamId\|\|envelope\.kind!==kind/);
});

test('confirmed joined squads are listed separately from owned team identities',()=>{
 const screen=read('app/teams/index.tsx');
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(api,/export async function joinedSportsTeams\(token:string\)/);
 assert.match(api,/\/api\/teams\/joined/);
 assert.match(screen,/auth\.token\?joinedSportsTeams\(auth\.token\):Promise\.resolve\(\[\]\)/);
 assert.match(screen,/memberTeams\.status==='fulfilled'/);
 assert.match(screen,/Equipas onde és jogador/);
 assert.match(screen,/joined\.map\(team=><Pressable/);
 assert.match(screen,/params:\{id:String\(team\.id\)\}/);
});


test('team chat clears private content when membership is revoked during background refresh',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/import \{ApiError\} from '\.\.\/lib\/api'/);
 assert.match(panel,/\[401,403,409\]\.includes\(failure\.status\)/);
 assert.match(panel,/accessRevokedRef\.current=true;setAccessRevoked\(true\)/);
 assert.match(panel,/setEntries\(\[\]\);setOlderEntries\(\[\]\)[\s\S]*?setSearchResults\(\[\]\);setSearchActive\(false\)/);
 assert.match(panel,/setMedia\(\[\]\);setAttachmentsEnabled\(false\)/);
 assert.match(panel,/if\(accessRevoked\)return <View/);
 assert.match(panel,/accessRevokedRef\.current=false;setAccessRevoked\(false\)/);
 assert.match(panel,/revalidateBlocked=false/);
 assert.doesNotMatch(panel,/\[teamId,kind,token,loadReactions,accessRevoked\]/);
});

test('confirmed mobile players may leave a squad without owner permissions',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const leaveTeam=\(\)=>\{/);
 assert.match(screen,/!rosterVerified\|\|isOwner\|\|!isMember/);
 assert.match(screen,/item\.role==='PLAYER'/);
 assert.match(screen,/removeSportsTeamMember\(teamId,player\.profileId,auth\.token!\)/);
 assert.match(screen,/setActiveTab\('OVERVIEW'\)/);
 assert.match(screen,/setSaving\(false\);\s*void load\(true,true\)/);
 assert.match(screen,/accessibilityLabel="Sair desta equipa"/);
 assert.match(screen,/rosterVerified&&isMember&&!isOwner/);
 assert.match(screen,/Verifica o plantel antes de repetir/);
});


test('team owners see verified pending invitations and can cancel them safely',()=>{
 const screen=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(api,/export async function pendingSportsTeamPlayers\(teamId:number,token:string\)/);
 assert.match(screen,/pendingSportsTeamPlayers\(teamId,auth\.token!\)/);
 assert.match(screen,/setPendingPlayers\(rows\);setPendingVerified\(true\)/);
 assert.match(screen,/pendingPlayers\.some\(p=>p\.profileId===profileId\)/);
 assert.match(screen,/const cancelPendingInvite=\(invite:TeamPendingPlayerInvitation\)=>/);
 assert.match(screen,/actionRef\.current=true;savingRef\.current=true;setSaving\(true\)/);
 assert.match(screen,/releaseAction\(action\);void load\(true,true\)/);
 assert.match(screen,/Verifica os convites pendentes antes de repetir/);
 assert.match(screen,/title="Verificar convites"/);
 assert.match(screen,/title="Cancelar convite"/);
});

test('team owners have confirmed deletion but history always remains server protected',()=>{
 const detail=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(api,/export async function deleteSportsTeam\(teamId:number,token:string\)/);
 assert.match(api,/request<void>\('\/api\/teams\/'\+validId\(teamId\),\{token,method:'DELETE'\}\)/);
 assert.match(detail,/const deleteTeam=\(\)=>/);
 assert.match(detail,/!isOwner\|\|!rosterVerified\|\|!brandingVerified/);
 assert.match(detail,/Alert\.alert\('Eliminar equipa\?'/);
 assert.match(detail,/deleteSportsTeam\(teamId,auth\.token!\)/);
 assert.match(detail,/router\.replace\('\/teams'\)/);
 assert.match(detail,/disabled=\{saving\|\|!rosterVerified\|\|!brandingVerified\} onPress=\{deleteTeam\}/);
});
test('team feed and chat use native camera, gallery and authenticated PDF composer',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/chooseMedia=async\(source:'gallery'\|'camera'='gallery'\)/);
 assert.match(panel,/requestCameraPermissionsAsync\(\)/);
 assert.match(panel,/launchCameraAsync\(\{/);
 assert.match(panel,/launchImageLibraryAsync\(\{/);
 assert.match(panel,/accessibilityLabel="Abrir câmara"/);
 assert.match(panel,/accessibilityLabel="Selecionar fotografias ou vídeos"/);
 assert.match(panel,/ChatPdfComposer target=\{\{scope:'team',id:teamId,kind\}\}/);
 assert.match(panel,/SecureChatAttachment key=\{file\.index\} scope="team" kind=\{kind\}/);
});

test('team chat has its own scrollable history without moving a reader away from old messages',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/ScrollView ref=\{historyRef\} nestedScrollEnabled/);
 assert.match(panel,/style=\{kind==='chat'\?\[styles\.chatHistory,keyboardOpen&&styles\.chatHistoryKeyboard\]:styles\.feedHistory\}/);
 assert.match(panel,/nearLatest\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-85/);
 assert.match(panel,/latest>latestId\.current&&latestId\.current>0&&!nearLatest\.current/);
 assert.match(panel,/accessibilityLabel="Ver mensagens novas"/);
 assert.match(panel,/historyRef\.current\?\.scrollToEnd\(\{animated:true\}\)/);
 assert.match(panel,/if\(kind==='chat'&&composerFocused\.current&&nearLatest\.current\)/);
});


test('team chat pending media and text sends preserve a newer user draft and selected reply',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/submittedDraft=draft,submittedReply=replyTo/);
 assert.match(panel,/sendChatPhotoAlbum\(\{scope:'team',id:teamId,kind\},token,selection,submittedReply,submittedDraft\)/);
 assert.match(panel,/setDraft\(previous=>previous===submittedDraft\?'':previous\)/);
 assert.match(panel,/setDraft\(previous=>previous===draft\?'':previous\)/);
 assert.match(panel,/setReplyTo\(previous=>previous===submittedReply\?null:previous\)/);
 assert.doesNotMatch(panel,/setMedia\(\[\]\);setDraft\(''\);setReplyTo\(null\)/);
});

test('switching team chats preserves pending write locks without leaking old mutations',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/mutationVersion\.current\+\+;readRequestVersion\.current\+\+;/);
 assert.match(panel,/reading\.current=null;pendingRefresh\.current=false;/);
 assert.match(panel,/const pendingKind=pendingWrites\.current\.get\(writeKey\)/);
 assert.match(panel,/sendingNow\.current=!!pendingKind/);
 assert.match(panel,/setSending\(!!pendingKind\);setUploading\(pendingKind==='media'\)/);
 assert.match(panel,/finally\{if\(current===version\.current\)choosing\.current=false;\}/);
 assert.match(panel,/if\(activeWriteKey\.current===writeKey\)\{\s*sendingNow\.current=false;setSending\(false\);/);
 assert.match(panel,/const initial=needsInitialRead\.current;needsInitialRead\.current=false/);
 assert.match(panel,/if\(current===version\.current\)\{\s*reactionBusyRef\.current=false;reactionBusyContentId\.current=null;setReactionBusyId\(null\);\s*if\(!accessRevokedRef\.current\)void loadReactions\(\[item\]\);/);
 assert.doesNotMatch(panel,/sendingNow\.current=false;\s*if\(current===version\.current\)/);
});

test('private team attachment probes never hide a revoked membership from the chat UI',()=>{
 const api=read('src/lib/sports-team-content-api.ts');
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(api,/import \{ApiError,DEMO_MODE,request\} from '\.\/api'/);
 assert.match(api,/if\(error instanceof ApiError&&\[401,403,409\]\.includes\(error\.status\)\)throw error/);
 assert.match(api,/return false;\s*\}/);
 assert.match(panel,/teamPrivateAttachmentsAvailable\(teamId,kind,token\)\.then\(available=>/);
 assert.match(panel,/setAttachmentsEnabled\(false\);\s*revokeIfUnauthorized\(failure\)/);
 assert.match(panel,/setEntries\(\[\]\);setOlderEntries\(\[\]\)[\s\S]*?setSearchResults\(\[\]\);setSearchActive\(false\)/);
});

test('secure team attachment revocation clears private chat and ignores stale responses',()=>{
 const viewer=read('src/components/SecureChatAttachment.tsx');
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(viewer,/onAuthorizationError\?:\(status:number\)=>void/);
 assert.match(viewer,/\[401,403,409\]\.includes\(response\.status\)&&active\.current/);
 assert.match(viewer,/generation\.current===version&&!controller\.signal\.aborted/);
 assert.match(viewer,/onAuthorizationError\?\.\(response\.status\)/);
 assert.match(panel,/onAuthorizationError=\{status=>\{revokeIfUnauthorized\(new ApiError\(status,'Anexo privado indisponível\.'\)\);\}\}/);
 assert.match(panel,/setEntries\(\[\]\);setOlderEntries\(\[\]\)[\s\S]*?setSearchResults\(\[\]\);setSearchActive\(false\)/);
});


test('team chat blocks duplicate writes across a same-team focus change',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.ok(panel.includes("const writeKey=teamId+'|'+kind+'|'+token"));
 assert.match(panel,/pendingWrites=useRef\(new Map<string,'media'\|'text'\|'edit'\|'delete'>\(\)\)/);
 for(const kind of ['media','text','edit','delete']){
  assert.ok(panel.includes("pendingWrites.current.set(writeKey,'"+kind+"')"),kind);
 }
 const locks=panel.match(/pendingWrites\.current\.has\(writeKey\)/g)||[];
 const releases=panel.match(/pendingWrites\.current\.delete\(writeKey\)/g)||[];
 assert.equal(locks.length,4);
 assert.equal(releases.length,4);
 assert.match(panel,/if\(activeWriteKey\.current===writeKey\)activeWriteKey\.current=''/);
 assert.match(panel,/needsInitialRead\.current=!!pendingKind/);
 assert.match(panel,/void refresh\(!initial,version\.current\)/);
});

test('team chat aligns compact controls with other chats and preserves same-team drafts on refocus',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/import \{JynloIcon\} from '\.\/JynloIcon'/);
 for(const name of ['search','close','reply','edit','remove','gallery','camera','send'])
  assert.ok(panel.includes('name="'+name+'"'),name);
 for(const label of ['Pesquisar mensagens','Voltar à conversa','Responder à mensagem',
  'Editar mensagem da equipa','Eliminar mensagem da equipa','Selecionar fotografias ou vídeos','Abrir câmara'])
  assert.ok(panel.includes(label),label);
 assert.match(panel,/const changedConversation=focusedIdentity\.current!==writeKey/);
 assert.match(panel,/if\(changedConversation\)\{setDraft\(''\);setReplyTo\(null\);setEditingId\(null\);setEditDraft\(''\);[\s\S]*?feedCommentDrafts\.current\.clear\(\);\}/);
 assert.match(panel,/onStatus:status=>\{if\(version\.current===current\)\{/);
 assert.match(panel,/connection==='online'\?'Em tempo real'/);
 assert.match(panel,/entryAction:\{minWidth:40,minHeight:40/);
});

test('team conversation renders trusted GIFs and maps and only drafts location after permission',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/import \{giphyImageUrl\} from '\.\.\/lib\/chat-giphy\.cjs'/);
 assert.match(panel,/import \{chatLocationUrl\} from '\.\.\/lib\/chat-location\.cjs'/);
 assert.match(panel,/!item\.deleted&&giphyImageUrl\(item\.body\)\?<Image/);
 assert.match(panel,/!item\.deleted&&chatLocationUrl\(item\.body\)\?<Pressable/);
 assert.match(panel,/accessibilityLabel="Abrir localização no mapa"/);
 assert.match(panel,/const composeLocation=async\(\)=>/);
 assert.match(panel,/requestForegroundPermissionsAsync\(\)/);
 assert.match(panel,/getCurrentPositionAsync\(\{accuracy:Location\.Accuracy\.Balanced\}\)/);
 assert.match(panel,/setDraft\(previous=>\{/);
 assert.match(panel,/onPress=\{\(\)=>void composeLocation\(\)\}/);
 assert.match(panel,/accessibilityLabel="Partilhar localização atual"/);
 assert.doesNotMatch(panel,/await sendTeamContent\([^)]*link/);
});

test('team chat distinguishes deleted-message conflicts from disabled team privacy',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/if\(e instanceof ApiError&&e\.status===409\)\{\s*\/\/ 409 on edit may mean the message was removed/);
 assert.match(panel,/setError\('Esta mensagem pode ter sido eliminada\. A verificar o histórico\.'\)/);
 assert.match(panel,/setError\('A mensagem já pode ter sido eliminada\. A verificar o histórico\.'\)/);
 assert.match(panel,/if\(changedConversation\)setMedia\(\[\]\)/);
 assert.match(panel,/if\(changedConversation\)\{setDraft\(''\);setReplyTo\(null\)/);
 assert.match(panel,/if\(!revokeIfUnauthorized\(e\)\)/);
});

test('team realtime reconciliation updates old search hits without reviving stale results',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/const searchQueryRef=useRef\(''\),searchActiveRef=useRef\(false\)/);
 assert.match(panel,/searchPendingRef=useRef\(false\),searchRecheckRef=useRef\(false\)/);
 assert.match(panel,/searchActiveRef\.current&&!searchPendingRef\.current&&!searchRecheckRef\.current/);
 assert.match(panel,/void searchTeamContent\(teamId,kind,query,token\)\.then\(results=>/);
 assert.match(panel,/searchGeneration!==searchVersion\.current/);
 assert.match(panel,/searchQueryRef\.current!==query\|\|accessRevokedRef\.current/);
 assert.match(panel,/setSearchResults\(results\);void loadReactions\(results\)/);
 assert.match(panel,/searchActiveRef\.current=false;searchQueryRef\.current='';searchPendingRef\.current=false;searchRecheckRef\.current=false/);
 assert.match(panel,/if\(!revokeIfUnauthorized\(failure\)\)/);
});

test('same-team refocus clears only confirmed text and media after requests settle',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/if\(activeWriteKey\.current!==writeKey\|\|accessRevokedRef\.current\)return/);
 assert.match(panel,/setMedia\(previous=>previous===media\?\[\]:previous\)/);
 assert.match(panel,/setDraft\(previous=>previous===submittedDraft\?'':previous\)/);
 assert.match(panel,/setReplyTo\(previous=>previous===submittedReply\?null:previous\)/);
 assert.match(panel,/if\(current===version\.current\)\s*setEntries\(previous=>/);
 assert.match(panel,/const initial=needsInitialRead\.current;needsInitialRead\.current=false/);
 assert.doesNotMatch(panel,/if\(current!==version\.current\)return;\s*setMedia/);
});
