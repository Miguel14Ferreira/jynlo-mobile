const test=require('node:test');const assert=require('node:assert/strict');
const {registrationAction,isOrganizer,canLeave,canViewRoster,safeExactAddress,safeMeetingPoint}=require('../src/lib/session-state.cjs');
const active={status:'OPEN',maxParticipants:10,participantCount:5,privateGame:false,joined:false,waitlisted:false,creatorUsername:'Tiago',address:'Morada privada',canSeeExactAddress:true,meetingPointInstructions:'Porta norte'};
const action=(patch={},user='André',now=Date.now())=>registrationAction({...active,...patch},user,now);
test('anonymous viewers need login, server state not inferred',()=>{assert.equal(action({},null).kind,'LOGIN');assert.equal(action().kind,'JOIN');});
test('full session offers waitlist, never false confirmation',()=>{assert.equal(action({status:'FULL',participantCount:10}).kind,'WAITLIST');});
test('private session requires password; community only is distinct from private',()=>{assert.equal(action({privateGame:true}).kind,'PASSWORD');assert.equal(action({audience:'COMMUNITY_ONLY',privateGame:false}).kind,'JOIN');});
test('scheduled registration stays closed until opening; manual is server-authorized',()=>{const at=Date.parse('2026-11-03T20:00:00Z');assert.equal(action({registrationOpeningMode:'SCHEDULED',registrationOpensAt:'2026-11-04T20:00:00Z'},'André',at).kind,'SCHEDULED');assert.equal(action({registrationOpeningMode:'SCHEDULED',registrationOpensAt:'2026-11-02T20:00:00Z'},'André',at).kind,'JOIN');assert.match(action({registrationOpeningMode:'MANUAL'}).hint,/servidor/);});
test('joined or waitlisted do not receive a second registration CTA',()=>{assert.equal(action({joined:true}).kind,'JOINED');assert.equal(action({waitlisted:true}).kind,'WAITLISTED');});
test('canceled and completed sessions cannot be joined; leave is only a user action',()=>{for(const status of ['CANCELLED','COMPLETED']){assert.equal(action({status}).kind,'CLOSED');assert.equal(canLeave({...active,status,joined:true}),false);}assert.equal(canLeave({...active,joined:true}),true);assert.equal(canLeave({...active,waitlisted:true}),true);});
test('only organizer can access organizer controls',()=>{assert.equal(isOrganizer(active,'tiago'),true);assert.equal(isOrganizer(active,'André'),false);});
test('private address and meeting point require authorization and membership or ownership',()=>{assert.equal(safeExactAddress(active,'André'),null);assert.equal(safeMeetingPoint(active,'André'),null);assert.equal(safeExactAddress({...active,joined:true},'André'),'Morada privada');assert.equal(safeMeetingPoint({...active,joined:true},'André'),'Porta norte');assert.equal(safeExactAddress(active,'Tiago'),'Morada privada');assert.equal(safeExactAddress({...active,canSeeExactAddress:false,joined:true},'André'),null);});
test('participant roster visible only to participants or organizer',()=>{assert.equal(canViewRoster(active,'André'),false);assert.equal(canViewRoster({...active,joined:true},'André'),true);assert.equal(canViewRoster(active,'Tiago'),true);});
test('API session contract includes leave, waitlist, invite and cancellation endpoints without POST retry',()=>{const fs=require('fs');const api=fs.readFileSync(require('path').join(__dirname,'../src/lib/api.ts'),'utf8');for(const path of ['/api/session-invites/pending','/leave','/cancel','/invites/','/join']) assert.ok(api.includes(path),path);assert.match(api,/never automatically retry a POST/i);});

test('Vista de sessão pública respeita o estado e mostra ícones próprios por modalidade',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const view=fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8');
 assert.ok(view.includes('sportIcon(s.sport)'));
 assert.ok(view.includes("['OPEN','FULL'].includes(s.status||'')"));
 assert.ok(view.includes("['CANCELLED','COMPLETED'].includes(s.status||'')"));
 assert.ok(view.includes("sessionParticipationLabel({status:s.status||'UNKNOWN'"));
});

// Contract: the session screen continues to obtain the roster only after authorization.
test('progresso de participantes nao altera o controlo de acesso a lista',()=>{
 const {minimumPlayersProgress}=require('../src/lib/session-presentation.cjs');
 assert.equal(canViewRoster(active,'André'),false);
 assert.equal(minimumPlayersProgress({...active,minParticipants:6}).missing,1);
 assert.equal(canViewRoster({...active,joined:true},'André'),true);
});
