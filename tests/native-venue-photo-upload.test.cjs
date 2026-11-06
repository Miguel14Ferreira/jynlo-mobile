'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('venue upload uses authenticated multipart POST and never retries after timeout',()=>{
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
test('venue photo upload only happens after preview and explicit confirmation',()=>{
 const screen=read('app/venues/[id].tsx');
 assert.match(screen,/ImagePicker\.launchImageLibraryAsync/);
 assert.match(screen,/setSelectedPhoto\(result\.assets\[0\]\)/);
 assert.match(screen,/selectedPhoto\.uri/);
 assert.match(screen,/uploadVenuePhoto\(id,auth\.token,selectedPhoto\)/);
 assert.match(screen,/onPress=\{\(\)=>\{void submitPhoto\(\);\}\}/);
 assert.match(screen,/onPress=\{\(\)=>setSelectedPhoto\(null\)\}/);
 assert.match(screen,/auth\.token&&!DEMO_MODE/);
 assert.match(screen,/venuePhotos\(id\)/);
});
