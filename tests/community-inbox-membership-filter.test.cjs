const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/chat-api.ts'),'utf8'));
const {filterAuthorizedSummaries}=require('../src/lib/authorized-inbox-summaries.cjs');

test('community inbox only uses authenticated membership for visibility and titles',()=>{
 assert.match(source,/const groups=await myCommunities\(token,username\)/);
 assert.match(source,/if\(!Array\.isArray\(groups\)\)throw Error\(/);
 assert.match(source,/if\(!c\|\|!Number\.isSafeInteger\(c\.id\)/);
 assert.match(source,/const allowed=new Map\(uniqueGroups\.map\(/);
 assert.match(source,/filterAuthorizedSummaries\('community',allowed,summaries,'Comunidade'\)/);
 assert.match(source,/if\(!Array\.isArray\(batch\)\)throw Error\(/);
 const valid={kind:'community',id:'42',title:'untrusted',latestMessageId:3,latestText:'hello',
  latestSender:'alice',latestAt:'2026-11-15T12:00:00Z',unreadCount:2};
 const allowed=new Map([['42','Equipa 42']]);
 const result=filterAuthorizedSummaries('community',allowed,[
  {...valid,id:'99',latestText:'private'},valid,{...valid,latestText:'duplicate'},
  {...valid,kind:'direct'},null
 ],'Comunidade');
 assert.deepEqual(result,[{...valid,title:'Equipa 42'}]);
 assert.deepEqual(filterAuthorizedSummaries('community',new Map(),[valid],'Comunidade'),[]);
});
