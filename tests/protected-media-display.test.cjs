'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('protected media credentials are limited to Jynlo API routes',()=>{
 const helper=read('src/lib/protected-media-source.ts');
 assert.match(helper,/API_BASE\.replace/);
 assert.match(helper,/uri\.startsWith\(base\+'\/api\/profile-media\/'\)/);
 assert.match(helper,/Authorization:'Bearer '\+token/);
 assert.doesNotMatch(helper,/includes\('profile-media'\)/);
});
test('story image and video use authenticated media source',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/mediaRequestSource\(uri,token\)/);
 assert.match(feed,/<Image source=\{mediaRequestSource\(uri,token\)\}/);
 const video=read('src/components/FeedVideo.tsx');
 assert.match(video,/mediaRequestSource\(uri,token\)/);
 assert.match(video,/useVideoPlayer\(source,/);
});
test('post album images and full-screen photos receive authenticated source',()=>{
 assert.match(read('src/components/AdaptivePostPhoto.tsx'),/source=\{mediaRequestSource\(uri,token\)\}/);
 assert.match(read('src/components/PostImageLightbox.tsx'),/source=\{mediaRequestSource\(uri,token\)\}/);
});
