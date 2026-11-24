'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {linkParts}=require('../src/lib/chat-links.cjs');
test('links in chat messages become pressable, other text stays text',()=>{
 const parts=linkParts('vê https://jynlosports.com/for-venues, e www.cng.pt.');
 assert.deepEqual(parts.map(p=>p.url),[null,'https://jynlosports.com/for-venues',null,'https://www.cng.pt/',null]);
 assert.equal(parts[1].internalPath,'/for-venues');
 assert.equal(parts[3].internalPath,null);
 assert.equal(parts.map(p=>p.text).join(''),'vê https://jynlosports.com/for-venues, e www.cng.pt.');
 assert.ok(linkParts('javascript:alert(1)').every(p=>p.url===null));
});
