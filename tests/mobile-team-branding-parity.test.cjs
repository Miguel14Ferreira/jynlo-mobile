'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('all mobile team directory surfaces reuse real club crest and palette',()=>{
 const index=read('app/teams/index.tsx');
 const avatar=read('src/components/TeamBrandAvatar.tsx');
 assert.match(index,/import TeamBrandAvatar/);
 assert.equal((index.match(/<TeamBrandAvatar team=\{team\}/g)||[]).length,3);
 assert.match(avatar,/teamLogoUri\(team\.logoUrl\)/);
 assert.match(avatar,/safeTeamKitColor\(team\.kitPrimary/);
 assert.match(avatar,/safeTeamKitColor\(team\.kitSecondary/);
 assert.match(avatar,/\(team\.name\|\|'E'\)\.charAt\(0\)\.toUpperCase\(\)/);
});

test('owner-only kit editing requires verified roster and current team identity',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const isOwner=rosterVerified&&/);
 assert.match(screen,/!isOwner\|\|!brandingVerified\|\|saving\|\|actionRef\.current/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/setBrandingVerified\(false\)/);
 assert.match(screen,/setSportsTeamKit\(teamId,kitPrimary,kitSecondary,auth\.token,kitPattern\)/);
 assert.match(screen,/Guardar equipamento/);
 assert.match(screen,/accessibilityState=\{\{selected:kitPrimary===color\}\}/);
 assert.match(screen,/accessibilityState=\{\{selected:kitSecondary===color\}\}/);
});

test('logo upload uses validated gallery media, proper MIME, bearer and no JSON header',()=>{
 const api=read('src/lib/sports-teams-api.ts');
 const screen=read('app/teams/[id].tsx');
 assert.match(api,/export async function uploadSportsTeamLogo/);
 assert.match(api,/5\*1024\*1024/);
 assert.match(api,/form\.append\('logo',/);
 assert.match(api,/method:'PUT',credentials:'omit',redirect:'error',cache:'no-store'/);
 assert.match(api,/headers:\{Authorization:'Bearer '\+token,Accept:'application\/json'\}/);
 assert.doesNotMatch(api,/headers:\{Authorization:'Bearer '\+token,'Content-Type':'multipart\/form-data'/);
 assert.match(api,/controller\.signal\.aborted/);
 assert.match(api,/finally\{clearTimeout\(timer\);\}/);
 assert.match(screen,/ImagePicker\.launchImageLibraryAsync/);
 assert.match(screen,/uploadSportsTeamLogo\(teamId,asset!,auth\.token\)/);
 assert.match(screen,/removeSportsTeamLogo\(teamId,auth\.token\)/);
});

test('client never renders untrusted schemes or unscoped relative team media paths',()=>{
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(api,/export function teamLogoUri/);
 assert.match(api,/\/media\\\/teams/);
 assert.match(api,/return null;/);
 assert.match(api,/export function safeTeamKitColor/);
});


test('background team refresh cannot overwrite unsaved kit palette and failed crest uses initials',()=>{
 const screen=read('app/teams/[id].tsx');
 const crest=read('src/components/TeamBrandAvatar.tsx');
 assert.match(screen,/const kitEditedRef=useRef\(false\)/);
 assert.match(screen,/if\(!kitEditedRef\.current\)/);
 assert.match(screen,/kitEditedRef\.current=true;setKitPrimary\(color\)/);
 assert.match(screen,/kitEditedRef\.current=true;setKitSecondary\(color\)/);
 assert.match(screen,/kitEditedRef\.current=false/);
 assert.match(screen,/if\(mode==='KIT'\|\|!kitEditedRef\.current\)/);
 assert.match(screen,/Não foi possível abrir a galeria do dispositivo/);
 assert.match(crest,/onError=\{\(\)=>setImageFailed\(true\)\}/);
 assert.match(crest,/useEffect\(\(\)=>\{setImageFailed\(false\);\},\[source\]\)/);
});


test('team detail paints public identity before slow honours or membership finish',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const detailsRequest=sportsTeamDetail\(teamId,auth\.token\|\|undefined\)/);
 assert.match(screen,/void detailsRequest\.then\(identity=>/);
 assert.match(screen,/if\(version!==requestVersion\.current\)return/);
 assert.match(screen,/if\(!silent\)setLoading\(false\)/);
 assert.match(screen,/Promise\.allSettled\(\[\s*detailsRequest,/);
});


test('official plain, striped and diagonal kit choices have visible mobile previews',()=>{
 const screen=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-teams-api.ts');
 const preview=read('src/components/TeamKitPreview.tsx');
 for(const pattern of ['PLAIN','STRIPES','DIAGONAL']){
  assert.ok(screen.includes("id:'"+pattern+"'"),pattern);
  assert.ok(preview.includes("'"+pattern+"'"),pattern);
 }
 assert.match(api,/kitPattern\?: TeamKitPattern \| null/);
 assert.match(api,/token,method:'PUT',body:\{primary,secondary,pattern\}/);
 assert.match(screen,/setKitPattern\(identity\.kitPattern\|\|'PLAIN'\)/);
 assert.match(screen,/kitEditedRef\.current=true;setKitPattern\(option\.id\)/);
 assert.match(screen,/accessibilityState=\{\{selected:kitPattern===option\.id\}\}/);
 assert.match(screen,/TeamKitPreview primary=\{kitPrimary\} secondary=\{kitSecondary\} pattern=\{option\.id\}/);
});
