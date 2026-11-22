import React,{useCallback,useEffect,useState} from 'react';
import {Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {Button,Message} from './UI';
import {importRoster,previewRosterImport,removeRosterEntry,teamRoster,checkRosterAsset,
 type RosterRowStatus,type TeamRosterEntry,type TeamRosterPreview} from '../lib/team-roster-api';

/** Owner-only: import the squad from Excel/CSV. Contacts in the file are never read. */
export default function TeamRosterImport({teamId,token,onImported}:{teamId:number;token:string|null;onImported?:()=>void}){
 const [asset,setAsset]=useState<DocumentPicker.DocumentPickerAsset|null>(null);
 const [preview,setPreview]=useState<TeamRosterPreview|null>(null);
 const [entries,setEntries]=useState<TeamRosterEntry[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(()=>{void teamRoster(teamId,token).then(setEntries).catch(()=>setEntries([]));},[teamId,token]);
 useEffect(()=>{load();},[load]);
 async function choose(){
  if(busy)return;
  setError('');setNotice('');setPreview(null);
  try{
   const picked=await DocumentPicker.getDocumentAsync({type:['*/*'],copyToCacheDirectory:true,multiple:false});
   if(picked.canceled||!picked.assets?.[0])return;
   const next=picked.assets[0];
   checkRosterAsset(next);
   setAsset(next);setBusy(true);
   setPreview(await previewRosterImport(teamId,token,next));
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível ler o ficheiro.'));}
  finally{setBusy(false);}
 }
 async function confirm(){
  if(!asset||busy)return;
  setBusy(true);setError('');
  try{
   const result=await importRoster(teamId,token,asset);
   setNotice(t('Plantel importado: {a} convites enviados, {b} jogadores adicionados.',{a:result.invited,b:result.added}));
   setPreview(null);setAsset(null);load();onImported?.();
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível importar o plantel.'));}
  finally{setBusy(false);}
 }
 async function remove(entry:TeamRosterEntry){
  if(busy)return;
  setBusy(true);setError('');
  try{await removeRosterEntry(teamId,token,entry.id);setEntries(list=>list.filter(e=>e.id!==entry.id));}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível remover.'));}
  finally{setBusy(false);}
 }
 const label=(status:RosterRowStatus,username:string|null)=>status==='INVITE'?t('Convite para @{u}',{u:username||''})
  :status==='ALREADY_IN_TEAM'?t('Já está na equipa'):status==='DUPLICATE'?t('Repetido')
  :status==='UNKNOWN_USERNAME'?t('Utilizador não encontrado · fica sem conta'):t('Sem conta Jynlo');
 return <View style={styles.box}>
  <Text style={styles.heading}>{t('Tens o plantel num Excel?')}</Text>
  <Text style={styles.note}>{t('Importa nome, número e posição. Quem tiver o utilizador Jynlo na folha recebe convite; os restantes ficam no plantel e só tu os vês. Emails e telefones do ficheiro não são lidos.')}</Text>
  <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://jynlosports.com/assets/modelo-jynlo-plantel.csv')}>
   <Text style={styles.link}>{t('Descarregar modelo')}</Text></Pressable>
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!preview?<Button secondary title={busy?t('A ler o ficheiro…'):t('Escolher ficheiro')} disabled={busy} onPress={()=>void choose()}/>:null}
  {preview?<View style={styles.preview}>
   <Text style={styles.strong}>{t('Vamos enviar {a} convites e adicionar {b} jogadores sem conta.',{a:preview.invites,b:preview.newPlayers})}</Text>
   {preview.skipped?<Text style={styles.note}>{t('{n} linhas ignoradas (repetidas ou já na equipa).',{n:preview.skipped})}</Text>:null}
   {preview.rows.slice(0,40).map(row=><Text key={row.line} style={[styles.row,(row.status==='DUPLICATE'||row.status==='ALREADY_IN_TEAM')&&styles.skipped]}>
    {row.shirtNumber!=null?row.shirtNumber+' · ':''}{row.name}{row.position?' · '+row.position:''} — {label(row.status,row.username)}</Text>)}
   {preview.rows.length>40?<Text style={styles.note}>{t('… e mais {n}.',{n:preview.rows.length-40})}</Text>:null}
   {preview.warnings.map(w=><Text key={w} style={styles.note}>{w}</Text>)}
   <Button title={busy?t('A importar…'):t('Importar plantel')} disabled={busy||!(preview.invites+preview.newPlayers)} onPress={()=>void confirm()}/>
   <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setPreview(null);setAsset(null);}}/>
  </View>:null}
  {entries.length?<View style={styles.preview}>
   <Text style={styles.strong}>{t('Plantel importado ({n})',{n:entries.length})}</Text>
   {entries.map(entry=><View key={entry.id} style={styles.entry}>
    <Text style={[styles.row,{flex:1}]}>{entry.shirtNumber!=null?entry.shirtNumber+' · ':''}{entry.name}{entry.position?' · '+entry.position:''}{entry.username?' · @'+entry.username:''}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Remover {name} do plantel',{name:entry.name})} disabled={busy} onPress={()=>void remove(entry)} hitSlop={10}>
     <Text style={styles.remove}>✕</Text></Pressable>
   </View>)}
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{marginTop:14,padding:14,gap:10,borderRadius:14,borderWidth:1,borderStyle:'dashed',borderColor:C.border},
 heading:{color:C.white,fontSize:16,fontWeight:'900'},note:{color:C.muted,fontSize:12,lineHeight:18},
 link:{color:C.mint,fontWeight:'800',fontSize:13},preview:{gap:6},strong:{color:C.white,fontWeight:'800',fontSize:13},
 row:{color:C.white,fontSize:13},skipped:{opacity:.5,textDecorationLine:'line-through'},
 entry:{flexDirection:'row',alignItems:'center',gap:8},remove:{color:C.danger,fontSize:16,fontWeight:'900',paddingHorizontal:6}
});
