'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const camera=fs.readFileSync(path.join(__dirname,'../src/components/StoryCameraCapture.tsx'),'utf8');
test('native Story camera never applies stale capture after unmount or switch of account',()=>{
 assert.match(camera,/const alive=useRef\(true\),busyRef=useRef\(false\)/);
 assert.match(camera,/if\(!alive\.current\|\|result\.canceled\|\|!result\.assets\?\.length\)return/);
 assert.match(camera,/if\(!alive\.current\)return;[\s\S]*const problem=size>0\?validateMedia/);
 assert.match(camera,/return\(\)=>\{alive\.current=false;clearTimeout\(timer\);\}/);
});
test('camera requests permission before invoking native UI and unlocks busy state on completion',()=>{
 assert.match(camera,/requestCameraPermissionsAsync\(\)/);
 assert.match(camera,/if\(!alive\.current\)return;\s*if\(!permission\.granted\)/);
 assert.match(camera,/finally\{\s*busyRef\.current=false;/);
 assert.match(camera,/if\(alive\.current\)setBusy\(false\)/);
});
test('native camera offers retry and gallery after cancellation or denial',()=>{
 assert.match(camera,/accessibilityLabel="Abrir câmara do dispositivo"/);
 assert.match(camera,/accessibilityLabel="Abrir galeria de fotografias e vídeos"/);
 assert.match(camera,/onPickGallery/);
});
