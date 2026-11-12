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
 assert.match(screen,/resolveSessionMapLink\(mapsLink\)/);
 assert.match(screen,/describeSessionCoordinates\(point\)/);
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
