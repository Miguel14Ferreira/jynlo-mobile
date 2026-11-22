const untranslate=require('./untranslate.cjs');
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
test('Internal Play AAB workflow accepts guarded versioned requests and requires secrets',()=>{
 const y=untranslate(fs.readFileSync(path.join(__dirname,'../.github/workflows/build-play-internal-aab.yml'),'utf8'));
 assert.match(y,/workflow_dispatch:/);
  // Confirmation is manual and restricted to develop; never trigger on push.
  assert.doesNotMatch(y,/^  push:/m);
  assert.ok(y.includes("github.ref == 'refs/heads/develop'"));
  assert.ok(y.includes("inputs.confirm == 'PREPARAR_BETA_REAL'"));
  assert.ok(y.includes('Confirmar branch e identidade de versão da Jynlo'));
 assert.match(y,/PREPARAR_BETA_REAL/);
 assert.match(y,/secrets.JYNLO_PLAY_UPLOAD_KEYSTORE_BASE64/);
 assert.match(y,/check:release/);
 assert.match(y,/bundleRelease/);
 assert.match(y,/jarsigner -verify/);
 assert.match(y,/jynlo-google-play-internal-aab/);
});

test('Play upload key is verified before the expensive Gradle signing build',()=>{
 const y=untranslate(fs.readFileSync(path.join(__dirname,'../.github/workflows/build-play-internal-aab.yml'),'utf8'));
 const preflight=y.indexOf('name: Validar chave e passwords antes do Gradle');
 const gradle=y.indexOf('name: Gerar AAB release com assinatura do proprietário');
 assert.ok(preflight>0&&gradle>preflight);
 assert.match(y,/keytool -list/);
 assert.match(y,/keytool -certreq/);
 assert.match(y,/JYNLO_PLAY_UPLOAD_KEY_PASSWORD/);
 assert.match(y,/jynlo-upload-check\.csr/);
 assert.match(y,/trap 'rm -f/);
});
