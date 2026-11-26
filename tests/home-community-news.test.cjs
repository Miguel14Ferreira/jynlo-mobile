'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {communityNews,unreadMap}=require('../src/lib/home-community-news.cjs');

const now=Date.parse('2026-11-26T12:00:00Z');
const group={id:7,memberCount:12};

test('unread messages come first',()=>{
 const unread=unreadMap([{kind:'community',id:'7',unreadCount:3},{kind:'session',id:'7',unreadCount:9}]);
 assert.deepEqual(communityNews(group,unread,[{communityId:7,gameDate:'2026-11-27T10:00:00Z'}],now),{kind:'unread',count:3});
});

test('without unread, the soonest future game of that community',()=>{
 const sessions=[
  {communityId:7,gameDate:'2026-11-20T10:00:00Z'},
  {communityId:8,gameDate:'2026-11-27T09:00:00Z'},
  {communityId:7,gameDate:'2026-11-30T10:00:00Z'},
  {communityId:7,gameDate:'2026-11-28T10:00:00Z'},
 ];
 assert.deepEqual(communityNews(group,new Map(),sessions,now),{kind:'game',gameDate:'2026-11-28T10:00:00Z'});
});

test('otherwise the member count, even with bad inputs',()=>{
 assert.deepEqual(communityNews(group,new Map([['7',0]]),null,now),{kind:'members',count:12});
 assert.equal(unreadMap(null).size,0);
});

test('Início shows up to three communities with their news and a see-all link',()=>{
 const src=fs.readFileSync(require('node:path').join(__dirname,'../src/features/home-up-next.tsx'),'utf8');
 assert.match(src,/MAX_COMMUNITIES=3/);
 assert.match(src,/communitySummaries\(token,username,shown\)/);
 assert.match(src,/t\('As tuas comunidades'\)/);
 assert.match(src,/router\.push\('\/communities'\)/);
});
