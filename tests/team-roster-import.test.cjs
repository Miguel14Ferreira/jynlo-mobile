'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('team roster: owner imports a squad file with preview, never sending contacts',()=>{
 const api=read('src/lib/team-roster-api.ts'),ui=read('src/components/TeamRosterImport.tsx'),screen=read('app/teams/[id].tsx');
 assert.match(api,/\/roster'/);assert.match(api,/'\/import'.*'\/import\/preview'/);
 assert.match(api,/xlsx\|xls\|csv\|tsv/);assert.match(api,/2\*1024\*1024/);
 assert.match(ui,/previewRosterImport\(/);assert.match(ui,/importRoster\(/);
 assert.match(ui,/Emails e telefones do ficheiro não são lidos/);
 assert.match(screen,/<TeamRosterImport teamId=\{team\.id\}/);
});
test('errors after a button press open as a pop-up',()=>{
 const ui=read('src/components/UI.tsx');
 assert.match(ui,/markUserAction\(\);onPress\(\)/);
 assert.match(ui,/Alert\.alert\(t\('Algo correu mal'\),text\)/);
 assert.match(ui,/ACTION_ERROR_WINDOW_MS=10000/);
});
test('team roster: personal links, manual linking and suggestions that need a yes',()=>{
 const api=read('src/lib/team-roster-api.ts'),ui=read('src/components/TeamRosterImport.tsx'),claim=read('app/teams/claim/[token].tsx');
 assert.match(api,/\/claim-link'/);assert.match(api,/\/api\/teams\/roster-claims\/'\+claim\+'\/accept'/);
 assert.match(ui,/Partilhar convite/);assert.match(ui,/Associar a utilizador/);assert.match(ui,/Será a mesma pessoa\?/);
 assert.match(claim,/Sim, sou eu · Entrar na equipa/);assert.match(claim,/Não sou eu/);
 const {nativeRouteForWebLink}=require('../src/lib/native-app-links.cjs');
 const {safeRedirect}=require('../src/lib/routes.cjs');
 const id='123e4567-e89b-12d3-a456-426614174000';
 assert.equal(nativeRouteForWebLink('https://jynlosports.com/menu/teams/claim/'+id),'/teams/claim/'+id);
 assert.equal(nativeRouteForWebLink('https://evil.example/menu/teams/claim/'+id),'https://evil.example/menu/teams/claim/'+id);
 assert.equal(safeRedirect('/teams/claim/'+id),'/teams/claim/'+id);
 assert.equal(safeRedirect('/teams/claim/nope'),'/(tabs)');
 assert.match(read('app.json'),/"pathPrefix": "\/menu\/teams\/claim\/"/);
});
test('server reasons reach the person, technical text never does',()=>{
 const {userFacingMessage}=require('../src/lib/response-body.cjs');
 assert.equal(userFacingMessage('Já existe uma época ativa para esta modalidade'),'Já existe uma época ativa para esta modalidade');
 assert.equal(userFacingMessage('java.lang.IllegalStateException: x'),null);
 assert.equal(userFacingMessage('Could not initialize proxy [Profile#1]'),null);
 assert.equal(userFacingMessage('CONFLICT'),null);
 assert.equal(userFacingMessage(42),null);
 assert.match(read('src/lib/api.ts'),/\[400,403,404,409,422\]\.includes\(response\.status\)\?await readErrorMessage\(response\)/);
});
