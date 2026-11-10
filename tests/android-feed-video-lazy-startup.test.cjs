'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('feed startup does not eagerly initialize the Expo native video player',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.doesNotMatch(feed,/^import .*from 'expo-video';/m);
 assert.match(feed,/const FeedVideo=lazy\(\(\)=>import\('\.\.\/\.\.\/src\/components\/FeedVideo'\)\)/);
 assert.match(feed,/<Suspense fallback=\{<View style=\{story\?styles\.storyVideo:styles\.postVideo\}\/>\}>/);
 assert.match(feed,/<FeedVideo uri=\{uri\} story=\{story\}\/>/);
 assert.match(feed,/story\.video\?<MediaVideo uri=\{uri\} story\/>/);
});

test('on-demand video module preserves story autoplay and post media controls',()=>{
 const video=read('src/components/FeedVideo.tsx');
 assert.match(video,/import \{VideoView,useVideoPlayer\} from 'expo-video'/);
 assert.match(video,/p\.loop=story/);
 assert.match(video,/if\(story\)\{p\.muted=true;p\.play\(\);\}/);
 assert.match(video,/contentFit="cover" nativeControls=\{!story\}/);
 assert.match(video,/postVideo:\{width:'100%',height:235,borderRadius:9\}/);
 assert.match(video,/storyVideo:\{width:'100%',height:'100%'\}/);
});

test('Expo native config changes trigger free code checks before an APK build',()=>{
 const ci=read('.github/workflows/mobile-code-checks.yml');
 assert.match(ci,/\s+- 'app\.config\.js'/);
 assert.match(ci,/\s+- 'app\.json'/);
 assert.match(ci,/\s+- 'eas\.json'/);
 assert.match(ci,/npm run typecheck/);
 assert.match(ci,/npm run test:all/);
 assert.match(ci,/expo export --platform android/);
});

test('feed does not import native photo picker before user opens media gallery',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.doesNotMatch(feed,/^import .*from 'expo-image-picker';/m);
 assert.match(feed,/const ImagePicker=await import\('expo-image-picker'\)/);
 const userAction=feed.indexOf('async function pickMedia(');
 const pickerImport=feed.indexOf("await import('expo-image-picker')");
 const launch=feed.indexOf("ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:.86})");
 assert.ok(userAction>=0&&pickerImport>userAction&&launch>pickerImport);
 assert.match(feed,/if\(result\.canceled\|\|!result\.assets\.length\)return/);
 assert.match(feed,/catch\{Alert\.alert\('Não foi possível abrir a galeria'/);
});
