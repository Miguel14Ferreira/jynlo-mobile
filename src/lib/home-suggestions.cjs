// What a new account sees on the home screen instead of an empty card.
const MAX=3;
/** Upcoming games with free spots that the person is not in yet. */
function pickOpenGames(list,mineIds,now,limit=MAX){
  const mine=new Set(mineIds||[]);
  return (Array.isArray(list)?list:[])
    .filter(g=>g&&!mine.has(g.id)&&Date.parse(g.gameDate)>now&&Number(g.maxParticipants)>Number(g.participantCount))
    .sort((a,b)=>Date.parse(a.gameDate)-Date.parse(b.gameDate))
    .slice(0,limit);
}
/** Public communities the person is not in yet. */
function pickCommunitySuggestions(list,mineIds,limit=MAX){
  const mine=new Set(mineIds||[]);
  return (Array.isArray(list)?list:[]).filter(c=>c&&c.visibility==='PUBLIC'&&!mine.has(c.id)).slice(0,limit);
}
module.exports={pickOpenGames,pickCommunitySuggestions};
