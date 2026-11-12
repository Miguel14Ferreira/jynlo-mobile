'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('Story camera records with Expo CameraView limits and stops on teardown',()=>{
 const camera=read('src/components/StoryCameraCapture.tsx');
 assert.match(camera,/useMicrophonePermissions/);
 assert.match(camera,/requestMicPermission\(\)/);
 assert.match(camera,/mode=\{mode\}/);
 assert.match(camera,/maxDuration:30,maxFileSize:20\*1024\*1024/);
 assert.match(camera,/camera\.current\?\.stopRecording\(\)/);
 assert.match(camera,/onCaptured\(\{uri:result\.uri,type:'video'/);
 assert.match(camera,/onPickGallery/);
 assert.match(camera,/onCameraReady/);
 assert.match(camera,/cameraReady/);
 assert.match(camera,/O iPhone gravou em MOV/);
});
test('Story uploads retain the legacy one-file contract while posts use albums',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(api,/files\.length>1\?'files':file\.type==='video'\?'video':'image'/);
 assert.match(api,/sendMedia\('\/api\/stories',[\s\S]*?\[file\],token!\)/);
 assert.match(api,/sendMedia\('\/api\/feed\/posts',[\s\S]*?files,token!\)/);
 assert.match(feed,/allowsMultipleSelection:true/);
 assert.match(feed,/setComposerMedia\(next\)/);
 assert.match(feed,/postMediaItems\(item\)/);
});
test('Microphone and camera privacy notices mention recording',()=>{
 const config=read('app.json');
 assert.match(config,/gravas vídeos com som/);
 assert.match(config,/gravas Stories/);
});
