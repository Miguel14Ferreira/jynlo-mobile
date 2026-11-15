'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('switching league/cup never renders the fixtures from a previously selected event',()=>{
 const source=read('app/communities/[id]/championships/events.tsx');
 assert.match(source,/const \[loadedEventId,setLoadedEventId\]=useState<number\|null>\(null\)/);
 assert.match(source,/const detailsReady=eventId!==null&&loadedEventId===eventId/);
 assert.match(source,/setLoadedEventId\(null\);setDetailsFailed\(false\);setFixtures\(\[\]\);setRegistrations\(\[\]\);setStandings\(null\)/);
 assert.match(source,/setLoadedEventId\(complete\?eventId:null\)/);
 assert.match(source,/activeEvent&&detailsReady\?<View style=\{styles\.card\}>/);
 assert.match(source,/disabled=\{busy\|\|pending\.current\} onPress=\{\(\)=>setSelected\(item\.id\)\}/);
});

test('a server score update resets the fixture editor instead of leaving stale values',()=>{
 const source=read('app/communities/[id]/championships/events.tsx');
 assert.match(source,/key=\{fixture\.id\+'-'\+fixture\.homeScore\+'-'\+fixture\.awayScore\}/);
 assert.match(source,/!activeEvent\|\|!detailsReady\|\|busy\|\|pending\.current/);
 assert.match(source,/const allDone=detailsReady&&fixtures\.length>0/);
});

test('fixture mutation rights are revoked during every backend reload and on failure',()=>{
 const source=read('app/communities/[id]/championships/fixture.tsx');
 assert.match(source,/setCanWrite\(false\);setFixture\(null\);setRoster\(\[\]\)/);
 assert.match(source,/setFixture\(match\);setCanWrite\(editable\)/);
 assert.match(source,/if\(!canWrite\|\|loading\|\|pending\.current\|\|!fixture\)return/);
});

test('mobile goal creation supports optional same-team assistance and displays it',()=>{
 const api=read('src/lib/championship-owned-events-api.ts');
 const ui=read('app/communities/[id]/championships/fixture.tsx');
 assert.match(api,/assistProfileId\?:number\|null/);
 assert.match(api,/assistProfileId===profileId/);
 assert.match(api,/assistProfileId:assistProfileId\?\?null/);
 assert.match(ui,/setAssist\(null\)/);
 assert.match(ui,/selectedRoster\.filter\(p=>p\.profileId!==player\)/);
 assert.match(ui,/addOwnedFixtureGoal\(cid,chid,eid,fid,selectedTeam,player,parsedMinute,auth\.token!,assist\)/);
 assert.match(ui,/g\.assisterName\?' · Assistência: '\+g\.assisterName/);
});

test('partial fixture API failures cannot enable scoring and expose retry instead of infinite loading',()=>{
 const source=read('app/communities/[id]/championships/events.tsx');
 assert.match(source,/const \[detailsFailed,setDetailsFailed\]=useState\(false\)/);
 assert.match(source,/const complete=a\.status==='fulfilled'&&b\.status==='fulfilled'&&c\.status==='fulfilled'/);
 assert.match(source,/setLoadedEventId\(complete\?eventId:null\)/);
 assert.match(source,/activeEvent&&!detailsReady&&!detailsFailed\?<Loader\/>/);
 assert.match(source,/activeEvent&&detailsFailed\?<Button secondary title="Tentar carregar/);
 assert.match(source,/onPress=\{\(\)=>setDetailsRefresh\(value=>value\+1\)\}/);
});

test('championship organizer privileges are revoked before every membership recheck',()=>{
 const source=read('app/communities/[id]/championships/events.tsx');
 assert.match(source,/setLoading\(true\);setError\(''\);setOrganizer\(false\);setClosed\(true\);setTeams\(\[\]\)/);
 assert.match(source,/const canManage=organizer&&!closed&&!loading&&Boolean\(auth\.token\)/);
 assert.match(source,/const organizerRole=role==='OWNER'\|\|role==='ADMIN'/);
 assert.match(source,/setTeams\(seasonTeams\);setOrganizer\(organizerRole\)/);
 assert.ok(source.indexOf('setTeams(seasonTeams);setOrganizer(organizerRole)')>source.indexOf('await getChampionshipTeams(cid,chid,auth.token)'));
});
