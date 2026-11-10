'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'../app/(tabs)/profile.tsx'),'utf8');

test('profile presentation is fetched for its authenticated owner, never invented',()=>{
 assert.match(src,/request<ProfilePresentation>\('\/api\/profile\/me\/mobile',\{token:auth\.token\}\)/);
 assert.match(src,/parseFavoriteSports\(profile\?\.favoriteSports\)/);
 assert.match(src,/profile\?\.bio\?\.trim\(\)/);
 assert.match(src,/profile\?\.location\?\.trim\(\)/);
 assert.match(src,/profile\?\.profilePicUrl/);
 assert.doesNotMatch(src,/Math\.random\(|fakeFollowers|fakeStats/);
});
test('switching accounts invalidates private profile responses',()=>{
 assert.match(src,/setProfile\(null\);setProfileError\(false\)/);
 assert.match(src,/if\(!auth\.token\|\|DEMO_MODE\)/);
 assert.match(src,/let active=true/);
 assert.match(src,/if\(active\)setProfile\(result\)/);
 assert.match(src,/return\(\)=>\{active=false;\}/);
 assert.match(src,/\[auth\.token,auth\.username\]/);
});
test('edit and account safety flows remain available',()=>{
 assert.match(src,/accessibilityLabel="Editar o meu perfil desportivo"/);
 assert.match(src,/router\.push\('\/edit-profile'\)/);
 assert.match(src,/router\.push\('\/change-password'\)/);
 assert.match(src,/method:'DELETE'/);
 assert.match(src,/confirmUsername\.trim\(\)===auth\.username/);
 assert.match(src,/router\.replace\('\/welcome'\)/);
});
