'use strict';
/** Display only data officially returned by the community competition backend. */
function communityResults(overview,seasonId=null){
 const rounds=Array.isArray(overview?.rounds)?overview.rounds:[];
 const safeRounds=rounds.filter(r=>r&&Number.isSafeInteger(r.id)&&r.id>0&&
  typeof r.playedAt==='string'&&Number.isFinite(Date.parse(r.playedAt)));
 const recent=[...safeRounds].sort((a,b)=>Date.parse(b.playedAt)-Date.parse(a.playedAt)||b.id-a.id);
 const standings=Array.isArray(overview?.standings)?overview.standings:[];
 const ranked=standings.filter(s=>s&&Number.isSafeInteger(s.position)&&s.position>0&&
  Number.isFinite(s.points)&&Number.isFinite(s.games)).sort((a,b)=>a.position-b.position);
 const seasons=Array.isArray(overview?.seasons)?overview.seasons.filter(s=>s&&Number.isSafeInteger(s.id)&&s.id>0):[];
 return {rounds:recent,standings:ranked,seasons,selection:seasonId};
}
function officialRoundScore(round){
 if(!round||round.sport!=='Futebol'||round.eventType!=='FOOTBALL_FINAL')return null;
 const a=round.teamScore?.sideA,b=round.teamScore?.sideB;
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0)return null;
 return {a,b,label:a+'–'+b};
}
function roundPlayerContributions(round){
 if(!round||!Array.isArray(round.entries))return [];
 return round.entries.filter(e=>e&&(Number.isSafeInteger(e.goals)&&e.goals>0||
   Number.isSafeInteger(e.assists)&&e.assists>0)&&
   (typeof e.fullName==='string'&&e.fullName.trim()||
    typeof e.username==='string'&&e.username.trim()))
   .map(e=>({name:(e.fullName||e.username).trim(),team:e.team,goals:e.goals,assists:e.assists}));
}
module.exports={communityResults,officialRoundScore,roundPlayerContributions};
