'use strict';
/** Human-readable build provenance; never include signing secrets or tokens. */
const fs=require('node:fs');
function buildInfo(config,env,format){
  if(!['apk','aab'].includes(format))throw new Error('Unsupported Android format.');
  const expo=config?.expo;
  const sha=env.GITHUB_SHA||'';
  const api=env.EXPO_PUBLIC_JYNLO_API_URL||'';
  if(!/^[0-9a-f]{40}$/i.test(sha))throw new Error('Missing full Git commit SHA.');
  if(!/^https:\/\/[^/]+$/.test(api))throw new Error('Build API must be HTTPS.');
  if(expo?.android?.package!=='com.jynlo.app'||!Number.isSafeInteger(expo?.android?.versionCode))throw new Error('Invalid Android identity.');
  return {app:'Jynlo',format,gitCommit:sha,packageName:expo.android.package,version:expo.version,versionCode:expo.android.versionCode,apiUrl:api,distribution:format==='aab'?'google-play-internal':'internal-android-test'};
}
if(require.main===module){
  const format=process.argv[2];
  const config=JSON.parse(fs.readFileSync('app.json','utf8'));
  fs.writeFileSync('android-build-info.json',JSON.stringify(buildInfo(config,process.env,format),null,2)+'\n');
  console.log('Android build provenance created without credentials.');
}
module.exports={buildInfo};
