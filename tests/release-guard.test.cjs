'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const {after}=require('node:test');
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'jynlo-release-'));
const firebaseFile=path.join(tempDir,'google-services.json');
fs.writeFileSync(firebaseFile,JSON.stringify({client:[{client_info:{android_client_info:{package_name:'com.jynlo.app'}}}]}));
after(()=>fs.rmSync(tempDir,{recursive:true,force:true}));
const script=path.join(__dirname,'../scripts/verify-release.cjs');
function run(url,profile='production',firebase=firebaseFile){
  return spawnSync(process.execPath,[script],{
    encoding:'utf8',
    env:{...process.env,EXPO_PUBLIC_JYNLO_API_URL:url,EAS_BUILD_PROFILE:profile,JYNLO_REQUIRE_REAL_API:'1',GOOGLE_SERVICES_JSON:firebase}
  });
}
test('store builds require a real HTTPS API',()=>{
  for(const url of ['', 'http://api.example.org', 'https://localhost', 'https://127.0.0.1',
    'https://192.168.1.5', 'https://10.0.0.1', 'https://172.16.0.1',
    'https://127.1.2.3', 'https://8.8.8.8', 'https://[::1]', 'https://[2001:db8::1]',
    'https://demo.example.org', 'https://example.com', 'https://api.example.org/path',
    'https://api.example.org?token=secret', 'https://user:password@api.example.org']){
    const result=run(url);
    assert.notEqual(result.status,0,url||'(empty)');
    assert.match(result.stderr,/BUILD BLOQUEADO/);
  }
});
test('production and Play internal accept a public HTTPS endpoint',()=>{
  for(const profile of ['production','play-internal']){
    const result=run('https://api.jynlo.com',profile);
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/OK \(api\)/);
  }
});
test('store builds refuse preview and staging backends',()=>{
  for(const profile of ['production','play-internal']){
    for(const url of ['https://desporto24-preview-api.onrender.com','https://api-preview.example.org','https://staging-api.example.org']){
      const result=run(url,profile);
      assert.notEqual(result.status,0,`${profile}: ${url}`);
      assert.match(result.stderr,/BUILD BLOQUEADO/);
    }
  }
  assert.equal(run('https://desporto24-preview-api.onrender.com','preview').status,0,'internal preview must still work');
});
test('store builds reject absent, invalid and wrong-package Firebase configs',()=>{
  const wrongPackage=path.join(tempDir,'wrong.json');
  const invalidJson=path.join(tempDir,'invalid.json');
  fs.writeFileSync(wrongPackage,JSON.stringify({client:[{client_info:{android_client_info:{package_name:'com.someone.else'}}}]}));
  fs.writeFileSync(invalidJson,'not JSON');
  for(const profile of ['production','play-internal']){
    for(const file of ['',wrongPackage,invalidJson,path.join(tempDir,'nonexistent.json')]){
      const result=run('https://api.jynlo.com',profile,file);
      assert.notEqual(result.status,0,`${profile}: ${file||'empty'}`);
      assert.match(result.stderr,/BUILD BLOQUEADO/);
    }
  }
});
test('store build refuses diagnostic R8 override',()=>{
  const staticConfig=require('../app.json').expo;
  const configPath=require.resolve('../app.config.js');
  for(const profile of ['production','play-internal']){
    const result=spawnSync(process.execPath,['-e',`require(${JSON.stringify(configPath)})({config:${JSON.stringify(staticConfig)}})`],{
      encoding:'utf8',
      env:{...process.env,EAS_BUILD_PROFILE:profile,JYNLO_ANDROID_DIAGNOSTIC_NO_R8:'1'}
    });
    assert.notEqual(result.status,0,profile);
    assert.match(result.stderr,/BUILD BLOQUEADO/);
  }
});
test('local demo mode is allowed only without release flags',()=>{
  const result=spawnSync(process.execPath,[script],{
    encoding:'utf8',env:{...process.env,EXPO_PUBLIC_JYNLO_API_URL:'',EAS_BUILD_PROFILE:'preview',JYNLO_REQUIRE_REAL_API:'0'}
  });
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/OK \(demo\)/);
});

test('internal preview APK is configured against a real API',()=>{
  const eas=require('../eas.json');
  const preview=eas.build.preview;
  assert.equal(preview.distribution,'internal');
  assert.equal(preview.android.buildType,'apk');
  assert.equal(preview.env.JYNLO_REQUIRE_REAL_API,'1');
  const result=run(preview.env.EXPO_PUBLIC_JYNLO_API_URL,'preview');
  assert.equal(result.status,0,result.stderr);
  const missing=run('','preview');
  assert.notEqual(missing.status,0,'preview must reject missing API URL');
});
test('Google Play build produces an Android App Bundle',()=>{
  const eas=require('../eas.json');
  const app=require('../app.json').expo;
  assert.equal(app.android.package,'com.jynlo.app');
  assert.equal(eas.build.production.android.buildType,'app-bundle');
  assert.equal(eas.build['play-internal'].android.buildType,'app-bundle');
  assert.equal(eas.build['play-internal'].env.JYNLO_REQUIRE_REAL_API,'1');
  for(const profile of ['production','play-internal']){
    assert.equal(eas.build[profile].environment,'production',`${profile} must use production EAS secrets`);
    assert.notEqual(eas.build[profile].env.EXPO_PUBLIC_JYNLO_API_URL,'https://desporto24-preview-api.onrender.com');
    assert.notEqual(eas.build[profile].env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8,'1');
  }
});
