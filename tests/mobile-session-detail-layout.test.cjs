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
