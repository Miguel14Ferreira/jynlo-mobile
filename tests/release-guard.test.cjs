'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const script=path.join(__dirname,'../scripts/verify-release.cjs');
function run(url,profile='production'){
  return spawnSync(process.execPath,[script],{
    encoding:'utf8',
    env:{...process.env,EXPO_PUBLIC_JYNLO_API_URL:url,EAS_BUILD_PROFILE:profile,JYNLO_REQUIRE_REAL_API:'1'}
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
    const result=run('https://desporto24-preview-api.onrender.com',profile);
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/OK \(api\)/);
  }
});
test('local demo mode is allowed only without release flags',()=>{
  const result=spawnSync(process.execPath,[script],{
    encoding:'utf8',env:{...process.env,EXPO_PUBLIC_JYNLO_API_URL:'',EAS_BUILD_PROFILE:'preview',JYNLO_REQUIRE_REAL_API:'0'}
  });
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/OK \(demo\)/);
});
