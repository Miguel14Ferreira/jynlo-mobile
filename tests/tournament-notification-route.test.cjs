'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {notificationDestination}=require('../src/lib/notification-route.cjs');
test('tournament alerts open the tournament, or the community when the tournament is unknown',()=>{
 assert.deepEqual(notificationDestination({type:'TOURNAMENT_RESULT',communityId:5,competitionTournamentId:9,sessionId:null}),
  {kind:'tournament',id:'9',communityId:'5'});
 assert.deepEqual(notificationDestination({type:'TOURNAMENT_LEADER',communityId:5,competitionTournamentId:null,sessionId:null}),
  {kind:'community',id:'5'});
 assert.equal(notificationDestination({type:'TOURNAMENT_RESULT',communityId:null,competitionTournamentId:9,sessionId:null}),null);
});
