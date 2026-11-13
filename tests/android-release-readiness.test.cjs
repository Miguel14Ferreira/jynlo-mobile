'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const releaseGuard = path.join(root, 'scripts', 'verify-release.cjs');
const productionApi = 'https://desporto24-preview-api.onrender.com';

function runGuard(url) {
  return spawnSync(process.execPath, [releaseGuard, '--production'], {
    encoding: 'utf8',
    env: { ...process.env, EXPO_PUBLIC_JYNLO_API_URL: url, JYNLO_REQUIRE_REAL_API: '1' },
  });
}

test('Android release metadata agrees with Expo application identity', () => {
  assert.equal(app.android.package, 'com.jynlo.app');
  assert.equal(app.ios.bundleIdentifier, app.android.package);
  assert.equal(app.version, packageJson.version);
  assert.ok(Number.isSafeInteger(app.android.versionCode) && app.android.versionCode > 0);
  assert.equal(packageJson.main, 'expo-router/entry');
});

test('internal Android builds are explicitly APK, never accidentally store bundles', () => {
  for (const profile of ['preview', 'diagnostic']) {
    assert.ok(eas.build?.[profile], `Missing EAS profile: ${profile}`);
    assert.equal(eas.build[profile].android?.buildType, 'apk');
  }
});

test('release guard accepts only public HTTPS API origins', () => {
  const valid = runGuard(productionApi);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  for (const url of [
    '', 'http://example.org', 'https://localhost', 'https://127.0.0.1',
    'https://10.1.2.3', 'https://example.com', 'https://demo.example.org',
    'https://user:pass@api.example.org', 'https://api.example.org/path',
    'https://api.example.org/?debug=1', 'https://api.example.org/#debug',
    'https://api.example.org@localhost', 'https://[::1]',
  ]) {
    const result = runGuard(url);
    assert.notEqual(result.status, 0, `Release guard accepted unsafe URL: ${url}`);
    assert.match(result.stderr, /BUILD BLOQUEADO/);
  }
});

test('Android app links cover registration, reset, communities and sessions', () => {
  const filters = app.android.intentFilters || [];
  const paths = filters.flatMap(filter =>
    (filter.data || [])
      .filter(entry => entry.scheme === 'https' && entry.host === 'd24sports.com')
      .map(entry => entry.pathPrefix)
  );
  for (const prefix of [
    '/login/registerNewUser/confirmTokenRegistration/',
    '/login/resetPassword/', '/menu/communities/', '/sessions/',
  ]) assert.ok(paths.includes(prefix), `Missing app link: ${prefix}`);
});

test('Android media permissions and Expo plugins support camera and gallery', () => {
  const plugins = app.plugins.map(plugin => Array.isArray(plugin) ? plugin[0] : plugin);
  for (const plugin of ['expo-router', 'expo-image-picker', 'expo-notifications'])
    assert.ok(plugins.includes(plugin), `Missing Expo plugin: ${plugin}`);
  assert.ok(app.android.permissions.includes('android.permission.CAMERA'));
  assert.ok(app.android.permissions.includes('android.permission.RECORD_AUDIO'));
});

test('signed APK launch diagnostic enforces provenance before installation', () => {
  const workflow = fs.readFileSync(
    path.join(root, '.github', 'workflows', 'android-launch-diagnostic.yml'), 'utf8'
  );
  for (const marker of [
    'android-build-info.json', 'android-build-sha256.txt', 'sha256sum -c',
    "run.get('headBranch') != 'develop'", "run.get('conclusion') != 'success'",
    'adb install -r', 'adb logcat -d', 'pidof com.jynlo.app',
  ]) assert.ok(workflow.includes(marker), `Missing launch diagnostic safeguard: ${marker}`);
});

test('local validation never triggers an APK build without an explicit opt-in', () => {
  const script = fs.readFileSync(path.join(root, 'scripts', 'validate-local.ps1'), 'utf8');
  assert.match(script, /\[switch\]\$BuildApk/);
  assert.match(script, /if \(\$BuildApk\)/);
  assert.match(script, /CONSTRUIR_APK/);
  assert.match(script, /npm\.cmd.*typecheck/);
  assert.match(script, /npm\.cmd.*test:all/);
});
