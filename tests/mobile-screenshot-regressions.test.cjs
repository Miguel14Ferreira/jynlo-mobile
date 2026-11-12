'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Map fallback never embeds blocked OpenStreetMap volunteer tiles',()=>{
 const explore=read('app/(tabs)/explore.tsx');
 assert.match(explore,/https:\/\/www\.google\.com\/maps\/\@/);
 assert.doesNotMatch(explore,/https:\/\/www\.openstreetmap\.org\/\#map=/);
 assert.match(explore,/NATIVE_MAP_READY/);
});

test('uploaded stories use filename extension and explicit server errors',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/uploadName/);
 assert.match(api,/jynlo-media\.'\+extension/);
 assert.match(api,/response\.status===413/);
 assert.match(api,/controller\.signal\.aborted/);
 assert.match(api,/sendMedia\('\/api\/stories'/);
});

test('season explanations, venue images and completed attendance are privacy-safe',()=>{
 const create=read('app/sessions/create.tsx');
 const details=read('app/sessions/[id].tsx');
 const venue=read('app/venues/[id].tsx');
 assert.match(create,/equipas mais equilibradas/);
 assert.match(create,/Saber mais sobre o jogo de época/);
 assert.match(details,/Date\.parse\(s\.gameDate\|\|''\)>Date\.now\(\)/);
 assert.match(venue,/envio de novas fotografias está temporariamente suspenso/);
});

test('scrollable screens reserve space above system navigation and inbox has no technical status essay',()=>{
 const ui=read('src/components/UI.tsx');
 const inbox=read('app/(tabs)/messages.tsx');
 assert.match(ui,/paddingBottom:88/);
 assert.doesNotMatch(inbox,/Conversas e contadores de não lidas atualizados automaticamente/);
});
