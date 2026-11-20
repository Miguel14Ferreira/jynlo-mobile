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
 assert.match(panel,/kind==='feed'&&\(replyTo===null/);
 assert.match(panel,/\{kind==='feed'&&replyTo===item\.id\?/);
 assert.match(panel,/styles\.inlineCommentComposer/);
 assert.match(panel,/\{kind==='chat'\?composer:null\}/);
 assert.match(panel,/\?orderedTeamFeed\(searchActive\?searchResults:allFeedEntries,collapsedFeedPosts,searchActive,replyTo\)/);
 assert.ok(panel.includes("kind==='chat'?<>"));
 assert.ok(panel.includes("emojis.filter(emoji=>(reactions[item.id]?.counts?.[emoji]||0)>0)"));
 assert.ok(panel.includes("feedReactionPickerId===item.id?emojis.map"));
 assert.match(panel,/teamContentHistory\(teamId,kind,token\)/);
});


test('team feed threads comments without hiding replies whose parents are not loaded',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/function orderedTeamFeed\(entries:TeamContentEntry\[\],collapsed:Set<number>,searchActive:boolean,replyTo:number\|null\):TeamContentEntry\[\]/);
 assert.match(panel,/const byId=new Map\(entries\.map\(item=>\[item\.id,item\]\)\)/);
 assert.match(panel,/const rootOf=\(item:TeamContentEntry\):number=>/);
 assert.match(panel,/const rootById=new Map<number,number>\(\)/);
 assert.match(panel,/const cached=rootById\.get\(item\.id\)/);
 assert.match(panel,/for\(const id of chain\)rootById\.set\(id,root\)/);
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
 assert.match(panel,/replyTo===null\|\|!\(searchActive\?searchResults:allFeedEntries\)\.some/);
 assert.match(panel,/onPress=\{\(\)=>switchReply\(item\.id\)\}/);
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


test('team post drafts and attachments remain separate from comment drafts across targets and sends',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/feedRootDraft=useRef/);
 assert.match(panel,/feedCommentDrafts=useRef/);
 assert.match(panel,/const switchReply=\(id:number\|null\)=>/);
 assert.match(panel,/feedRootDraft\.current=\{draft,media\}/);
 assert.match(panel,/feedCommentDrafts\.current\.set\(replyTo,\{draft,media\}\)/);
 assert.match(panel,/setDraft\(restored\?\.draft\|\|''\);setMedia\(restored\?\.media\|\|\[\]\)/);
 assert.match(panel,/feedCommentDrafts\.current\.delete\(submittedReply\)/);
 assert.match(panel,/setDraft\(original\.draft\);setMedia\(original\.media\)/);
 assert.match(panel,/feedCommentDrafts\.current\.clear\(\)/);
 assert.match(panel,/if\(sendingNow\.current\|\|accessRevokedRef\.current\)return/);
});

test('one publish action supports text, photos, videos, captions and individual attachment removal',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const album=read('src/lib/chat-photo-album.ts');
 assert.match(panel,/if\(media\.length\)\{await sendMedia\(\);return;\}/);
 assert.match(panel,/sendChatPhotoAlbum\(\{scope:'team',id:teamId,kind\},token,selection,submittedReply,submittedDraft\)/);
 assert.match(panel,/disabled=\{sending\|\|uploading\|\|\(!media\.length&&!draft\.trim\(\)\)\}/);
 assert.match(panel,/accessibilityLabel=\{kind==='chat'\?'Enviar mensagem':'Publicar na equipa'\}/);
 assert.match(panel,/file\.type==='image'\?<Image/);
 assert.match(panel,/accessibilityLabel=\{'Retirar anexo '\+\(index\+1\)\}/);
 assert.match(panel,/setMedia\(current=>current\.filter\(\(_,i\)=>i!==index\)\)/);
 assert.doesNotMatch(panel,/Enviar anexos/);
 assert.match(album,/if\(caption\?\.trim\(\)\)form\.append\('caption',caption\.trim\(\)\)/);
 assert.match(album,/if\(replyToMessageId!=null\)form\.append\('replyToMessageId'/);
});
test('disabled private team feed rejects albums distinctly and revokes cached private content',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const album=read('src/lib/chat-photo-album.ts');
 assert.match(album,/target\.kind==='feed'\?'O feed da equipa está desativado\.'/);
 assert.match(album,/O \(\?:chat\|feed\) da equipa/);
 assert.match(panel,/O \(\?:chat\|feed\) da equipa está desativado/);
 assert.match(panel,/revokeIfUnauthorized\(new ApiError\(409,'Conversa desativada\.'\)\)/);
 assert.match(panel,/setEntries\(\[\]\);setOlderEntries\(\[\]\)[\s\S]*?setSearchResults\(\[\]\)/);
});

test('private team messages and feed posts show safe round author photos with fallback',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 const api=read('src/lib/sports-team-content-api.ts');
 const avatars=read('src/lib/sports-teams-api.ts');
 assert.match(api,/profilePicUrl\?:string\|null/);
 assert.match(panel,/teamPlayerAvatarUri\(item\.profilePicUrl\)/);
 assert.match(panel,/!brokenAuthorAvatars\[item\.id\]/);
 assert.match(panel,/onError=\{\(\)=>setBrokenAuthorAvatars\(prev=>/);
 assert.match(panel,/authorAvatarPhoto:\{width:37,height:37,borderRadius:19\}/);
 assert.match(panel,/setBrokenAuthorAvatars\(\{\}\)/);
 assert.match(panel,/setEntries\(\[\]\);setOlderEntries\(\[\]\)[\s\S]*?setSearchResults\(\[\]\)/);
 assert.match(avatars,/^export function teamPlayerAvatarUri/m);
 assert.match(avatars,/if\(!input\)return null/);
 assert.match(avatars,/return API_BASE\+input/);
});


test('private team feed counts threaded comments and collapses them without affecting chat or search',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/function teamFeedCommentCounts\(entries:TeamContentEntry\[\]\):Map<number,number>/);
 assert.match(panel,/const seen=new Set<number>\(\)/);
 assert.match(panel,/collapsedFeedPosts,setCollapsedFeedPosts/);
 assert.match(panel,/searchActive\|\|item\.id===root\|\|!collapsed\.has\(root\)\|\|replyTo===item\.id/);
 assert.match(panel,/accessibilityState=\{\{expanded:!collapsedFeedPosts\.has\(item\.id\)\}\}/);
 assert.match(panel,/setCollapsedFeedPosts\(new Set\(\)\)/);
 assert.match(panel,/if\(id!==null\)setCollapsedFeedPosts/);
});


test('private team feed memoizes threaded cards and reply totals while composing',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/import React,\{useCallback,useEffect,useMemo,useRef,useState\}/);
 assert.match(panel,/const visibleEntries=useMemo\(\(\)=>kind==='feed'/);
 assert.match(panel,/const feedCommentCounts=useMemo\(\(\)=>/);
 assert.match(panel,/teamFeedCommentCounts\(searchActive\?searchResults:allFeedEntries\)/);
 assert.match(panel,/function teamFeedCommentCounts\(entries:TeamContentEntry\[\]\):Map<number,number>/);
 assert.match(panel,/const roots=new Map<number,number\|null>\(\)/);
 assert.match(panel,/for\(const id of chain\)roots\.set\(id,root\)/);
 assert.match(panel,/\{visibleEntries\.map\(item=>/);
 assert.match(panel,/feedCommentCounts\.get\(item\.id\)/);
 assert.match(panel,/\[kind,searchActive,searchResults,entries,allFeedEntries,collapsedFeedPosts,replyTo\]/);
});


test('team feed preloads only four recent post photos; chat retains inline media previews',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/const recentFeedPhotoKeys=useMemo\(\(\)=>/);
 assert.match(panel,/if\(selected\.size>=4\)break/);
 assert.match(panel,/if\(item\.deleted\|\|item\.replyToId!==null\)continue/);
 assert.match(panel,/\['image\/jpeg','image\/png','image\/webp','image\/gif'\]/);
 assert.match(panel,/if\(firstImage\)selected\.add\(item\.id\+':'\+firstImage\.index\)/);
 assert.match(panel,/autoPreview=\{kind==='chat'\?file\.mimeType\.startsWith\('image\/'\):/);
 assert.match(panel,/recentFeedPhotoKeys\.has\(item\.id\+':'\+file\.index\)/);
 assert.match(panel,/onAuthorizationError=\{status=>\{revokeIfUnauthorized/);
});


test('team feed offers likes while private chat shows compact used reactions and optional picker',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/feedReactionPickerId,setFeedReactionPickerId/);
 assert.match(panel,/kind==='feed'\?<>/);
 assert.match(panel,/onPress=\{\(\)=>void react\(item,'❤️'\)\}/);
 assert.match(panel,/Object\.values\(reactions\[item\.id\]\?\.counts\|\|\{\}\)\.reduce/);
 assert.match(panel,/kind==='chat'\\?<>/);
 assert.match(panel,/emojis\\.filter\\(emoji=>\\(reactions\\[item\\.id\\]\\?\\.counts\\?\\.\\[emoji\\]/);
 assert.match(panel,/feedReactionPickerId===item\\.id\\?emojis\\.map/);
 assert.match(panel,/accessibilityState=\{\{expanded:feedReactionPickerId===item\.id/);
 assert.match(panel,/setFeedReactionPickerId\(null\)/);
 assert.match(panel,/teamReactionSummaries\(teamId,kind,ids,token\)/);
});


test('team feed reaction counts update immediately, roll back on error and stop after revoked access',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/const original:TeamReactionState=reactions\[item\.id\]\|\|\{counts:\{\},mine:null\}/);
 assert.match(panel,/if\(original\.mine\)counts\[original\.mine\]=Math\.max\(0/);
 assert.match(panel,/const next=original\.mine===emoji\?null:emoji/);
 assert.match(panel,/reactionVersion\.current\+\+/);
 assert.match(panel,/setReactions\(previous=>\(\{\.\.\.previous,\[item\.id\]:\{counts,mine:next\}\}\)\)/);
 assert.match(panel,/setReactions\(previous=>\(\{\.\.\.previous,\[item\.id\]:original\}\)\)/);
 assert.match(panel,/if\(!accessRevokedRef\.current\)void loadReactions\(\[item\]\)/);
 assert.match(panel,/if\(item\.deleted\|\|reactionBusyRef\.current\|\|accessRevokedRef\.current\)return/);
});


test('private team reaction summaries skip a like pending server confirmation',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/reactionBusyContentId=useRef<number\|null>\(null\)/);
 assert.match(panel,/item\.id!==reactionBusyContentId\.current/);
 assert.match(panel,/reactionBusyContentId\.current=item\.id/);
 assert.match(panel,/reactionBusyContentId\.current=null/);
 assert.match(panel,/if\(!ids\.length\)return/);
 assert.match(panel,/if\(!accessRevokedRef\.current\)void loadReactions\(\[item\]\)/);
});


test('team feed remembers exhausted cursor across websocket and polling refreshes',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/olderExhausted=useRef\(false\)/);
 assert.match(panel,/olderExhausted\.current=page\.length<30\|\|additions\.length===0/);
 assert.match(panel,/setHasOlderPosts\(!olderExhausted\.current\)/);
 assert.match(panel,/olderExhausted\.current=false;setHasOlderPosts\(false\)/);
 assert.doesNotMatch(panel,/setHasOlderPosts\(previous=>previous\|\|history\.length===100\)/);
});

test('team feed history is cursor paginated and scoped to private team membership',()=>{
 const api=read('src/lib/sports-team-content-api.ts');
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(api,/export async function olderTeamFeed\(teamId:number,before:number,token:string,limit=30\)/);
 assert.match(api,/Number\.isSafeInteger\(before\)/);
 assert.match(api,/limit<1\|\|limit>50/);
 assert.match(api,/endpoint\(teamId,'feed'\)\+'\/older\?before='/);
 assert.match(panel,/const \[olderEntries,setOlderEntries\]=useState<TeamContentEntry\[\]>\(\[\]\)/);
 assert.match(panel,/const allFeedEntries=useMemo/);
 assert.match(panel,/new Set\(entries\.map\(item=>item\.id\)\)/);
 assert.match(panel,/const page=await olderTeamFeed\(teamId,oldest,token,30\)/);
 assert.match(panel,/page\.filter\(item=>item\.id<oldest&&!known\.has\(item\.id\)\)/);
 assert.match(panel,/current!==version\.current\|\|accessRevokedRef\.current/);
 assert.match(panel,/if\(!revokeIfUnauthorized\(e\)\)setOlderError/);
 assert.match(panel,/setOlderEntries\(\[\]\);olderRef\.current=\[\];olderExhausted\.current=false;setHasOlderPosts\(false\)/);
 assert.match(panel,/accessibilityRole="button" disabled=\{olderBusy\|\|loading\|\|sending\}/);
});

test('older team posts reconcile edits and deletions in bounded authorized background pages',()=>{
 const api=read('src/lib/sports-team-content-api.ts');
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(api,/export async function reconcileTeamFeedEntries\(teamId:number,ids:number\[\],token:string\)/);
 assert.match(api,/ids\.length>100/);
 assert.match(api,/endpoint\(teamId,'feed'\)\+'\/entries\?ids='/);
 assert.match(panel,/olderReconcilePending=useRef\(false\)/);
 assert.match(panel,/Date\.now\(\)-olderReconcileAt\.current<30000/);
 assert.match(panel,/older\.slice\(start,start\+100\)/);
 assert.match(panel,/await reconcileTeamFeedEntries\(teamId,ids,token\)/);
 assert.match(panel,/const fresh=new Map\(updated\.map\(item=>\[item\.id,item\]\)\)/);
 assert.match(panel,/setOlderEntries\(previous=>previous\.filter/);
 assert.match(panel,/if\(expected!==version\.current\|\|accessRevokedRef\.current\)return/);
 assert.match(panel,/if\(expected===version\.current&&!accessRevokedRef\.current\)revokeIfUnauthorized/);
 assert.match(panel,/void reconcileOlder\(expected\)/);
});


test('own historical team post edits and deletions immediately update private loaded pages',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/setOlderEntries\(previous=>\{\s*const next=previous\.map\(item=>item\.id===updated\.id\?updated:item\)/);
 assert.match(panel,/olderRef\.current=next/);
 assert.match(panel,/const tombstone=\(entry:TeamContentEntry\):TeamContentEntry=>entry\.id===item\.id/);
 assert.match(panel,/setOlderEntries\(previous=>\{\s*const next=previous\.map\(tombstone\)/);
 assert.match(panel,/setSearchResults\(previous=>previous\.map\(tombstone\)\)/);
 assert.match(panel,/body:'',deleted:true,attachments:\[\]/);
});


test('stale historical team post responses cannot overwrite successful author edits',()=>{
 const panel=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(panel,/sendingNow\.current\|\|accessRevokedRef\.current\|\|Date\.now\(\)-olderReconcileAt\.current<30000/);
 assert.match(panel,/const writeVersion=mutationVersion\.current/);
 assert.match(panel,/if\(writeVersion!==mutationVersion\.current\)\{olderReconcileAt\.current=0;return;\}/);
 assert.match(panel,/setOlderEntries\(previous=>\{\s*const next=previous\.map\(item=>item\.id===updated\.id\?updated:item\)/);
 assert.match(panel,/setOlderEntries\(previous=>\{\s*const next=previous\.map\(tombstone\)/);
});

test('team identity kit controls meet minimum touch sizing and readable labels',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/swatch:\{width:44,height:44/);
 assert.match(screen,/kitPatternCard:\{flex:1,minWidth:90,minHeight:94/);
 assert.match(screen,/kitPatternText:\{fontSize:13/);
 assert.match(screen,/statLabel:\{color:'#C9E4E8',fontSize:12/);
 assert.match(screen,/tabText:\{fontSize:14/);
 assert.match(screen,/accessibilityLabel=\{'Cor principal '\+color\}/);
 assert.match(screen,/accessibilityState=\{\{selected:kitPrimary===color\}\}/);
});
