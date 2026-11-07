'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {nativeRouteForWebLink}=require('../src/lib/native-app-links.cjs');
test('safe numeric session and venue links open natively',()=>{
 for(const type of ['sessions','venues']){
  const url='https://d24sports.com/'+type+'/12345';
  assert.equal(nativeRouteForWebLink(url),'/'+type+'/12345');
 }
});
test('oversized numeric IDs stay as web links rather than becoming native routes',()=>{
 for(const type of ['sessions','venues']){
  const url='https://d24sports.com/'+type+'/999999999999999999999';
  assert.equal(nativeRouteForWebLink(url),url);
 }
});

test('links with embedded credentials or nonstandard ports remain external',()=>{
 for(const url of [
  'https://user:secret@d24sports.com/sessions/12345',
  'https://d24sports.com:8443/sessions/12345',
  'https://user@d24sports.com/menu/communities/12',
  'http://d24sports.com/venues/12345'
 ])assert.equal(nativeRouteForWebLink(url),url);
});
