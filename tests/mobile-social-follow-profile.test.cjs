'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const api=read('src/lib/social-relations-api.ts');
const screen=read('app/social/[username]/index.tsx');
const lists=read('src/components/SocialPeopleList.tsx');
const feed=read('app/(tabs)/index.tsx');

test('follow status, follow and unfollow reuse authenticated backend endpoints',()=>{
 assert.match(api,/\/api\/profile\/\$\{user\}/);
 assert.match(api,/\/api\/follows\/\$\{user\}\/status/);
 assert.match(api,/\/api\/follows\/\$\{user\}/);
 assert.match(api,/method:follow\?'POST':'DELETE'/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)/);
 assert.match(api,/encodeURIComponent\(cleaned\)/);
});
test('public profile is guarded against stale responses and repeated writes',()=>{
 assert.match(screen,/useFocusEffect\(useCallback\(\(\)=>\{/);
 assert.match(screen,/\+\+version\.current/);
 assert.match(screen,/request===version\.current/);
 assert.match(screen,/inFlight\.current\)return/);
 assert.match(screen,/!name\|\|own\|\|!auth\.token\|\|!status/);
 assert.match(screen,/await changeFollow\(name,shouldFollow,auth\.token\)/);
 assert.match(screen,/if\(request===version\.current\)setStatus\(next\)/);
 assert.match(screen,/Não foi possível confirmar a alteração/);
 assert.match(screen,/accessibilityLabel=\{status\.followedByMe\?'Deixar de seguir':status\.requestPending\?'Cancelar pedido para seguir':status\.privateProfile\?'Pedir para seguir':'Seguir utilizador'\}/);
});
test('users can open public profiles from social lists and feed',()=>{
 assert.match(lists,/accessibilityLabel=\{\x60Abrir perfil de \$\{person\.username\}\x60\}/);
 assert.match(lists,/pathname:'\/social\/\[username\]'/);
 assert.match(feed,/pathname:'\/social\/\[username\]'/);
 assert.match(feed,/accessibilityLabel=\{\x60Abrir perfil de \$\{item\.authorUsername\}\x60\}/);
 assert.match(screen,/kind:'followers'/);
 assert.match(screen,/kind:'following'/);
});

test('stale follow writes cannot release the lock for a different profile or login',()=>{
 assert.match(screen,/finally\{if\(request===version\.current\)\{inFlight\.current=false;setBusy\(false\);\}\}/);
 assert.doesNotMatch(screen,/finally\{inFlight\.current=false;if\(request===version\.current\)setBusy\(false\);\}/);
 assert.match(screen,/const request=version\.current,original=status\.followedByMe/);
 assert.match(screen,/return\(\)=>\{version\.current\+\+;setProfile\(null\);setStatus\(null\);setPrivacy\(null\);setAffiliations\(null\);\}/);
});

test('public profile identity never waits for follow or privacy requests',()=>{
 assert.doesNotMatch(screen,/Promise\.allSettled\(/);
 assert.match(screen,/publicSportsProfile\(name,auth\.token\)\.then\(value=>\{/);
 assert.match(screen,/followStatus\(name,auth\.token\)\.then\(value=>\{/);
 assert.match(screen,/profilePrivacyStatus\(auth\.token,name\)\.then\(value=>\{/);
 assert.match(screen,/if\(request===version\.current\)setLoading\(false\)/);
 assert.match(screen,/profile&&privacy\?\.canViewContent/);
});

test('public profile links to native sessions teams and communities without claiming membership',()=>{
 assert.match(screen,/accessibilityLabel="Procurar sessões desportivas"/);
 assert.match(screen,/router\.push\('\/explore'\)/);
 assert.match(screen,/accessibilityLabel="Explorar equipas"/);
 assert.match(screen,/router\.push\('\/teams'\)/);
 assert.match(screen,/accessibilityLabel="Explorar comunidades"/);
 assert.match(screen,/router\.push\('\/communities'\)/);
 assert.match(screen,/\{profile\?<View style=\{styles\.discovery\}>/);
});

test('own mobile profile uses authenticated own-membership APIs and never shows unverified association',()=>{
 const ownProfile=read('app/(tabs)/profile.tsx');
 assert.match(ownProfile,/joinedSportsTeams\(auth\.token\)/);
 assert.match(ownProfile,/myCommunities\(auth\.token,auth\.username\)/);
 assert.match(ownProfile,/Promise\.allSettled\(/);
 assert.match(ownProfile,/teams\.status==='fulfilled'/);
 assert.match(ownProfile,/communities\.status==='fulfilled'/);
 assert.match(ownProfile,/membershipsError/);
 assert.match(ownProfile,/auth\.token&&auth\.username&&!DEMO_MODE\?<View style=\{styles\.memberships\}>/);
 assert.match(ownProfile,/pathname:'\/teams\/\[id\]'/);
 assert.match(ownProfile,/pathname:'\/communities\/\[id\]'/);
 assert.match(ownProfile,/return\(\)=>\{active=false;\}/);
});

test('public profile affiliations use the backend projection and never private member APIs',()=>{
 const source=read('src/lib/social-relations-api.ts');
 assert.match(source,/\/api\/profile\/\$\{user\}\/public-affiliations/);
 assert.match(screen,/publicProfileAffiliations\(name,auth\.token\)/);
 assert.match(screen,/if\(!own\)void publicProfileAffiliations/);
 assert.match(screen,/setAffiliations\(null\)/);
 assert.match(screen,/affiliations\.teams\.map\(team=>/);
 assert.match(screen,/affiliations\.communities\.map\(group=>/);
 assert.doesNotMatch(screen,/joinedSportsTeams\(/);
 assert.doesNotMatch(screen,/myCommunities\(/);
});

test('sports history waits for verified profile privacy and never invents achievements',()=>{
 const apiSource=read('src/lib/social-relations-api.ts');
 assert.match(apiSource,/\/api\/profiles\/\$\{user\}\/activity/);
 assert.match(screen,/if\(value\.canViewContent\)void publicSportsActivity\(name,auth\.token\)/);
 assert.match(screen,/profile&&privacy\?\.canViewContent&&activity/);
 assert.match(screen,/request===version\.current\)setActivity\(activityValue\)/);
 assert.match(screen,/Object\.prototype\.hasOwnProperty\.call\(achievementLabels,code\)/);
 assert.match(screen,/activity\.participantsMobilized/);
 assert.match(screen,/activity\.communitiesJoined/);
 assert.match(screen,/setActivity\(null\)/);
});

test('own mobile profile loads real sporting history without blocking identity',()=>{
 const own=read('app/(tabs)/profile.tsx');
 assert.match(own,/publicSportsActivity\(auth\.username,auth\.token\)/);
 assert.match(own,/if\(active\)setActivity\(stats\)/);
 assert.match(own,/setActivity\(null\)/);
 assert.match(own,/auth\.token&&auth\.username&&!DEMO_MODE&&activity/);
 assert.match(own,/activity\.participantsMobilized/);
 assert.match(own,/activity\.communitiesJoined/);
 assert.match(own,/Object\.prototype\.hasOwnProperty\.call\(achievementLabels,code\)/);
});
