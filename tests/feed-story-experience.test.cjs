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
 assert.match(viewer,/setTimeout\(/);
 assert.match(viewer,/clearTimeout\(timer\)/);
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
