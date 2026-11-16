'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('ecrã exige confirmação antes de escrever resultados e iniciar ou terminar torneio',()=>{
 const file=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 for(const label of ['Publicar calendário?','Confirmar resultado?','Encerrar a liga?'])assert.ok(file.includes(label),label);
 assert.match(file,/canGenerateSchedule/);assert.match(file,/canRecordTournamentResult/);assert.match(file,/canCompleteTournament/);
 assert.match(file,/allVisibleFinished/);assert.match(file,/DEMO_MODE/);
 assert.doesNotMatch(file,/setInterval\(|retry\(/);
});
test('integra só as rotas reais e preserva bloqueio de publicação na demonstração',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 assert.match(screen,/src\/lib\/performance-api/);
 assert.match(screen,/src\/lib\/tournament-fixtures-api/);
 assert.match(screen,/!DEMO_MODE/);
 assert.match(screen,/resultados nunca são calculados/);
});

test('organizer editor validates the actual match and explains special scoring rules',()=>{
 const screen=fs.readFileSync(path.join(root,'app/tournaments/[communityId]/[id]/manage.tsx'),'utf8');
 const types=fs.readFileSync(path.join(root,'src/lib/tournament-organizer-core.d.cts'),'utf8');
 assert.match(screen,/validateTournamentMatchScore\(tournament,match,home,away\)/);
 assert.match(screen,/const match=matches\.find\(item=>item\.id===id\)/);
 assert.match(screen,/groupNumber:m\.groupNumber/);
 assert.match(screen,/groupNumber:null/);
 assert.match(screen,/tournament\.scoringMode==='CHESS_HALF_POINTS'/);
 assert.match(screen,/Eliminatória: indica o resultado após desempate/);
 assert.match(screen,/match=\{m\} tournament=\{tournament\}/);
 assert.match(types,/export function validateTournamentMatchScore\(/);
});
