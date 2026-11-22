const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pickerMediaMime}=require('../src/lib/picker-media-format.cjs');

test('accepts opaque Android content URIs when filename and MIME describe supported media',()=>{
 assert.equal(pickerMediaMime({type:'image',uri:'content://gallery/42',fileName:'momento.jpg',mimeType:'application/octet-stream'}),'image/jpeg');
 assert.equal(pickerMediaMime({type:'video',uri:'content://gallery/41',fileName:'lance.mp4',mimeType:'application/unknown'}),'video/mp4');
 assert.equal(pickerMediaMime({type:'image',uri:'content://gallery/40',fileName:'retrato.webp'}),'image/webp');
});
test('rejects incompatible media declarations rather than silently disguising container formats',()=>{
 assert.equal(pickerMediaMime({type:'video',uri:'file:///clip.mp4',mimeType:'video/webm'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'file:///photo.png',mimeType:'image/jpeg'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'file:///image.heic',mimeType:'image/jpeg'}),null);
 assert.equal(pickerMediaMime({type:'video',uri:'content://camera/3',fileName:'clip.mov',mimeType:'video/quicktime'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'content://gallery/2',fileName:'photo.avif',mimeType:'image/avif'}),null);
});
test('does not infer image media when only an untyped opaque provider URI is available',()=>{
 assert.equal(pickerMediaMime({type:'image',uri:'content://gallery/opaque',mimeType:'application/octet-stream'}),null);
 assert.equal(pickerMediaMime({type:'image',uri:'content://gallery/opaque',fileName:'file.jpg',mimeType:'video/mp4'}),null);
});
test('feed and native Story capture both use the same validated parser',()=>{
 const feed=untranslate(fs.readFileSync(path.join(__dirname,'..','app','(tabs)','index.tsx'),'utf8'));
 const camera=untranslate(fs.readFileSync(path.join(__dirname,'..','src','components','StoryCameraCapture.tsx'),'utf8'));
 assert.match(feed,/pickerMediaMime\(asset\)/);
 assert.match(camera,/pickerMediaMime\(asset\)/);
});

test('camera permission denial offers settings without blocking the gallery',()=>{
 const feed=untranslate(fs.readFileSync(path.join(__dirname,'..','app','(tabs)','index.tsx'),'utf8'));
 const story=untranslate(fs.readFileSync(path.join(__dirname,'..','src','components','StoryCameraCapture.tsx'),'utf8'));
 assert.match(feed,/if\(!permission\.granted\)/);
 assert.match(feed,/Linking\.openSettings\(\)/);
 assert.match(story,/setPermissionDenied\(true\)/);
 assert.match(story,/permissionDenied\?<Pressable accessibilityRole="button"/);
 assert.match(story,/Linking\.openSettings\(\)/);
 assert.match(story,/onPickGallery/);
 assert.match(feed,/source==='camera'/);
 assert.match(feed,/launchImageLibraryAsync/);
});
test('media selection prevents duplicate pickers and stale cross-account uploads',()=>{
 const screen=untranslate(fs.readFileSync(path.join(__dirname,'..','app','(tabs)','index.tsx'),'utf8'));
 assert.match(screen,/mediaPickerInFlight\.current\)return/);
 assert.match(screen,/mediaPickerInFlight\.current=true/);
 assert.match(screen,/finally\{if\(activeStoryAccount\.current===actorToken\)mediaPickerInFlight\.current=false;\}/);
 assert.match(screen,/activeStoryAccount\.current!==actorToken/);
 assert.match(screen,/postComposerRevision\.current!==postRevision/);
 assert.match(screen,/storyComposerRevision\.current===storyRevision/);
});
