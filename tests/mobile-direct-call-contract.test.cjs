'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('mobile direct call contracts match authenticated Java signalling endpoints',()=>{
 const api=read('src/lib/direct-call-api.ts');
 for(const item of [
  '/api/calls/direct/availability','/api/calls/direct/pending',
  "'/api/calls/direct/'+validPeer(peer)",
  "callPath(callId)+'/accept'","callPath(callId)+'/decline'",
  "callPath(callId)+'/end'","callPath(callId)+'/members'",
  "callPath(callId)+'/invite/'+validPeer(username)",
  'DirectCallSession','DirectCallInvitation','DirectCallMembers',
  "method:'POST'","body:{media}"
 ])assert.ok(api.includes(item),item);
});

test('direct call credentials remain scoped to authenticated endpoints and IDs are validated',()=>{
 const api=read('src/lib/direct-call-api.ts');
 assert.ok(api.includes('if(DEMO_MODE||!token)'));
 assert.ok(api.includes('if(!UUID.test(id))'));
 assert.ok(api.includes('if(!PEER.test(peer))'));
 assert.ok(api.includes('return encodeURIComponent(peer)'));
 assert.ok(api.includes('return request<DirectCallInvitation|null>'));
 assert.ok(api.includes("if(media!=='voice'&&media!=='video')"));
 assert.ok(!api.includes('LIVEKIT_API_SECRET'));
 assert.ok(!api.includes('LIVEKIT_API_KEY'));
});

test('direct call transport is not presented as a functional audio/video UI without a native media client',()=>{
 const direct=read('app/messages/[peer].tsx');
 const api=read('src/lib/direct-call-api.ts');
 assert.ok(api.includes('Do not use start/accept until native LiveKit media is integrated'));
 assert.ok(!direct.includes('startDirectCall('));
 assert.ok(!direct.includes('acceptDirectCall('));
});
