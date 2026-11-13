'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nativeRouteForWebLink}=require('../src/lib/native-app-links.cjs');
const config=require('../app.json').expo;

const filters=config.android.intentFilters.filter(f=>f.action==='VIEW'&&f.autoVerify);
function covered(path){
 return filters.some(filter=>filter.category.includes('BROWSABLE')&&
   filter.data.some(d=>d.scheme==='https'&&d.host==='d24sports.com'&&path.startsWith(d.pathPrefix)));
}
test('Android verified links cover session, community, event and venue invites',()=>{
 for(const path of ['/sessions/14','/menu/events/14','/menu/communities/8','/venues/23']){
   assert.ok(covered(path),path+' missing Android intent filter');
 }
});
test('invited guest opens exact native session and keeps only signed guest token',()=>{
 const guest='A'.repeat(43);
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/14?guest='+guest+'&password=secret'),
   '/sessions/14?guest='+guest);
 assert.ok(covered('/sessions/14'));
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/14?guest=invalid'),
   '/sessions/14');
});
test('legacy web links open their corresponding native screens',()=>{
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/events/14'),'/sessions/14');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/communities/8'),'/communities/8');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/venues/23'),'/venues/23');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/communities/8?tournament=2&teamPage=3'),
   '/tournaments/8/2/teams/3');
});
test('external hosts and malformed session identifiers never become native session routes',()=>{
 for(const url of ['https://not-d24sports.com/sessions/14?guest='+('A'.repeat(43)),
   'http://d24sports.com/sessions/14','https://d24sports.com/sessions/0',
   'https://d24sports.com/sessions/9007199254740992']){
   assert.equal(nativeRouteForWebLink(url),url);
 }
});
