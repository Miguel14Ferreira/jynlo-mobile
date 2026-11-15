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
 assert.match(viewer,/if\(!story\|\|story\.video\|\|paused\|\|replyFocused\|\|storyBusy\|\|!appActive\)return/);
 assert.match(viewer,/Animated\.timing\(progress/);
 assert.match(viewer,/animation\.stop\(\)/);
 assert.match(viewer,/remaining\.current=Math\.max\(0,1-value\)/);
 assert.match(viewer,/groups\.findIndex/);
 assert.match(viewer,/onPressIn:\(\)=>\{longPress\.current=false/);
});

test('image-led posts show caption after engagement controls; session activities retain context',()=>{
 assert.ok(post,'post card must exist');
 const image=post.indexOf('<PostAlbumCarousel items={album}');
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
 assert.match(viewer,/pageY-start>110&&!replyFocused\)safeClose\(\)/);
 assert.match(viewer,/onTouchCancel=/);
});

test('story caption overlay is shown in preview and playback using the existing caption contract',()=>{
 const viewer=feed.split('function StoryViewer(')[1]?.split('export default function JynloFeedHome()')[0];
 const composer=feed.split('<Modal visible={identityMatches&&storyComposer}')[1]?.split('</Modal>')[0];
 assert.ok(viewer&&composer);
 assert.match(viewer,/story\.caption\?\.trim\(\)/);
 assert.match(viewer,/styles\.storyCaptionLayer/);
 assert.match(composer,/storyCaption\.trim\(\)/);
 assert.match(composer,/<StoryTextPlacement caption=\{storyCaption\.trim\(\)\}/);
 assert.match(composer,/maxLength=\{180\}/);
 assert.match(composer,/MediaVideo uri=\{storyMedia\.uri\} story paused/);
 assert.doesNotMatch(composer,/burn|flatten|renderToFile/);
});

test('Stories open the device camera and still offer a gallery without a tall black preview',()=>{
 const composer=feed.split('<Modal visible={identityMatches&&storyComposer}')[1]?.split('</Modal>')[0];
 assert.ok(composer);
 assert.match(composer,/StoryCameraCapture key=\{storyComposerRevision\.current\}/);
 assert.match(composer,/pickMedia\(setStoryMedia,'gallery'\)/);
 assert.match(composer,/accessibilityLabel="Fechar criação de Story"/);
 const camera=fs.readFileSync(path.join(__dirname,'../src/components/StoryCameraCapture.tsx'),'utf8');
 assert.match(camera,/ImagePicker\.launchCameraAsync/);
 assert.doesNotMatch(camera,/<CameraView/);
});
test('feed engagement actions wrap rather than overlapping on small screens',()=>{
 assert.match(feed,/postActions:\{flexDirection:'row',flexWrap:'wrap'/);
 assert.match(feed,/postAction:\{flexDirection:'row'[^}]*minHeight:36/);
});

test('post creation supports camera, multiple gallery assets and one-item removal',()=>{
 const composer=feed.split('<Modal visible={identityMatches&&composerOpen}')[1]?.split('</Modal>')[0];
 assert.ok(composer,'authenticated full-screen post composer exists');
 assert.match(composer,/pickMedia\(\(\)=>\{\},'camera',true\)/);
 assert.match(composer,/pickMedia\(\(\)=>\{\},'gallery',true\)/);
 assert.match(composer,/composerMedia\.map\(\(media,i\)=>/);
 assert.match(composer,/Image source=\{\{uri:media.uri\}\} resizeMode="contain"/);
 assert.match(composer,/MediaVideo key=\{media.uri\} uri=\{media.uri\}/);
 assert.match(composer,/accessibilityLabel=\{`Remover ficheiro \$\{i\+1\}`\}/);
 assert.match(composer,/changeComposerMedia\(prev=>prev.filter\(x=>x.uri!==media.uri\)\)/);
 assert.match(composer,/disabled=\{publishing\}/);
 assert.match(composer,/\(!composerMedia.length&&!composerText.trim\(\)\)\|\|publishing/);
 assert.match(feed,/postMediaPreviewImage:\{width:'100%',height:300,backgroundColor:/);
});

test('feed comments use a dismissible bottom sheet instead of expanding under the post',()=>{
 const post=feed.split('function PostCard(')[1]?.split('const Header=')[0];
 const sheet=feed.split('<Modal visible={identityMatches&&expandedComments!==null}')[1]?.split('</Modal>')[0];
 assert.ok(post&&sheet,'post and comments sheet exist');
 assert.doesNotMatch(post,/styles\.commentBox/);
 assert.match(post,/accessibilityLabel="Abrir comentários"/);
 assert.match(sheet,/onRequestClose=\{closeComments\}/);
 assert.match(sheet,/styles\.commentsBackdrop/);
 assert.match(sheet,/comments\.map\(c=>/);
 assert.match(sheet,/accessibilityLabel="Enviar comentário"/);
 assert.match(sheet,/submitComment\(expandedComments\)/);
 assert.match(feed,/function closeComments\(\)\{commentsRequest\.current\+\+/);
 assert.match(feed,/if\(requestId===commentsRequest\.current\)setComments\(next\)/);
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

test('sharing a post or attendance activity uses the correct canonical URL',()=>{
 const share=feed.split('async function sharePost(')[1]?.split('function SessionPostAttachment(')[0];
 assert.ok(share);
 assert.match(share,/sharedPostLink\(item\)/);
 assert.match(share,/Share\.share/);
 const shared=fs.readFileSync(path.join(__dirname,'../src/lib/shared-post-link.cjs'),'utf8');
 assert.match(shared,/\/posts\//);assert.match(shared,/\/sessions\//);
});
test('posting media without typed caption uses a valid default backend caption',()=>{
 const api=fs.readFileSync(path.join(__dirname,'../src/lib/social-feed-api.ts'),'utf8');
 assert.match(api,/const caption=content\.trim\(\)/);
 assert.match(api,/const confirmed=await sendMedia\('\/api\/feed\/posts',\{content:caption,/);
});
