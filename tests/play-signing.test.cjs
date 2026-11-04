const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {configurePlaySigning}=require('../scripts/configure-play-signing.cjs');
test('Play signing changes only release signing, preserving debug config',()=>{
 const gradle="android {\n    signingConfigs {\n        debug { storeFile file('debug.keystore') }\n    }\n    buildTypes {\n        debug {\n            signingConfig signingConfigs.debug\n        }\n        release {\n            signingConfig signingConfigs.debug\n            minifyEnabled false\n        }\n    }\n}\n";
 const output=configurePlaySigning(gradle);
 assert.match(output,/signingConfig signingConfigs.jynloPlayUpload/);
 assert.match(output,/debug \{\s*signingConfig signingConfigs.debug/);
 assert.match(output,/JYNLO_PLAY_UPLOAD_KEYSTORE_PATH/);
 assert.doesNotMatch(output,/\brelease \{\s*signingConfig signingConfigs.debug/);
 assert.throws(()=>configurePlaySigning(output));
});
test('Play signing refuses unknown gradle templates',()=>{
 assert.throws(()=>configurePlaySigning('android { buildTypes { debug {} release {} } }'));
});
test('Internal Play AAB workflow runs only manually and requires secrets',()=>{
 const y=fs.readFileSync(path.join(__dirname,'../.github/workflows/build-play-internal-aab.yml'),'utf8');
 assert.match(y,/workflow_dispatch:/);
 assert.doesNotMatch(y,/\n\s*push:/);
 assert.match(y,/PREPARAR_BETA_REAL/);
 assert.match(y,/secrets.JYNLO_PLAY_UPLOAD_KEYSTORE_BASE64/);
 assert.match(y,/check:release/);
 assert.match(y,/bundleRelease/);
 assert.match(y,/jarsigner -verify/);
 assert.match(y,/jynlo-google-play-internal-aab/);
});
