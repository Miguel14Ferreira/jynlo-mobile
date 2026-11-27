const test=require('node:test');const assert=require('node:assert/strict');
const {sessionShareUrl,communityShareUrl}=require('../src/lib/share-links.cjs');
test('shared games and communities use the preview card page',()=>{
  assert.equal(sessionShareUrl(12),'https://api.jynlosports.com/api/share/sessions/12');
  assert.equal(communityShareUrl('4'),'https://api.jynlosports.com/api/share/communities/4');
  assert.throws(()=>sessionShareUrl('1/../x'));
});
