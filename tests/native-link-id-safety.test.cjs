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
