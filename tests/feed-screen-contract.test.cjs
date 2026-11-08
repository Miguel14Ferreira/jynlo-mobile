const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Feed é o separador inicial e Explorar mantém a descoberta de sessões',()=>{
  const tabs=read('app/(tabs)/_layout.tsx');
  assert.match(tabs, /name="index" options=\{\{title:'Feed'/);
  assert.match(tabs, /name="explore" options=\{\{title:'Explorar'/);
  assert.ok(fs.existsSync(path.join(root,'app/(tabs)/explore.tsx')));
  assert.ok(fs.existsSync(path.join(root,'app/people.tsx')));
});
test('Feed mobile centra-se em stories e publicações com compositor compacto',()=>{
  const feed=read('app/(tabs)/index.tsx');
  for(const fragment of ['Stories','Publicações','publishPost','publishStory','likePost','postComments','addPostComment','expo-image-picker','composerOpen','Partilhar um momento…'])assert.ok(feed.includes(fragment),fragment);
  for(const removed of ['A minha semana desportiva','Jogos com vagas','Pessoas para conhecer','discoverSessions','mySessions','myCommunities'])assert.ok(!feed.includes(removed),removed);
  assert.match(feed,/\.filter\(item=>item\.type==='POST'\)/);
});
test('contratos do Feed correspondem à API Jynlo e não têm troca rápida de conta',()=>{
  const api=read('src/lib/social-feed-api.ts');
  for(const endpoint of ['/api/stories','/api/feed/posts','/api/feed/posts/${postId}/likes','/api/feed/posts/${postId}/comments'])assert.ok(api.includes(endpoint),endpoint);
  assert.doesNotMatch(read('app/(tabs)/profile.tsx'), /Trocar para Tiago|Trocar para André/);
  assert.doesNotMatch(read('app/(tabs)/index.tsx'), /Trocar para Tiago|Trocar para André/);
});

test('Feed de visitante não pede feed privado e apresenta entrada simples',()=>{
  const feed=read('app/(tabs)/index.tsx');
  assert.match(feed,/auth\.token&&auth\.username\?socialFeed/);
  assert.match(feed,/auth\.token\?storyFeed/);
  assert.match(feed,/auth\.token\?<View style=\{styles\.composerCard\}>/);
  assert.match(feed,/Iniciar sessão/);
  assert.doesNotMatch(feed,/auth\.token\?discoverPeople/);
});
test('Feed mobile usa hero compacto sem recorte de imagem e separadores respeitam área segura',()=>{
 const feed=read('app/(tabs)/index.tsx'),tabs=read('app/(tabs)/_layout.tsx');
 assert.match(feed,/>Publicações<\/Text>/);
 assert.doesNotMatch(feed,/jynlo-feed-sports\.png/);
 assert.doesNotMatch(feed,/<ImageBackground/);
 assert.match(tabs,/useSafeAreaInsets/);
 assert.match(tabs,/Math\.max\(insets\.bottom,8\)/);
});
