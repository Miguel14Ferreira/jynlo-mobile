'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=JSON.parse(fs.readFileSync(path.join(__dirname,'../app.json'),'utf8')).expo;
const {nativeRouteForWebLink}=require('../src/lib/native-app-links.cjs');
const intentFilters=app.android.intentFilters;
function hasAndroidLink(prefix){
 return intentFilters.some(f=>f.action==='VIEW'&&f.autoVerify===true&&
  f.category.includes('BROWSABLE')&&f.category.includes('DEFAULT')&&
  f.data.some(d=>d.scheme==='https'&&d.host==='d24sports.com'&&d.pathPrefix===prefix));
}
test('Android registered session and venue app links match native navigation',()=>{
 assert.equal(hasAndroidLink('/sessions/'),true);
 assert.equal(hasAndroidLink('/menu/events/'),true);
 assert.equal(hasAndroidLink('/venues/'),true);
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/42'),'/sessions/42');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/events/42'),'/sessions/42');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/events/42?token=never-expose'),'/sessions/42');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/venues/25'),'/venues/25');
});
test('share URLs reject untrusted hosts and invalid session identifiers',()=>{
 assert.equal(nativeRouteForWebLink('https://evil.example/sessions/42'),'https://evil.example/sessions/42');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/0'),'https://d24sports.com/sessions/0');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/events/0'),'https://d24sports.com/menu/events/0');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/../../private'),'https://d24sports.com/sessions/../../private');
});
test('private session passwords must never be embedded in invite app-link filters',()=>{
 const serialized=JSON.stringify(intentFilters);
 assert.doesNotMatch(serialized,/[?&](?:password|token)=/i);
});

test('signed guest session links keep invitation identity without forwarding unrelated secrets',()=>{
 const guest='A'.repeat(43);
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/42?guest='+guest),'/sessions/42?guest='+guest);
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/42?guest='+guest+'&password=secret'),'/sessions/42?guest='+guest);
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/42?guest=bad!'),'/sessions/42');
 assert.equal(nativeRouteForWebLink('https://d24sports.com/sessions/42?guest=12345678-1234-1234-1234-1234567890ab'),'/sessions/42');
});
