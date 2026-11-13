'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/sessions/create.tsx'),'utf8');
test('session creation uses a native accessible monthly date calendar',()=>{
 assert.match(source,/function SessionDateCalendar\(/);
 assert.match(source,/accessibilityLabel="Mês anterior"/);
 assert.match(source,/accessibilityLabel="Mês seguinte"/);
 assert.match(source,/\['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'\]/);
 assert.match(source,/disabled=\{disabled\|\|past\}/);
 assert.match(source,/onSelect=\{date=>\{patch\('day',date\)/);
});
test('registration opening and recurring session days use the same calendar',()=>{
 assert.match(source,/accessibilityLabel="Abrir calendário das inscrições"/);
 assert.match(source,/onSelect=\{date=>\{patch\('registrationDay',date\)/);
 assert.match(source,/accessibilityLabel="Abrir calendário do horário adicional"/);
 assert.match(source,/onSelect=\{date=>\{setExtraDay\(date\)/);
 assert.match(source,/parseSessionDate\(form\.day,form\.time\)/);
 assert.match(source,/createSessionPayload\(form,SPORTS\)/);
});
