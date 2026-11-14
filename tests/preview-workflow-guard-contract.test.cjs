'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const script=path.join(root,'scripts','verify-release.cjs');
const previewApi='https://desporto24-preview-api.onrender.com';

test('internal preview APK workflows use API-required checks, not Play Store restrictions',()=>{
 for(const file of ['.github/workflows/mobile-preview-apk.yml','.github/workflows/mobile-release-safety.yml']){
  const source=read(file);
  assert.match(source,/EXPO_PUBLIC_JYNLO_API_URL: https:\/\/desporto24-preview-api\.onrender\.com/);
  assert.match(source,/JYNLO_REQUIRE_REAL_API: '1'/);
  assert.match(source,/run: node scripts\/verify-release\.cjs(?:\r?\n|$)/);
 }
 const preview=read('.github/workflows/mobile-preview-apk.yml');
 assert.doesNotMatch(preview,/run: node scripts\/verify-release\.cjs --production/);
});
test('preview accepts the verified preview endpoint but rejects demo mode',()=>{
 for(const endpoint of [previewApi,'']){
  const result=spawnSync(process.execPath,[script],{
   encoding:'utf8',
   env:{...process.env,EAS_BUILD_PROFILE:'preview',JYNLO_REQUIRE_REAL_API:'1',EXPO_PUBLIC_JYNLO_API_URL:endpoint}
  });
  assert.equal(result.status,endpoint?0:1,'endpoint='+endpoint+' '+result.stderr);
 }
});
test('production policy still rejects a preview backend',()=>{
 const result=spawnSync(process.execPath,[script,'--production'],{
  encoding:'utf8',
  env:{...process.env,EAS_BUILD_PROFILE:'production',JYNLO_REQUIRE_REAL_API:'1',EXPO_PUBLIC_JYNLO_API_URL:previewApi}
 });
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/BUILD BLOQUEADO/);
});
test('release-safety workflow still checks that store builds reject demo mode',()=>{
 const source=read('.github/workflows/mobile-release-safety.yml');
 assert.match(source,/if node scripts\/verify-release\.cjs --production; then/);
 assert.match(source,/EXPO_PUBLIC_JYNLO_API_URL: ''/);
});
