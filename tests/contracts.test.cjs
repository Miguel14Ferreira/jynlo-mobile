const test = require('node:test');
const assert = require('node:assert/strict');
const { vacancies, canJoin, money, formatDate } = require('../src/lib/format.cjs');
const base={id:12,status:'OPEN',privateGame:false,joined:false,waitlisted:false,maxParticipants:10,participantCount:8};
test('contagem de vagas não é negativa',()=>{ assert.equal(vacancies(base),2);assert.equal(vacancies({...base, participantCount:12}),0); });
test('só permite inscrição elegível',()=>{assert.equal(canJoin(base),true);for(const v of [{status:'CANCELLED'},{privateGame:true},{joined:true},{waitlisted:true},{participantCount:10}])assert.equal(canJoin({...base,...v}),false);});
test('moeda pt-PT',()=>{assert.equal(money(0),'Grátis');assert.equal(money(2.5),'2,50 €');});
test('data inválida protegida',()=>assert.equal(formatDate(null),'Data por confirmar'));
