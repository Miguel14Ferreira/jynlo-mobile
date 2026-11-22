const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const pkg=JSON.parse(untranslate(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8')));

test('Expo React and transitive LiveKit react-dom use exactly the same React release',()=>{
 assert.equal(pkg.dependencies.react,'19.3.0');
 assert.equal(pkg.overrides?.['react-dom'],pkg.dependencies.react);
 assert.equal(pkg.dependencies['@livekit/react-native'],'3.1.0');
});

test('dependency conflicts are not bypassed by disabling npm peer validation',()=>{
 const workflow=untranslate(fs.readFileSync(path.join(__dirname,'../.github/workflows/build-android-signed-apk.yml'),'utf8'));
 assert.match(workflow,/npm install --no-audit --no-fund/);
 assert.doesNotMatch(workflow,/--force|--legacy-peer-deps/);
});
