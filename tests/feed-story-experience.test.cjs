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

test('post creation opens a dedicated media-first screen with camera and gallery',()=>{
 const composer=feed.split('<Modal visible={composerOpen}')[1]?.split('</Modal>')[0];
 assert.ok(composer,'full-screen authenticated post composer exists');
 assert.match(composer,/launchCameraAsync|pickMedia\(setComposerMedia,'camera'\)/);
 assert.match(composer,/pickMedia\(setComposerMedia,'gallery'\)/);
 assert.match(composer,/composerMedia\.type==='image'/);
 assert.match(composer,/Image source=\{\{uri:composerMedia\.uri\}\}/);
 assert.match(composer,/MediaVideo key=\{composerMedia\.uri\} uri=\{composerMedia\.uri\}/);
 assert.match(composer,/accessibilityLabel="Remover media da publicação"/);
 assert.match(composer,/onPress=\{\(\)=>setComposerMedia\(null\)\}/);
 assert.match(composer,/disabled=\{publishing\}/);
 assert.match(composer,/disabled=\{!composerMedia\|\|publishing\}/);
 assert.doesNotMatch(feed,/auth\.token\?<View style=\{styles\.composerCard\}>/);
 assert.match(feed,/postMediaPreviewImage:\{width:'100%',height:300\}/);
});

test('feed comments use a dismissible bottom sheet instead of expanding under the post',()=>{
 const post=feed.split('function PostCard(')[1]?.split('const Header=')[0];
 const sheet=feed.split('<Modal visible={expandedComments!==null}')[1]?.split('</Modal>')[0];
 assert.ok(post&&sheet,'post and comments sheet exist');
 assert.doesNotMatch(post,/styles\.commentBox/);
 assert.match(post,/accessibilityLabel="Abrir comentários"/);
 assert.match(sheet,/onRequestClose=\{closeComments\}/);
 assert.match(sheet,/styles\.commentsBackdrop/);
 assert.match(sheet,/comments\.map\(c=>/);
 assert.match(sheet,/accessibilityLabel="Enviar comentário"/);
 assert.match(sheet,/submitComment\(expandedComments\)/);
 assert.match(feed,/function closeComments\(\)\{commentsRequest\.current\+\+/);
 assert.match(feed,/if\(requestId===commentsRequest\.current\)\{setComments/);
});

test('social feed links only to a real session id and uses backend-provided metadata',()=>{
 const attachment=feed.split('function SessionPostAttachment(')[1]?.split('function PostCard(')[0];
 const post=feed.split('function PostCard(')[1]?.split('const Header=')[0];
 assert.ok(attachment&&post,'session attachment and post card exist');
 assert.match(attachment,/Number\.isSafeInteger\(id\)/);
 assert.match(attachment,/id<=0\)return null/);
 assert.match(attachment,/item\.sport\?\.trim\(\)/);
 assert.match(attachment,/item\.city\?\.trim\(\)/);
 assert.match(attachment,/Number\.isFinite\(scheduled\)/);
 assert.match(attachment,/pathname:'\/sessions\/\[id\]'/);
 assert.match(attachment,/Ver detalhes da sessão/);
 assert.doesNotMatch(attachment,/confirmar presença|vagas disponíveis|communityId/);
 assert.match(post,/<SessionPostAttachment item=\{item\}\/>/);
});

test('sharing a session-related post includes its direct web link',()=>{
 const share=feed.split('async function sharePost(')[1]?.split('function SessionPostAttachment(')[0];
 assert.ok(share);
 assert.match(share,/Number\.isSafeInteger\(id\)/);
 assert.match(share,/id!==null&&id>0/);
 assert.match(share,/https:\/\/d24sports\.com\/sessions\/\$\{id\}/);
 assert.match(share,/await Share\.share/);
});
