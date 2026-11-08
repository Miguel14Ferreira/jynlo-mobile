'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('team balance endpoints preserve server-only authorization and explicit POST',()=>{
 const api=read('src/lib/api.ts');
 assert.match(api,/\/api\/sessions\/\$\{id\}\/teams\/suggestion\?source=\$\{source\}/);
 assert.match(api,/\/api\/sessions\/\$\{id\}\/teams\/confirm\?source=\$\{source\}/);
 assert.match(api,/export async function suggestSessionTeams/);
 assert.match(api,/export async function confirmSessionTeams/);
 assert.match(api,/token,method:'POST'/);
 assert.match(api,/source:'FORM'\|'EXCEL_POINTS'/);
});
test('only organizer of eligible community session sees team balancing',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/auth\.token&&owner&&detail/);
 assert.match(screen,/detail\.communityId\?<View style=\{styles\.editor\}>/);
 assert.match(screen,/suggestSessionTeams\(id,auth\.token,teamSource\)/);
 assert.match(screen,/confirmSessionTeams\(id,auth\.token!,teamSource\)/);
 assert.match(screen,/Alert\.alert\('Confirmar equipas\?'/);
 assert.match(screen,/setTeamPreview\(null\)/);
});
test('team response is server sourced and typed',()=>{
 const types=read('src/lib/types.ts');
 for(const term of ['SessionTeamPlayer','teamA:SessionTeamPlayer[]','teamB:SessionTeamPlayer[]',
   'playersWithStats:number','teamAScore:number','teamBalanceSupported?: boolean'])
  assert.ok(types.includes(term),term);
});

test('random team option is available without rankings and never uses server ranking endpoint',()=>{
 assert.match(screen,/title="Equipas aleatórias"/);
 assert.match(screen,/\(teamSource==='RANDOM'\|\|!detail\.teamBalanceSupported\)\?drawRandomTeams\(participants\):await suggestSessionTeams/);
 assert.match(screen,/\(!detail\.teamBalanceSupported\|\|teamSource==='RANDOM'\)\?'Sortear equipas'/);
 assert.match(screen,/\(teamSource==='RANDOM'\|\|!detail\.teamBalanceSupported\)\?<Button secondary title="Sortear novamente"/);
 assert.match(screen,/Ainda não guarda as equipas no servidor/);
 assert.match(screen,/teamsBusy\|\|teamSource==='RANDOM'/);
});
