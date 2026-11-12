'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('mobile feed allows real text-only posts without requiring camera or gallery',()=>{
 const home=read('app/(tabs)/index.tsx');
 const api=read('src/lib/social-feed-api.ts');
 assert.match(home,/async function submitPost\(\)\{if\(!requireLogin\(\)\|\|publishing\|\|\(!composerMedia&&!composerText\.trim\(\)\)\)return;/);
 assert.match(home,/disabled=\{\(!composerMedia&&!composerText\.trim\(\)\)\|\|publishing\}/);
 assert.match(home,/Partilha texto, fotografias ou vídeos/);
 assert.match(api,/if\(!file\)return createTextPost\(content,token,username\)/);
 assert.match(api,/request<FeedItem>\('\/api\/feed\/posts',\{method:'POST',token,body:\{content:body\}\}\)/);
});
test('story upload validates story media rules and post picker validates post limits',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/validateMedia\(mime,size\|\|1,setter===setStoryMedia\)/);
 assert.match(home,/pickMedia\(setComposerMedia,'gallery'\)/);
 assert.match(home,/pickMedia\(setStoryMedia,'gallery'\)/);
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/validateMedia\(file\.mimeType,actualSize,path\.includes\('\/stories'\)\)/);
});


test('media sends are single-flight, success closes composer even when subsequent feed refresh fails',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/postInFlight\.current=true;setPublishing\(true\)/);
 assert.match(home,/storyInFlight\.current=true;setStoryPublishing\(true\)/);
 assert.match(home,/if\(!requireLogin\(\)\|\|postInFlight\.current\|\|\(!composerMedia&&!composerText\.trim\(\)\)\)return/);
 assert.match(home,/if\(!requireLogin\(\)\|\|storyInFlight\.current\|\|!storyMedia\)return/);
 assert.match(home,/void load\(\)\.catch\(\(\)=>setError\('Publicação enviada/);
 assert.match(home,/void load\(\)\.catch\(\(\)=>setError\('Story enviada/);
 assert.match(home,/feedIdentity\.current===\`\$\{username\}:\$\{actor\}\`/);
 assert.doesNotMatch(home,/await publishPost\([^;]+;setComposerText\(''\);setComposerMedia/);
});
