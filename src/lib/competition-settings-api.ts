import {fetch as expoFetch} from 'expo/fetch';
import {File} from 'expo-file-system';
import type {DocumentPickerAsset} from 'expo-document-picker';
import {API_BASE,DEMO_MODE,request} from './api';
import {readErrorMessage} from './response-body.cjs';

function base(id:number){
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Comunidade inválida.');
 return '/api/communities/'+id;
}
function need(token:string|null):string{if(DEMO_MODE||!token)throw Error('Inicia sessão para gerir a competição.');return token;}
function season(id:number){if(!Number.isSafeInteger(id)||id<=0)throw Error('Escolhe uma época.');return id;}

export const updateDefaultPoints=(id:number,token:string|null,p:{winPoints:number;drawPoints:number;lossPoints:number})=>
 request<unknown>(base(id)+'/competition/settings',{token:need(token),method:'PUT',body:p});
export const updateSportPoints=(id:number,token:string|null,seasonId:number,sport:string,p:{winPoints:number;drawPoints:number;lossPoints:number})=>
 request<unknown>(base(id)+'/seasons/'+season(seasonId)+'/sport-points',{token:need(token),method:'PUT',body:{sport,...p}});
export const updateRacketRule=(id:number,token:string|null,seasonId:number,sport:string,matchFormat:'SINGLES'|'DOUBLES',r:{winPoints:number;lossPoints:number;tieBreak:string})=>
 request<unknown>(base(id)+'/seasons/'+season(seasonId)+'/racket-rules',{token:need(token),method:'PUT',body:{sport,matchFormat,...r}});
export const updateRaceRule=(id:number,token:string|null,seasonId:number,sport:string,pointsByPlace:string)=>
 request<unknown>(base(id)+'/seasons/'+season(seasonId)+'/race-rules',{token:need(token),method:'PUT',body:{sport,pointsByPlace}});
export const updateHabitualLocation=(id:number,token:string|null,place:{latitude:number;longitude:number;city:string;address:string})=>
 request<unknown>(base(id)+'/habitual-location',{token:need(token),method:'PUT',body:{source:'GPS',...place}});

export type AutoImportPlan={columns:string[];plan:{distinctRounds:number;duplicateRounds:number;acceptedRows:number;roundsNeedingYear:number;invalidDates:number;
 rounds:{sourceDate:string;parsedDate:string|null;duplicate:boolean;players:number;unresolvedResults:number}[]}};
export type ImportField='PLAYER'|'DATE'|'RESULT'|'WIN'|'DRAW'|'LOSS'|'GOALS'|'ASSISTS'|'POINTS'|'MVP'|'IGNORE';
export type ImportMapping={sheetName:string;columns:{columnIndex:number;field:ImportField}[]};
export type ImportColumn={columnIndex:number;header:string;sample:string;field:ImportField};
export type ImportColumns={sheetName:string;columns:ImportColumn[]};
async function upload<T>(id:number,token:string|null,asset:DocumentPickerAsset,seasonId:number|null,confirm:boolean|'columns',defaultYear:number|null,mapping?:ImportMapping|null):Promise<T>{
 const auth=need(token);
 if(!/\.(xlsx|xls|csv|tsv)$/i.test(asset.name||''))throw Error('Escolhe um ficheiro .xlsx, .xls, .csv ou .tsv.');
 if(typeof asset.size==='number'&&asset.size>10*1024*1024)throw Error('O ficheiro não pode ultrapassar 10 MB.');
 const file=new File(asset.uri);
 if(!file.exists)throw Error('O ficheiro selecionado já não está disponível.');
 const form=new FormData();
 form.append('file',file as unknown as Blob,asset.name.replace(/[\\/\x00-\x1f\x7f]/g,'_').slice(-140));
 if(mapping)form.append('mapping',JSON.stringify(mapping));
 const path=confirm==='columns'?'/competition/import/preview'
  :'/competition/import/auto/'+(confirm?'confirm':'plan')+'?seasonId='+season(seasonId!)+(defaultYear?'&defaultYear='+defaultYear:'');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
 try{
  const response=await expoFetch(API_BASE+base(id)+path,{
   method:'POST',headers:{Authorization:'Bearer '+auth,Accept:'application/json'},credentials:'omit',redirect:'error',body:form,signal:controller.signal});
  if(!response.ok){
   const reason=await readErrorMessage(response);
   throw Error(reason||(response.status===403?'Só os organizadores podem importar.':'Não foi possível ler o ficheiro.'));
  }
  return await response.json() as T;
 }finally{clearTimeout(timeout);}
}
const FIELDS=new Set(['PLAYER','DATE','RESULT','WIN','DRAW','LOSS','GOALS','ASSISTS','POINTS','MVP']);
type PreviewSheet={name:string;structure?:string;sampleRows?:string[][];
 columnSuggestions?:{columnIndex:number;header:string;field:string;confidence:number}[]};
/** Reads the file's columns and the server's suggestion for each one (the person can change them). */
export async function importColumns(id:number,token:string|null,asset:DocumentPickerAsset):Promise<ImportColumns>{
 const preview=await upload<{sheets:PreviewSheet[]}>(id,token,asset,null,'columns',null);
 const sheet=(preview.sheets||[]).find(s=>s.structure==='TABULAR')||(preview.sheets||[])[0];
 if(!sheet||!sheet.columnSuggestions?.length)throw Error('O ficheiro não tem dados para importar.');
 const used=new Set<string>();
 const columns=sheet.columnSuggestions.slice(0,60).map(s=>{
  let field:ImportField=s.confidence>=0.6&&FIELDS.has(s.field)&&!used.has(s.field)?s.field as ImportField:'IGNORE';
  if(field!=='IGNORE')used.add(field);
  const sample=(sheet.sampleRows||[]).map(r=>r?.[s.columnIndex]||'').find(v=>v.trim())||'';
  return {columnIndex:s.columnIndex,header:s.header||'',sample:sample.slice(0,40),field};
 });
 return {sheetName:sheet.name,columns};
}
export const mappingOf=(c:ImportColumns):ImportMapping=>({sheetName:c.sheetName,columns:c.columns.map(x=>({columnIndex:x.columnIndex,field:x.field}))});
export const autoImportPlan=(id:number,token:string|null,asset:DocumentPickerAsset,seasonId:number,defaultYear:number|null,mapping?:ImportMapping|null)=>
 upload<AutoImportPlan>(id,token,asset,seasonId,false,defaultYear,mapping);
export const autoImportConfirm=(id:number,token:string|null,asset:DocumentPickerAsset,seasonId:number,defaultYear:number|null,mapping?:ImportMapping|null)=>
 upload<{createdRounds:number;skippedDuplicateRounds:number;createdEntries:number}>(id,token,asset,seasonId,true,defaultYear,mapping);
