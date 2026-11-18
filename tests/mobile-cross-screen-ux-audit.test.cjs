'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('feed captions and common actions have readable sizes and 44pt touch targets',()=>{
 const screen=read('app/(tabs)/index.tsx');
 for(const marker of [
  "attendanceMeta:{color:'#C0D7DE',fontSize:13,lineHeight:19}",
  "attendanceButton:{minHeight:44",
  "attendanceMore:{alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:12,minHeight:44",
  "hiddenUndo:{minHeight:44",
  "headerCircle:{borderRadius:22,width:44,height:44",
  "weekDetail:{color:'#D1E7ED',fontSize:13,lineHeight:19",
  "ghostButton:{minHeight:44",
  "commentInput:{flex:1,minHeight:44",
  "sendComment:{backgroundColor:TEAL,width:44,height:44",
  "closeStory:{minWidth:44,minHeight:44"
 ])assert.ok(screen.includes(marker),marker);
 assert.match(screen,/publishPost\(/);
 assert.match(screen,/publishStory\(/);
});
test('discovery, inbox, profile and tournament filters remain usable on touch devices',()=>{
 const explore=read('app/(tabs)/explore.tsx');
 const inbox=read('app/(tabs)/messages.tsx');
 const profile=read('app/(tabs)/profile.tsx');
 const tournaments=read('app/(tabs)/tournaments.tsx');
 assert.match(explore,/chip:\{minHeight:44,justifyContent:'center'/);
 assert.match(explore,/accessibilityLabel="Repetir pesquisa de sessões"/);
 assert.match(explore,/onPress=\{\(\)=>\{void load\(\);\}\}/);
 assert.match(inbox,/kindChip:\{minHeight:44/);
 assert.match(profile,/favoriteHeading:\{color:MobileTheme\.colors\.muted,fontSize:12/);
 assert.match(tournaments,/filterLabel:\{color:C\.muted,fontWeight:'800',fontSize:12/);
 assert.match(tournaments,/chip:\{minHeight:44,justifyContent:'center'/);
});
test('tournament empty, error and filtered states all offer recovery',()=>{
 const screen=read('app/(tabs)/tournaments.tsx');
 for(const phrase of ['Tentar novamente','Descobrir comunidades','Limpar filtros'])
  assert.ok(screen.includes(phrase),phrase);
 assert.match(screen,/setQuery\(''\);setStatus\('ALL'\);setSport\('ALL'\)/);
 assert.match(screen,/accessibilityLabel=\{'Abrir torneio '\+x\.tournament\.name\}/);
 assert.match(screen,/router\.push\('\/\(tabs\)\/communities'\)/);
});
test('session participation status and confirmed team rows remain readable',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/confirmedTeamPlayer:\{[^\n]*minHeight:44/);
 assert.match(screen,/attendancePresent:\{color:C\.mint,fontSize:13/);
 assert.match(screen,/attendanceAbsent:\{color:'#FFB8B8',fontSize:13/);
 assert.match(screen,/attendanceButton:\{[^\n]*minHeight:44/);
});
test('navigation and account safety are unchanged by cosmetic changes',()=>{
 const tabs=read('app/(tabs)/_layout.tsx');
 const profile=read('app/(tabs)/profile.tsx');
 for(const tab of ['index','explore','messages','profile'])
  assert.ok(tabs.includes('name="'+tab+'"'));
 assert.match(tabs,/accessibilityLabel="Abrir menu de criação"/);
 assert.match(profile,/Eliminar a minha conta/);
});
