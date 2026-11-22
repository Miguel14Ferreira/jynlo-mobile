const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('APK é gerada por pedido explícito para testes reais, sem publicar na Play',()=>{
 const yaml=read('.github/workflows/build-android-signed-apk.yml');
 assert.match(yaml,/workflow_dispatch:/);
 assert.match(yaml,/inputs\.confirm == 'TESTAR_API_REAL'/);
 assert.match(yaml,/JYNLO_REQUIRE_REAL_API: "1"/);
 assert.match(yaml,/expo prebuild --platform android/);
 assert.match(yaml,/:app:assembleRelease/);
 assert.match(yaml,/write-android-build-info\.cjs apk/);
 assert.doesNotMatch(yaml,/bundleRelease|google-play-internal-aab|upload-to-google-play/);
});

test('usa keystore privada persistente, verifica a APK e remove a chave temporária',()=>{
 const yaml=read('.github/workflows/build-android-signed-apk.yml');
 for(const key of ['JYNLO_PLAY_UPLOAD_KEYSTORE_BASE64','JYNLO_PLAY_UPLOAD_STORE_PASSWORD','JYNLO_PLAY_UPLOAD_KEY_PASSWORD','JYNLO_PLAY_UPLOAD_KEY_ALIAS'])
  assert.match(yaml,new RegExp('secrets\\.'+key));
 assert.match(yaml,/configure-play-signing\.cjs android\/app\/build\.gradle/);
 assert.match(yaml,/apksigner/);
 assert.match(yaml,/app-release\.apk/);
 assert.match(yaml,/rm -f "\$RUNNER_TEMP\/jynlo-play-upload\.jks"/);
});
test('artefacto APK identifica versão e commit sem guardar segredos',()=>{
 const yaml=read('.github/workflows/build-android-signed-apk.yml');
 assert.match(yaml,/jynlo-mobile-signed-internal-apk/);
 assert.match(yaml,/android-build-info\.json/);
 assert.match(yaml,/android-build-sha256\.txt/);
});
