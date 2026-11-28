const {test}=require('node:test');const assert=require('node:assert/strict');
const {safeRedirect}=require('../src/lib/routes.cjs');
test('login e MFA preservam retorno seguro às comunidades e jogos',()=>{
 for(const route of ['/communities/create','/communities/invites','/communities/931001','/sessions/900001','/sessions/create','/feed','/venues','/venues/920001','/my-sessions','/notifications'])
   assert.equal(safeRedirect(route),route);
 for(const route of ['https://evil.test','//evil.test','/sessions/../../x','/communities/0','/communities/abc',null,['/communities/1']])
   assert.equal(safeRedirect(route),'/(tabs)');
});

test('rejeita IDs acima do limite seguro nos retornos após autenticação',()=>{
 for(const route of ['/sessions/999999999999999999999','/communities/999999999999999999999',
  '/venues/999999999999999999999','/tournaments/12/34/teams/999999999999999999999',
  '/tournaments/999999999999999999999/34/teams/56']){
  assert.equal(safeRedirect(route),'/(tabs)',route);
 }
 assert.equal(safeRedirect('/sessions/9007199254740991'),'/sessions/9007199254740991');
 assert.equal(safeRedirect('/sessions/9007199254740992'),'/(tabs)');
});
