const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('Stories open native inline camera and gallery, with explicit upload errors',()=>{
 const home=read('app/(tabs)/index.tsx'),camera=read('src/components/StoryCameraCapture.tsx');
 const api=read('src/lib/social-feed-api.ts'),pkg=JSON.parse(read('package.json'));
 assert.match(home,/<StoryCameraCapture key=\{storyComposerRevision\.current\}/);
 assert.match(camera,/requestCameraPermissionsAsync\(\)/);
 assert.match(camera,/launchCameraAsync\(/);
 assert.match(camera,/onPickGallery/);
 assert.match(camera,/onPickGallery/);
 assert.equal(pkg.dependencies['expo-camera'],'~58.0.14');
 assert.match(api,/if\(!uri.startsWith\('file:\/\/'\)\)/);
 assert.match(api,/source\.copy\(copy\)/);
 assert.match(api,/response\.status>=500/);
 assert.match(api,/for\(const file of temporary\)/);
});
test('Android screens remain inside system navigation area and season help is readable',()=>{
 const ui=read('src/components/UI.tsx'),create=read('app/sessions/create.tsx');
 assert.match(ui,/edges=\{underHeader\?\['bottom','left','right'\]:\['top','bottom','left','right'\]\}/);
 assert.match(create,/seasonHelpText:\{color:C\.mint/);
 assert.match(create,/seasonHead:\{gap:10/);
 // Season help was rewritten in plain language (PR #26).
 assert.match(create,/O que é um jogo de época\?/);
 assert.match(create,/Contar para a época/);
});
test('profile counts and session attendance respect actual backend state',()=>{
 const profile=read('app/(tabs)/profile.tsx');
 const session=read('app/sessions/[id].tsx');
 assert.match(profile,/followStatus\(auth\.username,auth\.token\)/);
 assert.match(profile,/socialCounts\.followers/);
 assert.match(profile,/socialCounts\.following/);
 assert.doesNotMatch(profile,/Não existe troca instantânea entre contas/);
 assert.match(session,/detail\?\.joined&&!\['CANCELLED','COMPLETED'\]\.includes/);
});
test('chat sharing is consent-based and photo storage is not required for other attachments',()=>{
 const chat=read('app/messages/[peer].tsx');
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['expo-location'],'~58.0.21');
 assert.match(chat,/requestForegroundPermissionsAsync\(\)/);
 assert.doesNotMatch(chat,/requestBackgroundPermissionsAsync\(/);
 assert.match(chat,/setDraft\(previous=>\[previous\.trim\(\),url\]/);
 assert.match(chat,/enabled=\{!blocked&&blockStatusKnown&&!sending&&!photoBusy\}/);
});
test('unmoderated venue photo submission and internal chat notices are hidden from users',()=>{
 const venue=read('app/venues/[id].tsx');
 const visible=venue.slice(venue.indexOf('return <Page>'));
 assert.doesNotMatch(visible,/Escolher fotografia do recinto/);
 assert.match(visible,/temporariamente suspenso/);
 assert.doesNotMatch(read('app/(tabs)/messages.tsx'),/Conversas e contadores de não lidas atualizados automaticamente/);
});
