const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');const path=require('node:path');
const fs=require('node:fs'),os=require('node:os');
const script=path.join(__dirname,'../scripts/verify-release.cjs');
const eas=require('../eas.json'),pkg=require('../package.json'),app=require('../app.json');
test('Play Store uses app-bundle while internal install uses apk',()=>{assert.equal(eas.build.production.android.buildType,'app-bundle');assert.equal(eas.build.preview.android.buildType,'apk');});
test('release cannot silently contain only offline demo data',()=>{let failure=null;try{execFileSync(process.execPath,[script,'--production'],{env:{...process.env,EXPO_PUBLIC_JYNLO_API_URL:''},stdio:'pipe'});}catch(e){failure=e;}assert.ok(failure);assert.match(failure.stderr.toString(),/BUILD BLOQUEADO/);});
test('only real HTTPS release with matching Firebase app config passes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jynlo-play-store-'));
 try{
  const configFile=path.join(dir,'google-services.json');
  fs.writeFileSync(configFile,JSON.stringify({client:[{client_info:{android_client_info:{package_name:'com.jynlo.app'}}}]}));
  const output=execFileSync(process.execPath,[script,'--production'],{env:{...process.env,
   EAS_BUILD_PROFILE:'play-internal',EXPO_PUBLIC_JYNLO_API_URL:'https://api.d24sports.com',GOOGLE_SERVICES_JSON:configFile
  },encoding:'utf8'});
  assert.match(output,/OK \\(api\\)/);
  assert.throws(()=>execFileSync(process.execPath,[script,'--production'],{env:{...process.env,
   EAS_BUILD_PROFILE:'play-internal',EXPO_PUBLIC_JYNLO_API_URL:'https://desporto24-preview-api.onrender.com',GOOGLE_SERVICES_JSON:configFile
  },stdio:'pipe'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('release explicitly has Expo signing hook and stable Android identifier',()=>{assert.equal(pkg.scripts['eas-build-pre-install'],'node scripts/verify-release.cjs');assert.match(app.expo.android.package,/^com\.[a-z0-9.]+$/);});
