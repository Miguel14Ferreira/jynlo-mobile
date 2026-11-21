const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/lib/availability-core.cjs');

test('day options start today and are local dates',()=>{
 const days=core.dayOptions(new Date(2026,10,21,20,0),3);
 assert.deepEqual(days.map(d=>d.value),['2026-11-21','2026-11-22','2026-11-23']);
 assert.deepEqual(days.map(d=>d.label),['Hoje','Amanhã','seg 23/11']);
});

test('a slot needs a valid time at least an hour ahead and within 60 days',()=>{
 const now=new Date(2026,10,21,18,0).getTime();
 assert.match(core.slotInstant('','10:00',now).error,/dia/);
 assert.match(core.slotInstant('2026-11-28','25:00',now).error,/HH:mm/);
 assert.match(core.slotInstant('2026-11-21','18:30',now).error,/1 hora/);
 assert.match(core.slotInstant('2027-03-01','10:00',now).error,/60 dias/);
 const ok=core.slotInstant('2026-11-28','10:00',now);
 assert.equal(new Date(ok.iso).getTime(),new Date(2026,10,28,10,0).getTime());
});

test('adds sorted slots without duplicates, up to five',()=>{
 let r=core.addSlot([],'2026-11-29T10:00:00.000Z');
 r=core.addSlot(r.slots,'2026-11-28T10:00:00.000Z');
 assert.deepEqual(r.slots,['2026-11-28T10:00:00.000Z','2026-11-29T10:00:00.000Z']);
 assert.match(core.addSlot(r.slots,'2026-11-28T10:00:00.000Z').error,/já está/);
 const five=['a','b','c','d','e'];
 assert.match(core.addSlot(five,'f').error,/máximo 5/);
});

test('best slot: most yes, then most maybe; none without answers',()=>{
 const request={members:4,answered:3,slots:[
  {id:1,startsAt:'2026-11-28T10:00:00Z',yes:['a'],maybe:['b','c'],no:0,mine:null},
  {id:2,startsAt:'2026-11-29T10:00:00Z',yes:['a','b'],maybe:[],no:1,mine:null},
  {id:3,startsAt:'2026-11-30T10:00:00Z',yes:['a','b'],maybe:['c'],no:0,mine:null}]};
 assert.equal(core.bestSlot(request).id,3);
 assert.equal(core.bestSlot({slots:[{id:1,yes:[],maybe:[],no:2}]}),null);
 assert.equal(core.progress(request),'3 de 4 membros responderam');
});

test('create params carry local day and time for the session form',()=>{
 const iso=new Date(2026,10,28,9,30).toISOString();
 assert.deepEqual(core.createParams({startsAt:iso},{communityId:'7'}),{communityId:'7',day:'2026-11-28',time:'09:30'});
});

test('the panel is shown to members of groups and communities and prefills the session form',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.match(read('app/groups/[id].tsx'),/<AvailabilityPanel kind="private" targetId=\{groupId\}/);
 assert.match(read('app/communities/[id].tsx'),/<AvailabilityPanel kind="community" targetId=\{id\}/);
 const create=read('app/sessions/create.tsx');
 assert.match(create,/day\?:string;time\?:string/);
 assert.match(create,/setForm\(withPresetWhen\(emptySessionForm\(\)\)\)/);
 assert.doesNotMatch(read('src/lib/availability-api.ts'),/username=/);
});

test('availability alerts open the group or the community',()=>{
 const {notificationDestination}=require('../src/lib/notification-route.cjs');
 assert.deepEqual(notificationDestination({type:'AVAILABILITY_REQUEST',privateGroupId:5,relatedUsername:'ana'}),{kind:'group-chat',id:'5'});
 assert.deepEqual(notificationDestination({type:'AVAILABILITY_REMINDER',communityId:7}),{kind:'community',id:'7'});
});

test('team chat alerts open the team chat and team chats are in Messages',()=>{
 const {notificationDestination}=require('../src/lib/notification-route.cjs');
 assert.deepEqual(notificationDestination({type:'CHAT_MESSAGE',sportsTeamId:8,relatedUsername:'ana'}),{kind:'team-chat',id:'8'});
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.match(read('app/notifications.tsx'),/case 'team-chat':router\.push\(\{pathname:'\/teams\/\[id\]',params:\{id:destination\.id!,tab:'CHAT'\}\}\)/);
 const messages=read('app/(tabs)/messages.tsx');
 assert.match(messages,/teamChatInbox\(auth\.token\)/);
 assert.match(messages,/\['team','Equipas'\]/);
 assert.match(read('src/components/SportsTeamContentPanel.tsx'),/markTeamChatRead\(teamId,newest,token\)/);
 assert.match(read('app/teams/[id].tsx'),/setConversationMuted\('team',String\(teamId\),!chatMuted,auth\.token\)/);
});

test('private groups: edit rule, reply quote and same chat tools as the other chats',()=>{
 const core=require('../src/lib/private-groups-core.cjs');
 const now=Date.parse('2026-11-21T20:00:00Z');
 const msg=(over)=>({id:1,groupId:5,sender:'ana',text:'Olá',createdAt:'2026-11-21T19:50:00Z',...over});
 assert.equal(core.editableGroupMessage(msg(),'ANA',now),true);
 assert.equal(core.editableGroupMessage(msg({createdAt:'2026-11-21T19:40:00Z'}),'ana',now),false);
 assert.equal(core.editableGroupMessage(msg(),'rui',now),false);
 assert.equal(core.editableGroupMessage(msg({attachments:[{index:0,filename:'a.jpg',mimeType:'image/jpeg',size:10}]}),'ana',now),false);
 assert.equal(core.editableGroupMessage(msg({deleted:true}),'ana',now),false);
 const list=[msg(),msg({id:2,replyToId:1,sender:'rui'}),msg({id:3,replyToId:99})];
 assert.deepEqual(core.replyQuote(list,list[1]),{sender:'ana',text:'Olá'});
 assert.deepEqual(core.replyQuote(list,list[2]),{sender:'',text:'Mensagem anterior'});
 assert.equal(core.replyQuote(list,list[0]),null);
 const screen=fs.readFileSync(path.join(__dirname,'..','app/groups/[id].tsx'),'utf8');
 for(const piece of ["useChatReactions('private'",'<ChatSearchPanel kind="private"',"scope=\"private\"","scope:'private'",'ChatReplyPreview','prepareLocation','editGroupMessage','deleteGroupMessage'])
  assert.ok(screen.includes(piece),piece);
 assert.match(fs.readFileSync(path.join(__dirname,'..','src/components/SecureChatAttachment.tsx'),'utf8'),/\/api\/private-groups\/'\+numeric\+'\/messages\/'\+messageId\+'\/attachments\/'\+index/);
});

test('communities have a feed in the app, like on the web',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const screen=read('app/communities/[id].tsx');
 assert.match(screen,/\{id:'FEED',label:'Feed'\}/);
 assert.match(screen,/<CommunityFeedPanel communityId=\{id\} token=\{auth\.token\} username=\{auth\.username\} canManage=\{owner\}\/>/);
 const api=read('src/lib/community-feed-api.ts');
 assert.match(api,/'\/api\/communities\/'\+id\+'\/posts'/);
 assert.match(read('src/lib/social-feed-api.ts'),/sendMedia\('\/api\/communities\/'\+communityId\+'\/posts'/);
 const panel=read('src/components/CommunityFeedPanel.tsx');
 assert.match(panel,/<ChatMentionText body=\{post\.body\}/);
 assert.match(panel,/<PostAlbumCarousel items=\{album\}/);
});

test('polls in group and team chats, and @mentions in session chat',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.match(read('src/lib/chat-poll-api.ts'),/ChatPollKind='session'\|'community'\|'private'\|'team'/);
 assert.match(read('app/groups/[id].tsx'),/<PollCard poll=\{readPoll\(m\.text\)!\} kind="private"/);
 assert.match(read('src/components/SportsTeamContentPanel.tsx'),/<PollCard poll=\{readPoll\(item\.body\)!\} kind="team"/);
 const session=read('src/components/SessionChatPanel.tsx');
 assert.match(session,/<ChatMentionSuggestions draft=\{draft\}/);
 assert.match(session,/<ChatMentionText body=/);
 const core=require('../src/lib/private-groups-core.cjs');
 assert.equal(core.editableGroupMessage({id:1,groupId:5,sender:'a',text:'[JYNLO:POLL:1]Q\nA\nB',createdAt:new Date().toISOString()},'a'),false);
});
