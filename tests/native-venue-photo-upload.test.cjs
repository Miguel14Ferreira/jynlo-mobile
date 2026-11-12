'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('venue photo upload client keeps authentication and format safeguards',()=>{
 const upload=read('src/lib/venue-photo-upload.ts');
 assert.match(upload,/\/api\/venues\/.*\/photos/);
 assert.match(upload,/method:'POST'/);
 assert.match(upload,/new FormData\(\)/);
 assert.match(upload,/form\.append\('photo'/);
 assert.match(upload,/Authorization:'Bearer '/);
 assert.match(upload,/asset\.fileSize>MAX_PHOTO_BYTES/);
 assert.doesNotMatch(upload,/Content-Type|JSON\.stringify|retry\(/);
 assert.match(upload,/Number\.isSafeInteger\(venueId\)/);
});

test('public mobile venue screen does not offer unmoderated photo submissions',()=>{
 const screen=read('app/venues/[id].tsx');
 const ui=screen.slice(screen.indexOf('return <Page>'));
 assert.match(ui,/envio de novas fotografias está temporariamente suspenso/i);
 assert.doesNotMatch(ui,/Escolher fotografia do recinto|Enviar fotografia|void submitPhoto\(\)/);
 assert.match(ui,/venuePhotos\(id\)/);
});
