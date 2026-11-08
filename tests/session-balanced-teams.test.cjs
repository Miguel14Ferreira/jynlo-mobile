'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('team endpoints are authenticated and confirmation uses POST',()=>{
 const api=read('src/lib/api.ts');
 assert.match(api,/teams\\/suggestion\\?source=/);
 assert.match(api,/teams\\/confirm\\?source=/);
 assert.match(api,/export async function suggestSessionTeams/);
 assert.match(api,/export async function confirmSessionTeams/);
 assert.match(api,/token,method:'POST'/);
 assert.match(api,/source:'FORM'\\|'EXCEL_POINTS'\\|'RANDOM'/);
 assert.match(api,/teamA:preview\\?\\.teamA\\.map/);
});
test('organizer can preview random teams without classification and persist the exact draw',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/detail\\.communityId\\?<View/);
 assert.match(screen,/title="Equipas aleatórias"/);
 assert.match(screen,/suggestSessionTeams\\(id,auth\\.token,!detail\\.teamBalanceSupported\\?'RANDOM':teamSource\\)/);
 assert.match(screen,/confirmSessionTeams\\(id,auth\\.token!,!detail\\.teamBalanceSupported\\?'RANDOM':teamSource,teamPreview\\)/);
 assert.match(screen,/title="Sortear novamente"/);
 assert.match(screen,/Confirmar distribuição de equipas/);
 assert.match(screen,/p\\.teamCode/);
});
test('team response and persisted roster assignment are typed',()=>{
 const types=read('src/lib/types.ts');
 for(const term of ['SessionTeamPlayer','teamA:SessionTeamPlayer[]','teamB:SessionTeamPlayer[]',
 'playersWithStats:number','teamAScore:number','teamBalanceSupported?: boolean',"teamCode?: 'A' | 'B' | null"])
  assert.ok(types.includes(term),term);
});
