'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/sessions/create.tsx'),'utf8');
test('session creator displays community membership load errors',()=>{
 assert.match(source,/setCommunityError\('Não foi possível carregar as tuas comunidades\.'\)/);
 assert.match(source,/communityError\?<Message tone="error">\{communityError\}<\/Message>/);
 assert.match(source,/communityError&&auth\.token&&auth\.username\?<Button secondary title="Voltar a carregar comunidades"/);
 assert.match(source,/onPress=\{\(\)=>\{void loadCommunities\(\);\}\}/);
});
test('successful community reload clears errors and validates preselected membership',()=>{
 assert.match(source,/setCommunities\(groups\);setCommunityError\(''\)/);
 assert.match(source,/groups\.find\(c=>c\.id===requestedCommunityId\)/);
 assert.match(source,/Já não pertences a esta comunidade/);
});
