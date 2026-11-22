import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE} from '../../src/lib/api';
import {myCommunities} from '../../src/lib/community-api';
import {communitySports} from '../../src/lib/community-core.cjs';
import {communityAllowsTournamentSport,canCreateTournamentForSport} from '../../src/lib/community-competition-core.cjs';
import {createTournament} from '../../src/lib/tournament-create-api';
import {creationProfile,disciplineChoices,isNumericModel,createTournamentDraft} from '../../src/lib/tournament-create-core.cjs';
import type {TournamentCreateFormat,TournamentEntryChoice,CreateTournamentInput} from '../../src/lib/tournament-create-core.cjs';
import {SPORTS} from '../../src/lib/sports';
import {C} from '../../src/lib/theme';
import type {CommunityGroup} from '../../src/lib/types';
import {sportMatches,sportName} from '../../src/lib/sport-names.cjs';

const FORMAT_LABELS:Record<TournamentCreateFormat,string>={
 LEAGUE:'Liga',KNOCKOUT:'Eliminatórias',GROUP_KNOCKOUT:'Grupos + eliminatórias'
};
const EVENT_LABELS:Record<string,string>={
 JUMP:'Saltos',THROW:'Lançamentos',TRACK:'Pista (tempos)',TRACK_RELAY:'Estafetas',
 SWIM_LCM:'Piscina de 50 m',CANOE_SPRINT:'Velocidade K1',ROWING_SINGLE:'Skiff 1x',
 RACE:'Corrida',ROAD_RACE:'Estrada',TRACK_SCRATCH:'Pista · Scratch',CHESS_GAME:'Partidas de xadrez'
};
const MODEL_HINTS:Record<string,string>={
 NUMERIC_INDIVIDUAL:'Confrontos individuais, resultados numéricos e pontuação por vitória/empate/derrota.',
 NUMERIC_TEAM:'Jogos entre equipas, com calendário, classificações e possibilidade de grupos/eliminatórias.',
 CHESS_HALF_POINTS:'Vitória vale 1, empate vale ½ e derrota 0.',
 RACE_POINTS:'Classificação pelos resultados das corridas associadas, não por golos nem vitórias em jogos.',
 SWIM_BEST_TIME:'Comparação pelo melhor tempo da mesma prova de piscina de 50 m.',
 CANOE_BEST_TIME:'Comparação pelo melhor tempo de uma distância K1.',
 ROWING_BEST_TIME:'Comparação pelo melhor tempo de uma prova de skiff 1x.',
 TRACK_BEST_TIME:'Comparação pelo melhor tempo na mesma disciplina de pista.',
 FIELD_BEST_MARK:'Comparação pela melhor marca da mesma prova de salto ou lançamento.',
 RELAY_BEST_TIME:'Estafetas por tempo, com equipas de quatro atletas.',
 EVENT_RANKING:'Classificação por provas: registas cada prova (tempo, pontuação/marca ou posições) e os lugares dão pontos — 25, 18, 15, 12, 10… Os atletas podem inscrever-se mesmo depois de começar.',
 UNAVAILABLE:'Esta modalidade existe no catálogo, mas o torneio ainda não tem um modelo de resultados validado.'
};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const titleOf=(code:string)=>(EVENT_LABELS[code]?t(EVENT_LABELS[code]):null)||code.replace(/_/g,' ').replace(/(\d+)X(\d+)/g,'$1×$2');
function Choice({title,active,onPress}:{title:string;active:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityState={{selected:active}}
   style={[styles.choice,active&&styles.activeChoice]} onPress={onPress}>
   <Text style={[styles.choiceText,active&&styles.activeText]}>{title}</Text>
 </Pressable>;
}
export default function CreateTournamentScreen(){
 const router=useRouter(),auth=useAuth();
 const params=useLocalSearchParams<{communityId?:string;sport?:string}>();
 const requestedCommunityId=Number(params.communityId);
 const scopedToCommunity=Number.isSafeInteger(requestedCommunityId)&&requestedCommunityId>0;
 const generation=useRef(0),identityRef=useRef(''),savingRef=useRef(false),communityOverridden=useRef(false);
 const currentCommunityRef=useRef<number|null>(null);
 const [communities,setCommunities]=useState<CommunityGroup[]>([]);
 const [communityId,setCommunityId]=useState<number|null>(null);
 const [search,setSearch]=useState(''),[sport,setSport]=useState('');
 const [name,setName]=useState(''),[entryType,setEntryType]=useState<TournamentEntryChoice>('INDIVIDUAL');
 const [athleticsMode,setAthleticsMode]=useState<'FIELD'|'TRACK'>('FIELD');
 const [format,setFormat]=useState<TournamentCreateFormat>('LEAGUE');
 const [event,setEvent]=useState(''),[discipline,setDiscipline]=useState('');
 const [groupCount,setGroupCount]=useState<2|4>(2),[teamSize,setTeamSize]=useState('5'),[legs,setLegs]=useState<1|2>(1);
 const [win,setWin]=useState('3'),[draw,setDraw]=useState('1'),[loss,setLoss]=useState('0');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(version=generation.current)=>{
  if(!auth.token||!auth.username){
   if(version===generation.current){setCommunities([]);setLoading(false);}
   return;
  }
  setLoading(true);setError('');
  try{
   const all=await myCommunities(auth.token,auth.username);
   if(version!==generation.current)return;
   const allowed=all.filter(c=>(c.myRole==='OWNER'||c.myRole==='ADMIN')&&(!scopedToCommunity||c.id===requestedCommunityId));
   setCommunities(allowed);
   setCommunityId(current=>{
    const preferred=Number(params.communityId);
    return communityOverridden.current&&allowed.some(c=>c.id===current)?current:
     allowed.some(c=>c.id===preferred)?preferred:allowed.some(c=>c.id===current)?current:(allowed[0]?.id??null);
   });
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:t('Não foi possível consultar as comunidades.'));}
  finally{if(version===generation.current)setLoading(false);}
 },[auth.token,auth.username,params.communityId,scopedToCommunity,requestedCommunityId]);
 useFocusEffect(useCallback(()=>{
  const identity=String(auth.username||'')+'|'+String(auth.token||'')+'|'+String(params.communityId||'')+'|'+String(params.sport||'');
  if(identityRef.current!==identity){
   identityRef.current=identity;communityOverridden.current=false;
   setCommunities([]);setCommunityId(null);currentCommunityRef.current=null;setSport('');setSearch('');
   setName('');setEntryType('INDIVIDUAL');setFormat('LEAGUE');
   setEvent('');setDiscipline('');setError('');
  }
  setBusy(savingRef.current);
  const version=++generation.current;
  void load(version);
  return ()=>{generation.current++;};
 },[load,auth.username,auth.token,params.communityId,params.sport]));
 const selected=communities.find(c=>c.id===communityId);
 currentCommunityRef.current=communityId;
 const selectedSports=useMemo(()=>communitySports(selected).filter(s=>SPORTS.includes(s)),[selected]);
 const selectionKey=selectedSports.join('|');
 useEffect(()=>{
  const preferred=typeof params.sport==='string'?params.sport.trim():'';
  setSport(current=>selectedSports.includes(current)?current:selectedSports.includes(preferred)?preferred:'');
 },[selected?.id,selectionKey,params.sport]);
 const sportIsAllowed=Boolean(selected&&communityAllowsTournamentSport(selected,sport)&&selectedSports.includes(sport));
 const profile=creationProfile(sport,entryType,athleticsMode);
 const effectiveFormat=profile.formats.includes(format)?format:(profile.formats[0]||'LEAGUE');
 const effectiveEvent=profile.events.length===1?(profile.events[0]||''):(profile.events.includes(event)?event:'');
 const disciplines=disciplineChoices(effectiveEvent);
 const effectiveDiscipline=disciplines.includes(discipline)?discipline:'';
 const suggestions=useMemo(()=>{
  const term=normalized(search.trim());
  return selectedSports.filter(s=>!term||sportMatches(s,term)).slice(0,12);
 },[search,selectionKey]);
 const data:CreateTournamentInput={
  name,sport,entryType,format:effectiveFormat,athleticsMode,
  eventType:effectiveEvent||null,eventDiscipline:effectiveDiscipline||null,
  groupCount:groupCount,playersPerTeam:Number(teamSize),roundRobinLegs:legs,
  winPoints:win.trim()?Number(win):NaN,drawPoints:draw.trim()?Number(draw):NaN,lossPoints:loss.trim()?Number(loss):NaN
 };
 let validation='';
 try{createTournamentDraft(data);}catch(e){validation=e instanceof Error?e.message:t('Confirma os campos.');}
 const ready=Boolean(sportIsAllowed&&name.trim().length>=2&&!validation&&!DEMO_MODE&&!busy);
 function pickSport(value:string){if(!selectedSports.includes(value))return;setSport(value);setSearch('');setEntryType('INDIVIDUAL');setFormat('LEAGUE');setEvent('');setDiscipline('');}
 function setMode(value:TournamentEntryChoice){setEntryType(value);setFormat('LEAGUE');setEvent('');setDiscipline('');}
 function selectFormat(value:TournamentCreateFormat){setFormat(value);}
 async function save(payload:CreateTournamentInput,version:number,identity:string,communityIdAtConfirmation:number){
  if(!selected||!auth.token||!auth.username||savingRef.current||DEMO_MODE||
    version!==generation.current||identity!==identityRef.current||selected.id!==communityIdAtConfirmation||
    currentCommunityRef.current!==communityIdAtConfirmation)return;
  if(!communityAllowsTournamentSport(selected,payload.sport)){setError(t('A modalidade escolhida não pertence a esta comunidade.'));return;}
  savingRef.current=true;setBusy(true);setError('');
  try{
   const tournament=await createTournament(selected.id,payload,auth.token,auth.username,selected.myRole,communitySports(selected));
   if(version!==generation.current||identity!==identityRef.current)return;
   router.replace({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(selected.id),id:String(tournament.id)}});
  }catch(e){
   if(version===generation.current&&identity===identityRef.current)
    setError((e instanceof Error?e.message:t('Não foi possível criar o torneio.'))+' '+t('Confirma o estado antes de tentar novamente.'));
  }finally{savingRef.current=false;setBusy(false);}
 }
 function confirmCreate(){
  if(!ready||!selected||!sportIsAllowed)return;
  let payload:CreateTournamentInput;
  try{createTournamentDraft(data);payload={...data};}
  catch(e){setError(e instanceof Error?e.message:t('Configuração inválida.'));return;}
  const version=generation.current,identity=identityRef.current,communityIdAtConfirmation=selected.id;
  Alert.alert(t('Criar torneio?'),selected.name+' · '+sport+' · '+t(FORMAT_LABELS[effectiveFormat])+'. '+t('O torneio fica em preparação e não inicia jogos automaticamente.'),[
   {text:t('Voltar'),style:'cancel'},
   {text:t('Criar torneio'),onPress:()=>{void save(payload,version,identity,communityIdAtConfirmation);}}
  ]);
 }
 return <Page><DemoBanner/><Eyebrow>{t('TORNEIOS · ORGANIZAÇÃO')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Criar competição')}</Text>
  <Text style={styles.sub}>{t('Escolhe uma das modalidades da comunidade. O formato e a classificação dependem da prova, nunca de uma tabela genérica de futebol.')}</Text>
  {!auth.token?<Button title={t('Entrar')} onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&auth.token&&communities.length===0?(scopedToCommunity
   ?<Message>{t('Só quem administra esta comunidade pode criar torneios nela.')}</Message>
   :<View style={styles.panel}>
     <Text style={styles.emptyTitle}>{t('Cria primeiro a tua comunidade')}</Text>
     <Text style={styles.emptyText}>{t('Cada torneio pertence a uma comunidade, onde ficam as inscrições, os jogos e a classificação. Demora menos de um minuto.')}</Text>
     <Button title={t('Criar comunidade e torneio')} onPress={()=>router.push({pathname:'/communities/create',params:{next:'tournament'}})}/>
    </View>):null}
  {!loading&&communities.length>0?<><View style={styles.panel}>
   <Text style={styles.heading}>{t('1. Comunidade')}</Text>
   {scopedToCommunity?<Text style={styles.helper}>{t('{a} · estás a criar um torneio nesta comunidade.',{a:selected?.name||t('Comunidade selecionada')})}</Text>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {communities.map(c=><Choice key={c.id} title={c.name} active={selected?.id===c.id} onPress={()=>{
      communityOverridden.current=true;currentCommunityRef.current=c.id;setCommunityId(c.id);setSport('');setSearch('');setEvent('');setDiscipline('');setFormat('LEAGUE');
    }}/>)}
   </ScrollView>}
   <Text style={styles.helper}>{t('A comunidade gere os participantes e define quem pode organizar. Os torneios usam as modalidades já associadas a esta comunidade.')}</Text>
  </View>
  <View style={styles.panel}>
   <Text style={styles.heading}>{t('2. Modalidade')}</Text>
   <TextInput value={search} onChangeText={setSearch} placeholder={t('Pesquisar modalidades desta comunidade')}
    placeholderTextColor={C.muted} accessibilityLabel={t('Pesquisar modalidade')} style={styles.input}/>
   {sport?<Badge text={sportName(sport)}/>:null}
   <View style={styles.chips}>{suggestions.map(value=><Choice key={value} title={value} active={sport===value} onPress={()=>pickSport(value)}/>)}</View>
   {selectedSports.length===0?<Message>{t('Esta comunidade ainda não tem modalidades do catálogo atual. Configura-as primeiro na Jynlo Web.')}</Message>:null}
   {!sport&&selectedSports.length>0?<Text style={styles.helper}>{t('Escolhe uma das {a} modalidades associadas. Podes pesquisar quando a lista é extensa.',{a:selectedSports.length})}</Text>:null}
   {!!sport&&!sportIsAllowed?<Message tone="error">{t('Este desporto deixou de pertencer à comunidade. Escolhe uma modalidade válida.')}</Message>:null}
   {sport?<><Text style={styles.label}>{t('TIPO DE COMPETIÇÃO')}</Text>
    <View style={styles.chips}>
     <Choice title={t('Individual')} active={entryType==='INDIVIDUAL'} onPress={()=>setMode('INDIVIDUAL')}/>
     <Choice title={t('Equipas')} active={entryType==='TEAM'} onPress={()=>setMode('TEAM')}/>
    </View>
   </>:null}
   {sport==='Atletismo'&&entryType==='INDIVIDUAL'?<><Text style={styles.label}>{t('TIPO DE RESULTADO')}</Text>
    <View style={styles.chips}>
     <Choice title={t('Saltos e lançamentos')} active={athleticsMode==='FIELD'} onPress={()=>{setAthleticsMode('FIELD');setEvent('');setDiscipline('');}}/>
     <Choice title={t('Pista / tempo')} active={athleticsMode==='TRACK'} onPress={()=>{setAthleticsMode('TRACK');setEvent('');setDiscipline('');}}/>
    </View></>:null}
   {sport?<Message>{(MODEL_HINTS[profile.model]?t(MODEL_HINTS[profile.model]!):null)||t('Formato específico em preparação.')}</Message>:null}
   {sport&&selected&&sportIsAllowed&&!canCreateTournamentForSport(selected,sport)?<Message>{t('É possível consultar competições existentes, mas o motor de criação deste desporto ainda não está validado na app mobile.')}</Message>:null}
  </View>
  {profile.model!=='UNAVAILABLE'?<>
   <View style={styles.panel}>
    <Text style={styles.heading}>{t('3. Configuração')}</Text>
    <Text style={styles.label}>{t('NOME DA COMPETIÇÃO')}</Text>
    <TextInput value={name} onChangeText={setName} maxLength={120} style={styles.input}
      accessibilityLabel={t('Nome do torneio')} placeholder={t('Ex.: Taça de Primavera')} placeholderTextColor={C.muted}/>
    <Text style={styles.label}>{t('FORMATO')}</Text>
    <View style={styles.chips}>{profile.formats.map(option=><Choice key={option} title={t(FORMAT_LABELS[option])} active={effectiveFormat===option} onPress={()=>selectFormat(option)}/>)}</View>
    {effectiveFormat==='GROUP_KNOCKOUT'?<><Text style={styles.label}>{t('NÚMERO DE GRUPOS')}</Text>
      <View style={styles.chips}>{([2,4] as const).map(n=><Choice key={n} title={t('{n} grupos',{n})} active={groupCount===n} onPress={()=>setGroupCount(n)}/>)}</View></>:null}
    {entryType==='TEAM'&&profile.model!=='RELAY_BEST_TIME'?<><Text style={styles.label}>JOGADORES POR EQUIPA (1–30)</Text>
     <TextInput style={styles.input} keyboardType="number-pad" maxLength={2} value={teamSize} onChangeText={setTeamSize} accessibilityLabel={t('Jogadores por equipa')}/></>:null}
    {profile.model==='RELAY_BEST_TIME'?<Text style={styles.helper}>{t('As equipas de estafeta têm quatro atletas.')}</Text>:null}
    {effectiveFormat==='LEAGUE'&&profile.model==='NUMERIC_TEAM'?<><Text style={styles.label}>{t('VOLTAS DO CAMPEONATO')}</Text>
      <View style={styles.chips}>{([1,2] as const).map(n=><Choice key={n} title={n===2?t('2 voltas'):t('1 volta')} active={legs===n} onPress={()=>setLegs(n)}/>)}</View></>:null}
    {isNumericModel(profile.model)&&profile.model!=='CHESS_HALF_POINTS'?<>
      <Text style={styles.label}>{t('PONTOS POR VITÓRIA / EMPATE / DERROTA')}</Text>
      <View style={styles.numberRow}>
       {([{value:win,set:setWin,label:t('Vitória')},{value:draw,set:setDraw,label:t('Empate')},{value:loss,set:setLoss,label:t('Derrota')}] as const).map(x=><View key={x.label} style={styles.numberField}>
        <Text style={styles.helper}>{x.label}</Text>
        <TextInput style={styles.input} keyboardType="number-pad" maxLength={3} value={x.value}
          onChangeText={x.set} accessibilityLabel={t('Pontos {v}',{v:x.label})}/>
       </View>)}
      </View>
    </>:null}
    {profile.events.length>1?<><Text style={styles.label}>{t('TIPO DE PROVA')}</Text>
      <View style={styles.chips}>{profile.events.map(e=><Choice key={e} title={titleOf(e)} active={effectiveEvent===e}
       onPress={()=>{setEvent(e);setDiscipline('');}}/>)}</View></>:null}
    {profile.events.length===1?<Text style={styles.helper}>{t('Prova: {a}',{a:titleOf(effectiveEvent)})}</Text>:null}
    {disciplines.length>0?<><Text style={styles.label}>{t('DISCIPLINA / DISTÂNCIA')}</Text>
      <View style={styles.chips}>{disciplines.map(d=><Choice key={d} title={titleOf(d)}
        active={effectiveDiscipline===d} onPress={()=>setDiscipline(d)}/>)}</View></>:null}
   </View>
   <View style={styles.panel}>
    <Text style={styles.heading}>{t('4. Confirmar')}</Text>
    <Text style={styles.helper}>{t('O torneio será criado em preparação. Inscrições, equipas e publicação de calendário são passos separados. Nenhum resultado será fabricado.')}</Text>
    {DEMO_MODE?<Message>{t('Modo de demonstração: podes explorar a configuração, mas a criação real está bloqueada.')}</Message>:null}
    {name.trim().length>=2&&validation?<Message tone="error">{validation}</Message>:null}
    <Button title={busy?t('A criar…'):t('Criar torneio')} disabled={!ready} onPress={confirmCreate}/>
   </View>
  </>:null}
  </>:null}
  <Button secondary title={t('Voltar')} onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:30,fontWeight:'900'},
 sub:{color:C.muted,fontSize:13,lineHeight:19},
 emptyTitle:{color:C.white,fontSize:18,fontWeight:'900'},
 emptyText:{color:C.muted,fontSize:14,lineHeight:20},
 panel:{gap:13,padding:17,borderRadius:20,backgroundColor:C.surface,borderColor:C.border,borderWidth:1},
 heading:{color:C.white,fontSize:18,fontWeight:'900'},
 helper:{color:C.muted,fontSize:12,lineHeight:18},
 label:{color:C.mint,fontSize:11,fontWeight:'800',letterSpacing:0.7},
 input:{minHeight:47,paddingHorizontal:13,borderRadius:12,backgroundColor:C.surface2,color:C.white,borderWidth:1,borderColor:C.border,fontSize:14},
 row:{gap:8},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 choice:{borderRadius:13,borderColor:C.border,borderWidth:1,paddingHorizontal:12,paddingVertical:10,backgroundColor:C.surface2},
 activeChoice:{backgroundColor:C.mint,borderColor:C.mint},
 choiceText:{color:C.white,fontSize:12,fontWeight:'800'},activeText:{color:C.background},
 numberRow:{flexDirection:'row',gap:9},
 numberField:{flex:1,gap:5}
});
