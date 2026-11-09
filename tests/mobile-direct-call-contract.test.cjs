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

test('call UI enters through an authenticated private conversation and uses the native LiveKit screen',()=>{
 const direct=read('app/messages/[peer].tsx');
 const screen=read('app/messages/call.tsx');
 assert.ok(direct.includes("pathname:'/messages/call'"));
 assert.ok(direct.includes('!blocked'));
 assert.ok(screen.includes('<LiveKitRoom'));
 assert.ok(screen.includes('AudioSession.startAudioSession()'));
});

test('Expo release includes a native LiveKit engine and the required media plugins',()=>{
 const p=JSON.parse(read('package.json'));
 const app=JSON.parse(read('app.json')).expo;
 for(const name of ['@livekit/react-native','@livekit/react-native-webrtc',
  '@livekit/react-native-expo-plugin','@config-plugins/react-native-webrtc','livekit-client'])
  assert.ok(p.dependencies[name],name);
 assert.ok(app.plugins.includes('@config-plugins/react-native-webrtc'));
 assert.ok(app.plugins.some(item=>Array.isArray(item)&&item[0]==='@livekit/react-native-expo-plugin'));
});
test('native call room uses server-issued credentials and manages microphone, camera and disconnect',()=>{
 const screen=read('app/messages/call.tsx');
 const route=read('app/_layout.tsx');
 const direct=read('app/messages/[peer].tsx');
 for(const item of ['registerGlobals()','AudioSession.startAudioSession()','AudioSession.stopAudioSession()',
  '<LiveKitRoom','serverUrl={session.serverUrl}','token={session.token}',
  "session.media==='video'","room.localParticipant.setMicrophoneEnabled",
  "room.localParticipant.setCameraEnabled","onDisconnected={()=>{void hangup();}}",
  "directCallAvailability(auth.token)","pendingDirectCall(auth.token)",
  "startDirectCall(peer,media,auth.token)","acceptDirectCall(invitation.callId,auth.token)",
  "declineDirectCall(invitation.callId,auth.token)","endDirectCall(activeSession.callId,auth.token)"])
  assert.ok(screen.includes(item),item);
 assert.ok(route.includes('name="messages/call"'));
 assert.ok(direct.includes("pathname:'/messages/call'"));
 assert.ok(!screen.includes('LIVEKIT_API_SECRET'));
});

test('native calls only connect after audio is ready and release server session on exit',()=>{
 const screen=read('app/messages/call.tsx');
 for(const text of [
  'setAudioReady(false)',
  'AudioSession.startAudioSession().then',
  'session&&audioReady?<LiveKitRoom',
  'session&&!audioReady?',
  "void endDirectCall(orphan.callId,auth.token).catch(()=>{})",
  'sessionRef.current=result;setSession(result)',
  "if(AppState.currentState==='active'&&!operation.current&&!sessionRef.current)",
  "As chamadas em segundo plano e os avisos globais ainda precisam de integração nativa"
 ])assert.ok(screen.includes(text),text);
});

test('failed or late native audio initialization releases server calls and cannot leave a frozen spinner',()=>{
 const screen=read('app/messages/call.tsx');
 for(const marker of [
  'if(!active){void AudioSession.stopAudioSession();return;}',
  'const failedSession=sessionRef.current',
  'failedSession?.callId===session.callId',
  'sessionRef.current=null',
  'setSession(null)',
  'endDirectCall(failedSession.callId,auth.token)',
  'A chamada foi terminada.'
 ])assert.ok(screen.includes(marker),marker);
});

test('call screen checks server state and leaves the room when invitation expires or call ends',()=>{
 const screen=read('app/messages/call.tsx');
 for(const marker of [
  'directCallMembers(callId,auth.token!)',
  'members.participants.length>=2',
  'e instanceof ApiError&&e.status===403',
  '[404,410].includes(e.status)',
  'setSession(null)',
  "setError('A chamada terminou ou o convite expirou.')",
  "if(AppState.currentState==='active')void inspect()",
  'clearInterval(timer)',
  'À espera de resposta do contacto'
 ])assert.ok(screen.includes(marker),marker);
 assert.ok(!screen.includes('setConnectedToPeer(false);setConnectedToPeer(false)'));
});

test('the messages inbox shows authenticated, unexpired incoming call invitations',()=>{
 const inbox=read('app/(tabs)/messages.tsx');
 for(const marker of [
  'pendingDirectCall(auth.token)',
  'setIncomingCall(null)',
  "call.status==='fulfilled'",
  'else setIncomingCall(null);',
  'Date.parse(call.value.expiresAt)>Date.now()',
  'sameIdentity&&incomingCall',
  "pathname:'/messages/call'",
  'params:{peer:incomingCall.caller}',
  'Abrir chamada para aceitar ou recusar'
 ])assert.ok(inbox.includes(marker),marker);
 assert.ok(inbox.includes("if(version!==generation.current||identity.current!==auth.username+'|'+auth.token)return"));
});

test('leaving a call clears local ownership and limits overlapping server status requests',()=>{
 const screen=read('app/messages/call.tsx');
 for(const marker of [
  'const orphan=sessionRef.current;',
  'sessionRef.current=null;setSession(null);setConnectedToPeer(false);setAudioReady(false)',
  'if(auth.token)void endDirectCall(orphan.callId,auth.token).catch(()=>{})',
  'let inspectInFlight=false',
  'if(inspectInFlight)return',
  'inspectInFlight=true',
  'finally{inspectInFlight=false;}'
 ])assert.ok(screen.includes(marker),marker);
 assert.ok(!screen.includes('useEffect(()=>{sessionRef.current=session;},[session])'));
});

test('LiveKit native failures close the media room rather than leaving a dead call onscreen',()=>{
 const screen=read('app/messages/call.tsx');
 assert.ok(screen.includes("onError={e=>{setError('Falha ao ligar ao LiveKit: '+e.message);void hangup();}}"));
 assert.ok(screen.includes("onDisconnected={()=>{void hangup();}}"));
});
