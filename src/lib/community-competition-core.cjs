'use strict';
/**
 * A community may contain many sports. A tournament retains its own sport and
 * scoringMode even when the community changes its selected sports later.
 * Never convert an unsupported scoring mode to football standings.
 */
const {communitySports}=require('./community-core.cjs');
const {creationProfile}=require('./tournament-create-core.cjs');
const {classificationKind}=require('./competition-core.cjs');

function communityAllowsTournamentSport(community,sport){
  if(typeof sport!=='string'||!sport.trim())return false;
  return communitySports(community).includes(sport.trim());
}
function canCreateTournamentForSport(community,sport){
  if(!communityAllowsTournamentSport(community,sport))return false;
  return ['INDIVIDUAL','TEAM'].some(type=>creationProfile(sport,type).model!=='UNAVAILABLE');
}
function groupCommunityTournaments(community,tournaments){
  const selected=communitySports(community);
  const sections=selected.map(sport=>({sport,selected:true,tournaments:[]}));
  const groups=new Map(sections.map(section=>[section.sport,section]));
  for(const tournament of Array.isArray(tournaments)?tournaments:[]){
    if(!tournament||typeof tournament!=='object')continue;
    const sport=typeof tournament.sport==='string'&&tournament.sport.trim()?tournament.sport.trim():'Modalidade por indicar';
    if(!groups.has(sport)){
      const section={sport,selected:false,tournaments:[]};
      sections.push(section);groups.set(sport,section);
    }
    groups.get(sport).tournaments.push({
      ...tournament,
      kind:classificationKind(tournament)
    });
  }
  for(const section of sections){
    section.tournaments.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-PT',{sensitivity:'base'}));
  }
  return sections;
}
module.exports={communityAllowsTournamentSport,canCreateTournamentForSport,groupCommunityTournaments};
