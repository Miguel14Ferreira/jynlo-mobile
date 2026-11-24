const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

// The reset statements grew (follow state, sections); check each reset exists, in any order.
function resetsInclude(source,calls){
 const lines=source.split('\n').filter(line=>line.includes('setCommunity(null)'));
 return lines.some(line=>calls.every(call=>line.includes(call)));
}

test('community mobile detail has accessibly labelled dashboard navigation',()=>{
 const src=read('app/communities/[id].tsx');
 assert.match(src,/useState<'OVERVIEW'\|'FEED'\|'SESSIONS'\|'CHAT'\|'MEMBERS'\|'MANAGE'>\('OVERVIEW'\)/);
 assert.match(src,/accessibilityLabel="Secções da comunidade"/);
 for(const tab of ['OVERVIEW','SESSIONS','CHAT','MEMBERS'])
  assert.match(src,new RegExp("id:'"+tab+"'"));
 // Managing is a gear button in the header (organizers only), so the tabs fit on one line.
 assert.match(src,/owner\?<Pressable accessibilityRole="button" accessibilityLabel="Gerir comunidade" accessibilityState=\{\{selected:activeSection==='MANAGE'\}\}/);
 assert.match(src,/setActiveSection\('OVERVIEW'\)/);
});
test('community private data stays protected and main content keeps its existing flows',()=>{
 const src=read('app/communities/[id].tsx');
 assert.match(src,/role&&activeSection==='MEMBERS'\?<View style=\{styles\.section\}>/);
 assert.match(src,/owner&&activeSection==='MANAGE'\?<View style=\{styles\.section\}>/);
 assert.match(src,/owner&&activeSection==='MANAGE'&&requestsError/);
 assert.match(src,/owner&&activeSection==='MANAGE'&&requests\.length>0/);
 // The community chat opens full screen, like a messaging app.
 assert.match(src,/if\(tab\.id==='CHAT'\)openChat\(\)/);
 assert.match(src,/pathname:'\/communities\/\[id\]\/chat'/);
 assert.match(src,/role&&activeSection==='SESSIONS'\?<View style=\{styles\.section\}>/);
 assert.match(src,/auth\.token && \(role \? activeSection==='OVERVIEW' : community\.visibility==='PUBLIC'\)/);
 assert.match(src,/<CommunityTeamsPanel communityId=\{id\} isOrganizer=\{owner\} token=\{auth\.token\}/);
 assert.doesNotMatch(src,/<CommunityChatPanel embedded\/>/);
 assert.match(src,/pendingCommunityRequests\(id,auth\.token,auth\.username\)/);
 assert.match(src,/communitySessions\(id,auth\.token,auth\.username\)/);
 assert.match(src,/Criar sessão nesta comunidade/);
 assert.match(src,/Ver competições por modalidade/);
 assert.match(src,/Resultados e classificações/);
 assert.match(src,/Criar torneio nesta comunidade/);
 assert.match(src,/Ver diretos da comunidade/);
});
test('public community joining stays available without exposing member-only navigation',()=>{
 const src=read('app/communities/[id].tsx');
 assert.match(src,/!role&&auth\.token&&community\.visibility==='PUBLIC'/);
 assert.match(src,/!role&&auth\.token&&community\.visibility==='PRIVATE'/);
 assert.match(src,/\{role\?<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{styles\.sectionNav\}/);
 assert.match(src,/teamDestination&&!role&&myRequest/);
 assert.ok(resetsInclude(src,['setCommunity(null)','setSessions([])']));
});
