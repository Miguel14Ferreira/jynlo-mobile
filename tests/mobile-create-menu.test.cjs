'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const tabs=read('app/(tabs)/_layout.tsx');
const feed=read('app/(tabs)/index.tsx');
test('centre creation button is a real accessible action with closable sheet',()=>{
 assert.match(tabs,/name="create" options=\{\{title:'Criar',tabBarButton:/);
 assert.match(tabs,/accessibilityLabel="Abrir menu de criação"/);
 assert.match(tabs,/<Modal visible=\{open\} transparent animationType="slide" onRequestClose=\{close\}>/);
 assert.match(tabs,/accessibilityLabel="Fechar menu de criação"/);
 for(const screen of ['index','explore','create','messages','profile'])
  assert.ok(tabs.includes('name="'+screen+'"'),screen);
});
test('creation options reuse existing routes and require authentication',()=>{
 assert.match(tabs,/if\(!auth\.token\|\|!auth\.username\)/);
 assert.match(tabs,/router\.push\('\/sessions\/create'\)/);
 assert.match(tabs,/router\.push\('\/communities\/create'\)/);
 assert.match(tabs,/router\.push\('\/venues\/create'\)/);
 assert.match(tabs,/router\.push\('\/tournaments\/create'\)/);
 assert.match(tabs,/router\.push\(\{pathname:'\/teams',params:\{create:'1'\}\}\)/);
 assert.match(tabs,/params:\{compose:destination\}/);
 assert.match(feed,/useLocalSearchParams<\{compose\?:string;storyId\?:string;momentSession\?:string\}>\(\)/);
 assert.match(feed,/if\(compose==='post'\)openPostComposer\(\)/);
 assert.match(feed,/else openStoryComposer\(\)/);
 assert.match(feed,/router\.setParams\(\{compose:undefined\}\)/);
 assert.ok(feed.indexOf('useFocusEffect(useCallback(()=>{if(!auth.ready')<feed.indexOf('  // The central + action reuses'), 'initial identity reset precedes opening composer');
});
test('tournament is gated by owned or administrated communities, not membership alone',()=>{
 assert.match(tabs,/myCommunities\(auth\.token,auth\.username\)/);
 assert.match(tabs,/groups\.filter\(c=>c\.myRole==='OWNER'\|\|c\.myRole==='ADMIN'\)/);
 assert.match(tabs,/eligible\.length>0/);
 assert.match(tabs,/checkError\?/);
 // Tournament is a primary create action; the create screen itself only offers
 // owned/administrated communities and otherwise guides the organiser to create one.
 assert.match(tabs,/accessibilityLabel="Criar torneio"[^>]*onPress=\{\(\)=>action\('tournament'\)\}/);
 const tournamentCreate=read('app/tournaments/create.tsx');
 assert.match(tournamentCreate,/c\.myRole==='OWNER'\|\|c\.myRole==='ADMIN'/);
 assert.match(tournamentCreate,/Criar comunidade e torneio/);
 assert.match(read('app/communities/create.tsx'),/thenTournament\)router\.replace\(\{pathname:'\/tournaments\/create'/);
 assert.match(tabs,/Várias provas numa época · comunidade que administras/);
});

test('jogo de época explains rankings and keeps long choices in a vertical layout',()=>{
 const create=read('app/sessions/create.tsx');
 assert.match(create,/accessibilityLabel="Saber mais sobre jogos de época"/);
 assert.match(create,/<Modal visible=\{showSeasonHelp\} transparent animationType="fade"/);
 assert.match(create,/onPress=\{\(\)=>setShowSeasonHelp\(true\)\}/);
 assert.match(create,/accessibilityLabel="Percebi, fechar explicação"/);
 assert.match(create,/helpBody:\{fontSize:15,lineHeight:23,color:C.white\}/);
 assert.doesNotMatch(create,/Alert\.alert\('O que é um jogo de época\?'/);
 assert.match(create,/title="Não contar para a época"/);
 assert.match(create,/title="Contar para a época"/);
 assert.match(create,/styles\.playerChoices/);
 assert.match(create,/styles\.seasonHead|styles\.seasonHeading|styles\.seasonRow|styles\.seasonControl|styles\.seasonChoices/);
});

test('session creation is an accessible full-width hero above secondary actions',()=>{
 const layout=read('app/(tabs)/_layout.tsx');
 assert.match(layout,/accessibilityLabel="Criar sessão desportiva"/);
 assert.match(layout,/style=\{styles\.sessionHero\} onPress=\{\(\)=>action\('session'\)\}/);
 assert.match(layout,/sessionHero:\{width:'100%',minHeight:142/);
 assert.ok(layout.indexOf('accessibilityLabel="Criar sessão desportiva"') < layout.indexOf("onPress={()=>action('post')}"));
 assert.match(layout,/Marca o jogo, reúne jogadores e organiza as equipas/);
 assert.match(layout,/Também podes criar/);
 assert.match(layout,/style=\{\[styles\.actionCard,styles\.teamCard\]\}/);
 assert.match(layout,/teamCard:\{width:'100%'/);
 assert.match(layout,/style=\{styles\.teamCopy\}/);
});

test('plus menu contains only post and community secondary tiles without duplicate Story tile',()=>{
 const layout=read('app/(tabs)/_layout.tsx');
 const tiles=layout.slice(layout.indexOf('<View style={styles.primaryGrid}>'),layout.indexOf('</View>',layout.indexOf('<View style={styles.primaryGrid}>')));
 assert.match(tiles,/action\('post'\)/);
 assert.match(tiles,/action\('community'\)/);
 assert.doesNotMatch(tiles,/action\('story'\)/);
 assert.doesNotMatch(layout,/Criar Story com a câmara/);
 assert.match(feed,/accessibilityLabel="Criar a minha story"/);
});

test('create team opens the form after identity reset and consumes the deep-link once',()=>{
 const screen=read('app/teams/index.tsx');
 assert.match(screen,/useLocalSearchParams<\{create\?:string\}>\(\)/);
 assert.match(screen,/if\(params\.create==='1'&&auth\.token\)/);
 assert.match(screen,/setCreateOpen\(true\)/);
 assert.match(screen,/router\.setParams\(\{create:undefined\}\)/);
 const reset=screen.indexOf("setCreateOpen(false);setName('');");
 const open=screen.indexOf("if(params.create==='1'&&auth.token)");
 assert.ok(reset>=0&&open>reset,'the URL intent must run after account reset');
});
