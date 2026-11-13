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
 assert.match(home,/finally\{mediaPickerInFlight.current=false;\}/);
});
test('gallery results and camera captures from a previous session are never applied to the next account',()=>{
 const home=source('app/(tabs)/index.tsx');
 assert.match(home,/if\(activeStoryAccount.current!==actorToken\|\|result.canceled/);
 assert.match(home,/if\(activeStoryAccount.current!==actorToken\)return;\s*if\(album\)/);
 assert.match(home,/if\(activeStoryAccount.current===actorToken\)Alert.alert/);
 assert.match(home,/StoryCameraCapture onCaptured=\{media=>\{if\(activeStoryAccount.current===auth.token\)setStoryMedia\(media\);\}\}/);
 assert.match(home,/setComposerMedia\(next\)/);
 assert.match(home,/setStoryMedia\(null\)/);
});
test('Story camera exposes accessible gallery button alongside upward swipe and recording lock',()=>{
 const camera=source('src/components/StoryCameraCapture.tsx');
 assert.match(camera,/finishGalleryGesture=\(x:number,y:number\)=>/);
 assert.match(camera,/start.y-y>75&&Math.abs\(start.x-x\)<110\)onPickGallery\(\)/);
 assert.match(camera,/accessibilityLabel="Abrir galeria de fotografias e vídeos"/);
 assert.match(camera,/accessibilityHint="Também podes deslizar para cima na câmara"/);
 assert.match(camera,/disabled=\{busy\|\|recording\} onPress=\{onPickGallery\}/);
 assert.match(camera,/onResponderRelease=\{e=>finishGalleryGesture/);
 assert.match(camera,/if\(recordingRef.current\)\{\s*camera.current\?\.stopRecording\(\)/);
});
