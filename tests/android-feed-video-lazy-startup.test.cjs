'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('feed startup does not eagerly initialize the Expo native video player',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.doesNotMatch(feed,/^import .*from 'expo-video';/m);
 assert.match(feed,/const FeedVideo=lazy\(\(\)=>import\('\.\.\/\.\.\/src\/components\/FeedVideo'\)\)/);
 assert.match(feed,/<Suspense fallback=\{<View style=\{story\?styles\.storyVideo:styles\.postVideo\}\/>\}>/);
 assert.match(feed,/<FeedVideo uri=\{uri\} story=\{story\} paused=\{paused\} muted=\{muted\} onEnd=\{onEnd\} onReady=\{onReady\} onPlaybackError=\{onPlaybackError\}\/>/);
 assert.match(feed,/<MediaVideo key=\{story.id\+'-'\+mediaRetry\} uri=\{uri\} story muted=\{storyMuted\}[\s\S]*?paused=/);
});

test('on-demand video playback advances Stories exactly once, never crops ordinary posts',()=>{
 const video=read('src/components/FeedVideo.tsx');
 assert.match(video,/import \{VideoView,useVideoPlayer\} from 'expo-video'/);
 assert.match(video,/p\.loop=false/);
 assert.match(video,/if\(story\)\{p\.muted=muted;p\.play\(\);\}/);
 assert.match(video,/ended\.current=true/);
 assert.match(video,/contentFit="contain" nativeControls=\{!story\}/);
 assert.match(video,/postVideo:\{width:'100%',height:300,borderRadius:12,backgroundColor:/);
 assert.match(video,/storyVideo:\{width:'100%',height:'100%'\}/);
 assert.match(video,/useEffect\(\(\)=>\{ended\.current=false;readyOnce\.current=false;setVideoFailed\(false\);\},\[uri,token\]\)/);
});

test('code checks remain explicit and build-free while GitHub hosted quota is exhausted',()=>{
 const ci=read('.github/workflows/mobile-code-checks.yml');
 assert.match(ci,/workflow_dispatch:/);
 assert.doesNotMatch(ci,/^\s+push:/m);
 assert.match(ci,/npm run typecheck/);
 assert.match(ci,/npm run test:all/);
 assert.match(ci,/expo export --platform android/);
 assert.doesNotMatch(ci,/eas build --platform android/);
});

test('native photo picker is only loaded after a user action and supports mixed albums',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.doesNotMatch(feed,/^import .*from 'expo-image-picker';/m);
 assert.match(feed,/const ImagePicker=await import\('expo-image-picker'\)/);
 const userAction=feed.indexOf('async function pickMedia(');
 const pickerImport=feed.indexOf("await import('expo-image-picker')");
 const launch=feed.indexOf('ImagePicker.launchImageLibraryAsync(');
 assert.ok(userAction>=0&&pickerImport>userAction&&launch>pickerImport);
 assert.match(feed,/allowsMultipleSelection:true,selectionLimit:availableAlbumSlots/);
 assert.match(feed,/mediaPickerInFlight.current/);
 assert.match(feed,/if\(activeStoryAccount.current!==actorToken\|\|result.canceled\|\|!result.assets.length\)return/);
 assert.match(feed,/pickerMediaMime\(asset\)/);
});
