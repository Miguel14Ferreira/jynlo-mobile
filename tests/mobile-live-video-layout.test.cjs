'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('personal Live video uses a dominant stage and a local PiP preview',()=>{
 const s=read('app/live/[id].tsx');
 assert.match(s,/const videos=tracks\.filter\(isTrackReference\)\.sort\(\(a,b\)=>Number\(a\.participant\.isLocal\)-Number\(b\.participant\.isLocal\)\)/);
 assert.match(s,/const dominant=videos\[0\],previews=videos\.slice\(1\)/);
 assert.match(s,/VideoTrack trackRef=\{dominant\} style=\{styles\.video\}/);
 assert.match(s,/previews\.map\(track=>/);
 assert.match(s,/videoPreview:\{position:'absolute'/);
 assert.match(s,/videoStageExpanded:\{height:510\}/);
 assert.match(s,/accessibilityLabel=\{expandedVideo\?'Reduzir vídeo do direto':'Ampliar vídeo do direto'\}/);
 assert.match(s,/accessibilityLabel=\{showChat\?'Ocultar chat do direto':'Mostrar chat do direto'\}/);
});
test('personal Live retains publisher moderation, chat restrictions and end confirmation',()=>{
 const s=read('app/live/[id].tsx');
 assert.match(s,/BroadcastControls publisher=\{host\|\|role==='GUEST'\}/);
 assert.match(s,/controls\?\.mutedByHost/);
 assert.match(s,/setPersonalLiveChatEnabled\(auth\.token,id,!controls\.chatEnabled\)/);
 assert.match(s,/decidePersonalLiveGuest\(auth\.token,id,requestId,approve\)/);
 assert.match(s,/Alert\.alert\('Terminar direto\?'/);
 assert.match(s,/endPersonalLive\(auth\.token!,id\)/);
 assert.match(s,/connection&&showChat\?<View style=\{styles\.panel\}>/);
});
test('private calls show the remote camera with self-view PiP and safe controls',()=>{
 const s=read('src/features/direct-call-screen.tsx');
 assert.match(s,/const valid=tracks\.filter\(isTrackReference\)\.sort\(\(a,b\)=>Number\(a\.participant\.isLocal\)-Number\(b\.participant\.isLocal\)\)/);
 assert.match(s,/const dominant=valid\[0\],preview=valid\.slice\(1\)/);
 assert.match(s,/VideoTrack trackRef=\{dominant\} style=\{styles\.video\}/);
 assert.match(s,/videoStageExpanded:\{height:500\}/);
 assert.match(s,/previewVideo:\{position:'absolute'/);
 assert.match(s,/accessibilityLabel=\{expandedVideo\?'Reduzir vídeo da chamada':'Ampliar vídeo da chamada'\}/);
 assert.match(s,/await room\.localParticipant\.setMicrophoneEnabled\(muted\)/);
 assert.match(s,/await room\.localParticipant\.setCameraEnabled\(cameraOff\)/);
 assert.match(s,/accessibilityLabel="Terminar chamada"/);
 assert.match(s,/endDirectCall\(activeSession\.callId,auth\.token\)/);
});
