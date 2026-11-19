'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('team profile retains real badge/kit, roster, stats, tabs and back navigation',()=>{
 const team=read('app/teams/[id].tsx');
 assert.match(team,/TeamBrandAvatar team=\{team\} size=\{94\}/);
 assert.match(team,/TeamKitPreview primary=\{team\.kitPrimary\}/);
 assert.match(team,/rosterVerified\?members\.length:'—'/);
 assert.match(team,/minHeight:44,justifyContent:'center',paddingHorizontal:12/);
 assert.match(team,/accessibilityLabel="Voltar às equipas"/);
 assert.match(team,/flexWrap:'wrap',gap:9/);
 assert.match(team,/tabBar:/);
});

test('session detail keeps real booking, Google Maps and participation alongside larger readable cards',()=>{
 const session=read('app/sessions/[id].tsx');
 assert.match(session,/SessionLocationPanel session=\{detail\}/);
 assert.match(session,/sessionParticipationLabel\(/);
 assert.match(session,/formatDate\(s\.gameDate\)/);
 assert.match(session,/money\(s\.priceAmount\)/);
 assert.match(session,/participantCount\?\?'—'/);
 assert.match(session,/sessionPhoto:\{width:'100%',height:220/);
 assert.match(session,/minHeight:96,flexGrow:1/);
 assert.match(session,/role="button"|accessibilityRole="button"/);
});
