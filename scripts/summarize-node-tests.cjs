'use strict';
/**
 * Summarize Node TAP failures without changing test execution, exit codes or
 * skipping any assertions. Intended for Codemagic diagnostic artifacts.
 */
const fs=require('node:fs');
const [input,output]=process.argv.slice(2);
if(!input||!output){process.stderr.write('Usage: node summarize-node-tests.cjs <tests.log> <summary.txt>\n');process.exitCode=2;}
else {
 const log=fs.existsSync(input)?fs.readFileSync(input,'utf8'):'';
 const failures=[];
 const lines=log.split(/\r?\n/);
 let last=null, block=[];
 const flush=()=>{
   if(!last)return;
   const relevant=block.filter(line=>/^\s*(?:error:|code:|location:|failureType:|expected:|actual:)/.test(line));
   failures.push({title:last,details:relevant.slice(0,8)});
   last=null;block=[];
 };
 for(const line of lines){
   const match=/^not ok (\d+) - (.*)$/.exec(line);
   if(match){flush();last='#'+match[1]+' '+match[2];continue;}
   if(last){
     if(/^ {0,2}(?:ok \d+ - |1\.\.\d+|# tests |# pass |# fail )/.test(line))flush();
     else block.push(line);
   }
 }
 flush();
 const counts=lines.filter(s=>/^# (?:tests|pass|fail|cancelled|skipped) \d+$/.test(s)).slice(-5);
 const out=['JYNLO MOBILE — Falhas Node TAP','',...counts,'','Falhas encontradas: '+failures.length,''];
 for(const failure of failures){out.push(failure.title,...failure.details,'');}
 if(!log)out.push('Log de testes não disponível.');
 fs.writeFileSync(output,out.join('\n')+'\n');
 process.stdout.write('Resumo de '+failures.length+' falhas criado em '+output+'\n');
}
