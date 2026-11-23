import React,{useCallback,useMemo,useState} from 'react';
import {Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import {t} from '../../../src/lib/i18n';
import {useAuth} from '../../../src/lib/auth';
import {C} from '../../../src/lib/theme';
import {Button,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {sportName} from '../../../src/lib/sport-names.cjs';
import {communityDetails} from '../../../src/lib/community-api';
import {communitySports} from '../../../src/lib/community-core.cjs';
import {communityResultsOverview,type CommunityResultsOverview} from '../../../src/lib/community-results-api';
import {racePoints,racketRule,sportFamily,teamPoints} from '../../../src/lib/competition-settings-core.cjs';
import {autoImportConfirm,autoImportPlan,importColumns,mappingOf,updateDefaultPoints,updateHabitualLocation,updateRaceRule,updateRacketRule,
 updateSportPoints,type AutoImportPlan,type ImportColumns,type ImportField} from '../../../src/lib/competition-settings-api';

const FIELD_LABELS:[ImportField,string][]=[['PLAYER','Jogador'],['DATE','Data'],['RESULT','Resultado (V/E/D)'],['WIN','Vitórias'],
 ['DRAW','Empates'],['LOSS','Derrotas'],['GOALS','Golos'],['ASSISTS','Assistências'],['POINTS','Pontos'],['MVP','MVP'],['IGNORE','Ignorar']];
import type {CommunityGroup} from '../../../src/lib/types';

type Section='POINTS'|'RACKET'|'RACE'|'PLACE'|'IMPORT'|null;
type Scoring={sport:string;winPoints:number;drawPoints:number;lossPoints:number};

/** Organizer settings that used to be web-only: points, racket/race rules, usual place and history import. */
export default function CompetitionSettingsScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>();
 const id=typeof rawId==='string'&&/^[1-9]\d*$/.test(rawId)?Number(rawId):NaN;
 const auth=useAuth(),router=useRouter();
 const [community,setCommunity]=useState<CommunityGroup|null>(null);
 const [overview,setOverview]=useState<CommunityResultsOverview|null>(null);
 const [seasonId,setSeasonId]=useState<number|null>(null);
 const [open,setOpen]=useState<Section>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [drafts,setDrafts]=useState<Record<string,{win:string;draw:string;loss:string}>>({});
 const [racket,setRacket]=useState<Record<string,{win:string;loss:string;tieBreak:string}>>({});
 const [race,setRace]=useState<Record<string,string>>({});
 const [place,setPlace]=useState({city:'',address:'',latitude:null as number|null,longitude:null as number|null});
 const [file,setFile]=useState<DocumentPicker.DocumentPickerAsset|null>(null);
 const [plan,setPlan]=useState<AutoImportPlan|null>(null);
 const [columns,setColumns]=useState<ImportColumns|null>(null);
 const [year,setYear]=useState('');

 const load=useCallback(async(nextSeason:number|null)=>{
  if(!auth.token||!Number.isSafeInteger(id))return;
  setLoading(true);setError('');
  try{
   const c=await communityDetails(id,auth.token,auth.username) as CommunityGroup;
   setCommunity(c);
   setPlace(p=>p.latitude!=null?p:{city:c.habitualCity||'',address:c.habitualAddress||'',
    latitude:typeof c.habitualLatitude==='number'?c.habitualLatitude:null,longitude:typeof c.habitualLongitude==='number'?c.habitualLongitude:null});
   const first=await communityResultsOverview(id,auth.token,nextSeason);
   const active=(first.seasons||[]).filter(s=>s.active);
   const chosen=nextSeason??(active[0]?.id??null);
   const data=chosen!==nextSeason&&chosen!=null?await communityResultsOverview(id,auth.token,chosen):first;
   setSeasonId(chosen);setOverview(data);
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível carregar a competição.'));}
  finally{setLoading(false);}
 },[auth.token,auth.username,id]);
 useFocusEffect(useCallback(()=>{void load(null);},[load]));

 const sports=useMemo(()=>community?communitySports(community):[],[community]);
 const teamSports=sports.filter(s=>sportFamily(s)==='team');
 const racketSports=sports.filter(s=>sportFamily(s)==='racket');
 const raceSports=sports.filter(s=>sportFamily(s)==='race');
 const activeSeasons=(overview?.seasons||[]).filter(s=>s.active);
 const role=community&&'myRole' in community?community.myRole:null;
 const manage=role==='OWNER'||role==='ADMIN';
 const scoring=(sport:string):Scoring=>{
  const groups=(overview?.sportStandings||[]) as {sport?:string;scoring?:Scoring|null}[];
  const s=groups.find(g=>g.sport===sport)?.scoring;
  const d=overview?.settings;
  return s||{sport,winPoints:d?.winPoints??3,drawPoints:d?.drawPoints??1,lossPoints:d?.lossPoints??0};
 };
 const racketCurrent=(sport:string,format:string)=>{
  const g=((overview?.racketStandings||[]) as {sport?:string;matchFormat?:string;rule?:{winPoints:number;lossPoints:number;tieBreak:string}|null}[])
   .find(x=>x.sport===sport&&x.matchFormat===format)?.rule;
  return {win:String(g?.winPoints??2),loss:String(g?.lossPoints??0),tieBreak:g?.tieBreak||'SETS_FIRST'};
 };
 const raceCurrent=(sport:string)=>{
  const g=((overview?.raceStandings||[]) as {sport?:string;rule?:{pointsByPlace?:number[]}|null}[]).find(x=>x.sport===sport)?.rule;
  return g?.pointsByPlace?.length?g.pointsByPlace.join(', '):'25, 18, 15, 12, 10, 8, 6, 4, 2, 1';
 };
 async function run(action:()=>Promise<unknown>,done:string,reload=true){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{await action();setNotice(done);if(reload)await load(seasonId);}
  catch(e){setError(e instanceof Error?e.message:t('Não foi possível guardar.'));}
  finally{setBusy(false);}
 }
 function needSeason():number{if(seasonId==null)throw Error(t('Cria primeiro uma época ativa em Resultados e classificações.'));return seasonId;}
 async function useMyLocation(){
  await run(async()=>{
   const permission=await Location.requestForegroundPermissionsAsync();
   if(permission.status!=='granted')throw Error(t('Sem acesso à localização. Podes ativá-lo nas definições do telemóvel.'));
   const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
   let city=place.city,address=place.address;
   try{const [r]=await Location.reverseGeocodeAsync({latitude:point.coords.latitude,longitude:point.coords.longitude});
    if(r){city=r.city||r.subregion||city;address=[r.street,r.streetNumber].filter(Boolean).join(' ')||r.name||address;}}catch{/* keep typed text */}
   setPlace({city,address,latitude:point.coords.latitude,longitude:point.coords.longitude});
  },t('Localização encontrada. Confirma e guarda.'),false);
 }
 async function chooseFile(){
  if(busy)return;
  setError('');setNotice('');setPlan(null);setColumns(null);
  const picked=await DocumentPicker.getDocumentAsync({type:['*/*'],copyToCacheDirectory:true,multiple:false});
  if(picked.canceled||!picked.assets?.[0])return;
  const asset=picked.assets[0];setFile(asset);
  await run(async()=>setColumns(await importColumns(id,auth.token,asset)),t('Ficheiro lido. Confirma o que é cada coluna.'),false);
 }
 function setField(columnIndex:number,field:ImportField){
  // A field belongs to one column only: choosing it elsewhere clears the previous column.
  setColumns(c=>c&&{...c,columns:c.columns.map(x=>x.columnIndex===columnIndex?{...x,field}
   :field!=='IGNORE'&&x.field===field?{...x,field:'IGNORE' as ImportField}:x)});
  setPlan(null);
 }
 async function reviewColumns(){
  if(!columns||!file)return;
  const fields=new Set(columns.columns.map(c=>c.field));
  if(!fields.has('PLAYER')||!fields.has('DATE')){setError(t('Indica qual é a coluna do jogador e a da data.'));return;}
  setError('');
  await run(async()=>setPlan(await autoImportPlan(id,auth.token,file,needSeason(),/^\d{4}$/.test(year)?Number(year):null,mappingOf(columns))),
   t('Confirma antes de importar.'),false);
 }

 const card=(key:Exclude<Section,null>,title:string,hint:string,children:React.ReactNode)=><View style={styles.card}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open===key}} onPress={()=>setOpen(open===key?null:key)} style={styles.cardHead}>
   <View style={{flex:1,gap:3}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.hint}>{hint}</Text></View>
   <Text style={styles.chev}>{open===key?'−':'+'}</Text>
  </Pressable>
  {open===key?<View style={styles.cardBody}>{children}</View>:null}
 </View>;
 const num=(value:string,onChange:(v:string)=>void,label:string)=><View style={styles.numBox}>
  <Text style={styles.numLabel}>{label}</Text>
  <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={4} style={styles.num} accessibilityLabel={label}/>
 </View>;

 return <Page>
  <Eyebrow>{t('COMPETIÇÃO')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Definições da competição')}</Text>
  {community?<Text style={styles.hint}>{community.name}</Text>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&community&&!manage?<Message>{t('Só os organizadores da comunidade podem alterar estas definições.')}</Message>:null}
  {manage&&activeSeasons.length>1?<View style={styles.seasonRow}>
   <Text style={styles.hint}>{t('Época')}</Text>
   {activeSeasons.map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityState={{selected:seasonId===s.id}}
    onPress={()=>void load(s.id)} style={[styles.chip,seasonId===s.id&&styles.chipOn]}>
    <Text style={styles.chipText}>{s.name||s.label}{s.sport?' · '+sportName(s.sport):''}</Text></Pressable>)}
  </View>:null}
  {manage&&!loading?<>
   {teamSports.length?card('POINTS',t('Pontos por jogo'),t('Quanto vale uma vitória, um empate e uma derrota em cada modalidade.'),<>
    {teamSports.map(sport=>{const cur=scoring(sport);const d=drafts[sport]||{win:String(cur.winPoints),draw:String(cur.drawPoints),loss:String(cur.lossPoints)};
     const set=(k:'win'|'draw'|'loss',v:string)=>setDrafts(all=>({...all,[sport]:{...d,[k]:v}}));
     return <View key={sport} style={styles.rule}>
      <Text style={styles.ruleTitle}>{sportName(sport)}</Text>
      <View style={styles.row}>{num(d.win,v=>set('win',v),t('Vitória'))}{num(d.draw,v=>set('draw',v),t('Empate'))}{num(d.loss,v=>set('loss',v),t('Derrota'))}</View>
      <Button secondary title={busy?t('A guardar…'):t('Guardar pontos')} disabled={busy} onPress={()=>void run(async()=>{
       const p=teamPoints(d);
       if(seasonId!=null)await updateSportPoints(id,auth.token,seasonId,sport,p);
       else await updateDefaultPoints(id,auth.token,p);
      },t('Pontos de {s} guardados.',{s:sportName(sport)}))}/>
     </View>;})}
    {seasonId==null?<Text style={styles.hint}>{t('Sem época ativa: estes pontos ficam como padrão da comunidade.')}</Text>:null}
   </>):null}
   {racketSports.length?card('RACKET',t('Regras de raquete'),t('Pontos por vitória e derrota e o que desempata: sets ou jogos.'),<>
    {seasonId==null?<Text style={styles.hint}>{t('Cria primeiro uma época ativa em Resultados e classificações.')}</Text>:null}
    {racketSports.flatMap(sport=>(['SINGLES','DOUBLES'] as const).map(format=>{
     const key=sport+':'+format;const d=racket[key]||racketCurrent(sport,format);
     const set=(k:'win'|'loss'|'tieBreak',v:string)=>setRacket(all=>({...all,[key]:{...d,[k]:v}}));
     return <View key={key} style={styles.rule}>
      <Text style={styles.ruleTitle}>{sportName(sport)} · {format==='SINGLES'?t('Singulares'):t('Pares')}</Text>
      <View style={styles.row}>{num(d.win,v=>set('win',v),t('Vitória'))}{num(d.loss,v=>set('loss',v),t('Derrota'))}</View>
      <View style={styles.row}>
       {(['SETS_FIRST','SCORE_FIRST'] as const).map(tb=><Pressable key={tb} accessibilityRole="button" accessibilityState={{selected:d.tieBreak===tb}}
        onPress={()=>set('tieBreak',tb)} style={[styles.chip,d.tieBreak===tb&&styles.chipOn]}>
        <Text style={styles.chipText}>{tb==='SETS_FIRST'?t('Desempate: sets'):t('Desempate: jogos/pontos')}</Text></Pressable>)}
      </View>
      <Button secondary title={t('Guardar regra')} disabled={busy||seasonId==null} onPress={()=>void run(()=>updateRacketRule(id,auth.token,needSeason(),sport,format,racketRule(d)),
       t('Regra de {s} guardada.',{s:sportName(sport)}))}/>
     </View>;}))}
   </>):null}
   {raceSports.length?card('RACE',t('Pontos por posição'),t('Para corridas e provas: quantos pontos vale cada lugar.'),<>
    {seasonId==null?<Text style={styles.hint}>{t('Cria primeiro uma época ativa em Resultados e classificações.')}</Text>:null}
    {raceSports.map(sport=>{const v=race[sport]??raceCurrent(sport);return <View key={sport} style={styles.rule}>
     <Text style={styles.ruleTitle}>{sportName(sport)}</Text>
     <TextInput value={v} onChangeText={x=>setRace(all=>({...all,[sport]:x}))} style={styles.input} accessibilityLabel={t('Pontos por posição')}
      placeholder="25, 18, 15, 12, 10" placeholderTextColor={C.muted}/>
     <Text style={styles.hint}>{t('1.º lugar primeiro, separados por vírgulas. Até 20 posições.')}</Text>
     <Button secondary title={t('Guardar pontos')} disabled={busy||seasonId==null} onPress={()=>void run(()=>updateRaceRule(id,auth.token,needSeason(),sport,racePoints(v)),
      t('Pontos de {s} guardados.',{s:sportName(sport)}))}/>
    </View>;})}
   </>):null}
   {card('PLACE',t('Local habitual'),t('Onde costumam jogar. Preenche o local dos novos jogos desta comunidade.'),<>
    <Button secondary title={t('Usar a minha localização atual')} disabled={busy} onPress={()=>void useMyLocation()}/>
    <TextInput value={place.city} onChangeText={v=>setPlace(p=>({...p,city:v}))} maxLength={100} style={styles.input} placeholder={t('Cidade')} placeholderTextColor={C.muted} accessibilityLabel={t('Cidade')}/>
    <TextInput value={place.address} onChangeText={v=>setPlace(p=>({...p,address:v}))} maxLength={255} style={styles.input} placeholder={t('Morada ou nome do campo')} placeholderTextColor={C.muted} accessibilityLabel={t('Morada')}/>
    {place.latitude==null?<Text style={styles.hint}>{t('Para guardar, usa a tua localização quando estiveres no local onde costumam jogar.')}</Text>
     :<Text style={styles.hint}>{t('Ponto no mapa definido ✓')}</Text>}
    <Button title={t('Guardar local habitual')} disabled={busy||place.latitude==null||!place.city.trim()} onPress={()=>void run(()=>updateHabitualLocation(id,auth.token,
     {latitude:place.latitude!,longitude:place.longitude!,city:place.city.trim(),address:place.address.trim()}),t('Local habitual guardado.'))}/>
   </>)}
   {card('IMPORT',t('Importar histórico'),t('Traz jogos antigos do Excel ou CSV que o teu grupo já usa.'),<>
    {seasonId==null?<Text style={styles.hint}>{t('Cria primeiro uma época ativa em Resultados e classificações.')}</Text>:null}
    <Text style={styles.hint}>{t('Uma linha por jogador em cada jogo. Depois de escolheres o ficheiro, dizes o que é cada coluna (jogador, data, resultado, golos…). Nada é importado sem confirmares.')}</Text>
    <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://jynlosports.com/assets/modelo-jynlo-historico.csv')}>
     <Text style={styles.link}>{t('Ainda não tens ficheiro? Descarregar modelo')}</Text></Pressable>
    <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} style={styles.input}
     placeholder={t('Ano (só se as datas não tiverem ano)')} placeholderTextColor={C.muted} accessibilityLabel={t('Ano')}/>
    {!plan&&!columns?<Button secondary title={busy?t('A ler o ficheiro…'):t('Escolher ficheiro')} disabled={busy||seasonId==null} onPress={()=>void chooseFile()}/>:null}
    {columns&&!plan?<View style={styles.rule}>
     <Text style={styles.ruleTitle}>{t('O que é cada coluna?')}</Text>
     {columns.columns.map(c=><View key={c.columnIndex} style={styles.colRow}>
      <Text style={styles.colHead} numberOfLines={1}>{c.header||t('Coluna {n}',{n:c.columnIndex+1})}{c.sample?<Text style={styles.hint}>{'  · '+c.sample}</Text>:null}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
       {FIELD_LABELS.map(([f,label])=><Pressable key={f} accessibilityRole="radio" accessibilityState={{selected:c.field===f}}
        accessibilityLabel={(c.header||String(c.columnIndex+1))+': '+t(label)}
        onPress={()=>setField(c.columnIndex,f)} style={[styles.colChip,c.field===f&&styles.colChipOn]}>
        <Text style={[styles.colChipText,c.field===f&&styles.colChipTextOn]}>{t(label)}</Text></Pressable>)}
      </ScrollView>
     </View>)}
     <Button title={busy?t('A analisar…'):t('Ver o que vai ser importado')} disabled={busy} onPress={()=>void reviewColumns()}/>
     <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setFile(null);setColumns(null);}}/>
    </View>:null}
    {plan?<View style={styles.rule}>
     <Text style={styles.ruleTitle}>{t('Vamos criar {a} jornadas com {b} resultados de jogadores.',{a:plan.plan.distinctRounds-plan.plan.duplicateRounds,b:plan.plan.rounds.filter(r=>!r.duplicate).reduce((s,r)=>s+r.players,0)})}</Text>
     {plan.plan.duplicateRounds?<Text style={styles.hint}>{t('{n} jornadas já existiam e ficam como estão.',{n:plan.plan.duplicateRounds})}</Text>:null}
     {plan.columns.length?<Text style={styles.hint}>{t('Colunas reconhecidas: {c}',{c:plan.columns.join(', ')})}</Text>:null}
     {plan.plan.roundsNeedingYear||plan.plan.invalidDates?<Message tone="error">{t('Há datas sem ano ou inválidas. Indica o ano acima e escolhe o ficheiro outra vez.')}</Message>:null}
     <Button title={busy?t('A importar…'):t('Importar jogos')} disabled={busy||!!plan.plan.roundsNeedingYear||!!plan.plan.invalidDates}
      onPress={()=>void run(async()=>{const r=await autoImportConfirm(id,auth.token,file!,needSeason(),/^\d{4}$/.test(year)?Number(year):null,columns?mappingOf(columns):null);
       setPlan(null);setFile(null);setColumns(null);setNotice(t('Importado: {a} jornadas e {b} resultados.',{a:r.createdRounds,b:r.createdEntries}));},t('Importação concluída.'))}/>
     <Button secondary title={t('Mudar colunas')} disabled={busy} onPress={()=>setPlan(null)}/>
     <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setPlan(null);setFile(null);setColumns(null);}}/>
    </View>:null}
   </>)}
   <Text style={styles.hint}>{t('A classificação pública partilha-se na página da comunidade, em Classificação pública.')}</Text>
  </>:null}
  <Button secondary title={t('Voltar')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{fontSize:27,color:C.white,fontWeight:'900'},hint:{color:C.muted,fontSize:12,lineHeight:18},
 card:{borderWidth:1,borderColor:C.border,borderRadius:18,backgroundColor:C.surface,overflow:'hidden'},
 cardHead:{flexDirection:'row',alignItems:'center',gap:10,padding:15,minHeight:56},cardTitle:{color:C.white,fontSize:16,fontWeight:'900'},
 chev:{color:C.mint,fontSize:24,fontWeight:'900',width:24,textAlign:'center'},cardBody:{padding:15,paddingTop:0,gap:12},
 colRow:{gap:6,paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.border},colHead:{color:C.white,fontSize:14,fontWeight:'800'},
 chips:{gap:6,paddingRight:8},colChip:{minHeight:36,paddingHorizontal:12,justifyContent:'center',borderRadius:999,borderWidth:1,borderColor:C.border},
 colChipOn:{backgroundColor:C.mint,borderColor:C.mint},colChipText:{color:C.muted,fontSize:13,fontWeight:'700'},colChipTextOn:{color:'#04212a'},
 rule:{gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:C.border},ruleTitle:{color:C.white,fontSize:14,fontWeight:'800'},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8},numBox:{gap:4,minWidth:84},numLabel:{color:C.muted,fontSize:11,fontWeight:'700'},
 num:{minHeight:44,width:84,borderColor:C.border,borderWidth:1,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface2,fontSize:16,fontWeight:'800'},
 input:{minHeight:46,borderColor:C.border,borderWidth:1,borderRadius:12,paddingHorizontal:12,color:C.white,backgroundColor:C.surface2,fontSize:15},
 seasonRow:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 chip:{minHeight:38,paddingHorizontal:12,paddingVertical:7,borderRadius:999,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 chipOn:{borderColor:C.mint,backgroundColor:C.surface2},link:{color:C.mint,fontWeight:'800',fontSize:13},chipText:{color:C.white,fontSize:12,fontWeight:'800'}
});
