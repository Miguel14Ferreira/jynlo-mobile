const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('mobile kit designer saves all three authoritative web kits, not just a shirt palette',()=>{
 const screen=read('app/teams/[id].tsx'),studio=read('src/components/TeamKitStudio.tsx');
 const api=read('src/lib/sports-teams-api.ts'),preview=read('src/components/TeamKitPreview.tsx');
 assert.match(screen,/onSave=\{\(primary,variants\)=>void updateBranding\('KIT',undefined,\{primary,variants\}\)\}/);
 for(const kind of ['PRIMARY','ALTERNATE','TRAINING'])assert.ok(studio.includes("id:'"+kind+"'"));
 for(const garment of ['jersey','singlet','vest','polo','cycling','rashguard'])
  assert.ok(studio.includes("id:'"+garment+"'"));
 for(const pat of ['PLAIN','STRIPES','DIAGONAL','HOOPS','HALVES','CHEVRON'])
  assert.ok(studio.includes("id:'"+pat+"'"));
 assert.match(studio,/setVariants\(prev=>\[\.\.\.prev\.filter\(v=>v\.type!==slot\)/);
 assert.match(studio,/setDirty\(true\)/);
 assert.match(studio,/if\(dirty\)return/);
 assert.match(studio,/onSave\(\{\.\.\.primary/);
 assert.match(api,/options\?:\{garment:TeamKitGarment/);
 assert.match(api,/variants:TeamKitVariant\[\]/);
 assert.match(preview,/playerNumber\.slice\(0,2\)/);
 assert.match(preview,/const sleeveless=/);
});

test('native crest editor shares strict version-two layer data and PNG transport with web',()=>{
 const screen=read('app/teams/[id].tsx'),editor=read('src/components/TeamCrestStudio.tsx');
 const api=read('src/lib/sports-teams-api.ts'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies['react-native-svg'],'15.16.0');
 assert.equal(pkg.dependencies['react-native-view-shot'],'6.1.1');
 assert.match(screen,/<TeamCrestStudio key=\{'crest-'\+team\.id\}/);
 assert.match(screen,/onSave=\{\(asset,design\)=>void updateBranding\('LOGO',asset,undefined,design\)\}/);
 assert.match(screen,/uploadSportsTeamLogo\(teamId,asset!,auth\.token,crestDesign\)/);
 assert.match(editor,/captureRef\(previewRef\.current/);
 assert.match(editor,/format:'png'/);
 assert.match(editor,/JSON\.stringify\(\{\.\.\.current,version:2\}\)/);
 assert.match(api,/form\.append\('crestDesign',crestDesign\)/);
 assert.match(api,/form\.append\('logo',/);
 assert.match(editor,/version:2,shape:'shield'/);
 assert.match(editor,/Array\.isArray\(value\.layers\)/);
});

test('mobile layer UI supports touch drag, reordering, duplication, and no-symbol emblems',()=>{
 const code=read('src/components/TeamCrestStudio.tsx');
 for(const key of ['selected','setSelected','duplicateLayer','removeLayer','reorder','dragAt'])
  assert.ok(code.includes(key),key);
 assert.match(code,/onResponderMove=\{event=>dragAt/);
 assert.match(code,/onResponderGrant=\{event=>dragAt/);
 assert.match(code,/Math\.hypot\(/);
 assert.match(code,/layers\.length>=6/);
 assert.match(code,/project\.symbol==='none'/);
 assert.match(code,/Sem símbolo/);
 assert.match(code,/setProject\(base\);setSelected\(null\)/);
 for(const sport of ['basketball','volleyball','tennis','rugby','cricket',
  'hockey','cycling','swimming','boxing','golf','running'])assert.ok(code.includes(sport));
});

test('native generated emblem and gallery upload both stay owner-protected and fail closed',()=>{
 const screen=read('app/teams/[id].tsx'),api=read('src/lib/sports-teams-api.ts');
 assert.match(screen,/!isOwner\|\|!brandingVerified\|\|saving\|\|actionRef\.current/);
 assert.match(api,/if\(DEMO_MODE\|\|!token\)throw Error/);
 assert.match(api,/if\(!asset\.uri\|\|asset\.type!=='image'\)/);
 assert.match(api,/Authorization:'Bearer '\+token/);
 assert.match(api,/redirect:'error'/);
 assert.match(api,/signal:controller\.signal/);
 assert.match(api,/if\(updated\.id!==id\|\|!teamLogoUri\(updated\.logoUrl\)\)/);
 assert.match(api,/A ligação expirou\. Confirma o logótipo/);
});
