'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const camera=fs.readFileSync(path.join(__dirname,'../src/components/StoryCameraCapture.tsx'),'utf8');
test('pending camera captures cannot mutate an unmounted Story editor',()=>{
 assert.match(camera,/const captureInFlight=useRef\(false\)/);
 assert.match(camera,/if\(!alive\.current\)return;\s*if\(!photo\?\.uri\)/);
 assert.match(camera,/if\(alive\.current\)onCaptured\(\{uri:photo\.uri/);
 assert.match(camera,/captureInFlight\.current=false;if\(alive\.current\)setBusy\(false\)/);
});
test('microphone permission cannot start a recording after leaving the editor',()=>{
 assert.match(camera,/permissionRequestInFlight\.current=true/);
 assert.match(camera,/if\(!alive\.current\)return;\s*if\(!granted\.granted\)/);
 assert.match(camera,/finally\{permissionRequestInFlight\.current=false;\}/);
 assert.match(camera,/if\(!alive\.current\|\|!camera\.current\|\|!cameraReady\|\|mode!=='video'\|\|recordingRef\.current\)return/);
 assert.match(camera,/if\(alive\.current\)onCaptured\(\{uri:result\.uri/);
});
