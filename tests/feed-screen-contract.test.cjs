const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Feed é o separador inicial e Explorar mantém a descoberta de sessões',()=>{
  const tabs=read('app/(tabs)/_layout.tsx');
  assert.match(tabs, /name="index" options=\{\{title:'Feed'/);
  assert.match(tabs, /name="explore" options=\{\{title:'Explorar'/);
  assert.ok(fs.existsSync(path.join(root,'app/(tabs)/explore.tsx')));
  assert.ok(fs.existsSync(path.join(root,'app/people.tsx')));
});
test('Feed mobile inclui stories, semana, posts, fotos, gostos, comentários',()=>{
  const feed=read('app/(tabs)/index.tsx');
  for(const fragment of ['Stories','A minha semana desportiva','Últimas publicações','Partilhar com a comunidade','publishPost','publishStory','likePost','postComments','addPostComment','expo-image-picker'])assert.ok(feed.includes(fragment),fragment);
});
test('contratos do Feed correspondem à API Jynlo e não têm troca rápida de conta',()=>{
  const api=read('src/lib/social-feed-api.ts');
  for(const endpoint of ['/api/stories','/api/feed/posts','/api/feed/posts/${postId}/likes','/api/feed/posts/${postId}/comments'])assert.ok(api.includes(endpoint),endpoint);
  assert.doesNotMatch(read('app/(tabs)/profile.tsx'), /Trocar para Tiago|Trocar para André/);
  assert.doesNotMatch(read('app/(tabs)/index.tsx'), /Trocar para Tiago|Trocar para André/);
});

test('Feed de visitante nunca pede feed privado nem simula uma conta',()=>{
  const feed=read('app/(tabs)/index.tsx');
  assert.match(feed,/auth\.token&&auth\.username\?socialFeed/);
  assert.match(feed,/auth\.token\?storyFeed/);
  assert.match(feed,/auth\.token\?discoverPeople/);
  assert.match(feed,/auth\.token\?<View style=\{styles\.composerCard\}>/);
  assert.match(feed,/Explorar todas as sessões/);
  assert.match(feed,/auth\.token\?'A minha semana desportiva':'Descobre a tua próxima sessão'/);
});
