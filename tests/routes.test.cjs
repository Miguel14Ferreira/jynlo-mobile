const {test}=require('node:test');const assert=require('node:assert/strict');
const {safeRedirect}=require('../src/lib/routes.cjs');
test('login e MFA preservam retorno seguro às comunidades e sessões',()=>{
 for(const route of ['/communities/create','/communities/invites','/communities/931001','/sessions/900001','/sessions/create','/feed','/venues','/venues/920001','/my-sessions'])
   assert.equal(safeRedirect(route),route);
 for(const route of ['https://evil.test','//evil.test','/sessions/../../x','/communities/0','/communities/abc',null,['/communities/1']])
   assert.equal(safeRedirect(route),'/(tabs)');
});
