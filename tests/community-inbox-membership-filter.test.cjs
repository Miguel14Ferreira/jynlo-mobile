'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/chat-api.ts'),'utf8');

test('community inbox filters summaries against verified memberships and deduplicates',()=>{
 const start=source.indexOf(' const allowed=new Map(uniqueGroups.map(group=>[String(group.id),group.name?.trim()||\'Comunidade\']));');
 const end=source.indexOf('\n}',start);
 assert.ok(start>=0&&end>start,'community inbox must have a membership filter');
 const code=source.slice(start,end).replace('new Set<string>()','new Set()');
 const filter=new Function('uniqueGroups','summaries',code);
 const valid={kind:'community',id:'42',latestText:'hello'};
 const results=filter([{id:42,name:' Equipa 42 '}],[{kind:'community',id:'99',latestText:'private'},valid,{...valid,latestText:'duplicate'},{kind:'direct',id:'42'},null]);
 assert.deepEqual(results,[{...valid,title:'Equipa 42'}]);
 assert.deepEqual(filter([],[valid]),[]);
});
