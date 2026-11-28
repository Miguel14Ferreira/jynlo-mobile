const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

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
 const tournaments=read('app/tournaments/index.tsx');
 assert.match(explore,/chip:\{minHeight:44,justifyContent:'center'/);
 assert.match(explore,/accessibilityLabel="Repetir pesquisa de jogos"/);
 assert.match(explore,/onPress=\{\(\)=>\{void load\(\);\}\}/);
 assert.match(inbox,/kindChip:\{minHeight:44/);
 assert.match(profile,/favoriteHeading:\{color:MobileTheme\.colors\.muted,fontSize:12/);
 assert.match(tournaments,/search:\{minHeight:44/);
 assert.match(tournaments,/chip:\{minHeight:44,justifyContent:'center'/);
});
test('tournament empty, error and filtered states all offer recovery',()=>{
 const screen=read('app/tournaments/index.tsx');
 for(const phrase of ['Tentar novamente','Descobrir comunidades','Limpar filtros'])
  assert.ok(screen.includes(phrase),phrase);
 assert.match(screen,/setQuery\(''\);setStatus\('ALL'\);setSport\('ALL'\)/);
 assert.match(screen,/accessibilityLabel=\{'Abrir torneio '\+x\.tournament\.name\}/);
 assert.match(screen,/router\.push\('\/communities'\)/);
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

test('shared dark palettes retain WCAG AA text contrast on used surfaces',()=>{
 const theme=read('src/lib/theme.ts');
 const C=Object.fromEntries([...theme.slice(theme.indexOf('export const C ='),theme.indexOf('/** Shared design')).matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)].map(x=>[x[1],x[2]]));
 const mobile=Object.fromEntries([...theme.slice(theme.indexOf('colors: {')).matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)].map(x=>[x[1],x[2]]));
 const luminance=hex=>{
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));
  return .2126*r+.7152*g+.0722*b;
 };
 const ratio=(a,b)=>{
  const first=luminance(a),second=luminance(b);
  return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
 };
 for(const [tokens,foreground,background] of [
  [C,'muted','surface'],[C,'muted','surface2'],[C,'white','surface3'],
  [mobile,'muted','surface'],[mobile,'tabInactive','tabBackground'],[mobile,'accent','surface']
 ]){
  const a=tokens[foreground],b=tokens[background];
  assert.ok(a&&b,'Missing design token '+foreground+' / '+background);
  assert.ok(ratio(a,b)>=4.5,foreground+' on '+background+' does not meet WCAG AA');
 }
});
