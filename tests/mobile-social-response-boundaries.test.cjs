const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('feed, profile, Stories and replies validate remote data before rendering',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const guarded=[
  "requireSocialCollection(await request<unknown>('/api/feed',{token}),'feed')",
  "requireSocialCollection(await request<unknown>('/api/feed/users/'",
  "requireSocialCollection(await request<unknown>('/api/stories',{token}),'story')",
  "requireSocialCollection(await request<unknown>('/api/stories/mine',{token}),'story')",
  "requireSocialCollection(await request<unknown>('/api/stories/me/replies?page='+page,{token}),'reply')",
  "safeDiscoveredPeople(raw)"
 ];
 for(const expression of guarded)assert.ok(api.includes(expression),expression);
});

test('failed social API validation cannot replace confirmed feed and Story content',()=>{
 const source=read('app/(tabs)/index.tsx');
 assert.match(source,/Promise\.allSettled\(/);
 assert.match(source,/if\(fetches\[0\]\.status==='fulfilled'\)\{/);
 assert.match(source,/if\(fetches\[1\]\.status==='fulfilled'\)\{/);
 assert.match(source,/if\(fetches\[2\]\.status==='fulfilled'\)\{/);
 assert.match(source,/O conteúdo apresentado pode estar desatualizado/);
 assert.match(source,/As Stories apresentadas podem estar desatualizadas/);
});

test('a changed login cannot display old social content or commit stale credentials',()=>{
 const auth=read('src/lib/auth.tsx');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(auth,/const authEpoch=useRef\(0\)/);
 assert.match(auth,/if\(epoch!==authEpoch\.current\)/);
 assert.match(auth,/credentialQueue\.current=work\.then\(\(\)=>\{\},\(\)=>\{\}\)/);
 assert.match(auth,/authEpoch\.current\+\+/);
 assert.match(feed,/const visiblePosts=identityMatches&&hiddenReady\?posts\.filter/);
 assert.match(feed,/if\(id!==reloadNumber\.current\)return/);
 assert.match(feed,/setPosts\(\[\]\);setStories\(\[\]\);setOwnStories\(\[\]\)/);
});
