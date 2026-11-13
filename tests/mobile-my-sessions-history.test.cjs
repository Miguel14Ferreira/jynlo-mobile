'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {organizeMySessions}=require('../src/lib/my-sessions-core.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const now=Date.parse('2026-11-13T12:00:00Z');
const session=(id,offsetHours,status='OPEN')=>({id,gameDate:new Date(now+offsetHours*3600000).toISOString(),status,sport:'Futebol',city:'Lisboa'});
test('future sessions appear in chronological order, with no duplicates across owned, confirmed and waitlist',()=>{
 const data={created:[session(1,5),session(2,1)],joined:[session(1,5),session(3,2)],waitlisted:[session(3,2),session(4,8)]};
 const result=organizeMySessions(data,now);
 assert.deepEqual(result.upcoming.map(s=>s.items.map(i=>i.id)),[[2,1],[3],[4]]);
 assert.deepEqual(result.history.map(s=>s.items.length),[0,0,0]);
});
test('server cancelled and completed sessions always appear under history, even if their date is future',()=>{
 const data={created:[session(1,-5),session(2,5,'CANCELLED'),session(3,-1,'COMPLETED'),session(4,7)] ,joined:[],waitlisted:[]};
 const result=organizeMySessions(data,now);
 assert.deepEqual(result.upcoming[0].items.map(s=>s.id),[4]);
 assert.deepEqual(result.history[0].items.map(s=>s.id),[2,3,1]);
});
test('malformed data, invalid time and duplicate identifiers are filtered without crashing lists',()=>{
 const data={created:[null,{id:0,gameDate:'invalid'},{id:2,gameDate:'invalid'},session(1,6),session(1,7)],joined:'not-an-array',waitlisted:[session(3,-6)]};
 const result=organizeMySessions(data,now);
 assert.deepEqual(result.upcoming.map(s=>s.items.map(i=>i.id)),[[1],[],[]]);
 assert.deepEqual(result.history.map(s=>s.items.map(i=>i.id)),[[],[],[3]]);
 assert.deepEqual(organizeMySessions(null,now).upcoming.map(s=>s.items.length),[0,0,0]);
});
test('screen renders upcoming grouped lists and optionally opens past sessions with accurate labels',()=>{
 const source=read('app/my-sessions.tsx');
 assert.match(source,/organizeMySessions\(loadedIdentity===identity\?data:null\)/);
 assert.match(source,/sections.upcoming.filter\(section=>section.items.length>0\)/);
 assert.match(source,/sections.history.filter\(section=>section.items.length>0\)/);
 assert.match(source,/accessibilityState=\{\{expanded:showHistory\}\}/);
 assert.match(source,/Ver histórico/);
 assert.match(source,/Não tens sessões futuras/);
 assert.match(source,/SessionCard key=\{item.id\} session=\{item\} onPress=\{\(\)=>open\(item\)\}/);
 assert.match(read('src/lib/my-sessions-core.d.cts'),/organizeMySessions/);
});

test('failed personal session requests have an explicit safe retry',()=>{
 const screen=read('app/my-sessions.tsx');
 assert.match(screen,/Tentar carregar novamente/);
 assert.match(screen,/disabled=\{loading\} onPress=\{\(\)=>\{void load\(\);\}\}/);
 assert.match(screen,/if\(!auth.token\|\|!auth.username\)\{setLoading\(false\);return;\}/);
});
