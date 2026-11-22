const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('Android and iOS both require camera and microphone before transmitting',()=>{
 const gate=read('src/lib/live-capture-permissions.ts');
 assert.match(gate,/Platform\.OS==='android'/);
 assert.match(gate,/PermissionsAndroid\.requestMultiple\(/);
 assert.match(gate,/PermissionsAndroid\.PERMISSIONS\.CAMERA/);
 assert.match(gate,/PermissionsAndroid\.PERMISSIONS\.RECORD_AUDIO/);
 assert.match(gate,/Platform\.OS==='ios'/);
 assert.match(gate,/ImagePicker\.requestCameraPermissionsAsync\(\)/);
 assert.match(gate,/AudioModule\.requestRecordingPermissionsAsync\(\)/);
 assert.match(gate,/if\(!camera\.granted\)throw Error/);
 assert.match(gate,/if\(!microphone\.granted\)throw Error/);
});
test('personal live never creates a server event before granting native capture',()=>{
 const list=read('app/live/index.tsx');
 const permission=list.indexOf('await ensureLiveCapturePermissions()');
 const create=list.indexOf('await startPersonalLive(auth.token,title)');
 assert.ok(permission>=0&&create>permission);
});
test('community live checks capture permissions for both immediate and scheduled starts',()=>{
 const community=read('app/communities/[id]/live/index.tsx');
 const matches=community.match(/await ensureLiveCapturePermissions\(\)/g)||[];
 assert.equal(matches.length,2);
 assert.match(community,/const active=await startCommunityLive/);
});
test('a guest cannot publish before camera and microphone permission',()=>{
 const room=read('app/live/[id].tsx');
 const permission=room.indexOf('await ensureLiveCapturePermissions()');
 // The guest token is only requested after permissions (token re-read in between).
 const token=room.indexOf('return joinPersonalLive(token,id)',permission);
 assert.ok(permission>0&&token>permission);
 assert.match(room,/if\(active\.current&&next\.role==='GUEST'\)/);
});

test('signed iOS and Android app manifests declare live capture permission descriptions',()=>{
 const config=JSON.parse(read('app.json')).expo;
 assert.match(config.ios.infoPlist.NSCameraUsageDescription,/câmara/i);
 assert.match(config.ios.infoPlist.NSMicrophoneUsageDescription,/microfone/i);
 assert.ok(config.android.permissions.includes('android.permission.CAMERA'));
 assert.ok(config.android.permissions.includes('android.permission.RECORD_AUDIO'));
});
