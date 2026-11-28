const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {confirmedSessionTeams,sessionParticipationLabel}=require('../src/lib/session-teams-presentation.cjs');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const player=(id,username,teamCode)=>({id,username,teamCode});
test('confirmed player assignments retain server A/B teams and unassigned players',()=>{
 const result=confirmedSessionTeams([
  player(3,'Carla','B'),player(2,'Bruno','A'),player(1,'Ana','A'),
  player(4,'Duarte',null),player(5,'Eva','INVALID')]);
 assert.deepEqual(result.A.map(x=>x.username),['Ana','Bruno']);
 assert.deepEqual(result.B.map(x=>x.username),['Carla']);
 assert.deepEqual(result.unassigned.map(x=>x.username),['Duarte','Eva']);
});
test('partial/duplicate and malformed roster responses cannot fabricate team members',()=>{
 const result=confirmedSessionTeams([null,player(1,'Ana','A'),player(1,'Ana','B'),player(2,'','B'),player(-1,'X','A'),player(3,'Z','B')]);
 assert.deepEqual(result.A.map(x=>x.id),[1]);
 assert.deepEqual(result.B.map(x=>x.id),[3]);
 assert.deepEqual(confirmedSessionTeams(null),{A:[],B:[],unassigned:[]});
});
test('cancelled and completed status take priority over cached joined or waitlisted flags',()=>{
 assert.equal(sessionParticipationLabel({status:'CANCELLED',joined:true,waitlisted:false}),'Cancelada');
 assert.equal(sessionParticipationLabel({status:'COMPLETED',joined:true,waitlisted:false}),'Concluída');
 assert.equal(sessionParticipationLabel({status:'FULL',joined:true,waitlisted:false}),'Confirmado');
 assert.equal(sessionParticipationLabel({status:'FULL',joined:false,waitlisted:true}),'Lista de espera');
 assert.equal(sessionParticipationLabel({status:'OPEN',joined:false,waitlisted:false}),'Aberta');
 assert.equal(sessionParticipationLabel(null),'Jogo indisponível');
});
test('only authorized session detail viewers see persisted teams, never an unconfirmed preview',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/confirmedSessionTeams\(participants\)/);
 assert.match(screen,/canViewRoster\(detail,auth.username\)&&!rosterError&&hasConfirmedTeams/);
 assert.match(screen,/EQUIPAS CONFIRMADAS/);
 assert.match(screen,/confirmedTeams\[team\]\.map\(player=>/);
 assert.match(screen,/confirmedTeams.unassigned.length/);
 assert.match(screen,/sessionParticipationLabel\(\{\.\.\.s,status:s\.status\|\|'UNKNOWN',joined:/);
 assert.match(screen,/setParticipants\(\[\]\)/);
 assert.match(screen,/if\(!rosterAllowed\)setTeamPreview\(null\)/);
 assert.match(read('src/lib/session-teams-presentation.d.cts'),/confirmedSessionTeams/);
});
