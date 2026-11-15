'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const screen=read('app/tournaments/[communityId]/[id]/teams/[teamId].tsx');
const api=read('src/lib/team-api.ts');
test('captain decides explicitly whether tournament team becomes permanent',()=>{
 assert.match(screen,/promotion\?\.canPromote/);
 assert.match(screen,/Tornar equipa permanente/);
 assert.match(screen,/Agora não/);
 assert.match(screen,/Alert\.alert\('Criar equipa permanente\?'/);
 assert.match(screen,/promoteTournamentTeam\(cid,tid,teamId,token\)/);
 assert.match(screen,/Se não converteres, esta equipa permanece apenas no torneio/);
});
test('previously promoted team links to its permanent identity',()=>{
 assert.match(screen,/promotion\?\.globalTeamId/);
 assert.match(screen,/Abrir equipa na Jynlo/);
 assert.match(screen,/pathname:'\/teams\/\[id\]'/);
});
test('team promotion is opted in by authenticated user, never on opening the screen',()=>{
 assert.match(api,/export async function tournamentTeamPromotionStatus/);
 assert.match(api,/export async function promoteTournamentTeam/);
 assert.match(api,/method:'POST',body:null/);
 assert.match(screen,/promotionLock\.current=true/);
 assert.match(screen,/if\(!auth\.token\|\|!promotion\?\.canPromote/);
});
