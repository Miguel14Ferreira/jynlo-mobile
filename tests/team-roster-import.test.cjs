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
