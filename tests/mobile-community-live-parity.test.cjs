const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('community Lives use authenticated endpoints and validate IDs, title and date',()=>{
 const api=source('src/lib/community-live-api.ts');
 assert.match(api,/\/api\/communities/);
 assert.match(api,/\+'\/live'/);
 assert.match(api,/communityLiveCapabilities/);
 assert.match(api,/communityLiveEvents/);
 assert.match(api,/scheduleCommunityLive/);
 assert.match(api,/startCommunityLive/);
 assert.match(api,/joinCommunityLive/);
 assert.match(api,/heartbeatCommunityLive/);
 assert.match(api,/endCommunityLive/);
 assert.match(api,/Number\.isSafeInteger\(communityId\)/);
 assert.match(api,/Number\.isSafeInteger\(eventId\)/);
 assert.match(api,/DEMO_MODE/);
 assert.match(api,/90\*86400000/);
});

test('community scheduling is owner-only and native capture permission is requested before starting',()=>{
 const screen=source('app/communities/[id]/live/index.tsx');
 assert.match(screen,/caps\.canManage/);
 assert.match(screen,/event\.canManage/);
 assert.match(screen,/await ensureLiveCapturePermissions\(\)/);
 assert.ok(screen.indexOf('await ensureLiveCapturePermissions()')<screen.indexOf('await startCommunityLive'));
 assert.match(screen,/communityLiveCapabilities\(auth\.token,id\)/);
 assert.match(screen,/communityLiveEvents\(auth\.token,id\)/);
 assert.match(screen,/date\.toISOString\(\)/);
 assert.match(screen,/Direto da comunidade/);
});

test('LiveKit community viewers are subscribe-only, hosts heartbeat and explicitly end events',()=>{
 const room=source('app/communities/[id]/live/[eventId].tsx');
 assert.match(room,/joinCommunityLive\(auth\.token,communityId,eventId\)/);
 assert.match(room,/connect audio=\{host\} video=\{host\}/);
 assert.match(room,/heartbeatCommunityLive\(auth\.token!,communityId,eventId\)/);
 assert.match(room,/endCommunityLive\(auth\.token!,communityId,eventId\)/);
 assert.match(room,/AudioSession\.startAudioSession\(\)/);
 assert.match(room,/registerGlobals\(\)/);
 assert.match(room,/room\.localParticipant\.setMicrophoneEnabled/);
 assert.match(room,/room\.localParticipant\.setCameraEnabled/);
 assert.match(room,/x\.id===eventId&&x\.status==='LIVE'/);
});

test('community Live navigation is visible only to existing members',()=>{
 const community=source('app/communities/[id].tsx');
 const layout=source('app/_layout.tsx');
 // Live stays members-only, now inside the Overview section.
 assert.match(community,/\{role&&activeSection==='OVERVIEW'\?<View style=\{styles\.section\}>\s*<Eyebrow>TRANSMISSÕES EM DIRETO/);
 assert.match(community,/pathname:'\/communities\/\[id\]\/live'/);
 assert.match(layout,/name="communities\/\[id\]\/live\/index"/);
 assert.match(layout,/name="communities\/\[id\]\/live\/\[eventId\]"/);
});
