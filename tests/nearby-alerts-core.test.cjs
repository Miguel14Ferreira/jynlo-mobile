const untranslate=require('./untranslate.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/lib/nearby-alerts-core.cjs');

test('starts off with 25 km and every sport',()=>{
 assert.deepEqual(core.emptyPreference(),{enabled:false,latitude:null,longitude:null,placeLabel:null,radiusKm:25,sports:[]});
 assert.equal(core.summary(core.emptyPreference()),'Desligado');
});

test('rounds a position to about 1 km and rejects invalid ones',()=>{
 assert.deepEqual(core.approximate(38.72534,-9.15012),{latitude:38.73,longitude:-9.15});
 assert.equal(core.approximate(95,0),null);
 assert.equal(core.approximate(NaN,0),null);
});

test('normalizes server data defensively',()=>{
 const value=core.normalizePreference({enabled:true,latitude:null,longitude:null,radiusKm:30,sports:['Padel',3,' ']});
 assert.equal(value.enabled,false,'cannot be on without a place');
 assert.equal(value.radiusKm,25);
 assert.deepEqual(value.sports,['Padel']);
 assert.deepEqual(core.normalizePreference(null),core.emptyPreference());
});

test('toggles sports ignoring accents and case, up to the limit',()=>{
 let p=core.emptyPreference();
 p=core.toggleSport(p,'Ténis');
 assert.deepEqual(p.sports,['Ténis']);
 p=core.toggleSport(p,'tenis');
 assert.deepEqual(p.sports,[]);
 for(let i=0;i<20;i++)p=core.toggleSport(p,'S'+i);
 assert.equal(p.sports.length,core.MAX_SPORTS);
});

test('suggests matching sports not yet chosen',()=>{
 const catalog=['Padel','Ténis','Ténis de Mesa','Futebol'];
 assert.deepEqual(core.sportSuggestions(catalog,'tenis',['Ténis']),['Ténis de Mesa']);
 assert.deepEqual(core.sportSuggestions(catalog,'  ',[]),[]);
});

test('needs a place before turning on, and summarizes the choice',()=>{
 const on={...core.emptyPreference(),enabled:true};
 assert.match(core.problem(on),/Escolhe um local/);
 const lisbon={...on,latitude:38.72,longitude:-9.14,placeLabel:'Lisboa',radiusKm:10,sports:['Padel']};
 assert.equal(core.problem(lisbon),'');
 assert.equal(core.summary(lisbon),'Até 10 km de Lisboa · Padel');
 assert.ok(core.samePreference(lisbon,{...lisbon}));
 assert.ok(!core.samePreference(lisbon,{...lisbon,radiusKm:25}));
});

test('every reference place is a valid rounded point and radii match the server',()=>{
 assert.deepEqual([...core.RADII_KM],[10,25,50,100]);
 for(const place of core.PLACES)assert.deepEqual(core.approximate(place.latitude,place.longitude),{latitude:place.latitude,longitude:place.longitude});
});

test('location is read only on an explicit tap, in the foreground, and rounded',()=>{
 const api=untranslate(fs.readFileSync(path.join(__dirname,'..','src/lib/nearby-alerts-api.ts'),'utf8'));
 assert.match(api,/requestForegroundPermissionsAsync/);
 assert.doesNotMatch(api,/Background|watchPosition/);
 assert.match(api,/approximate\(/);
 const screen=untranslate(fs.readFileSync(path.join(__dirname,'..','app/nearby-alerts.tsx'),'utf8'));
 assert.match(screen,/onPress=\{\(\)=>\{void useMyPosition\(\);\}\}/);
 assert.match(untranslate(fs.readFileSync(path.join(__dirname,'..','app/notification-settings.tsx'),'utf8')),/router\.push\('\/nearby-alerts'\)/);
});

test('the screen can forget the saved place and the privacy text explains it',()=>{
 const screen=untranslate(fs.readFileSync(path.join(__dirname,'..','app/nearby-alerts.tsx'),'utf8'));
 assert.match(screen,/Apagar o local guardado/);
 assert.match(screen,/set\(\{enabled:false,latitude:null,longitude:null,placeLabel:null\}\)/);
 const legal=untranslate(fs.readFileSync(path.join(__dirname,'..','src/lib/legal-content.ts'),'utf8'));
 assert.match(legal,/avisos de novos jogos perto de ti/);
});
