'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('text-only posts remain available and use the real authenticated JSON API',()=>{
 const home=read('app/(tabs)/index.tsx'),api=read('src/lib/social-feed-api.ts');
 assert.match(home,/async function submitPost\(\)\{/);
 assert.match(home,/!composerMedia.length&&!composerText.trim\(\)/);
 assert.match(api,/if\(!files\?\.length\)return createTextPost\(caption,token,username,place\)/);
 assert.match(api,/request<FeedItem>\('\/api\/feed\/posts',\{method:'POST',token,body:\{content:body,location:location\.trim\(\)\|\|null\}\}\)/);
 assert.match(api,/return request<FeedItem\[\]>\('\/api\/feed',\{token\}\)/);
});
test('Stories and post selection use file-type and on-disk media validation',()=>{
 const home=read('app/(tabs)/index.tsx'),api=read('src/lib/social-feed-api.ts');
 assert.match(home,/mediaTypes:\['images','videos'\]/);
 assert.match(home,/validateMedia\(mime,size\|\|1,!album&&setter===setStoryMedia\)/);
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
 assert.match(home,/!requireLogin\(\)\|\|storyInFlight.current\|\|!storyMedia/);
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
