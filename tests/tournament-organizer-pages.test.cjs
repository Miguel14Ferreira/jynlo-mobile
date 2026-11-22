const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {reconcileVisibleFixtures,validateFirstFixturePage,validateNextFixturePage}=require('../src/lib/tournament-organizer-pages.cjs');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('reconciles all previously opened match pages and uses server pagination',async()=>{
 const pages=[
  {page:0,hasMore:true,matches:[{id:1,status:'COMPLETED'},{id:2,status:'COMPLETED'}]},
  {page:1,hasMore:true,matches:[{id:2,status:'COMPLETED'},{id:3,status:'COMPLETED'}]},
  {page:2,hasMore:false,matches:[{id:4,status:'SCHEDULED'}]}
 ];
 const requested=[];
 const fetch=async page=>{requested.push(page);return pages[page];};
 const result=await reconcileVisibleFixtures(fetch,2,()=>true);
 assert.deepEqual(requested,[0,1,2]);
 assert.deepEqual(result.matches.map(m=>m.id),[1,2,3,4]);
 assert.equal(result.page,2);
 assert.equal(result.hasMore,false);
});
test('newly generated knockout fixtures remain visible as a further page',async()=>{
 const data=await reconcileVisibleFixtures(async page=>({
  page,hasMore:page===0,matches:[{id:page+1,status:'SCHEDULED'}]
 }),0,()=>true);
 assert.equal(data.page,0);
 assert.equal(data.hasMore,true);
});
test('if fewer pages remain after updating, stop at server last page',async()=>{
 const queried=[];
 const data=await reconcileVisibleFixtures(async page=>{
  queried.push(page);return {page,hasMore:false,matches:[{id:42}]};
 },4,()=>true);
 assert.deepEqual(queried,[0]);
 assert.equal(data.page,0);
});
test('rejects invalid cursors and missing pages instead of misreporting completion',async()=>{
 await assert.rejects(reconcileVisibleFixtures(async page=>({page:page+1,hasMore:false,matches:[]}),2,()=>true),/página/);
 await assert.rejects(reconcileVisibleFixtures(async page=>({page,hasMore:true,matches:[]}),2,()=>true),/não avançou/);
 await assert.rejects(reconcileVisibleFixtures(async page=>({page,hasMore:false,matches:[{id:0}]}),0,()=>true),/jogo inválido/);
 await assert.rejects(reconcileVisibleFixtures(async()=>({page:0,hasMore:false,matches:[]}),60,()=>true),/Paginação/);
});
test('discard asynchronous replies if user navigated away',async()=>{
 let accept=true,resolve;
 const pending=new Promise(done=>{resolve=done;});
 const operation=reconcileVisibleFixtures(()=>pending,1,()=>accept);
 accept=false;resolve({page:0,hasMore:true,matches:[{id:1}]});
 assert.equal(await operation,null);
});
test('organizer uses server pagination for visible pages on refresh and after saves',()=>{
 const screen=read('app/tournaments/[communityId]/[id]/manage.tsx');
 for(const token of [
  'reconcileVisibleFixtures<TournamentTeamMatch|TournamentIndividualMatch>(',
  'silent?visiblePage.current:0',
  'visiblePage.current=response.page',
  'if(!response)return false',
  'requestedPage,auth.token!,auth.username!'
 ])assert.ok(screen.includes(token),token);
});

test('next-page guards reject invalid cursor, broken empty pages and corrupt matches',()=>{
 const good={page:1,hasMore:false,matches:[{id:12}]};
 assert.equal(validateNextFixturePage(good,1),good);
 for(const response of [
  {page:0,hasMore:false,matches:[{id:12}]},
  {page:1,hasMore:'yes',matches:[{id:12}]},
  {page:1,hasMore:true,matches:[]},
  {page:1,hasMore:false,matches:[{id:0}]},
  {page:1,hasMore:false,matches:null}
 ])assert.throws(()=>validateNextFixturePage(response,1));
 assert.throws(()=>validateNextFixturePage(good,-1));
});
test('organizer checks the server page before updating its pagination cursor',()=>{
 const screen=read('app/tournaments/[communityId]/[id]/manage.tsx');
 assert.match(screen,/const checked=validateNextFixturePage<TournamentTeamMatch\|TournamentIndividualMatch>\(response,next\)/);
 assert.match(screen,/visiblePage\.current=checked\.page;setPage\(checked\.page\);setHasMore\(checked\.hasMore\)/);
 assert.match(screen,/if\(version!==generation\.current\|\|reading!==readVersion\.current\)return;\s*const items=checked\.matches\.map/);
});


test('first-page guard accepts an empty completed calendar but rejects broken cursors and duplicate IDs',()=>{
 const good={page:0,hasMore:false,matches:[{id:11},{id:12}]};
 assert.equal(validateFirstFixturePage(good),good);
 assert.deepEqual(validateFirstFixturePage({page:0,hasMore:false,matches:[]}).matches,[]);
 for(const response of [
  {page:1,hasMore:false,matches:[]},
  {page:0,hasMore:'yes',matches:[]},
  {page:0,hasMore:true,matches:[]},
  {page:0,hasMore:false,matches:[{id:0}]},
  {page:0,hasMore:false,matches:[{id:8},{id:8}]},
  {page:0,hasMore:false,matches:null}
 ])assert.throws(()=>validateFirstFixturePage(response));
});
test('next-page guard also rejects duplicates within the same server page',()=>{
 assert.throws(()=>validateNextFixturePage({page:1,hasMore:false,matches:[{id:10},{id:10}]},1),/repetidos/);
});
test('both mobile calendar screens validate first-page results before displaying them',()=>{
 const team=read('app/tournaments/[communityId]/[id]/fixtures.tsx');
 const individual=read('app/tournaments/[communityId]/[id]/matches.tsx');
 assert.match(team,/validateFirstFixturePage<TournamentTeamMatch>\(matchData\)/);
 assert.match(individual,/validateFirstFixturePage<TournamentIndividualMatch>\(result\)/);
});


test('calendar screens do not mistake API failure for an empty tournament',()=>{
 const team=read('app/tournaments/[communityId]/[id]/fixtures.tsx');
 const individual=read('app/tournaments/[communityId]/[id]/matches.tsx');
 assert.match(team,/canListMatches\(tournament\)&&\(!error\|\|matches\.length>0\)/);
 assert.match(individual,/matches\.length===0&&!error\?<Message>Ainda não existem jogos individuais publicados/);
});
