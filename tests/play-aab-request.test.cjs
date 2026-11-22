const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('pedido manual de AAB exige confirmação e develop, sem publicação automática',()=>{
 const wf=read('.github/workflows/build-play-internal-aab.yml');
 assert.match(wf,/workflow_dispatch:/);
 assert.doesNotMatch(wf,/^  push:/m);
 assert.match(wf,/github.ref == 'refs\/heads\/develop'/);
 assert.match(wf,/inputs.confirm == 'PREPARAR_BETA_REAL'/);
 assert.match(wf,/app.json'\).expo.version/);
 assert.match(wf,/app.json'\).expo.android.package/);
 assert.match(wf,/:app:bundleRelease/);
 assert.match(wf,/jynlo-google-play-internal-aab/);
 assert.doesNotMatch(wf,/gradle.*publishBundle|fastlane supply|google-play-upload\//i);
});
