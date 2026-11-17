'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('team profile has focused tabs with active state and avoids mixing chat with roster',()=>{
 const screen=read('app/teams/[id].tsx');
 for(const name of ['Plantel e clube','🏆 Troféus','Publicações','Mensagens'])assert.ok(screen.includes(name),name);
 for(const tab of ['OVERVIEW','TROPHIES','FEED','CHAT'])assert.ok(screen.includes("activeTab==='"+tab+"'"));
 assert.match(screen,/accessibilityRole="tab"/);
 assert.match(screen,/accessibilityState=\{\{selected:activeTab===tab\.id\}\}/);
 assert.match(screen,/activeTab==='FEED'\?<View/);
 assert.match(screen,/activeTab==='CHAT'\?<View/);
 assert.doesNotMatch(screen,/activeTab==='OVERVIEW'\?<View style=\{styles\.panel\}><Text style=\{styles\.heading\}>Feed/);
});

test('roster cards navigate to athlete profiles and owner can remove confirmed players',()=>{
 const screen=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(screen,/pathname:'\/social\/\[username\]'/);
 assert.match(screen,/params:\{username:m\.username\}/);
 assert.match(screen,/removeSportsTeamMember\(teamId,member\.profileId,auth\.token!\)/);
 assert.match(screen,/Alert\.alert\('Remover jogador\?'/);
 assert.match(screen,/member\.role==='OWNER'\)return/);
 assert.match(screen,/isOwner&&m\.role!=='OWNER'/);
 assert.match(screen,/!rosterVerified/);
 assert.match(screen,/setMembers\(current=>current\.filter\(item=>item\.profileId!==member\.profileId\)\)/);
 assert.match(screen,/void load\(true,true\)/);
 assert.match(api,/method:'DELETE'/);
});

test('owner search has a clear no-result state and invite has confirmation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/returnKeyType="search" onSubmitEditing=\{\(\)=>void search\(\)\}/);
 assert.match(screen,/setSearchComplete\(true\)/);
 assert.match(screen,/searchComplete&&inviteCandidates\.length===0/);
 assert.match(screen,/Convite enviado\. O jogador entra no plantel depois de aceitar/);
 assert.match(screen,/searchVersion\.current\+\+/);
 assert.match(screen,/setCandidates\(\[\]\)/);
});

test('team competitions and associated communities have working detail navigation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/pathname:'\/communities\/\[id\]'/);
 assert.match(screen,/params:\{id:String\(m\.communityId\)\}/);
 assert.match(screen,/pathname:'\/tournaments\/\[communityId\]\/\[id\]'/);
 assert.match(screen,/params:\{communityId:String\(item\.communityId\),id:String\(item\.tournamentId\)\}/);
 assert.match(screen,/Ver histórico e troféus/);
 assert.match(screen,/setActiveTab\('TROPHIES'\)/);
});

test('owner permissions work with normalized handles and fail closed on unreadable roster',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const isOwner=rosterVerified&&/);
 assert.match(screen,/const isMember=rosterVerified&&/);
 assert.match(screen,/m\.username\.toLowerCase\(\)===auth\.username!\.toLowerCase\(\)/);
 assert.match(screen,/else\{setMembers\(\[\]\);setRosterVerified\(false\);setPendingVerified\(false\)/);
 assert.match(screen,/setPendingPlayers\(\[\]\);failed\.push\('o plantel'\)/);
});

test('community exits require confirmation and verified membership, with safe reconciliation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/Alert\.alert\('Sair da comunidade\?'/);
 assert.match(screen,/onPress=\{\(\)=>confirmLeaveCommunity\(m\)\}/);
 assert.match(screen,/if\(!auth\.token\|\|savingRef\.current\|\|actionRef\.current\|\|!communitiesVerified/);
 assert.match(screen,/setCommunitiesVerified\(false\)/);
 assert.match(screen,/setCommunities\(current=>current\.filter\(item=>item\.id!==id\)\)/);
 assert.match(screen,/A saída foi enviada, mas não foi possível confirmar a lista atual/);
 assert.match(screen,/releaseAction\(action\)/);
});

test('invitation results exclude current squad members and link to public profiles',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const inviteCandidates=candidates\.filter\(p=>!members\.some\(m=>m\.profileId===p\.profileId\)&&/);
 assert.match(screen,/!pendingPlayers\.some\(invite=>invite\.profileId===p\.profileId\)/);
 assert.match(screen,/inviteCandidates\.map\(p=><View/);
 assert.match(screen,/params:\{username:p\.username\}/);
 assert.match(screen,/Não encontrámos novos jogadores com essa pesquisa/);
});

test('community invitations cannot be repeated if mutation succeeded but refresh failed',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const decided=await answerTeamCommunityMembership\(id,accept,auth\.token\)/);
 assert.match(screen,/setCommunities\(current=>current\.map\(item=>item\.id===id\?decided:item\)\)/);
 assert.match(screen,/O convite foi tratado, mas não foi possível confirmar as associações/);
 assert.match(screen,/setCommunitiesVerified\(false\)/);
});

test('failed team data shows a contextual retry without inventing member or community totals',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/error&&!loading&&!saving\?<Button secondary title="Tentar novamente"/);
 assert.match(screen,/onPress=\{\(\)=>void load\(false,true\)\}/);
 assert.match(screen,/rosterVerified\?members\.length:'—'/);
 assert.match(screen,/communitiesVerified\?communities\.filter\(m=>m\.status==='ACTIVE'\)\.length:'—'/);
});

test('competition application buttons display actual backend state instead of a generic sent label',()=>{
 const screen=read('app/teams/competitions.tsx');
 assert.match(screen,/const applicationStatus=\(competition:OpenTeamCompetition,teamId:number\|null\)=>/);
 assert.match(screen,/a\.communityId===competition\.communityId/);
 assert.match(screen,/status==='APPROVED'\?'Aprovada · inscrição por confirmar'/);
 assert.match(screen,/status==='DECLINED'\?'Candidatura recusada'/);
 assert.match(screen,/status==='PENDING'\?'Pedido em análise'/);
 assert.match(screen,/applicationLabel\(item,chosen\)/);
 assert.match(screen,/!ownedVerified\|\|!applicationsVerified/);
 assert.match(screen,/applied\(item,chosen\)/);
});

test('global team roster uses public avatars with round fallbacks and resets on account changes',()=>{
 const screen=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(api,/profilePicUrl\?: string \| null/);
 assert.match(api,/export function teamPlayerAvatarUri\(input:string\|null\|undefined\):string\|null/);
 assert.match(api,/if\(!input\)return null/);
 assert.match(api,/return API_BASE\+input/);
 assert.match(screen,/teamPlayerAvatarUri\(m\.profilePicUrl\)/);
 assert.match(screen,/!brokenAvatars\[m\.profileId\]/);
 assert.match(screen,/onError=\{\(\)=>setBrokenAvatars\(previous=>\(\{\.\.\.previous,\[m\.profileId\]:true\}\)\)\}/);
 assert.match(screen,/setTeam\(null\);setMembers\(\[\]\);setBrokenAvatars\(\{\}\)/);
 assert.match(screen,/playerAvatarPhoto:\{width:42,height:42,borderRadius:21\}/);
});


test('embedded team chat and feed keep a compact single composer toolbar',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/activeTab==='CHAT'\?<View/);
 assert.match(screen,/activeTab==='FEED'\?<View/);
 assert.match(panel,/style=\{\[styles\.input,kind==='chat'&&styles\.chatInput\]\}/);
 assert.match(panel,/chatInput:\{minHeight:48,maxHeight:120\}/);
 assert.match(panel,/\{attachmentsEnabled\?<>/);
 assert.match(panel,/onPress=\{\(\)=>void composeLocation\(\)\}/);
 assert.match(panel,/clearInterval\(timer\)/);
 assert.match(panel,/item\.username\?\.toLowerCase\(\)===username\.toLowerCase\(\)/);
 assert.doesNotMatch(panel,/headingEmoji/);
 assert.doesNotMatch(panel,/Ver novos momentos|Verificar desafios/);
});


test('team feed has a top post editor and reverse-chronological cards while chat remains chronological',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/const composer=<>/);
 assert.match(panel,/kind==='feed'&&replyTo===null/);
 assert.match(panel,/\{kind==='feed'&&replyTo===item\.id\?/);
 assert.match(panel,/styles\.inlineCommentComposer/);
 assert.match(panel,/\{kind==='chat'\?composer:null\}/);
 assert.match(panel,/kind==='feed'\?orderedTeamFeed\(searchActive\?searchResults:entries\)/);
 assert.match(panel,/kind==='chat'\?'Responder à mensagem':'Comentar publicação'/);
 assert.match(panel,/kind==='chat'\?'Mensagem eliminada':'Publicação eliminada'/);
 assert.match(panel,/if\(accessRevoked\)return/);
 assert.match(panel,/teamContentHistory\(teamId,kind,token\)/);
});


test('team feed threads comments without hiding replies whose parents are not loaded',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/function orderedTeamFeed\(entries:TeamContentEntry\[\]\):TeamContentEntry\[\]/);
 assert.match(panel,/const byId=new Map\(entries\.map\(item=>\[item\.id,item\]\)\)/);
 assert.match(panel,/const rootOf=\(item:TeamContentEntry\):number=>/);
 assert.match(panel,/const seen=new Set<number>\(\[item\.id\]\)/);
 assert.match(panel,/\.flatMap\(\(\[root,items\]\)=>items\.slice\(\)\.sort/);
 assert.match(panel,/styles\.feedComment/);
 assert.match(panel,/kind==='feed'&&item\.replyToId!=null/);
 assert.match(panel,/teamContentHistory\(teamId,kind,token\)/);
 assert.doesNotMatch(panel,/publishPost\(/);
});


test('team feed comment composer stays beside the post and uses private authenticated send',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/const composer=<>/);
 assert.match(panel,/replyTo===item\.id/);
 assert.match(panel,/A comentar publicação de @/);
 assert.match(panel,/replyTo===null\|\|!\(searchActive\?searchResults:entries\)\.some/);
 assert.match(panel,/setReplyTo\(current=>current===item\.id\?null:item\.id\)/);
 assert.match(panel,/sendTeamContent\(teamId,kind,message,token,submittedReply\)/);
 assert.match(panel,/pendingWrites\.current\.has\(writeKey\)/);
 assert.match(panel,/accessRevokedRef\.current/);
});


test('team content authors open ordinary Jynlo profiles without exposing private team material',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/import \{useFocusEffect,useRouter\} from 'expo-router'/);
 assert.match(panel,/accessibilityRole="link" accessibilityLabel=\{'Abrir perfil de @'\+item\.username\}/);
 assert.match(panel,/pathname:'\/social\/\[username\]',params:\{username:item\.username\}/);
 assert.match(panel,/authorLink:\{alignSelf:'flex-start',minHeight:36/);
 assert.match(panel,/teamContentHistory\(teamId,kind,token\)/);
 assert.match(panel,/if\(accessRevoked\)return/);
});
