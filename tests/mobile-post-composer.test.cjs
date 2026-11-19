'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('text-only posts remain available and use the real authenticated JSON API',()=>{
 const home=read('app/(tabs)/index.tsx'),api=read('src/lib/social-feed-api.ts');
 assert.match(home,/async function submitPost\(\)\{/);
 assert.match(home,/!composerMedia.length&&!composerText.trim\(\)/);
 assert.match(api,/if\(!files\?\.length\)return createTextPost\(caption,token,username,place,sessionId\)/);
 assert.match(api,/request<FeedItem>\('\/api\/feed\/posts',\{method:'POST',token,body:\{content:body,location:location\.trim\(\)\|\|null,\.\.\.\(sessionId\?\{sessionId\}:\{\}\)\}\}\)/);
 assert.match(api,/requireSocialCollection\(await request<unknown>\('\/api\/feed',\{token\}\),'feed'\)/);
});
test('Stories and post selection use file-type and on-disk media validation',()=>{
 const home=read('app/(tabs)/index.tsx'),api=read('src/lib/social-feed-api.ts');
 assert.match(home,/mediaTypes:\['images','videos'\]/);
 assert.match(home,/size>0\?validateMedia\(mime,size,!album&&setter===setStoryMedia\):null/);
 assert.match(home,/appendAlbumSelection\(composerMediaRef\.current,prepared\)/);
 assert.match(home,/pickMedia\(setStoryMedia,'gallery'\)/);
 assert.match(api,/validateMedia\(file.mimeType,actualSize,path.includes\('\/stories'\)\)/);
 assert.match(api,/const actualSize=localFile.exists\?localFile.size:-1/);
 assert.match(api,/if\(!uri.startsWith\('file:\/\/'\)\)/);
});
test('media publishing uses synchronous single-flight guards and preserves uncertain failures',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/postInFlight.current=true;setPublishing\(true\)/);
 assert.match(home,/storyInFlight.current=true;setStoryPublishing\(true\)/);
 assert.match(home,/!requireLogin\(\)\|\|postInFlight.current\|\|\(!composerMedia.length&&!composerText.trim\(\)\)/);
 assert.match(home,/!requireLogin\(\)\|\|storyInFlight.current\|\|!storyRetryAcknowledged\|\|!storyMedia/);
 assert.match(home,/void load\(\)\.catch\(\(\)=>setError\('Publicação enviada/);
 assert.match(home,/void load\(\)\.catch\(\(\)=>setError\('Story enviada/);
 assert.match(home,/feedIdentity.current===`\$\{username\}:\$\{actor\}`/);
});
test('multipart success requires verified server media metadata before clearing composer',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const receipt=read('src/lib/social-upload-receipt.cjs');
 assert.match(api,/confirmedSocialMediaReceipt\(confirmed,files.map\(file=>file.mimeType\),path.includes\('\/stories'\)\)/);
 assert.match(api,/O servidor respondeu, mas não confirmou todos os ficheiros/);
 assert.match(receipt,/reply.postId/);
 assert.match(receipt,/reply.id/);
 assert.match(receipt,/reply.mediaUrl/);
 assert.match(receipt,/reply.extraMedia/);
});

test('uploads preserve edits made during slow publishing without a second POST',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/const revision=postComposerRevision\.current/);
 assert.match(home,/const revision=storyComposerRevision\.current/);
 assert.match(home,/composerTextRef\.current===body&&composerLocationRef\.current===place/);
 assert.match(home,/composerMediaRef\.current\.every\(\(file,index\)=>file\.uri===media\[index\]\?\.uri\)/);
 assert.match(home,/storyCaptionRef\.current===body&&storyMediaRef\.current\?\.uri===media\.uri/);
 assert.match(home,/As alterações feitas durante o envio ficaram guardadas no editor/);
 assert.match(home,/finally\{if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`\)\{postInFlight\.current=false;setPublishing\(false\);\}\}/);
 assert.match(home,/finally\{if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`\)\{storyInFlight\.current=false;setStoryPublishing\(false\);\}\}/);
 assert.match(home,/onChangeText=\{value=>\{composerTextRef\.current=value;setComposerText\(value\);\}\}/);
});

test('Feed albums and protected post details display complete photos with measured proportions',()=>{
 const home=read('app/(tabs)/index.tsx');
 const detail=read('app/posts/[postId]/index.tsx');
 const album=read('src/components/PostAlbumCarousel.tsx');
 const protectedMedia=read('src/components/ProtectedPostMedia.tsx');
 const photo=read('src/components/AdaptivePostPhoto.tsx');
 assert.match(home,/import PostAlbumCarousel from/);
 assert.match(home,/<PostAlbumCarousel items=\{album\}/);
 assert.match(album,/<AdaptivePostPhoto uri=\{uri\} width=\{width\}/);
 assert.match(detail,/<ProtectedPostMedia src=\{media\.url\}/);
 assert.match(protectedMedia,/<AdaptivePostPhoto uri=\{uri\} width=\{width\}/);
 assert.match(protectedMedia,/downloadPrivateProfileMedia\(src,token\)/);
 assert.match(photo,/const source=event\.nativeEvent\.source/);
 assert.match(photo,/Math\.round\(width\*dimensions\.height\/dimensions\.width\)/);
 assert.match(photo,/Math\.min\(620,Math\.max\(180,/);
 assert.match(photo,/resizeMode="contain"/);
 assert.match(photo,/setDimensions\(null\)/);
});
