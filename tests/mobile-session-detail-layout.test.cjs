'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('organizer can quickly edit and share without opening advanced tools',()=>{
 const view=read('app/sessions/[id].tsx');
 const panel=view.indexOf('FERRAMENTAS DO ORGANIZADOR');
 const edit=view.indexOf('title="Editar dados da sessão"',panel);
 const share=view.indexOf('title="Partilhar convite da sessão"',panel);
 const toggle=view.indexOf('Mostrar ferramentas avançadas',panel);
 const gated=view.indexOf('adminToolsOpen?<View style={styles.editor}>',panel);
 const dangerous=view.indexOf('title="Cancelar esta sessão"',panel);
 assert.ok(panel>=0&&edit>panel&&share>edit&&toggle>share&&gated>toggle&&dangerous>gated);
 assert.match(view,/const \[adminToolsOpen,setAdminToolsOpen\]=useState\(false\)/);
 assert.match(view,/setAdminToolsOpen\(open=>!open\)/);
});
test('session details have no redundant refresh action while background synchronization stays active',()=>{
 const view=read('app/sessions/[id].tsx');
 assert.doesNotMatch(view,/title="Atualizar estado da sessão"/);
 assert.match(view,/setInterval\(/);
 assert.match(view,/syncSession/);
 assert.match(view,/Quem vai/);
 assert.match(view,/resolveJynloMedia\(participant\.profilePicUrl\)/);
});

test('expired session status is consistent between the badge and detail information',()=>{
 const view=read('app/sessions/[id].tsx');
 assert.match(view,/sessionParticipationLabel\(\{status:s\.status\|\|'UNKNOWN',gameDate:s\.gameDate,joined:false,waitlisted:false\}\)/);
 assert.doesNotMatch(view,/s\.status==='OPEN'\?'Aberta':s\.status==='FULL'\?'Completa'/);
});

test('session detail uses accessible metadata and 44pt attendance actions',()=>{
 const view=read('app/sessions/[id].tsx');
 assert.match(view,/label:\{fontSize:12,letterSpacing:\.5/);
 assert.match(view,/value:\{fontSize:17,color:C\.white,fontWeight:'900',lineHeight:24/);
 assert.match(view,/attendanceButton:\{[^\n]*minHeight:44/);
 assert.match(view,/removePlayerButton:\{[^\n]*minHeight:44/);
 assert.match(view,/memberStatus:\{color:C\.muted,fontSize:13/);
 assert.match(view,/accessibilityLabel=\{'Confirmar presença de '\+p\.username\}/);
 assert.match(view,/accessibilityLabel=\{'Registar falta de '\+p\.username\}/);
});


test('authorized session chat is accessible near game details and remains realtime',()=>{
 const s=read('app/sessions/[id].tsx');
 assert.match(s,/const \[showSessionChat,setShowSessionChat\]=useState\(false\)/);
 assert.match(s,/accessibilityLabel=\{showSessionChat\?'Fechar chat da sessão':'Abrir chat da sessão'\}/);
 assert.match(s,/accessibilityState=\{\{expanded:showSessionChat\}\}/);
 assert.match(s,/showSessionChat\?<SessionChatPanel embedded\/>/);
 assert.ok(s.indexOf('showSessionChat?<SessionChatPanel embedded/>')<s.indexOf('<SessionLocationPanel'));
 assert.match(s,/auth\.token&&detail&&\(owner\|\|detail\.joined\)/);
 assert.match(s,/s\.status!=='CANCELLED'&&s\.status!=='COMPLETED'/);
 assert.match(s,/setShowSessionChat\(false\);setShowParticipantRoster\(true\)/);
});
test('session roster has accessible disclosure without changing management permissions',()=>{
 const s=read('app/sessions/[id].tsx');
 assert.match(s,/const \[showParticipantRoster,setShowParticipantRoster\]=useState\(true\)/);
 assert.match(s,/detail&&canViewRoster\(detail,auth\.username\)/);
 assert.match(s,/accessibilityLabel=\{showParticipantRoster\?'Ocultar participantes da sessão':'Mostrar participantes da sessão'\}/);
 assert.match(s,/accessibilityState=\{\{expanded:showParticipantRoster\}\}/);
 assert.match(s,/showParticipantRoster\?<>/);
 assert.match(s,/participants\.map\(p=>/);
 assert.match(s,/owner&&\['OPEN','FULL'\]\.includes\(detail\.status\)/);
 assert.match(s,/accessibilityLabel=\{'Confirmar presença de '\+p\.username\}/);
});
