'use strict';
const {tr}=require('./i18n-core.cjs');
/** Same families as the server: W/D/L team sports, racket matches and races. */
const TEAM=['Andebol','Basebol','Basquetebol','Basquetebol 3x3','Corfebol','Cricket','Curling','Flag Football','Futebol','Futebol Americano',
 'Futevólei','Futsal','Hóquei','Hóquei em Campo','Hóquei em Patins','Hóquei no Gelo','Lacrosse','Polo Aquático','Rugby','Rugby Sevens',
 'Softbol','Voleibol','Voleibol de Praia'];
const RACKET=['Ténis','Padel','Badminton','Squash','Pickleball','Ténis de mesa','Ténis de praia'];
const RACE=['Automobilismo','BMX','Canoagem','Canoagem Slalom','Canoagem Velocidade','Ciclismo','Ciclismo de Estrada','Ciclismo de Pista',
 'Ciclocrosse','Columbofilia','Corrida','Corrida de obstáculos','Esqui Alpino','Esqui de Fundo','Esqui de Montanha','Karting','Motociclismo',
 'Motocross','Motonáutica','Mountain Bike','Natação','Natação em Águas Abertas','Orientação','Patinagem de Velocidade','Pentatlo Moderno',
 'Remo','Trail Running','Triatlo','Vela','Atletismo','Snowboard'];
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
const T=new Set(TEAM.map(norm)),R=new Set(RACKET.map(norm)),C=new Set(RACE.map(norm));
function sportFamily(sport){const k=norm(sport);return T.has(k)?'team':R.has(k)?'racket':C.has(k)?'race':'other';}

function intIn(value,min,max,label){
 const text=String(value??'').trim();
 if(!/^\d{1,4}$/.test(text))throw Error(tr('{label}: escreve um número inteiro.',{label}));
 const n=Number(text);
 if(n<min||n>max)throw Error(tr('{label}: tem de estar entre {min} e {max}.',{label,min,max}));
 return n;
}
function teamPoints(input){
 return {winPoints:intIn(input.win,0,1000,tr('Vitória')),drawPoints:intIn(input.draw,0,1000,tr('Empate')),lossPoints:intIn(input.loss,0,1000,tr('Derrota'))};
}
function racketRule(input){
 const winPoints=intIn(input.win,0,100,tr('Vitória')),lossPoints=intIn(input.loss,0,100,tr('Derrota'));
 if(winPoints<=lossPoints)throw Error(tr('A vitória tem de valer mais do que a derrota.'));
 const tieBreak=input.tieBreak==='SCORE_FIRST'?'SCORE_FIRST':'SETS_FIRST';
 return {winPoints,lossPoints,tieBreak};
}
/** "25, 18, 15" → "25,18,15": up to 20 places, never increasing. */
function racePoints(text){
 const parts=String(text||'').split(/[,;\s]+/).filter(Boolean);
 if(!parts.length)throw Error(tr('Indica os pontos por posição, por exemplo 10, 8, 6, 5, 4.'));
 if(parts.length>20)throw Error(tr('Só são permitidas as primeiras 20 posições.'));
 let last=Infinity;
 for(const p of parts){
  if(!/^\d{1,4}$/.test(p))throw Error(tr('Pontuação inválida: {v}.',{v:p}));
  const n=Number(p);
  if(n>1000||n>last)throw Error(tr('Os pontos têm de descer de posição para posição, entre 0 e 1000.'));
  last=n;
 }
 return parts.join(',');
}
module.exports={sportFamily,teamPoints,racketRule,racePoints,TEAM,RACKET,RACE};
