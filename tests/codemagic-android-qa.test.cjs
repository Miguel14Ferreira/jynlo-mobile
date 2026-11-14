'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Codemagic uses a manual develop-only Mac M2 Android standalone build',()=>{
 const yaml=read('codemagic.yaml');
 assert.match(yaml,/instance_type: mac_mini_m2/);
 assert.match(yaml,/max_build_duration: 90/);
 assert.match(yaml,/\$\{CM_BRANCH:-\}.*develop/);
 assert.match(yaml,/npx --no-install expo prebuild --platform android --no-install/);
 assert.match(yaml,/\.\/gradlew assembleRelease --no-daemon/);
 assert.match(yaml,/android\/app\/build\/outputs\/apk\/release\/\*\.apk/);
 assert.doesNotMatch(yaml,/\b(publishing|autoSubmit|triggering):/);
});
test('Codemagic targets authenticated preview backend and blocks production or master',()=>{
 const yaml=read('codemagic.yaml');
 assert.match(yaml,/EXPO_PUBLIC_JYNLO_API_URL: "https:\/\/desporto24-preview-api\.onrender\.com"/);
 assert.match(yaml,/JYNLO_REQUIRE_REAL_API: "1"/);
 assert.match(yaml,/node scripts\/verify-release\.cjs/);
 assert.match(yaml,/node scripts\/check-eas-project\.cjs/);
 assert.match(yaml,/npm run typecheck/);
 assert.match(yaml,/npm run test:all/);
 assert.doesNotMatch(yaml,/eas build|bundleRelease|publish --|play-internal/);
});
test('Jynlo official icon step is cross-platform for Codemagic macOS',()=>{
 const script=read('scripts/prepare-jynlo-icon.sh');
 assert.match(script,/uname -s/);
 assert.match(script,/base64 -D -i "\$SOURCE" -o "\$work_dir\/approved\.webp"/);
 assert.match(script,/base64 --decode "\$SOURCE"/);
});
test('Expo File uploads use native Expo fetch, with no old RN URI-form attachment parts',()=>{
 const paths=[
  'src/lib/social-feed-api.ts','src/lib/chat-photo-album.ts','src/lib/chat-photo-attachment.ts',
  'src/lib/direct-photo-attachment.ts','src/lib/chat-pdf-attachment.ts'
 ];
 for(const name of paths){
  const source=read(name);
  assert.match(source,/import \{fetch as expoFetch\} from 'expo\/fetch'/);
  assert.match(source,/await expoFetch\(/);
  assert.doesNotMatch(source,/form\.append\('[^']+',\{\s*uri:/);
 }
});
