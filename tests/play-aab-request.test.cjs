'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('pedido de AAB versionado para Google Play não publica automaticamente',()=>{
 const wf=read('.github/workflows/build-play-internal-aab.yml');
 assert.match(wf,/\.github\/jynlo-play-aab\.request/);
 assert.match(wf,/branches: \[develop\]/);
 assert.match(wf,/PREPARAR_BETA_REAL 0\.16\.0/);
 assert.match(wf,/expo\.android\.versionCode/);
 assert.match(wf,/:app:bundleRelease/);
 assert.match(wf,/jynlo-google-play-internal-aab/);
 assert.doesNotMatch(wf,/gradle.*publishBundle|fastlane supply|google-play-upload\//i);
});
