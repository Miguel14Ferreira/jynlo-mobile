const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('venue detail uses real backend photo, condition and rating endpoints',()=>{
 const api=read('src/lib/parity-api.ts');
 const screen=read('app/venues/[id].tsx');
 for(const endpoint of ['/photos','/sport-conditions','/ratings/summary'])assert.ok(api.includes(endpoint));
 assert.match(screen,/Promise\.allSettled/);
 assert.match(screen,/venuePhotos\(id\)/);
 assert.match(screen,/venueSportConditions\(id\)/);
 assert.match(screen,/venueRatingSummary\(id\)/);
});
test('review privacy, URL safety and no mandatory browser redirection',()=>{
 const screen=read('app/venues/[id].tsx');
 assert.match(screen,/rating\.ratingCount>=3/);
 assert.match(screen,/rating\.averageScore!=null/);
 assert.match(screen,/url\.protocol==='https:'/);
 assert.match(screen,/Math\.abs\(venue\.latitude\)<=90/);
 assert.doesNotMatch(screen,/d24sports\.com/);
 assert.doesNotMatch(screen,/Linking\.openURL\('https:\/\/d24sports/);
});
test('public venue fields align with backend without inventing values',()=>{
 const types=read('src/lib/types.ts');
 for(const key of ['openingHours','priceInfo','contact','website','surfaceType','indoor','changingRooms','showers','accessible','locationStatus'])
  assert.match(types,new RegExp(key));
 assert.match(types,/export interface VenuePhoto/);
 assert.match(types,/export interface VenueSportCondition/);
 assert.match(types,/export interface VenueRatingSummary/);
});

test('venue labels and values use accessible hierarchy instead of low-emphasis text runs',()=>{
 const screen=read('app/venues/[id].tsx');
 assert.match(screen,/styles\.infoRow/);
 assert.match(screen,/styles\.infoLabel/);
 assert.match(screen,/styles\.infoValue/);
 assert.match(screen,/fontSize:15,fontWeight:'600',lineHeight:23/);
 assert.match(screen,/accessibilityLabel=\{t\(label\)\+': '\+/);
 assert.doesNotMatch(screen,/\{label\}: \{value\.trim\(\)\}/);
});
test('muted text design tokens achieve WCAG AA contrast on native dark surfaces',()=>{
 const theme=read('src/lib/theme.ts');
 const hex=(key)=>new RegExp(key+":\\s*'(#(?:[0-9a-fA-F]{6}))'").exec(theme)?.[1];
 const contrast=(a,b)=>{
  const light=h=>{
   const rgb=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)
    .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
   return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  };
  const x=light(a),y=light(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
 };
 for(const [foreground,background] of [
  ['muted','background'],['muted','surface'],['muted','surface2'],
  ['white','surface'],['mint','surface']
 ]){
  const a=hex(foreground),b=hex(background);
  assert.ok(a&&b,'missing token '+foreground+'/'+background);
  assert.ok(contrast(a,b)>=4.5,foreground+' on '+background+' must meet WCAG AA');
 }
});
