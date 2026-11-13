'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('team endpoints are authenticated and random confirmation sends exact team lists',()=>{
 const api=read('src/lib/api.ts');
 for(const term of ['/teams/suggestion','/teams/confirm','export async function suggestSessionTeams',
 'export async function confirmSessionTeams',"token,method:'POST'","'RANDOM'",
 'teamA:preview?.teamA.map','teamB:preview?.teamB.map'])
  assert.ok(api.includes(term),term);
});
test('organizer can preview and persist server random teams without classification',()=>{
 const screen=read('app/sessions/[id].tsx');
 for(const term of ['detail.communityId?','title="Equipas aleatórias"',
 "suggestSessionTeams(id,actorToken,mode)",
 "confirmSessionTeams(id,actorToken,mode,selectedPreview)",
 'title="Sortear novamente"','Confirmar distribuição de equipas','p.teamCode'])
  assert.ok(screen.includes(term),term);
});
test('team response and persisted roster assignment are typed',()=>{
 const types=read('src/lib/types.ts');
 for(const term of ['SessionTeamPlayer','teamA:SessionTeamPlayer[]','teamB:SessionTeamPlayer[]',
 'playersWithStats:number','teamAScore:number','teamBalanceSupported?: boolean',"teamCode?: 'A' | 'B' | null"])
  assert.ok(types.includes(term),term);
});
