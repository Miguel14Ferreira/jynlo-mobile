const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {isLevel,levelLabel,filterChoices,sessionChoices}=require('../src/lib/session-level-core.cjs');
const {createSessionPayload}=require('../src/lib/session-create-core.cjs');

test('labels and choices',()=>{
 assert.equal(levelLabel('BEGINNER'),'Iniciante');
 assert.equal(levelLabel(null),'Todos os níveis');
 assert.equal(levelLabel('PRO'),'Todos os níveis');
 assert.equal(isLevel('ADVANCED'),true);
 assert.deepEqual(filterChoices().map(c=>c.value),['','BEGINNER','INTERMEDIATE','ADVANCED']);
 assert.equal(sessionChoices()[0].label,'Todos os níveis');
});

test('create payload sends the level only when one is chosen',()=>{
 const base={sport:'Padel',day:'',time:'',city:'Lisboa',address:'Rua A 1',maxParticipants:'4',price:'0',privateGame:false,password:'',meetingPointInstructions:''};
 const future=new Date(Date.now()+3*86400000);
 const pad=n=>String(n).padStart(2,'0');
 base.day=pad(future.getDate())+'/'+pad(future.getMonth()+1)+'/'+future.getFullYear();
 base.time='19:00';
 let payload;
 try{payload=createSessionPayload({...base,skillLevel:'INTERMEDIATE'},['Padel']);}
 catch(e){base.day=future.getFullYear()+'-'+pad(future.getMonth()+1)+'-'+pad(future.getDate());payload=createSessionPayload({...base,skillLevel:'INTERMEDIATE'},['Padel']);}
 assert.equal(payload.skillLevel,'INTERMEDIATE');
 const none=createSessionPayload({...base,skillLevel:''},['Padel']);
 assert.equal('skillLevel' in none,false);
 const bad=createSessionPayload({...base,skillLevel:'PRO'},['Padel']);
 assert.equal('skillLevel' in bad,false);
});

test('search sends skillLevel and the organizer can change it',()=>{
 const api=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8'));
 assert.match(api,/q\.set\('skillLevel',filters\.skillLevel\)/);
 assert.match(api,/\/skill-level`,\{token,method:'PATCH',body:\{skillLevel\}\}/);
 const explore=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/explore.tsx'),'utf8'));
 assert.match(explore,/filterChoices\(\)/);
 assert.match(explore,/setSkillLevel\(''\)/);
});
