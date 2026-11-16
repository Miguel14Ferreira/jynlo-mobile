'use strict';
/** Display exclusively the final snapshot from the server, never a presumed table leader. */
function officialTournamentOutcome(tournament){
 if(!tournament||tournament.status!=='COMPLETED')return null;
 if(tournament.championTied===true)return {
  title:'Competição encerrada sem campeão único',
  detail:'Empate nos critérios desportivos oficiais. A classificação final está disponível para consulta.',
  winner:false
 };
 const byTeam=tournament.entryType==='TEAM';
 const name=byTeam?tournament.championTeamName:tournament.championDisplayName;
 const validIdentity=byTeam?
   Number.isSafeInteger(tournament.championTeamId)&&tournament.championTeamId>0:
   Number.isSafeInteger(tournament.championProfileId)&&tournament.championProfileId>0;
 if(validIdentity&&typeof name==='string'&&name.trim().length>0)return {
  title:'Campeão oficial: '+name.trim(),
  detail:'Vencedor confirmado pelo servidor no encerramento da competição.',
  winner:true
 };
 return {
  title:'Competição concluída',
  detail:'O servidor ainda não disponibilizou um vencedor individual confirmado. Não vamos atribuir um campeão com base na classificação provisória.',
  winner:false
 };
}
module.exports={officialTournamentOutcome};
