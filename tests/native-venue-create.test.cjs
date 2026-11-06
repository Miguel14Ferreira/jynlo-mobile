'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {DISTRICTS,parseGps,parseHttps,buildVenueRequest}=require('../src/lib/venue-create.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const base={
 name:'Pavilhão de teste',city:'Lisboa',district:'Lisboa',address:'Rua Exemplo 10',
 venueType:'Pavilhão',surfaceType:'Madeira',openingHours:'09:00-21:00',
 priceInfo:'',contact:'',website:'',latitude:'',longitude:'',
 environmentType:'INDOOR',ownershipType:'PUBLIC',changingRooms:true,
 toilets:true,showers:true,accessible:true,wifi:false,lighting:true,parking:false
};
test('venue request uses moderated backend DTO and official sports separator',()=>{
 const req=buildVenueRequest(base,['Padel','Futebol','Padel'],['Padel','Futebol','Karting']);
 assert.equal(req.name,'Pavilhão de teste');
 assert.equal(req.environmentType,'INDOOR');
 assert.equal(req.ownershipType,'PUBLIC');
 assert.equal(req.sports,'Padel;Futebol');
 assert.equal(req.indoor,true);
 assert.equal(req.changingRooms,true);
 assert.equal(req.latitude,null);
 assert.equal(req.longitude,null);
 assert.equal(req.district,'Lisboa');
});
test('reject missing location, incomplete GPS, unsupported coordinates and invalid HTTPS',()=>{
 assert.throws(()=>buildVenueRequest({...base,address:''},[],['Padel']),/morada/);
 assert.throws(()=>buildVenueRequest({...base,address:'',latitude:'38.7'},[],['Padel']),/latitude e longitude/);
 assert.deepEqual(parseGps('38.72','-9.14'),{latitude:38.72,longitude:-9.14});
 assert.throws(()=>parseGps('0','0'),/Portugal continental/);
 assert.throws(()=>parseGps('38,72','-9.14'),/decimais/);
 assert.equal(parseHttps(''),null);
 assert.throws(()=>parseHttps('http://example.com'),/HTTPS/);
 assert.throws(()=>parseHttps('https://user:pass@example.com'),/HTTPS/);
 assert.ok(DISTRICTS.includes('Lisboa'));
});
test('require server catalog, non-empty name and city, valid environment and known sports',()=>{
 assert.throws(()=>buildVenueRequest({...base,name:''},[],['Padel']),/nome e a cidade/);
 assert.throws(()=>buildVenueRequest({...base,environmentType:''},[],['Padel']),/ambiente/);
 assert.throws(()=>buildVenueRequest(base,['Karting'],['Padel']),/modalidades/);
 assert.throws(()=>buildVenueRequest(base,[],[]),/Catálogo/);
});
test('mobile creation is authenticated and never bypasses venue moderation',()=>{
 const screen=read('app/venues/create.tsx');
 const venues=read('app/venues.tsx'),layout=read('app/_layout.tsx');
 assert.match(screen,/request<Suggestion>\('\/api\/venues'/);
 assert.match(screen,/method:'POST'/);
 assert.match(screen,/token:auth\.token/);
 assert.match(screen,/buildVenueRequest\(data,sports,catalog\)/);
 assert.match(screen,/status==='PENDING'/);
 assert.match(screen,/submitted\)return/);
 assert.doesNotMatch(screen,/d24sports\.com|Linking\.openURL/);
 assert.match(venues,/router\.push\('\/venues\/create'\)/);
 assert.match(layout,/name="venues\/create"/);
});
