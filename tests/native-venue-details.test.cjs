'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('venue detail uses real backend photo, condition and rating endpoints',()=>{
 const api=read('src/lib/parity-api.ts');
 const screen=read('app/venues/[id].tsx');
 for(const endpoint of ['/photos','/sport-conditions','/ratings/summary'])assert.ok(api.includes(endpoint));
 assert.match(screen,/Promise\.allSettled/);
 assert.match(screen,/venuePhotos\(id\)/);
 assert.match(screen,/venueSportConditions\(id\)/);
 assert.match(screen,/venueRatingSummary\(id\)/);
});
test('review privacy, URL safety and no mandatory browser redirection',()=>{
 const screen=read('app/venues/[id].tsx');
 assert.match(screen,/rating\.ratingCount>=3/);
 assert.match(screen,/rating\.averageScore!=null/);
 assert.match(screen,/url\.protocol==='https:'/);
 assert.match(screen,/Math\.abs\(venue\.latitude\)<=90/);
 assert.doesNotMatch(screen,/d24sports\.com/);
 assert.doesNotMatch(screen,/Linking\.openURL\('https:\/\/d24sports/);
});
test('public venue fields align with backend without inventing values',()=>{
 const types=read('src/lib/types.ts');
 for(const key of ['openingHours','priceInfo','contact','website','surfaceType','indoor','changingRooms','showers','accessible','locationStatus'])
  assert.match(types,new RegExp(key));
 assert.match(types,/export interface VenuePhoto/);
 assert.match(types,/export interface VenueSportCondition/);
 assert.match(types,/export interface VenueRatingSummary/);
});
