'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const load=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('mobile session creation offers three location modes matching Web',()=>{
 const screen=load('app/sessions/create.tsx');
 assert.match(screen,/title:'Recinto guardado'/);
 assert.match(screen,/title:'Ligação Google Maps'/);
 assert.match(screen,/title:'Estou no recinto'/);
 assert.match(screen,/getCurrentSessionCoordinates\(\)/);
 assert.match(screen,/resolveSessionMapLink\(requestedUrl,auth\.token\|\|''\)/);
 assert.match(screen,/describeSessionCoordinates\(point,auth\.token\|\|''\)/);
 assert.match(screen,/Confirmei que o ponto corresponde ao recinto correto/);
 assert.match(screen,/locationMode!=='saved'&&/);
 assert.match(screen,/form\.locationConfirmed!==true/);
 assert.match(screen,/googleMapsPreview\(form\.latitude,form\.longitude\)/);
 assert.match(screen,/Morada editada\. O ponto GPS original mantém-se/);
});
test('session payload rejects incomplete/unconfirmed GPS and preserves coordinates only when confirmed',()=>{
 const core=load('src/lib/session-create-core.cjs');
 const decl=load('src/lib/session-create-core.d.cts');
 assert.match(core,/hasLatitude!==hasLongitude/);
 assert.match(core,/input\.locationConfirmed!==true/);
 assert.match(core,/latitude:locationLatitude,longitude:locationLongitude/);
 assert.match(decl,/locationConfirmed\?:boolean/);
 assert.match(decl,/latitude:number\|null;longitude:number\|null/);
});
test('GPS opt-in does not request background permission or infer coordinates from street text',()=>{
 const api=load('src/lib/session-location-api.ts');
 assert.match(api,/requestForegroundPermissionsAsync/);
 assert.match(api,/getCurrentPositionAsync/);
 assert.match(api,/\/api\/venues\/resolve-map-link/);
 assert.match(api,/\/api\/venues\/reverse-location/);
 assert.doesNotMatch(api,/requestBackgroundPermissionsAsync|watchPositionAsync/);
 assert.match(api,/validCoordinates\(result\.latitude,result\.longitude\)/);
});

test('authenticated mobile location services forward the access token',()=>{
 const api=load('src/lib/session-location-api.ts');
 assert.match(api,/resolveSessionMapLink\(url:string,token:string\)/);
 assert.match(api,/describeSessionCoordinates\(point:SessionCoordinates,token:string\)/);
 assert.match(api,/request<ResolvedLink>\([^\n]+\{token,method:'POST'/);
 assert.match(api,/request<ReverseLocation>\([^\n]+\{token\}\)/);
});

test('new session preserves only the currently verified original Maps link',()=>{
 const screen=load('app/sessions/create.tsx');
 assert.match(screen,/const \[verifiedMapsLink,setVerifiedMapsLink\]=useState\(''\)/);
 assert.match(screen,/setVerifiedMapsLink\(requestedUrl\)/);
 assert.match(screen,/setVerifiedMapsLink\(''\)/);
 assert.match(screen,/verifiedMapsLink!==mapsLink\.trim\(\)/);
 assert.match(screen,/googleMapsUrl:locationMode==='link'\?verifiedMapsLink:null/);
});

test('session details prioritize the exact saved link and never substitute a catalogue pin',()=>{
 const {exactSessionMapPin,exactSessionMapsDestination,trustedGoogleMapsUrl}
   =require('../src/lib/session-maps.cjs');
 const url='https://maps.app.goo.gl/2Qy87Din3ZYJz8VZA';
 const session={canSeeExactAddress:true,googleMapsUrl:url,
   pinLatitude:38.7542,pinLongitude:-9.1563,
   venue:{latitude:38.76,longitude:-9.14}};
 assert.deepEqual(exactSessionMapPin(session),{latitude:38.7542,longitude:-9.1563});
 assert.equal(exactSessionMapsDestination(session),url);
 assert.equal(exactSessionMapPin({...session,pinLatitude:null,pinLongitude:null}),null);
 assert.equal(exactSessionMapsDestination({...session,canSeeExactAddress:false}),null);
 assert.equal(trustedGoogleMapsUrl('https://maps.app.goo.gl.evil.example/foo'),null);
});

test('session screen embeds shared native map and organizer-only Maps link editor',()=>{
 const screen=load('app/sessions/[id].tsx');
 const panel=load('src/components/SessionLocationPanel.tsx');
 assert.match(screen,/<SessionLocationPanel session=\{detail\}/);
 assert.match(panel,/exactSessionMapPin\(session\)/);
 assert.match(panel,/exactSessionMapsDestination\(session\)/);
 assert.match(panel,/MapView/);
 assert.match(panel,/Marker coordinate=\{pin\}/);
 assert.match(panel,/Linking\.openURL\(destination\)/);
 assert.match(panel,/canEdit&&\['OPEN','FULL'\]/);
 assert.match(panel,/\/maps-link/);
});
