'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const component=fs.readFileSync(path.join(__dirname,'../src/components/SecureChatAttachment.tsx'),'utf8');
const pkg=require('../package.json');

test('voice messages have an SDK-compatible native player',()=>{
 assert.equal(pkg.dependencies['expo-audio'],'~58.0.11');
 assert.match(component,/useAudioPlayer\(null\)/);
 assert.match(component,/useAudioPlayerStatus\(player\)/);
 assert.match(component,/'audio\/webm':'webm'/);
 assert.match(component,/player\.replace\(cached\.current\.uri\)/);
});
test('voice playback does not use unauthenticated media URLs',()=>{
 assert.match(component,/Authorization:'Bearer '\+token/);
 assert.match(component,/redirect:'error'/);
 assert.match(component,/new File\(Paths\.cache/);
 assert.match(component,/if\(old\?\.exists\)old\.delete\(\)/);
 assert.doesNotMatch(component,/player\.replace\(API_BASE/);
});
test('voice playback is stopped when attachment is released',()=>{
 assert.match(component,/player\.pause\(\)/);
 assert.match(component,/if\(!pdfPreview\.current\)cleanup\(\)/);
 // Full-screen image viewer now opens explicitly, rather than on every media download.
 // Videos use an inline authenticated player and PDFs open through the native viewer.
 assert.match(component,/Modal visible=\{expanded&&!!uri&&!isVoice\(mime\)&&!isVideo\(mime\)&&mime!=='application\/pdf'\}/);
 assert.match(component,/onPress=\{\(\)=>setExpanded\(true\)\}/);
 assert.match(component,/if\(uri&&!isVoice\(mime\)\)\{if\(!auto\)setExpanded\(true\);return;\}/);
});

test('private audio cache is detached before deletion and pauses on background',()=>{
 const detached=component.indexOf('player.replace(null)');
 const deleted=component.indexOf('if(old?.exists)old.delete()');
 assert.ok(detached>=0&&deleted>detached);
 assert.match(component,/state==='background'\|\|state==='inactive'/);
 assert.match(component,/try\{player.pause\(\);\}catch\{\}/);
});
