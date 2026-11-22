const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8'));
const search=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/social-place-search.ts'),'utf8'));

test('post and Story geographic inputs require an explicitly selected real suggestion',()=>{
 assert.match(source,/verifiedPostPlace!==composerLocation\.trim\(\)/);
 assert.match(source,/verifiedStoryPlace!==storyLocation\.trim\(\)/);
 assert.match(source,/setVerifiedPostPlace\(''\);setPostPlaceOptions\(\[\]\)/);
 assert.match(source,/setVerifiedStoryPlace\(''\);setStoryPlaceOptions\(\[\]\)/);
 assert.match(source,/setVerifiedPostPlace\(label\)/);
 assert.match(source,/setVerifiedStoryPlace\(label\)/);
});
test('stale geographic lookups cannot overwrite another input or editor',()=>{
 assert.match(source,/let active=true;/);
 assert.match(source,/if\(active\)setPostPlaceOptions\(places\)/);
 assert.match(source,/if\(active\)setStoryPlaceOptions\(places\)/);
 assert.match(source,/return\(\)=>\{active=false;clearTimeout\(timer\);\}/);
});
test('worldwide fallback does not require a Google API key on the device',()=>{
 assert.match(search,/\/api\/places\/suggestions/);
 assert.match(search,/geocoding-api\.open-meteo\.com/);
 assert.match(search,/photon\.komoot\.io/);
 assert.match(search,/seen\.has\(label\)/);
 assert.match(search,/slice\(0,160\)/);
});
