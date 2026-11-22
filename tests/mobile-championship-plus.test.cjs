const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const tabs=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/_layout.tsx'),'utf8'));
const championship=untranslate(fs.readFileSync(path.join(__dirname,'../app/communities/[id]/championships/create.tsx'),'utf8'));

test('central plus offers championship creation only to authorized community organizers',()=>{
 assert.match(tabs,/groups\.filter\(c=>c\.myRole==='OWNER'\|\|c\.myRole==='ADMIN'\)/);
 assert.match(tabs,/auth\.token&&auth\.username&&!checking&&!checkError&&eligible\.length>0/);
 assert.match(tabs,/Criar campeonato/);
 assert.match(tabs,/eligible\.some\(group=>group\.id===id\)/);
 assert.match(tabs,/selectChampionshipCommunity\(group\.id\)/);
 assert.match(tabs,/pathname:'\/communities\/\[id\]\/championships\/create'/);
 assert.doesNotMatch(tabs,/A criação ficará disponível aqui quando o respetivo fluxo Mobile estiver integrado/);
});

test('championship creation validates membership and sport before submitting',()=>{
 assert.match(championship,/role==='OWNER'\|\|role==='ADMIN'/);
 assert.match(championship,/communityDetails\(communityId,auth\.token,auth\.username\)/);
 assert.match(championship,/disabled=\{saving\|\|!name\.trim\(\)\|\|!seasonLabel\.trim\(\)\|\|!sport\}/);
});
