const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>untranslate(fs.readFileSync(path.join(__dirname,'..',name),'utf8'));

test('team hub displays Jynlo-native navigation for posts, chat, honours and competitions',()=>{
 const detail=read('app/teams/[id].tsx');
 assert.match(detail,/import \{JynloIcon\} from '\.\.\/\.\.\/src\/components\/JynloIcon'/);
 for(const icon of ['post','messages','tournament','championship'])
  assert.ok(detail.includes('name="'+icon+'"'),'missing Jynlo navigation icon '+icon);
 for(const tab of ['FEED','CHAT','TROPHIES'])
  assert.ok(detail.includes("setActiveTab('"+tab+"')"));
 assert.match(detail,/pathname:'\/teams\/competitions',params:\{teamId:String\(teamId\)\}/);
 assert.match(detail,/quickLink:\{flexGrow:1,flexBasis:'42%',minWidth:132/);
 assert.match(detail,/Feed desativado/);
 assert.match(detail,/Chat desativado/);
});

test('team discovery does not repeat owned or joined clubs in search results',()=>{
 const listing=read('app/teams/index.tsx');
 assert.match(listing,/const joinedOnly=joined\.filter\(team=>!owned\.some/);
 assert.match(listing,/const discoveredOnly=teams\.filter\(team=>!owned\.some/);
 assert.match(listing,/!joined\.some\(member=>member\.id===team\.id\)/);
 assert.match(listing,/discoveredOnly\.map\(team=>/);
 assert.match(listing,/discoveredOnly\.length===0/);
 assert.match(listing,/Convite para integrares o plantel/);
 assert.match(listing,/styles\.inviteActions/);
});

test('competition discovery makes chosen team and submission conditions clear',()=>{
 const page=read('app/teams/competitions.tsx');
 assert.match(page,/Seleciona o plantel que queres inscrever/);
 assert.match(page,/Só as equipas que administras aparecem aqui/);
 assert.match(page,/Escolhe uma equipa acima para pedir participação/);
 assert.match(page,/accessibilityRole="radio"/);
 assert.match(page,/accessibilityState=\{\{selected:chosen===team\.id\}\}/);
 assert.match(page,/JynloIcon name="check" active/);
 assert.match(page,/Competições disponíveis/);
 assert.match(page,/Pedir participação/);
 assert.match(page,/!ownedVerified\|\|!applicationsVerified\|\|!item\.applicationsOpen/);
});
