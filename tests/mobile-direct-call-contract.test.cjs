const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

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
 const screen=read('src/features/direct-call-screen.tsx');
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
 const screen=read('src/features/direct-call-screen.tsx');
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
 const screen=read('src/features/direct-call-screen.tsx');
 for(const text of [
  'setAudioReady(false)',
  'void startAudio().then',
  'session&&audioReady?<LiveKitRoom',
  'session&&!audioReady?',
  "void endDirectCall(orphan.callId,auth.token).catch(()=>{})",
  'sessionRef.current=result;setSession(result)',
  "if(AppState.currentState==='active'&&!operation.current&&!sessionRef.current)",
  "As chamadas em segundo plano e os avisos globais ainda precisam de integração nativa"
 ])assert.ok(screen.includes(text),text);
});

test('failed or late native audio initialization releases server calls and cannot leave a frozen spinner',()=>{
 const screen=read('src/features/direct-call-screen.tsx');
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
 const screen=read('src/features/direct-call-screen.tsx');
 for(const marker of [
  'directCallMembers(callId,auth.token!)',
  'members.participants.length>=2',
  'e instanceof ApiError&&e.status===403&&!connectedToPeer',
  '[403,404,410].includes(e.status)',
  'setSession(null)',
  "setError('A chamada terminou, expirou ou deixou de estar acessível.')",
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
 const screen=read('src/features/direct-call-screen.tsx');
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
 const screen=read('src/features/direct-call-screen.tsx');
 assert.ok(screen.includes("onError={e=>{setError('Falha ao ligar ao LiveKit: '+e.message);void hangup();}}"));
 assert.ok(screen.includes("onDisconnected={()=>{void hangup();}}"));
});

test('call action is hidden until contact block status has been verified',()=>{
 const chat=read('app/messages/[peer].tsx');
 for(const marker of [
  'blockStatusKnown,setBlockStatusKnown',
  'setBlocked(false);setBlockStatusKnown(false)',
  'setBlocked(value);setBlockStatusKnown(true)',
  '!DEMO_MODE&&blockStatusKnown&&!blocked'
 ])assert.ok(chat.includes(marker),marker);
});
test('active LiveKit calls close if permission is revoked; ringing invitations remain pending',()=>{
 const screen=read('src/features/direct-call-screen.tsx');
 assert.ok(screen.includes('e.status===403&&!connectedToPeer'));
 assert.ok(screen.includes('[403,404,410].includes(e.status)'));
 assert.ok(screen.includes('sessionRef.current=null;setSession(null);setConnectedToPeer(false)'));
});

test('CI validates LiveKit Android native prebuild before relying on signed APK output',()=>{
 const ci=read('.github/workflows/mobile-push-validation.yml');
 const apk=read('.github/workflows/build-android-signed-apk.yml');
 const native='npx expo prebuild --platform android --no-install --clean';
 assert.ok(ci.includes(native));
 assert.ok(ci.includes("name: Validate native Android generation (LiveKit / WebRTC)"));
 assert.ok(ci.indexOf(native)>ci.indexOf('npx expo export --platform android'));
 assert.ok(apk.includes(native));
 assert.ok(apk.includes('npm run test:all'));
 assert.ok(apk.includes('npm run typecheck'));
});

test('Android and iOS advertise call-media permissions before a LiveKit release',()=>{
 const expo=JSON.parse(read('app.json')).expo;
 const permissions=expo.android.permissions;
 for(const permission of ['android.permission.RECORD_AUDIO','android.permission.CAMERA','android.permission.MODIFY_AUDIO_SETTINGS'])
  assert.ok(permissions.includes(permission),permission);
 assert.match(expo.ios.infoPlist.NSMicrophoneUsageDescription,/microfone/);
 assert.match(expo.ios.infoPlist.NSCameraUsageDescription,/câmara/);
 assert.equal(new Set(permissions).size,permissions.length);
});

test('Android requests the correct media permissions before initiating or accepting calls',()=>{
 const screen=read('src/features/direct-call-screen.tsx');
 for(const marker of [
  "if(Platform.OS!=='android')return",
  'PermissionsAndroid.PERMISSIONS.RECORD_AUDIO',
  "if(media==='video')needed.push(PermissionsAndroid.PERMISSIONS.CAMERA)",
  'PermissionsAndroid.requestMultiple(needed)',
  'PermissionsAndroid.RESULTS.GRANTED',
  'await ensureCallPermissions(media)',
  'await ensureCallPermissions(invitation.media)',
  'if(version!==generation.current)return;'
 ])assert.ok(screen.includes(marker),marker);
 assert.ok(screen.indexOf('await ensureCallPermissions(media)')<screen.indexOf('await startDirectCall(peer,media,auth.token)'));
 assert.ok(screen.indexOf('await ensureCallPermissions(invitation.media)')<screen.indexOf('await acceptDirectCall(invitation.callId,auth.token)'));
});

test('signed APK builds are not cancelled by subsequent develop pushes',()=>{
 const workflow=read('.github/workflows/build-android-signed-apk.yml');
 assert.match(workflow,/concurrency:\s*\n\s*group:\s*jynlo-signed-apk-/);
 assert.match(workflow,/cancel-in-progress:\s*false/);
 assert.doesNotMatch(workflow,/cancel-in-progress:\s*true/);
 assert.match(workflow,/runs-on:\s*ubuntu-latest/);
 assert.match(workflow,/npx expo prebuild --platform android --no-install --clean/);
});
test('signed APK bundle check consumes unzip output under pipefail',()=>{
 const workflow=read('.github/workflows/build-android-signed-apk.yml');
 assert.ok(workflow.includes("unzip -Z1 \"$apk\" | grep -Fx 'assets/index.android.bundle' >/dev/null"));
 assert.ok(!workflow.includes("grep -q '^assets/index.android.bundle$'"));
 assert.ok(workflow.includes('apksigner'));
});

test('signed internal diagnostic APK disables R8 instead of concealing missing LiveKit JNI classes',()=>{
 const workflow=read('.github/workflows/build-android-signed-apk.yml');
 const prebuild='npx expo prebuild --platform android --no-install --clean';
 const diagnostic='Desativar minificação R8 apenas para APK interna de diagnóstico';
 const build='./gradlew :app:assembleRelease';
 assert.ok(workflow.includes(diagnostic));
 assert.ok(workflow.includes('minifyEnabled false'));
 assert.ok(workflow.includes('shrinkResources false'));
 assert.ok(workflow.includes("grep -qF -- '-dontwarn livekit.org.jni_zero.JniZeroJni'"));
 assert.ok(workflow.indexOf(prebuild)<workflow.indexOf(diagnostic));
 assert.ok(workflow.indexOf(diagnostic)<workflow.indexOf(build));
 assert.ok(!workflow.includes('Aplicar regras R8 específicas do JNI LiveKit para a APK interna'));
 assert.ok(!workflow.includes('-dontwarn livekit.**'));
});

test('LiveKit native globals are registered only when a call needs audio',()=>{
 const screen=read('src/features/direct-call-screen.tsx');
 assert.doesNotMatch(screen,/^registerGlobals\(\);$/m);
 assert.match(screen,/let liveKitGlobalsRegistered=false/);
 const callAudio=screen.slice(screen.indexOf('const startAudio=async()=>'),screen.indexOf('void startAudio().then('));
 assert.match(callAudio,/if\(!liveKitGlobalsRegistered\)/);
 assert.match(callAudio,/registerGlobals\(\)/);
 assert.match(callAudio,/liveKitGlobalsRegistered=true/);
 assert.match(callAudio,/await AudioSession\.startAudioSession\(\)/);
 assert.ok(callAudio.indexOf('registerGlobals()')<callAudio.indexOf('AudioSession.startAudioSession()'));
 assert.match(screen,/void startAudio\(\)\.then\(\(\)=>\{/);
 assert.match(screen,/\}\)\.catch\(e=>\{/);
});

test('Expo Router does not eagerly import LiveKit native modules while registering routes',()=>{
 const route=read('app/messages/call.tsx');
 assert.match(route,/lazy\(\(\)=>import\('\.\.\/\.\.\/src\/features\/direct-call-screen'\)\)/);
 assert.match(route,/<Suspense fallback=/);
 assert.doesNotMatch(route,/from ['"]@livekit\/react-native['"]/);
 assert.doesNotMatch(route,/from ['"]livekit-client['"]/);
 const native=read('src/features/direct-call-screen.tsx');
 assert.match(native,/from '@livekit\/react-native'/);
 assert.match(native,/export default function DirectCallScreen\(\)/);
});

test('failed LiveKit lazy import is contained so chat navigation remains usable',()=>{
 const route=read('app/messages/call.tsx');
 assert.match(route,/class CallLoadBoundary extends React\.Component/);
 assert.match(route,/static getDerivedStateFromError\(\)\{return \{failed:true\};\}/);
 assert.match(route,/if\(this\.state\.failed\)return/);
 assert.match(route,/O módulo de chamadas não está disponível neste dispositivo/);
 assert.match(route,/onBack=\{\(\)=>router\.back\(\)\}/);
 assert.match(route,/accessibilityRole="button"/);
 assert.ok(route.indexOf('<CallLoadBoundary')<route.indexOf('<Suspense fallback='));
 assert.ok(route.indexOf('<Suspense fallback=')<route.indexOf('<DirectCallScreen/>'));
 assert.doesNotMatch(route,/^import .*from ['"]@livekit\/react-native['"]/m);
});

test('late native call actions cannot unlock a newer account or screen generation',()=>{
 const screen=read('src/features/direct-call-screen.tsx');
 const guarded='finally{if(version===generation.current){operation.current=false;setBusy(false);}}';
 assert.equal(screen.split(guarded).length-1,2,'both start and accept must guard their action locks');
 assert.ok(!screen.includes('finally{operation.current=false;if(version===generation.current)setBusy(false);}'));
 assert.match(screen,/const version=\+\+generation\.current;\s*\/\/ A new screen generation must not inherit a pending action lock\.\s*operation\.current=false;setBusy\(false\)/);
 assert.match(screen,/clearInterval\(timer\);generation\.current\+\+;[\s\S]{0,210}operation\.current=false;\s*const orphan=sessionRef\.current/);
 assert.match(screen,/if\(version!==generation\.current\)\{void endDirectCall\(result\.callId,auth\.token\)\.catch\(\(\)=>\{\}\);return;\}/);
});

test('LiveKit VideoTrack accepts one merged ViewStyle object rather than a React Native style array',()=>{
 const screen=read('src/features/direct-call-screen.tsx');
 // Video stage: one dominant camera plus small previews; each VideoTrack gets a single style object.
 const stage=read('src/lib/video-stage-layout.cjs');
 assert.match(screen,/<VideoTrack trackRef=\{dominant\} style=\{styles\.video\}\/>/);
 assert.match(screen,/<VideoTrack trackRef=\{track\} style=\{styles\.video\}\/>/);
 assert.doesNotMatch(screen,/<VideoTrack[^>]*style=\{\[/);
 // Remote participants lead; the SDK-owned array is copied, never reordered in place.
 assert.match(stage,/\[\.\.\.selected\]\.sort\(\(a,b\)=>Number\(a\.participant\.isLocal\)-Number\(b\.participant\.isLocal\)\)/);
});
