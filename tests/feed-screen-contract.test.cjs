const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Feed é o separador inicial e Explorar mantém a descoberta de sessões',()=>{
  const tabs=read('app/(tabs)/_layout.tsx');
  assert.match(tabs, /name="index" options=\{\{title:'Feed'/);
  assert.match(tabs, /name="explore" options=\{\{title:'Explorar'/);
  assert.ok(fs.existsSync(path.join(root,'app/(tabs)/explore.tsx')));
  assert.ok(fs.existsSync(path.join(root,'app/people.tsx')));
});
test('Feed mobile centra-se em stories e publicações sem caixa de texto no início',()=>{
  const feed=read('app/(tabs)/index.tsx');
  for(const fragment of ['Stories','Publicações','publishPost','publishStory','likePost','postComments','addPostComment','expo-image-picker','composerOpen','Nova publicação'])assert.ok(feed.includes(fragment),fragment);
  for(const removed of ['A minha semana desportiva','Jogos com vagas','Pessoas para conhecer','discoverSessions','mySessions','myCommunities'])assert.ok(!feed.includes(removed),removed);
  assert.match(feed,/if\(fetches\[0\]\.status==='fulfilled'\)setPosts\(value\(0,\[\] as FeedItem\[\]\)\)/);
  assert.doesNotMatch(feed,/setPosts\([^\n]*\.filter\(item=>item\.type==='POST'\)/);
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
  assert.doesNotMatch(feed,/auth\.token\?<View style=\{styles\.composerCard\}>/);
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

test('Feed apresenta stories e criação de publicações num ecrã próprio',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/const \[composerOpen,setComposerOpen\]=useState\(false\)/);
 assert.match(feed,/<Modal visible=\{composerOpen\}/);
 assert.doesNotMatch(feed,/\{composerOpen\?<><TextInput/);
 assert.match(feed,/storiesCard:\{paddingVertical:10,gap:8\}/);
 assert.match(feed,/feedCardWrap:\{paddingHorizontal:12,marginBottom:10\}/);
 assert.doesNotMatch(feed,/weekPanel:\{[^}]*\}[^]*<View style=\{styles\.weekPanel\}>/);
});

test('criar story mantém-se acessível na fila mesmo quando já existem stories',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/storyGroups\.length\?<ScrollView[^]*?accessibilityLabel="Criar a minha story"/);
 assert.match(feed,/onPress=\{\(\)=>setStoryComposer\(true\)\} style=\{styles\.storyItem\}/);
 assert.match(feed,/>A tua story<\/Text>/);
 assert.match(feed,/storyCreateBadge:\{/);
});

test('Feed mobile presents server session attendance and creation events alongside posts',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const types=read('src/lib/types.ts');
 assert.match(types,/type:'POST'\|'SESSION_CREATED'\|'SESSION_ATTENDED'/);
 assert.match(feed,/if\(fetches\[0\]\.status==='fulfilled'\)setPosts\(value\(0,\[\] as FeedItem\[\]\)\)/);
 assert.match(feed,/item\.sessionId\?<Pressable onPress=\{\(\)=>router\.push/);
 assert.match(feed,/item\.type==='POST'\?/);
});
