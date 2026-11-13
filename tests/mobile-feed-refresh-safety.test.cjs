'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
test('feed preserves prior posts and stories if a refresh fails',()=>{
 assert.match(source,/if\(fetches\[0\]\.status==='fulfilled'\)setPosts/);
 assert.match(source,/if\(fetches\[1\]\.status==='fulfilled'\)setStories/);
 assert.match(source,/if\(fetches\[2\]\.status==='fulfilled'\)setOwnStories/);
 assert.match(source,/O conteúdo apresentado pode estar desatualizado/);
});
test('feed clears cached social content on account changes',()=>{
 assert.match(source,/const feedIdentity=useRef\(''\)/);
 assert.match(source,/const identityChanged=feedIdentity\.current!==identity/);
 assert.match(source,/if\(identityChanged\)\{\s*feedIdentity\.current=identity/);
 assert.match(source,/setPosts\(\[\]\);setStories\(\[\]\);setOwnStories\(\[\]\)/);
 assert.match(source,/setStoryViewer\(null\);setStoryComposer\(false\)/);
 assert.match(source,/const visiblePosts=identityMatches&&hiddenReady\?posts.filter\(item=>/);
});

test('partial Story API failures retain cached Stories but warn users explicitly',()=>{
 assert.match(source,/if\(fetches\[1\]\.status==='fulfilled'\)setStories/);
 assert.match(source,/if\(fetches\[2\]\.status==='fulfilled'\)setOwnStories/);
 assert.match(source,/else if\(fetches\[1\]\.status==='rejected'\|\|fetches\[2\]\.status==='rejected'\)/);
 assert.match(source,/Não foi possível atualizar as Stories/);
 assert.match(source,/As Stories apresentadas podem estar desatualizadas/);
});
