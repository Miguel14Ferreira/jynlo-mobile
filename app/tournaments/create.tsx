import React,{useCallback,useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE} from '../../src/lib/api';
import {myCommunities} from '../../src/lib/community-api';
import {createTournament} from '../../src/lib/tournament-create-api';
import {creationProfile,disciplineChoices,isNumericModel,createTournamentDraft} from '../../src/lib/tournament-create-core.cjs';
import type {TournamentCreateFormat,TournamentEntryChoice,CreateTournamentInput} from '../../src/lib/tournament-create-core.cjs';
import {SPORTS} from '../../src/lib/sports';
import {C} from '../../src/lib/theme';
import type {CommunityGroup} from '../../src/lib/types';

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
 CHESS_HALF_POINTS:'Vitória vale 1, empate vale ½ e derrota 0. Regras internas da API: 2/1/0.',
 RACE_POINTS:'Classificação pelos resultados das corridas associadas, não por golos nem vitórias em jogos.',
 SWIM_BEST_TIME:'Comparação pelo melhor tempo da mesma prova de piscina de 50 m.',
 CANOE_BEST_TIME:'Comparação pelo melhor tempo de uma distância K1.',
 ROWING_BEST_TIME:'Comparação pelo melhor tempo de uma prova de skiff 1x.',
 TRACK_BEST_TIME:'Comparação pelo melhor tempo na mesma disciplina de pista.',
 FIELD_BEST_MARK:'Comparação pela melhor marca da mesma prova de salto ou lançamento.',
 RELAY_BEST_TIME:'Estafetas por tempo, com equipas de quatro atletas.',
 UNAVAILABLE:'Esta modalidade existe no catálogo, mas o torneio ainda não tem um modelo de resultados validado.'
};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const titleOf=(code:string)=>EVENT_LABELS[code]||code.replace(/_/g,' ').replace(/(\d+)X(\d+)/g,'$1×$2');
function Choice({title,active,onPress}:{title:string;active:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityState={{selected:active}}
   style={[styles.choice,active&&styles.activeChoice]} onPress={onPress}>
   <Text style={[styles.choiceText,active&&styles.activeText]}>{title}</Text>
 </Pressable>;
}
export default function CreateTournamentScreen(){
 const router=useRouter(),auth=useAuth();
 const params=useLocalSearchParams<{communityId?:string}>();
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
 const load=useCallback(async()=>{
  if(!auth.token||!auth.username){setCommunities([]);setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const all=await myCommunities(auth.token,auth.username);
   const allowed=all.filter(c=>c.myRole==='OWNER'||c.myRole==='ADMIN');
   setCommunities(allowed);
   setCommunityId(current=>{
    const preferred=Number(params.communityId);
    return allowed.some(c=>c.id===preferred)?preferred:allowed.some(c=>c.id===current)?current:(allowed[0]?.id??null);
   });
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar as comunidades.');}
  finally{setLoading(false);}
 },[auth.token,auth.username,params.communityId]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const selected=communities.find(c=>c.id===communityId);
 const profile=creationProfile(sport,entryType,athleticsMode);
 const effectiveFormat=profile.formats.includes(format)?format:(profile.formats[0]||'LEAGUE');
 const effectiveEvent=profile.events.length===1?profile.events[0]:(profile.events.includes(event)?event:'');
 const disciplines=disciplineChoices(effectiveEvent);
 const effectiveDiscipline=disciplines.includes(discipline)?discipline:'';
 const suggestions=useMemo(()=>{
  const term=normalized(search.trim());
  if(term)return SPORTS.filter(s=>normalized(s).includes(term)).slice(0,10);
  const local=[...(selected?.sports||[]),selected?.sport||'',...SPORTS.slice(0,0)];
  return Array.from(new Set(local.filter(s=>SPORTS.includes(s)))).slice(0,12);
 },[search,selected]);
 const data:CreateTournamentInput={
  name,sport,entryType,format:effectiveFormat,athleticsMode,
  eventType:effectiveEvent||null,eventDiscipline:effectiveDiscipline||null,
  groupCount:groupCount,playersPerTeam:Number(teamSize),roundRobinLegs:legs,
  winPoints:win.trim()?Number(win):NaN,drawPoints:draw.trim()?Number(draw):NaN,lossPoints:loss.trim()?Number(loss):NaN
 };
 let validation='';
 try{createTournamentDraft(data);}catch(e){validation=e instanceof Error?e.message:'Confirma os campos.';}
 const ready=Boolean(selected&&name.trim().length>=2&&!validation&&!DEMO_MODE&&!busy);
 function pickSport(value:string){setSport(value);setSearch('');setEntryType('INDIVIDUAL');setFormat('LEAGUE');setEvent('');setDiscipline('');}
 function setMode(value:TournamentEntryChoice){setEntryType(value);setFormat('LEAGUE');setEvent('');setDiscipline('');}
 function selectFormat(value:TournamentCreateFormat){setFormat(value);}
 async function save(payload:CreateTournamentInput){
  if(!selected||!auth.token||!auth.username||busy||DEMO_MODE)return;
  setBusy(true);setError('');
  try{
   const tournament=await createTournament(selected.id,payload,auth.token,auth.username,selected.myRole);
   router.replace({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(selected.id),id:String(tournament.id)}});
  }catch(e){setError((e instanceof Error?e.message:'Não foi possível criar o torneio.')+' Confirma o estado antes de tentar novamente.');}
  finally{setBusy(false);}
 }
 function confirmCreate(){
  if(!ready||!selected)return;
  let payload:CreateTournamentInput;
  try{createTournamentDraft(data);payload={...data};}
  catch(e){setError(e instanceof Error?e.message:'Configuração inválida.');return;}
  Alert.alert('Criar torneio?',selected.name+' · '+sport+' · '+FORMAT_LABELS[effectiveFormat]+'. O torneio fica em preparação e não inicia jogos automaticamente.',[
   {text:'Voltar',style:'cancel'},
   {text:'Criar torneio',onPress:()=>{void save(payload);}}
  ]);
 }
 return <Page><DemoBanner/><Eyebrow>TORNEIOS · ORGANIZAÇÃO</Eyebrow>
  <Text style={styles.title}>Criar competição</Text>
  <Text style={styles.sub}>Escolhe primeiro a modalidade. Os formatos só aparecem quando a API da Jynlo já tem regras compatíveis.</Text>
  {!auth.token?<Button title="Entrar" onPress={()=>router.push('/login')}/>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {!loading&&auth.token&&communities.length===0?<Message>Precisas de ser proprietário ou administrador de uma comunidade para criar torneios.</Message>:null}
  {!loading&&communities.length>0?<><View style={styles.panel}>
   <Text style={styles.heading}>1. Comunidade</Text>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {communities.map(c=><Choice key={c.id} title={c.name} active={selected?.id===c.id} onPress={()=>{
      setCommunityId(c.id);setSport('');setSearch('');setEvent('');setDiscipline('');setFormat('LEAGUE');
    }}/>)}
   </ScrollView>
   <Text style={styles.helper}>A comunidade gere os participantes e define quem pode organizar.</Text>
  </View>
  <View style={styles.panel}>
   <Text style={styles.heading}>2. Modalidade</Text>
   <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar nas 121 modalidades"
    placeholderTextColor={C.muted} accessibilityLabel="Pesquisar modalidade" style={styles.input}/>
   {sport?<Badge text={sport}/>:null}
   <View style={styles.chips}>{suggestions.map(value=><Choice key={value} title={value} active={sport===value} onPress={()=>pickSport(value)}/>)}</View>
   {!sport?<Text style={styles.helper}>Seleciona uma das modalidades sugeridas ou utiliza a pesquisa.</Text>:null}
   {sport?<><Text style={styles.label}>TIPO DE COMPETIÇÃO</Text>
    <View style={styles.chips}>
     <Choice title="Individual" active={entryType==='INDIVIDUAL'} onPress={()=>setMode('INDIVIDUAL')}/>
     <Choice title="Equipas" active={entryType==='TEAM'} onPress={()=>setMode('TEAM')}/>
    </View>
   </>:null}
   {sport==='Atletismo'&&entryType==='INDIVIDUAL'?<><Text style={styles.label}>TIPO DE RESULTADO</Text>
    <View style={styles.chips}>
     <Choice title="Saltos e lançamentos" active={athleticsMode==='FIELD'} onPress={()=>{setAthleticsMode('FIELD');setEvent('');setDiscipline('');}}/>
     <Choice title="Pista / tempo" active={athleticsMode==='TRACK'} onPress={()=>{setAthleticsMode('TRACK');setEvent('');setDiscipline('');}}/>
    </View></>:null}
   {sport?<Message>{MODEL_HINTS[profile.model]||'Formato específico em preparação.'}</Message>:null}
  </View>
  {profile.model!=='UNAVAILABLE'?<>
   <View style={styles.panel}>
    <Text style={styles.heading}>3. Configuração</Text>
    <Text style={styles.label}>NOME DA COMPETIÇÃO</Text>
    <TextInput value={name} onChangeText={setName} maxLength={120} style={styles.input}
      accessibilityLabel="Nome do torneio" placeholder="Ex.: Taça de Primavera" placeholderTextColor={C.muted}/>
    <Text style={styles.label}>FORMATO</Text>
    <View style={styles.chips}>{profile.formats.map(option=><Choice key={option} title={FORMAT_LABELS[option]} active={effectiveFormat===option} onPress={()=>selectFormat(option)}/>)}</View>
    {effectiveFormat==='GROUP_KNOCKOUT'?<><Text style={styles.label}>NÚMERO DE GRUPOS</Text>
      <View style={styles.chips}>{([2,4] as const).map(n=><Choice key={n} title={String(n)+' grupos'} active={groupCount===n} onPress={()=>setGroupCount(n)}/>)}</View></>:null}
    {entryType==='TEAM'&&profile.model!=='RELAY_BEST_TIME'?<><Text style={styles.label}>JOGADORES POR EQUIPA (1–30)</Text>
     <TextInput style={styles.input} keyboardType="number-pad" maxLength={2} value={teamSize} onChangeText={setTeamSize} accessibilityLabel="Jogadores por equipa"/></>:null}
    {profile.model==='RELAY_BEST_TIME'?<Text style={styles.helper}>As equipas de estafeta têm quatro atletas.</Text>:null}
    {effectiveFormat==='LEAGUE'&&profile.model==='NUMERIC_TEAM'?<><Text style={styles.label}>VOLTAS DO CAMPEONATO</Text>
      <View style={styles.chips}>{([1,2] as const).map(n=><Choice key={n} title={String(n)+' volta'+(n===2?'s':'')} active={legs===n} onPress={()=>setLegs(n)}/>)}</View></>:null}
    {isNumericModel(profile.model)&&profile.model!=='CHESS_HALF_POINTS'?<>
      <Text style={styles.label}>PONTOS POR VITÓRIA / EMPATE / DERROTA</Text>
      <View style={styles.numberRow}>
       {([{value:win,set:setWin,label:'Vitória'},{value:draw,set:setDraw,label:'Empate'},{value:loss,set:setLoss,label:'Derrota'}] as const).map(x=><View key={x.label} style={styles.numberField}>
        <Text style={styles.helper}>{x.label}</Text>
        <TextInput style={styles.input} keyboardType="number-pad" maxLength={3} value={x.value}
          onChangeText={x.set} accessibilityLabel={'Pontos '+x.label}/>
       </View>)}
      </View>
    </>:null}
    {profile.events.length>1?<><Text style={styles.label}>TIPO DE PROVA</Text>
      <View style={styles.chips}>{profile.events.map(e=><Choice key={e} title={titleOf(e)} active={effectiveEvent===e}
       onPress={()=>{setEvent(e);setDiscipline('');}}/>)}</View></>:null}
    {profile.events.length===1?<Text style={styles.helper}>Prova: {titleOf(effectiveEvent)}</Text>:null}
    {disciplines.length>0?<><Text style={styles.label}>DISCIPLINA / DISTÂNCIA</Text>
      <View style={styles.chips}>{disciplines.map(d=><Choice key={d} title={titleOf(d)}
        active={effectiveDiscipline===d} onPress={()=>setDiscipline(d)}/>)}</View></>:null}
   </View>
   <View style={styles.panel}>
    <Text style={styles.heading}>4. Confirmar</Text>
    <Text style={styles.helper}>O torneio será criado em preparação. Inscrições, equipas e publicação de calendário são passos separados. Nenhum resultado será fabricado.</Text>
    {DEMO_MODE?<Message>Modo de demonstração: podes explorar a configuração, mas a criação real está bloqueada.</Message>:null}
    {name.trim().length>=2&&validation?<Message tone="error">{validation}</Message>:null}
    <Button title={busy?'A criar…':'Criar torneio'} disabled={!ready} onPress={confirmCreate}/>
   </View>
  </>:null}
  </>:null}
  <Button secondary title="Voltar" onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:30,fontWeight:'900'},
 sub:{color:C.muted,fontSize:13,lineHeight:19},
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
