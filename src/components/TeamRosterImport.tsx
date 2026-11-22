import React,{useCallback,useEffect,useState} from 'react';
import {Linking,Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {Button,Message} from './UI';
import {importRoster,previewRosterImport,removeRosterEntry,teamRoster,checkRosterAsset,rosterClaimLink,linkRosterEntry,
 unlinkRosterEntry,updateRosterEntry,rosterSuggestions,
 type RosterRowStatus,type TeamRosterEntry,type TeamRosterPreview,type TeamRosterSuggestion} from '../lib/team-roster-api';
import {findSportsTeamPlayers,type SportsTeamPlayerCandidate} from '../lib/sports-teams-api';

/** Owner-only: import the squad from Excel/CSV. Contacts in the file are never read. */
export default function TeamRosterImport({teamId,token,onImported}:{teamId:number;token:string|null;onImported?:()=>void}){
 const [asset,setAsset]=useState<DocumentPicker.DocumentPickerAsset|null>(null);
 const [preview,setPreview]=useState<TeamRosterPreview|null>(null);
 const [entries,setEntries]=useState<TeamRosterEntry[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [suggestions,setSuggestions]=useState<TeamRosterSuggestion[]>([]);
 const [dismissed]=useState(()=>new Set<number>());
 const [editing,setEditing]=useState<number|null>(null);
 const [draft,setDraft]=useState({name:'',number:'',position:''});
 const [linking,setLinking]=useState<number|null>(null),[query,setQuery]=useState(''),[candidates,setCandidates]=useState<SportsTeamPlayerCandidate[]>([]),[searched,setSearched]=useState(false);
 const load=useCallback(()=>{
  void teamRoster(teamId,token).then(setEntries).catch(()=>setEntries([]));
  void rosterSuggestions(teamId,token).then(list=>setSuggestions(list.filter(s=>!dismissed.has(s.entryId)))).catch(()=>setSuggestions([]));
 },[teamId,token,dismissed]);
 async function run(action:()=>Promise<unknown>,done?:()=>void){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{await action();done?.();}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível guardar.'));}
  finally{setBusy(false);}
 }
 function share(entry:TeamRosterEntry){
  void run(async()=>{
   const url=await rosterClaimLink(teamId,token,entry.id);
   await Share.share({message:t('{name}, és tu no plantel? Entra na equipa aqui: {url}',{name:entry.name,url})});
   setNotice(t('Convite criado para {name}. Um link novo anula o anterior.',{name:entry.name}));
  },load);
 }
 function startEdit(entry:TeamRosterEntry){
  setLinking(null);setEditing(entry.id);
  setDraft({name:entry.name,number:entry.shirtNumber==null?'':String(entry.shirtNumber),position:entry.position||''});
 }
 function saveEdit(entry:TeamRosterEntry){
  const n=draft.number.trim();
  if(n&&!/^\d{1,3}$/.test(n)){setError(t('O número tem de estar entre 0 e 999.'));return;}
  void run(()=>updateRosterEntry(teamId,token,entry.id,{name:draft.name.trim(),shirtNumber:n?Number(n):null,position:draft.position.trim()||null}),
   ()=>{setEditing(null);load();onImported?.();});
 }
 function startLink(entry:TeamRosterEntry){
  setEditing(null);setLinking(linking===entry.id?null:entry.id);setQuery(entry.name);setCandidates([]);setSearched(false);
 }
 function search(){
  const q=query.trim();if(q.length<2||!token)return;
  void run(async()=>{setCandidates((await findSportsTeamPlayers(q,token)).slice(0,8));setSearched(true);});
 }
 function link(entry:TeamRosterEntry,c:SportsTeamPlayerCandidate){
  void run(async()=>{
   const updated=await linkRosterEntry(teamId,token,entry.id,c.profileId);
   setNotice(updated.memberStatus==='ACTIVE'?t('{name} associado a @{u}.',{name:entry.name,u:c.username})
    :t('Convite enviado a @{u}. Fica associado quando aceitar.',{u:c.username}));
  },()=>{setLinking(null);load();onImported?.();});
 }
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
 const memberLabel=(status:TeamRosterEntry['memberStatus'])=>status==='ACTIVE'?t('na equipa'):status==='INVITED'?t('convite enviado')
  :status==='DECLINED'?t('recusou o convite'):t('saiu da equipa');
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
  {suggestions.length?<View style={styles.suggest}>
   <Text style={styles.strong}>{t('Será a mesma pessoa?')}</Text>
   {suggestions.map(sug=><View key={sug.entryId} style={styles.preview}>
    <Text style={styles.row}>{sug.entryName}{sug.shirtNumber!=null?' · nº '+sug.shirtNumber:''} → @{sug.username}{sug.fullName?' ('+sug.fullName+')':''}</Text>
    <View style={styles.actions}>
     <Button title={t('Sim')} disabled={busy} onPress={()=>void run(()=>linkRosterEntry(teamId,token,sug.entryId,sug.profileId),()=>{load();onImported?.();})}/>
     <Button secondary title={t('Não')} disabled={busy} onPress={()=>{dismissed.add(sug.entryId);setSuggestions(list=>list.filter(x=>x.entryId!==sug.entryId));}}/>
    </View>
   </View>)}
  </View>:null}
  {entries.length?<View style={styles.preview}>
   <Text style={styles.strong}>{t('Plantel importado ({n})',{n:entries.length})}</Text>
   {entries.map(entry=><View key={entry.id} style={styles.entryBox}>
    {editing===entry.id?<View style={styles.preview}>
     <TextInput value={draft.name} onChangeText={v=>setDraft(d=>({...d,name:v}))} maxLength={100} style={styles.input} placeholder={t('Nome')} placeholderTextColor={C.muted} accessibilityLabel={t('Nome')}/>
     <View style={styles.actions}>
      <TextInput value={draft.number} onChangeText={v=>setDraft(d=>({...d,number:v}))} keyboardType="number-pad" maxLength={3} style={[styles.input,{width:80}]} placeholder={t('Número')} placeholderTextColor={C.muted} accessibilityLabel={t('Número')}/>
      <TextInput value={draft.position} onChangeText={v=>setDraft(d=>({...d,position:v}))} maxLength={40} style={[styles.input,{flex:1}]} placeholder={t('Posição')} placeholderTextColor={C.muted} accessibilityLabel={t('Posição')}/>
     </View>
     <View style={styles.actions}>
      <Button title={t('Guardar')} disabled={busy} onPress={()=>saveEdit(entry)}/>
      <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>setEditing(null)}/>
     </View>
    </View>:<>
     <View style={styles.entry}>
      <Text style={[styles.row,{flex:1}]}>{entry.shirtNumber!=null?entry.shirtNumber+' · ':''}{entry.name}{entry.position?' · '+entry.position:''}{entry.username?' · @'+entry.username+' · '+memberLabel(entry.memberStatus):' · '+t('sem conta')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Remover {name} do plantel',{name:entry.name})} disabled={busy} onPress={()=>void remove(entry)} hitSlop={10}>
       <Text style={styles.remove}>✕</Text></Pressable>
     </View>
     <View style={styles.actions}>
      {!entry.username?<>
       <Pressable accessibilityRole="button" disabled={busy} onPress={()=>share(entry)} style={styles.chip}><Text style={styles.chipText}>{t('Partilhar convite')}</Text></Pressable>
       <Pressable accessibilityRole="button" disabled={busy} onPress={()=>startLink(entry)} style={styles.chip}><Text style={styles.chipText}>{t('Associar a utilizador')}</Text></Pressable>
      </>:<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void run(()=>unlinkRosterEntry(teamId,token,entry.id),()=>{load();onImported?.();})} style={styles.chip}><Text style={styles.chipText}>{t('Desfazer associação')}</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>startEdit(entry)} style={styles.chip}><Text style={styles.chipText}>{t('Editar')}</Text></Pressable>
     </View>
    </>}
    {linking===entry.id?<View style={styles.preview}>
     <TextInput value={query} onChangeText={setQuery} maxLength={80} style={styles.input} placeholder={t('Nome ou utilizador')} placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={search} accessibilityLabel={t('Nome ou utilizador')}/>
     <Button secondary title={t('Pesquisar')} disabled={busy||query.trim().length<2} onPress={search}/>
     {candidates.map(c=><Pressable key={c.profileId} accessibilityRole="button" disabled={busy} onPress={()=>link(entry,c)} style={styles.chip}>
      <Text style={styles.chipText}>{(c.fullName||c.username)+' · @'+c.username}</Text></Pressable>)}
     {searched&&!candidates.length?<Text style={styles.note}>{t('Não encontrámos ninguém com essa pesquisa.')}</Text>:null}
    </View>:null}
   </View>)}
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 box:{marginTop:14,padding:14,gap:10,borderRadius:14,borderWidth:1,borderStyle:'dashed',borderColor:C.border},
 heading:{color:C.white,fontSize:16,fontWeight:'900'},note:{color:C.muted,fontSize:12,lineHeight:18},
 link:{color:C.mint,fontWeight:'800',fontSize:13},preview:{gap:6},strong:{color:C.white,fontWeight:'800',fontSize:13},
 row:{color:C.white,fontSize:13},skipped:{opacity:.5,textDecorationLine:'line-through'},
 entry:{flexDirection:'row',alignItems:'center',gap:8},entryBox:{gap:6,paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.border},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},suggest:{gap:8,padding:10,borderRadius:12,backgroundColor:C.surface2},
 chip:{minHeight:36,paddingHorizontal:10,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 chipText:{color:C.white,fontSize:12,fontWeight:'800'},
 input:{minHeight:44,borderColor:C.border,borderWidth:1,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface2,fontSize:15},remove:{color:C.danger,fontSize:16,fontWeight:'900',paddingHorizontal:6}
});
