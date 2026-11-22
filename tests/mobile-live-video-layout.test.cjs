const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('personal Live video uses a dominant stage and a local PiP preview',()=>{
 const s=read('app/live/[id].tsx');
 assert.match(s,/chooseVideoStageTracks\(tracks\.filter\(isTrackReference\)\)/);
 assert.match(s,/const \{dominant,previews,remaining\}=chooseVideoStageTracks/);
 assert.match(s,/VideoTrack trackRef=\{dominant\} style=\{styles\.video\}/);
 assert.match(s,/previews\.map\(track=>/);
 assert.match(s,/videoPreview:\{position:'absolute'/);
 assert.match(s,/videoStageDimensions\(width,height,expanded\)/);
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
 assert.match(s,/chooseVideoStageTracks\(tracks\.filter\(isTrackReference\)\)/);
 assert.match(s,/const \{dominant,previews,remaining\}=chooseVideoStageTracks/);
 assert.match(s,/VideoTrack trackRef=\{dominant\} style=\{styles\.video\}/);
 assert.match(s,/videoStageDimensions\(wide&&showChat\?width-345:width,height,expandedVideo\)/);
 assert.match(s,/previewVideo:\{position:'absolute'/);
 assert.match(s,/accessibilityLabel=\{expandedVideo\?'Reduzir vídeo da chamada':'Ampliar vídeo da chamada'\}/);
 assert.match(s,/await room\.localParticipant\.setMicrophoneEnabled\(muted\)/);
 assert.match(s,/await room\.localParticipant\.setCameraEnabled\(cameraOff\)/);
 assert.match(s,/accessibilityLabel="Terminar chamada"/);
 assert.match(s,/endDirectCall\(activeSession\.callId,auth\.token\)/);
});

test('responsive stage dimensions stay usable on small and large screens',()=>{
 const {videoStageDimensions}=require('../src/lib/video-stage-layout.cjs');
 for(const [w,h] of [[320,570],[360,640],[390,844],[430,932],[900,1400]]){
  const normal=videoStageDimensions(w,h,false),expanded=videoStageDimensions(w,h,true);
  assert.ok(normal.stageHeight>0&&expanded.stageHeight>0);
  assert.ok(normal.stageHeight<=Math.max(180,h-310));
  assert.ok(expanded.stageHeight<=Math.max(180,h-185));
  assert.ok(expanded.stageHeight>=normal.stageHeight);
  assert.ok(normal.previewWidth<=112&&normal.previewWidth>=76);
  assert.ok(normal.previewHeight>normal.previewWidth);
 }
});
test('camera selection keeps remote video dominant without modifying SDK order',()=>{
 const {chooseVideoStageTracks}=require('../src/lib/video-stage-layout.cjs');
 const local={participant:{isLocal:true},id:'local'};
 const r1={participant:{isLocal:false},id:'remote1'};
 const r2={participant:{isLocal:false},id:'remote2'};
 const r3={participant:{isLocal:false},id:'remote3'};
 const tracks=[local,r1,r2,r3],selection=chooseVideoStageTracks(tracks);
 assert.equal(selection.dominant,r1);
 assert.equal(selection.previews[0],r2);
 assert.equal(selection.previews.length,1);
 assert.equal(selection.remaining,2);
 assert.equal(tracks[0],local);
 assert.equal(chooseVideoStageTracks([local]).dominant,local);
 assert.equal(chooseVideoStageTracks([]).dominant,null);
});
