'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('native image picker previews before explicit upload',()=>{
 const editor=read('app/edit-profile.tsx');
 assert.match(editor,/ImagePicker\.launchImageLibraryAsync/);
 assert.match(editor,/mediaTypes:\['images'\]/);
 assert.match(editor,/allowsEditing:true/);
 assert.match(editor,/exif:false,base64:false/);
 assert.match(editor,/setSelectedPhoto\(result\.assets\[0\]\)/);
 assert.match(editor,/onPress=\{\(\)=>\{void savePhoto\(\);\}\}/);
 assert.match(editor,/onPress=\{\(\)=>setSelectedPhoto\(null\)\}/);
 assert.match(editor,/setSelectedPhoto\(null\)/);
});
test('profile picture uses authenticated multipart PUT without JSON content type or retry',()=>{
 const upload=read('src/lib/profile-photo.ts');
 assert.match(upload,/\/api\/profile\/me\/photo/);
 assert.match(upload,/method:'PUT'/);
 assert.match(upload,/Authorization:'Bearer '\+token/);
 assert.match(upload,/new FormData\(\)/);
 assert.match(upload,/form\.append\('photo'/);
 assert.doesNotMatch(upload,/Content-Type|JSON\.stringify|retry/i);
 assert.match(upload,/asset\.fileSize>MAX_PHOTO_BYTES/);
 assert.match(upload,/profile\.profilePicUrl/);
});
test('profile avatar reflects saved photo after returning to profile',()=>{
 const profile=read('app/(tabs)/profile.tsx');
 assert.match(profile,/useFocusEffect/);
 assert.match(profile,/\/api\/profile\/me/);
 assert.match(profile,/profilePicUrl/);
 assert.match(profile,/avatarImage/);
});
