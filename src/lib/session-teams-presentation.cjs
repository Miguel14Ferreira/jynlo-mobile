'use strict';
/** Group server-confirmed team codes without deriving or inventing assignments. */
function confirmedSessionTeams(participants){
 const groups={A:[],B:[],unassigned:[]};
 if(!Array.isArray(participants))return groups;
 const seen=new Set();
 for(const player of participants){
  if(!player||typeof player!=='object'||!Number.isSafeInteger(player.id)||player.id<=0||
     typeof player.username!=='string'||!player.username.trim()||seen.has(player.id))continue;
  seen.add(player.id);
  if(player.teamCode==='A')groups.A.push(player);
  else if(player.teamCode==='B')groups.B.push(player);
  else groups.unassigned.push(player);
 }
 const byName=(a,b)=>a.username.localeCompare(b.username,'pt-PT');
 groups.A.sort(byName);groups.B.sort(byName);groups.unassigned.sort(byName);
 return groups;
}
function sessionParticipationLabel(session){
 if(!session)return 'Sessão indisponível';
 if(session.status==='CANCELLED')return 'Cancelada';
 if(session.status==='COMPLETED')return 'Concluída';
 if(session.joined)return 'Confirmado';
 if(session.waitlisted)return 'Lista de espera';
 if(session.status==='FULL')return 'Completa';
 if(session.status==='OPEN')return 'Aberta';
 return 'Estado por confirmar';
}
module.exports={confirmedSessionTeams,sessionParticipationLabel};
