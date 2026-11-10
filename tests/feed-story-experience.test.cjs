'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const viewer=feed.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0];
const post=feed.split('function PostCard(')[1]?.split('const Header=')[0];

test('stories support left/right taps and hold-to-pause without timing out videos',()=>{
 assert.ok(viewer,'story viewer must exist');
 assert.match(viewer,/tapZone\(-1\)/);
 assert.match(viewer,/tapZone\(1\)/);
 assert.match(viewer,/onLongPress:/);
 assert.match(viewer,/if\(!story\|\|story\.video\|\|paused\)return/);
 assert.match(viewer,/Animated\.timing\(progress/);
 assert.match(viewer,/animation\.stop\(\)/);
 assert.match(viewer,/remaining\.current=Math\.max\(0,1-value\)/);
 assert.match(viewer,/groups\.findIndex/);
 assert.match(viewer,/onPressIn:\(\)=>\{longPress\.current=false/);
});

test('image-led posts show caption after engagement controls; session activities retain context',()=>{
 assert.ok(post,'post card must exist');
 const image=post.indexOf('style={styles.postImage}');
 const actions=post.indexOf('style={styles.postActions}');
 const caption=post.indexOf("item.content?<Text style={styles.postBody}>",actions);
 assert.ok(image>=0&&actions>image&&caption>actions,'post image, actions, then caption');
 assert.match(post,/item\.type!=='POST'&&item\.content/);
 assert.match(post,/accessibilityLabel="Partilhar publicação"/);
});

test('native video pauses while story viewer is held',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/components/FeedVideo.tsx'),'utf8');
 assert.match(source,/paused=false/);
 assert.match(source,/if\(paused\)player\.pause\(\)/);
 assert.match(source,/else player\.play\(\)/);
});

test('story videos advance once at native playback completion, without looping',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/components/FeedVideo.tsx'),'utf8');
 assert.match(source,/p\.loop=false/);
 assert.match(source,/player\.addListener\('playToEnd'/);
 assert.match(source,/if\(ended\.current\)return/);
 assert.match(source,/subscription\.remove\(\)/);
 assert.match(viewer,/onEnd=\{\(\)=>go\(1\)\}/);
 assert.match(viewer,/key=\{story\.id\}/);
});

test('viewer closes on downward swipe without overriding ordinary taps',()=>{
 assert.match(viewer,/onTouchStart=/);
 assert.match(viewer,/onTouchEnd=/);
 assert.match(viewer,/pageY-start>110\)onClose\(\)/);
 assert.match(viewer,/onTouchCancel=/);
});

test('story caption overlay is shown in preview and playback using the existing caption contract',()=>{
 const viewer=feed.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0];
 const composer=feed.split('<Modal visible={storyComposer}')[1]?.split('</Modal>')[0];
 assert.ok(viewer&&composer);
 assert.match(viewer,/story\.caption\?\.trim\(\)/);
 assert.match(viewer,/styles\.storyCaptionLayer/);
 assert.match(composer,/storyCaption\.trim\(\)/);
 assert.match(composer,/styles\.storyCaptionOverlay/);
 assert.match(composer,/maxLength=\{180\}/);
 assert.match(composer,/MediaVideo uri=\{storyMedia\.uri\} story paused/);
 assert.doesNotMatch(composer,/burn|flatten|renderToFile/);
});
