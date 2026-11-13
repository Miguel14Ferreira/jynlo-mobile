'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('Story editor opens the native device camera and retains media safety limits',()=>{
 const camera=read('src/components/StoryCameraCapture.tsx');
 assert.match(camera,/ImagePicker\.launchCameraAsync/);
 assert.match(camera,/videoMaxDuration:30/);
 assert.match(camera,/size>0\?validateMedia\(mime,size,true\):null/);
 assert.match(camera,/onCaptured\(\{uri:asset\.uri/);
 assert.match(camera,/onPickGallery/);
 assert.match(camera,/alive\.current=true/);
 assert.doesNotMatch(camera,/<CameraView|recordAsync|takePictureAsync/);
});
test('Story uploads retain the legacy one-file contract while posts use albums',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(api,/files\.length>1\?'files':file\.type==='video'\?'video':'image'/);
 assert.match(api,/sendMedia\('\/api\/stories',[\s\S]*?\[file\],token!\)/);
 assert.match(api,/sendMedia\('\/api\/feed\/posts',[\s\S]*?files,token!\)/);
 assert.match(feed,/allowsMultipleSelection:true/);
 assert.match(feed,/composerMediaRef.current=next;setComposerMedia\(next\)/);
 assert.match(feed,/postMediaItems\(item\)/);
});
test('Microphone and camera privacy notices mention recording',()=>{
 const config=read('app.json');
 assert.match(config,/gravas vídeos com som/);
 assert.match(config,/gravas Stories/);
});
