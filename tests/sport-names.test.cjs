'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sportName,sportNames,venueTypeName,surfaceName,sportMatches,EN_SPORTS}=require('../src/lib/sport-names.cjs');
const {SPORTS}=(()=>{const s=require('node:fs').readFileSync(require.resolve('../src/lib/sports.ts'),'utf8');return {SPORTS:[...s.matchAll(/'([^']+)'/g)].map(m=>m[1])};})();
test('sport names: English in the English app, the stored value otherwise',()=>{
 assert.equal(sportName('Futebol','en'),'Football');
 assert.equal(sportName('ténis','en'),'Tennis');
 assert.equal(sportName('Futebol','pt'),'Futebol');
 assert.equal(sportName('Futebol'),'Futebol');
 assert.equal(sportName('Desporto inventado','en'),'Desporto inventado');
 assert.equal(sportName(null,'en'),'');
 assert.equal(sportNames('Futebol, Padel,Natação','en'),'Football, Padel, Swimming');
});
test('every sport in the app catalogue has an English name',()=>{
 const missing=SPORTS.filter(s=>/^[A-ZÀ-Ú]/.test(s)&&sportName(s,'en')===s&&!Object.prototype.hasOwnProperty.call(EN_SPORTS,s));
 assert.deepEqual(missing,[]);
});
test('sports can be searched in Portuguese or English',()=>{
 assert.ok(sportMatches('Futebol','foot'));
 assert.ok(sportMatches('Futebol','fute'));
 assert.ok(sportMatches('Natação','natacao'));
 assert.ok(sportMatches('Natação','swim'));
 assert.ok(!sportMatches('Padel','swim'));
 assert.ok(sportMatches('Padel',''));
});
test('venue types and surfaces use the same catalogue',()=>{
 assert.equal(typeof venueTypeName('Pavilhão','en'),'string');
 assert.equal(surfaceName('',"en"),'');
});
