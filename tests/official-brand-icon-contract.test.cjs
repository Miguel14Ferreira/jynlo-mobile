'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const expo=require('../app.json').expo;
const pkg=require('../package.json');
const artifact=path.join(root,'assets/approved-jynlo-icon.webp.base64');
const iconScript=fs.readFileSync(path.join(root,'scripts/prepare-jynlo-icon.sh'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/sync-jynlo-official-icon.yml'),'utf8');

test('the approved artwork is committed offline as a real WebP',()=>{
 const raw=fs.readFileSync(artifact,'utf8').trim();
 const image=Buffer.from(raw,'base64');
 assert.ok(image.length>1000);
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
});
test('both native Android icon paths are generated from approved artwork',()=>{
 assert.equal(expo.icon,'./assets/jynlo-icon.png');
 assert.equal(expo.android.adaptiveIcon.foregroundImage,'./assets/jynlo-icon.png');
 assert.match(pkg.scripts['eas-build-pre-install'],/verify-release\.cjs && bash scripts\/prepare-jynlo-icon\.sh/);
 assert.match(iconScript,/assets\/approved-jynlo-icon\.webp\.base64/);
 assert.match(iconScript,/assets\/jynlo-icon\.png/);
 assert.match(iconScript,/ImageOps\.contain/);
 assert.match(workflow,/approved-jynlo-icon\.webp\.base64/);
 assert.doesNotMatch(workflow,/raw\.githubusercontent\.com/);
});
test('Android APK test build has an incremented version code',()=>{
 assert.equal(expo.version,pkg.version);
 assert.equal(expo.version,'0.16.2');
 assert.equal(expo.android.versionCode,9);
});
