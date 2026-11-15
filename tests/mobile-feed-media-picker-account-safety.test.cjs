'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
test('only one authenticated camera/gallery picker can mutate composers at a time',()=>{
 const home=source('app/(tabs)/index.tsx');
 assert.match(home,/mediaPickerInFlight=useRef\(false\)/);
 assert.match(home,/if\(!requireLogin\(\)\|\|mediaPickerInFlight.current\)return/);
 assert.match(home,/const actorToken=auth.token/);
 assert.match(home,/mediaPickerInFlight.current=true/);
 assert.match(home,/finally\{if\(activeStoryAccount\.current===actorToken\)mediaPickerInFlight\.current=false;\}/);
});
test('gallery results and camera captures from a previous session are never applied to the next account',()=>{
 const home=source('app/(tabs)/index.tsx');
 assert.match(home,/if\(activeStoryAccount.current!==actorToken\|\|result.canceled/);
 assert.match(home,/if\(activeStoryAccount.current!==actorToken\)return;\s*if\(album\)/);
 assert.match(home,/if\(activeStoryAccount.current===actorToken\)Alert.alert/);
 assert.match(home,/StoryCameraCapture key=\{storyComposerRevision.current\} onCaptured=\{media=>\{if\(activeStoryAccount.current===auth.token&&storyComposerRef.current&&storyComposerRevision.current===storyCaptureRevision&&!storyInFlight.current\)setStoryMedia\(media\);\}\}/);
 assert.match(home,/changeComposerMedia\(\(\)=>result\.items\)/);
 assert.match(home,/setStoryMedia\(null\)/);
});
test('Story camera opens the device camera and offers gallery fallback after cancellation',()=>{
 const camera=source('src/components/StoryCameraCapture.tsx');
 assert.match(camera,/ImagePicker\.launchCameraAsync\(/);
 assert.match(camera,/requestCameraPermissionsAsync\(\)/);
 assert.match(camera,/mediaTypes:\['images','videos'\]/);
 assert.match(camera,/videoMaxDuration:30/);
 assert.match(camera,/accessibilityLabel="Abrir galeria de fotografias e vídeos"/);
 assert.match(camera,/onPickGallery/);
 assert.doesNotMatch(camera,/<CameraView|stopRecording\(|takePictureAsync/);
});
test('Android media with unavailable size metadata can be selected but is checked before upload',()=>{
 const home=source('app/(tabs)/index.tsx'),api=source('src/lib/social-feed-api.ts');
 assert.match(home,/size>0\?validateMedia\(mime,size/);
 assert.match(api,/const actualSize=localFile.exists\?localFile.size:-1/);
 assert.match(api,/validateMedia\(file.mimeType,actualSize/);
});
