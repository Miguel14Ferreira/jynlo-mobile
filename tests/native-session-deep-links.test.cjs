'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {nativeRouteForWebLink}=require('../src/lib/native-app-links.cjs');

const prefix='https://d24sports.com';
const guest='G'.repeat(43);

test('public session URLs open the same native session including trailing slash',()=>{
 for(const path of ['/sessions/1','/sessions/123','/sessions/123/','/menu/events/123','/menu/events/123/']){
  const expected='/sessions/'+path.match(/\d+/)[0];
  assert.equal(nativeRouteForWebLink(prefix+path),expected);
 }
});
test('valid guest invitation survives on both public and organizer session links',()=>{
 assert.equal(nativeRouteForWebLink(prefix+'/sessions/123?guest='+guest),'/sessions/123?guest='+guest);
 assert.equal(nativeRouteForWebLink(prefix+'/menu/events/123/?guest='+guest),'/sessions/123?guest='+guest);
});
test('published post URLs map to the existing post detail route',()=>{
 assert.equal(nativeRouteForWebLink(prefix+'/posts/14'),'/posts/14');
 assert.equal(nativeRouteForWebLink(prefix+'/posts/14/'),'/posts/14');
 assert.equal(nativeRouteForWebLink(prefix+'/posts/14?utm_campaign=share'),'/posts/14');
 assert.equal(nativeRouteForWebLink(prefix+'/posts/0'),prefix+'/posts/0');
});
test('untrusted credentials and arbitrary parameters never pass to the native session',()=>{
 assert.equal(nativeRouteForWebLink(prefix+'/sessions/123?password=secret&utm_source=test'),'/sessions/123');
 assert.equal(nativeRouteForWebLink(prefix+'/sessions/123?guest=bad'),'/sessions/123');
 assert.equal(nativeRouteForWebLink('https://other.example/sessions/123'),'https://other.example/sessions/123');
 assert.equal(nativeRouteForWebLink('http://d24sports.com/sessions/123'),'http://d24sports.com/sessions/123');
 assert.equal(nativeRouteForWebLink(prefix+'/sessions/0'),prefix+'/sessions/0');
});
test('Android manifest and Expo native intent handle shared session links',()=>{
 const app=require('../app.json').expo;
 assert.equal(app.scheme,'jynlo');
 const httpsFilters=app.android.intentFilters.filter(filter=>filter.action==='VIEW'&&filter.autoVerify);
 assert.ok(httpsFilters.some(filter=>filter.data.some(data=>data.scheme==='https'&&data.host==='d24sports.com'&&data.pathPrefix==='/sessions/')));
 assert.ok(httpsFilters.some(filter=>filter.data.some(data=>data.scheme==='https'&&data.host==='d24sports.com'&&data.pathPrefix==='/menu/events/')));
 assert.ok(httpsFilters.some(filter=>filter.data.some(data=>data.scheme==='https'&&data.host==='d24sports.com'&&data.pathPrefix==='/posts/')));
 const native=fs.readFileSync(path.join(__dirname,'..','app','+native-intent.tsx'),'utf8');
 assert.match(native,/nativeRouteForWebLink\(path\)/);
 const screen=fs.readFileSync(path.join(__dirname,'..','app','posts','[postId]','index.tsx'),'utf8');
 assert.match(screen,/socialPostById\(id,auth.token\)/);
});
