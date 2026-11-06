'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {filterInbox,unreadInboxCount}=require('../src/lib/inbox-filter.cjs');
const fs=require('node:fs'),path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/(tabs)/messages.tsx'),'utf8');

const inbox=[
 {kind:'direct',id:'Joao_12',latestText:'Vamos jogar amanhã?',latestSender:'João',unreadCount:3},
 {kind:'community',id:'42',latestText:'Próximo treino de ténis',latestSender:'Inês',unreadCount:0},
 {kind:'direct',id:'Ana',latestText:'Está combinado',latestSender:'Ana',unreadCount:1},
 {kind:'session',id:'17',latestText:null,latestSender:null,unreadCount:0}
];
test('search matches visible inbox contact, sender and preview case/accent-insensitively',()=>{
 assert.deepEqual(filterInbox(inbox,'JOAO').map(x=>x.id),['Joao_12']);
 assert.deepEqual(filterInbox(inbox,'ines').map(x=>x.id),['42']);
 assert.deepEqual(filterInbox(inbox,'TENIS').map(x=>x.id),['42']);
 assert.deepEqual(filterInbox(inbox,'comunidade').map(x=>x.id),['42']);
 assert.deepEqual(filterInbox(inbox,'  combinado ').map(x=>x.id),['Ana']);
 assert.equal(filterInbox(inbox,'não existe').length,0);
});
test('unread filter only shows known positive unread counts and can combine with search',()=>{
 assert.deepEqual(filterInbox(inbox,'',true).map(x=>x.id),['Joao_12','Ana']);
 assert.deepEqual(filterInbox(inbox,'ana',true).map(x=>x.id),['Ana']);
 assert.deepEqual(filterInbox(inbox,'ténis',true),[]);
 assert.equal(filterInbox(inbox).length,inbox.length);
});
test('unread total ignores invalid server counters',()=>{
 assert.equal(unreadInboxCount(inbox),4);
 assert.equal(unreadInboxCount([{unreadCount:-5},{unreadCount:NaN},{unreadCount:2.5},{unreadCount:2}]),2);
});
test('filter is local to the authenticated inbox with accessible controls',()=>{
 assert.match(screen,/filterInbox\(items,search,unreadOnly\)/);
 assert.match(screen,/unreadInboxCount\(items\)/);
 assert.match(screen,/accessibilityLabel="Pesquisar conversas pelo contacto ou mensagem"/);
 assert.match(screen,/accessibilityState=\{\{selected:unreadOnly\}\}/);
 assert.match(screen,/displayed\.map\(item=>/);
 assert.match(screen,/Não foram encontradas conversas com estes filtros/);
 assert.match(screen,/setSearch\(''\);setUnreadOnly\(false\)/);
});
