const untranslate=require('./untranslate.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('criar sessão pede escolha explícita entre começar do zero e completar grupo',()=>{
 const s=read('app/sessions/create.tsx');
 assert.ok(s.includes('Ainda não tenho jogadores'));
 assert.ok(s.includes('Já tenho jogadores e quero completar'));
 assert.ok(s.includes("patch('externalConfirmedParticipants','0')"));
 assert.ok(s.includes('hasExistingPlayers&&Number(form.externalConfirmedParticipants)<1'));
 assert.ok(s.includes("createSessionPayload(form,SPORTS)"));
 assert.ok(s.includes('O organizador ocupa uma vaga.'));
});
test('consultar as minhas sessões como visitante não emite pedido privado',()=>{
 const s=read('app/my-sessions.tsx');
 assert.ok(s.includes('if(!auth.token||!auth.username)'));
 assert.ok(s.includes("!loading&&!error&&auth.token?<View style={styles.group}>"));
 assert.ok(s.includes("redirect:'/sessions/create'"));
 assert.ok(s.includes('Estás a explorar como visitante'));
});
test('convite não é dado como presença confirmada se servidor não devolve estado',()=>{
 const s=read('app/notifications.tsx');
 assert.ok(s.includes("const confirmed=accept?confirmedSessionJoin(response):null"));
 assert.ok(s.includes("confirmed?.state==='WAITLISTED'"));
 assert.ok(s.includes('A aceitação ainda não foi confirmada'));
 assert.ok(s.includes('Ver detalhes da sessão'));
 assert.equal(require('../src/lib/routes.cjs').safeRedirect('/notifications'),'/notifications');
});