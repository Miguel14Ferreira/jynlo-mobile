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
 assert.match(screen,/request!==version\.current/);
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
 assert.match(screen,/return\(\)=>\{version\.current\+\+;setProfile\(null\);setStatus\(null\);setPrivacy\(null\);\}/);
});

test('public profile identity never waits for follow or privacy requests',()=>{
 assert.doesNotMatch(screen,/Promise\.allSettled\(/);
 assert.match(screen,/publicSportsProfile\(name,auth\.token\)\.then\(value=>\{/);
 assert.match(screen,/followStatus\(name,auth\.token\)\.then\(value=>\{/);
 assert.match(screen,/profilePrivacyStatus\(auth\.token,name\)\.then\(value=>\{/);
 assert.match(screen,/if\(request===version\.current\)setLoading\(false\)/);
 assert.match(screen,/profile&&privacy\?\.canViewContent/);
});
