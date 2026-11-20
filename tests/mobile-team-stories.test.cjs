const test=require('node:test');
const assert=require('node:assert/strict');
const {groupStories}=require('../src/lib/social-feed-core.cjs');

const story=(id,overrides={})=>({
 id,authorUsername:'captain',displayName:'Capitão',avatarUrl:'/profiles/captain.png',
 communityId:null,communityName:null,communityPhotoUrl:null,
 teamId:null,teamName:null,teamLogoUrl:null,
 createdAt:'2026-11-20T10:00:00.000Z',expiresAt:'2026-11-21T10:00:00.000Z',
 ...overrides
});

test('Team stories use official team name and logo, never the captain identity',()=>{
 const groups=groupStories([],[
  story(1,{teamId:42,teamName:'Colégio Pio FC',teamLogoUrl:'/media/teams/42/logo'}),
  story(2,{teamId:42,teamName:'Colégio Pio FC',teamLogoUrl:'/media/teams/42/logo',authorUsername:'anotheradmin'}),
  story(3,{communityId:42,communityName:'Colégio Pio',communityPhotoUrl:'/media/community/42'}),
  story(4)
 ],Date.parse('2026-11-20T11:00:00Z'));
 const team=groups.find(g=>g.key==='team:42');
 assert.ok(team);
 assert.equal(team.name,'Colégio Pio FC');
 assert.equal(team.avatar,'/media/teams/42/logo');
 assert.equal(team.stories.length,2);
 assert.ok(groups.some(g=>g.key==='community:42'));
 assert.ok(groups.some(g=>g.key==='person:captain'));
 assert.equal(groups.length,3);
});

test('Expired team stories do not appear in the feed',()=>{
 assert.equal(groupStories([],[
  story(7,{teamId:12,expiresAt:'2026-11-19T00:00:00Z'})
 ],Date.parse('2026-11-20T11:00:00Z')).length,0);
});
