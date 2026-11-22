const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const get=file=>untranslate(fs.readFileSync(path.join(root,file),'utf8'));
const api=get('src/lib/social-relations-api.ts');
const people=get('src/components/SocialPeopleList.tsx');
const profile=get('app/(tabs)/profile.tsx');
const feed=get('app/(tabs)/index.tsx');
const follows=get('app/social/[username]/[kind].tsx');
const likers=get('app/posts/[postId]/likers.tsx');

test('social lists use real, validated backend contracts',()=>{
 assert.match(api,/\/api\/follows\/\$\{user\}\/\$\{kind\}/);
 assert.match(api,/\/api\/feed\/posts\/\$\{postId\}\/likers/);
 assert.match(api,/encodeURIComponent\(cleaned\)/);
 assert.match(api,/Number\.isSafeInteger\(postId\)/);
 assert.match(api,/if\(DEMO_MODE\)return \[\]/);
});
test('social person lists clear results on navigation and authentication changes',()=>{
 assert.match(people,/useFocusEffect\(useCallback\(\(\)=>\{/);
 assert.match(people,/generation\.current\+\+/);
 assert.match(people,/setPeople\(\[\]\)/);
 assert.match(people,/if\(version===generation\.current\)setPeople\(result\)/);
 assert.match(people,/resolveJynloMedia\(person\.profilePicUrl\)/);
});
test('profile and Feed offer accessible, distinct actions',()=>{
 assert.match(profile,/accessibilityLabel="Ver os meus seguidores"/);
 assert.match(profile,/accessibilityLabel="Ver quem sigo"/);
 assert.match(profile,/pathname:'\/social\/\[username\]\/\[kind\]'/);
 assert.match(feed,/Ver quem gostou desta publicação/);
 assert.match(feed,/item\.hideLikers&&item\.authorUsername\.toLowerCase\(\)!==auth\.username\?\.toLowerCase\(\)/);
 assert.match(feed,/Gostos privados/);
 assert.match(feed,/pathname:'\/posts\/\[postId\]\/likers'/);
 assert.match(feed,/toggleLike\(item\)/);
 assert.match(feed,/item\.likeCount/);
 assert.match(feed,/ gostos/);
});
test('route parameters are validated before reading lists',()=>{
 assert.match(follows,/kind!=='followers'&&kind!=='following'/);
 assert.match(follows,/SocialPeopleList username=\{username\} kind=\{kind\}/);
 assert.match(likers,/Number\.isSafeInteger\(id\)/);
 assert.match(likers,/SocialPeopleList postId=\{id\}/);
});
