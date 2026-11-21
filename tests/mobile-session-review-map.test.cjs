'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('review stage shows map only for the saved venue or a user-confirmed GPS point',()=>{
 const screen=read('app/sessions/create.tsx');
 assert.match(screen,/import SessionDraftLocationMap/);
 assert.match(screen,/\{step===3\?<View style=\{styles.panel\}>/);
 assert.match(screen,/<SessionDraftLocationMap/);
 assert.match(screen,/form\.venueId&&(venueChosen\?\.id|venueChosen&&venueChosen\.id)===form\.venueId/);
 assert.match(screen,/form\.locationConfirmed===true&&validCoordinates\(form\.latitude,form\.longitude\)/);
 assert.match(screen,/typeof venueChosen\.latitude==='number'&&typeof venueChosen\.longitude==='number'/);
 assert.match(screen,/onEdit=\{\(\)=>setStep\(1\)\}/);
});
test('native map uses exact coordinates and a separate Google Maps destination',()=>{
 const preview=read('src/components/SessionDraftLocationMap.tsx');
 assert.match(preview,/validCoordinates\(point\.latitude,point\.longitude\)/);
 assert.match(preview,/nativeGoogleMapsConfigured===true/);
 assert.match(preview,/provider=\{Platform\.OS==='android'\?PROVIDER_GOOGLE:undefined\}/);
 assert.match(preview,/<Marker coordinate=\{coordinates\}/);
 assert.match(preview,/googleMapsPreview\(coordinates\.latitude,coordinates\.longitude\)/);
 assert.match(preview,/scrollEnabled=\{false\} zoomEnabled=\{false\}/);
 assert.match(preview,/A pesquisa pela morada não garante um ponto exato/);
 assert.doesNotMatch(preview,/onRegionChange|onPress=\{.*setForm/);
});
