const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('privacy changes are authorized server operations, never local-only toggles',()=>{
 const client=read('src/lib/profile-privacy-api.ts');
 assert.match(client,/\/api\/profile\/privacy\/me/);
 assert.match(client,/method:'PUT'/);
 assert.match(client,/method:'POST'/);
 assert.match(client,/method:'DELETE'/);
 assert.match(client,/DEMO_MODE/);
});

test('own profile respects server feature gate and offers follow moderation',()=>{
 const ui=read('src/components/ProfilePrivacySettings.tsx');
 assert.match(ui,/privateModeAvailable/);
 assert.match(ui,/updateProfilePrivacy/);
 assert.match(ui,/pendingFollowRequests/);
 assert.match(ui,/decideFollowRequest/);
 assert.match(ui,/Proteção privada ainda não disponível/);
 assert.match(ui,/myPrivateMediaReadiness\(token\)/);
 assert.match(ui,/privacy\.privateModeAvailable\?<Pressable/);
 assert.match(ui,/media\.publicReferences/);
 assert.match(read('app/(tabs)/profile.tsx'),/ProfilePrivacySettings/);
});

test('other profiles request approval and hide protected posts',()=>{
 const screen=read('app/social/[username]/index.tsx');
 assert.match(screen,/requestPending/);
 assert.match(screen,/privateProfile/);
 assert.match(screen,/canViewContent/);
 assert.match(screen,/profile&&privacy\?\.canViewContent/);
});
