'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {filterAuthorizedSummaries,filterAuthorizedDirectSummaries}=require('../src/lib/authorized-inbox-summaries.cjs');
const summary=(kind,id,overrides={})=>({
 kind,id,title:'Server supplied title',latestMessageId:6,latestText:'message',
 latestSender:'alice',latestAt:'2026-11-15T12:00:00Z',unreadCount:1,...overrides
});

test('community inbox never trusts unverified membership or server titles',()=>{
 const allowed=new Map([['42','Equipa 42']]);
 const result=filterAuthorizedSummaries('community',allowed,[
  summary('community','99'),summary('community','42'),summary('community','42',{latestText:'duplicate'}),
  summary('direct','42'),null
 ],'Comunidade');
 assert.equal(result.length,1);
 assert.equal(result[0].id,'42');
 assert.equal(result[0].title,'Equipa 42');
 assert.equal(result[0].latestText,'message');
});

test('session inbox excludes other kinds, unapproved IDs and duplicate results',()=>{
 const allowed=new Map([['18','Sessão 18']]);
 const result=filterAuthorizedSummaries('session',allowed,[
  summary('community','18'),summary('session','19'),summary('session','18'),
  summary('session','18',{latestMessageId:7})
 ],'Sessão desportiva');
 assert.deepEqual(result.map(item=>item.title),['Sessão 18']);
});

test('malformed responses and invalid metadata fail closed',()=>{
 const allowed=new Map([['1','Primeira']]);
 for(const invalid of [null,{},'bad',42])assert.deepEqual(filterAuthorizedSummaries('community',allowed,invalid,'Comunidade'),[]);
 const invalid=[
  summary('community','1',{unreadCount:-1}),
  summary('community','1',{unreadCount:NaN}),
  summary('community','1',{latestText:{secret:true}}),
  summary('community','1',{latestMessageId:-2}),
  summary('community','1',{latestAt:123}),
 ];
 assert.deepEqual(filterAuthorizedSummaries('community',allowed,invalid,'Comunidade'),[]);
});

test('invalid first duplicate cannot suppress a later valid summary',()=>{
 const allowed=new Map([['1','Primeira']]);
 const result=filterAuthorizedSummaries('community',allowed,[
  summary('community','1',{unreadCount:-1}),summary('community','1')
 ],'Comunidade');
 assert.equal(result.length,1);
 assert.equal(result[0].unreadCount,1);
});

test('direct messages ignore spoofed peers and malformed duplicate summaries',()=>{
 const allowed=new Map([['bruno','Bruno'],['ana','Ana']]);
 const result=filterAuthorizedDirectSummaries(allowed,[
  summary('direct','outsider'),
  summary('direct','BRUNO',{unreadCount:-1}),
  summary('direct','bruno',{latestText:'valid'}),
  summary('direct','BrUnO',{latestText:'duplicate'})
 ]);
 assert.equal(result.length,2);
 assert.deepEqual(result.map(item=>item.id),['Bruno','Ana']);
 assert.equal(result[0].latestText,'valid');
 assert.equal(result[1].unreadCount,0);
 assert.equal(result[1].latestMessageId,null);
});

test('direct inbox does not accept non-array or untrusted metadata',()=>{
 const allowed=new Map([['ana','Ana']]);
 for(const raw of [null,{},'bad']){
  assert.deepEqual(filterAuthorizedDirectSummaries(allowed,raw),[]);
 }
 const result=filterAuthorizedDirectSummaries(allowed,[
  summary('direct','ANA',{latestAt:123}),
  summary('direct','ANA',{latestMessageId:1.5})
 ]);
 assert.deepEqual(result,[{
  kind:'direct',id:'Ana',latestMessageId:null,latestText:null,
  latestSender:null,latestAt:null,unreadCount:0
 }]);
});
