'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('mobile Lives share the authenticated backend routes with Jynlo Web',()=>{
 const api=read('src/lib/personal-live-api.ts');
 for(const endpoint of ["'/api/live'","'/join'","'/heartbeat'","'/end'","'/messages'","'/controls'","'/guest-requests'"])assert.ok(api.includes(endpoint),endpoint);
 assert.match(api,/if\(!Number\.isSafeInteger\(id\)\|\|id<=0\)/);
 assert.match(api,/DEMO_MODE/);
 assert.match(api,/title\.trim\(\)/);
 assert.match(api,/trimmed\.length>500/);
});

test('Live event is created only after camera and microphone permissions',()=>{
 const list=read('app/live/index.tsx');
 const permissions=list.indexOf('await ensureLiveCapturePermissions()');
 const create=list.indexOf('startPersonalLive(auth.token,title)');
 assert.ok(permissions>=0&&create>permissions);
 assert.match(list,/router\.push\(\{pathname:'\/live\/\[id\]'/);
 assert.match(list,/item\.status==='LIVE'/);
});

test('LiveKit host heartbeat, viewer controls and chat use live permissions',()=>{
 const room=read('app/live/[id].tsx');
 assert.match(room,/registerGlobals\(\)/);
 assert.match(room,/AudioSession\.startAudioSession\(\)/);
 assert.match(room,/heartbeatPersonalLive\(auth\.token!,id\)/);
 assert.match(room,/endPersonalLive\(auth\.token!,id\)/);
 assert.match(room,/connect audio=\{host\|\|role==='GUEST'\} video=\{host\|\|role==='GUEST'\}/);
 assert.match(room,/await room\.localParticipant\.setCameraEnabled/);
 assert.match(room,/await room\.localParticipant\.setMicrophoneEnabled/);
 assert.match(room,/sendPersonalLiveMessage\(auth\.token,id,message\)/);
 assert.match(room,/setPersonalLiveChatEnabled\(auth\.token,id,!controls\.chatEnabled\)/);
 assert.match(room,/decidePersonalLiveGuest\(auth\.token,id,requestId,approve\)/);
 assert.match(room,/next\.role==='GUEST'/);
});

test('home navigation points to the implemented native personal Lives screens',()=>{
 const home=read('app/(tabs)/index.tsx');
 const routes=read('app/_layout.tsx');
 assert.match(home,/router\.push\(auth\.token\?'\/live':'\/login'\)/);
 assert.match(routes,/name="live\/index"/);
 assert.match(routes,/name="live\/\[id\]"/);
});

test('personal Lives refresh from authenticated WebSocket invalidations, with a modest fallback',()=>{
 const realtime=read('src/lib/personal-live-realtime.ts');
 const room=read('app/live/[id].tsx');
 const list=read('app/live/index.tsx');
 assert.match(realtime,/type:'AUTH',token/);
 assert.match(realtime,/envelope\.type==='AUTHENTICATED'/);
 assert.match(realtime,/envelope\.type==='PERSONAL_LIVE_INVALIDATED'/);
 assert.match(realtime,/reconnectDelay\(attempt\+\+\)/);
 assert.match(realtime,/onInvalidated\(\)/);
 assert.match(room,/observePersonalLives\(\{token:auth\.token/);
 assert.match(list,/observePersonalLives\(\{token:auth\.token/);
 assert.match(room,/setInterval\(\(\)=>\{if\(AppState\.currentState==='active'\)void refresh\(\);\},30000\)/);
});

test('guest permissions are revoked after host removal, and never guessed from the UI',()=>{
 const room=read('app/live/[id].tsx');
 assert.match(room,/!state\.value\.isGuest&&connectionRole\.current==='GUEST'/);
 assert.match(room,/next\.role==='VIEWER'/);
 assert.match(room,/next\.role==='GUEST'/);
 assert.match(room,/await ensureLiveCapturePermissions\(\)/);
 assert.match(room,/connectionRole\.current===role/);
});
