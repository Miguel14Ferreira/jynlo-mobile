const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('Google Play Android identity stays fixed to registered app',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
  assert.equal(config.expo.android.package,'com.jynlo.app');
  assert.equal(config.expo.ios.bundleIdentifier,'com.jynlo.app');
  assert.ok(Number.isSafeInteger(config.expo.android.versionCode));
  assert.ok(config.expo.android.versionCode>0);
  // A signed AAB from an older commit must not silently impersonate a newer app release.
  assert.equal(config.expo.version,require('../package.json').version);
  assert.equal(config.expo.android.versionCode,6);
});

test('internal Play workflow uses real HTTPS API, private upload key and no auto publishing',()=>{
  const source=fs.readFileSync(path.join(root,'.github/workflows/build-play-internal-aab.yml'),'utf8');
  assert.match(source,/workflow_dispatch:/);
  assert.doesNotMatch(source,/\n\s*push:/);
  assert.match(source,/JYNLO_REQUIRE_REAL_API:\s*["']?1/);
  assert.match(source,/EXPO_PUBLIC_JYNLO_API_URL:\s*["']?https:\/\//);
  assert.match(source,/secrets\.JYNLO_PLAY_UPLOAD_KEYSTORE_BASE64/);
  assert.match(source,/jarsigner -verify/);
  assert.match(source,/upload-artifact@v4/);
  assert.doesNotMatch(source,/google-play-release|r0adkll\/upload-google-play/i);
});
