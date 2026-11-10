const test=require('node:test');const assert=require('node:assert/strict');
const {groupStories,validateMedia,futureWeek,upcoming,uniqueSessions,mediaUrl}=require('../src/lib/social-feed-core.cjs');
const now=Date.parse('2026-11-03T16:00:00Z');
const s=(id,who='Tiago',group=null,expiry=now+86400000)=>({id,authorUsername:who,displayName:who,communityId:group,communityName:group?'Futeboladas à Balda':null,avatarUrl:null,communityPhotoUrl:null,createdAt:new Date(now-id*1000).toISOString(),expiresAt:new Date(expiry).toISOString()});
test('stories próprios e do feed deduplicados sem histórias expiradas',()=>{const x=groupStories([s(1)],[s(1),s(2,'André'),s(3,'André'),s(4,'Rita',5),s(5,'Rita',null,now-1)],now);assert.equal(x.length,3);assert.deepEqual(x.map(x=>x.stories.length),[1,2,1]);});
test('modo de apresentação mantém comunidades separadas dos perfis',()=>{const x=groupStories([s(1,'Tiago'),s(2,'Tiago',3)],[s(4,'Tiago',3)],now);assert.equal(x.length,2);assert.equal(x[1].stories.length,2);});
test('ficheiros têm limites independentes de foto e vídeo',()=>{assert.equal(validateMedia('image/jpeg',1024),null);assert.match(validateMedia('image/jpeg',6*1024*1024),/5 MB/);assert.match(validateMedia('video/mp4',21*1024*1024),/20 MB/);assert.match(validateMedia('application/pdf',500),/não suportado/);});
test('A minha semana exclui expiradas canceladas e sessões antigas',()=>{const future=new Date(now+86400000).toISOString();const old=new Date(now-86400000).toISOString();assert.equal(futureWeek({status:'OPEN',gameDate:future},now),true);assert.equal(upcoming({status:'CANCELLED',gameDate:future},now),false);assert.equal(upcoming({status:'OPEN',gameDate:old},now),false);});
test('sessão criada não aparece repetida nas minhas sessões',()=>{assert.deepEqual(uniqueSessions([{id:1}],[{id:1},{id:2}]).map(x=>x.id),[1,2]);});
test('media externo exige HTTPS e endereços relativos ficam no backend',()=>{assert.equal(mediaUrl('https://api.d24sports.com','/media/photo.png'),'https://api.d24sports.com/media/photo.png');assert.equal(mediaUrl('https://api.d24sports.com','http://notsecure.com/a'),null);});

test('stories inválidas não bloqueiam o feed nem ficam visíveis indefinidamente',()=>{
 const valid=s(31,'Rita');
 const invalidExpiry={...s(32,'André'),expiresAt:'not-a-date'};
 const invalidAuthor={...s(33,'Rita'),authorUsername:null};
 const missingAuthor={...s(34,'Rita'),authorUsername:undefined};
 const result=groupStories([invalidExpiry,invalidAuthor],[missingAuthor,valid],now);
 assert.equal(result.length,1);
 assert.deepEqual(result[0].stories.map(story=>story.id),[31]);
});
