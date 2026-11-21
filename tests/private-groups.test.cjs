'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const core=require('../src/lib/private-groups-core.cjs');

test('group name and messages follow the server limits',()=>{
 assert.equal(core.validateGroupTitle('  Futebol   de sábado '),'Futebol de sábado');
 assert.throws(()=>core.validateGroupTitle('a'),/2 e 90/);assert.throws(()=>core.validateGroupTitle('x'.repeat(91)),/2 e 90/);
 assert.equal(core.validateGroupMessage('  olá \u0000'),'olá');
 assert.throws(()=>core.validateGroupMessage('  '),/Escreve/);assert.throws(()=>core.validateGroupMessage('x'.repeat(2001)),/2000/);
});

test('invitees are distinct, never yourself, and respect the 30-member cap',()=>{
 assert.deepEqual(core.validateInvitees(['Ana','ana','miguel','  rui '],'Miguel',1),['Ana','rui']);
 assert.throws(()=>core.validateInvitees(['miguel'],'miguel',1),/pelo menos/);
 assert.throws(()=>core.validateInvitees(['a','b'],'me',29),/no máximo 1 pessoa/);
 assert.throws(()=>core.validateInvitees(['a'],'me',30),/30 membros/);
});

test('messages merge by id, oldest first, without duplicates',()=>{
 const m=(id)=>({id,groupId:1,sender:'a',text:String(id),createdAt:''});
 assert.deepEqual(core.mergeMessages([m(3),m(1)],[m(2),m(3),m(5)]).map(x=>x.id),[1,2,3,5]);
});

test('roles, labels and friend filtering',()=>{
 const g={id:1,title:'x',creatorUsername:'Miguel',members:[{username:'Miguel'},{username:'ana'}]};
 assert.equal(core.isCreator(g,'miguel'),true);assert.equal(core.isCreator(g,'ana'),false);
 assert.equal(core.membersLabel(1),'1 membro');assert.equal(core.membersLabel(3),'3 membros');
 const friends=[{username:'ana',nickname:'Ana'},{username:'rui',fullName:'Rui Costa'},{username:'zé',nickname:'Zé'}];
 assert.deepEqual(core.invitableFriends(friends,g,'').map(f=>f.username),['rui','zé']);
 assert.deepEqual(core.invitableFriends(friends,null,'cost').map(f=>f.username),['rui']);
});

test('app uses the shared endpoints and listens to group events only as hints',()=>{
 const api=read('src/lib/private-groups-api.ts');
 assert.match(api,/const ROOT='\/api\/private-groups'/);
 for(const m of ["method:'POST'","method:'PATCH'","method:'DELETE'"])assert.ok(api.includes(m),m);
 assert.match(api,/\?beforeId=\$\{beforeId\}/);
 const rt=read('src/lib/session-chat-realtime.ts');
 assert.match(rt,/PRIVATE_GROUP_MESSAGE/);assert.match(rt,/PRIVATE_GROUP_UPDATED/);
 assert.match(read('app/(tabs)/messages.tsx'),/router\.push\('\/groups'\)/);
 assert.match(read('app/_layout.tsx'),/name="groups\/\[id\]"/);
});

test('a group message alert opens the group, never the sender\'s direct chat',()=>{
 const {notificationDestination}=require('../src/lib/notification-route.cjs');
 assert.deepEqual(notificationDestination({type:'CHAT_MESSAGE',privateGroupId:5,relatedUsername:'ana'}),{kind:'group-chat',id:'5'});
 assert.deepEqual(notificationDestination({type:'CHAT_MESSAGE',relatedUsername:'ana'}),{kind:'direct-chat',peer:'ana'});
 assert.match(read('app/notifications.tsx'),/case 'group-chat':router\.push\(\{pathname:'\/groups\/\[id\]'/);
});
