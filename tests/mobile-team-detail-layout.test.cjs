'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('team identity management is a separate owner-only tab after the navigation',()=>{
 const source=read('app/teams/[id].tsx');
 assert.match(source,/useState<'OVERVIEW'\|'TROPHIES'\|'FEED'\|'CHAT'\|'CHALLENGES'\|'BRANDING'>/);
 assert.match(source,/isOwner\?\[\{id:'BRANDING' as const,label:'Identidade',icon:'settings' as const\}\]:\[\]/);
 assert.match(source,/isOwner&&activeTab==='BRANDING'\?<View style=\{styles\.panel\}>/);
 const tabs=source.indexOf('accessibilityLabel="Secções da equipa"');
 const panel=source.indexOf("isOwner&&activeTab==='BRANDING'?<View");
 const roster=source.indexOf("activeTab==='OVERVIEW'?<View");
 assert.ok(tabs>0&&panel>tabs&&roster>panel,'branding content follows tab controls');
 assert.doesNotMatch(source,/isOwner&&activeTab==='OVERVIEW'\?<View style=\{styles\.panel\}>\s*<Text style=\{styles\.heading\}>Identidade da equipa/);
});
test('team public statistics are verified and owner actions are accessible',()=>{
 const source=read('app/teams/[id].tsx');
 assert.match(source,/trophiesVerified\?standaloneTrophies\.length\+championshipHonours\.length:'—'/);
 assert.match(source,/rosterVerified\?members\.length:'—'/);
 assert.match(source,/communitiesVerified\?communities\.filter/);
 assert.match(source,/accessibilityLabel="Personalizar emblema e equipamento"/);
 assert.match(source,/onPress=\{\(\)=>setActiveTab\('BRANDING'\)\}/);
 assert.match(source,/accessibilityLabel="Encontrar competições para esta equipa"/);
 assert.match(source,/activeTab==='FEED'/);
 assert.match(source,/activeTab==='CHAT'/);
});


test('club dashboard provides accessible direct access to content, chat and honours',()=>{
 const source=read('app/teams/[id].tsx');
 assert.match(source,/activeTab==='OVERVIEW'\?<View style=\{styles\.panel\}>\s*<Text style=\{styles\.heading\}>O espaço da equipa/);
 for(const [label,tab] of [['Abrir publicações da equipa','FEED'],['Abrir chat da equipa','CHAT'],['Abrir troféus e histórico da equipa','TROPHIES']]){
  assert.ok(source.includes('accessibilityLabel="'+label+'"'));
  assert.ok(source.includes("onPress={()=>setActiveTab('"+tab+"')}"));
 }
 assert.match(source,/team\.chatEnabled\?'Conversa da equipa':'Chat desativado'/);
 assert.match(source,/quickLinks:\{flexDirection:'row',flexWrap:'wrap'/);
});

test('team section rail uses native iconography and keeps selected hidden tabs visible',()=>{
 const source=read('app/teams/[id].tsx');
 assert.ok(source.includes('ref={tabRail} horizontal'));
 assert.ok(source.includes("tabPositions.current[tab.id]=event.nativeEvent.layout.x"));
 assert.ok(source.includes('tabRail.current?.scrollTo({x:Math.max(0,position-22),animated:true})'));
 assert.ok(source.includes('accessibilityLabel={tab.label}'));
 assert.ok(source.includes('<JynloIcon name={tab.icon}'));
 assert.ok(source.includes("icon:'messages'"));
 assert.ok(source.includes("icon:'post'"));
 assert.ok(source.includes("icon:'tournament'"));
 assert.ok(source.includes("icon:'settings' as const"));
});
