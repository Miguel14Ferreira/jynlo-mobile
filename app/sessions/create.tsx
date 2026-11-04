import React,{useCallback,useRef,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Message,Page} from '../../src/components/UI';
import {DEMO_MODE} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {createSession} from '../../src/lib/session-create-api';
import {createSessionPayload} from '../../src/lib/session-create-core.cjs';
import {SPORTS} from '../../src/lib/sports';
import {C} from '../../src/lib/theme';
import {myCommunities} from '../../src/lib/community-api';
import {venues} from '../../src/lib/parity-api';
import type {CommunityGroup,VenueSummary} from '../../src/lib/types';
import type {CreateSessionForm} from '../../src/lib/session-create-core.cjs';

export default function CreateSessionScreen(){
 const auth=useAuth(),router=useRouter(),locked=useRef(false);
 const [form,setForm]=useState<CreateSessionForm>({sport:'',day:'',time:'',city:'',address:'',
  maxParticipants:'10',price:'0',privateGame:false,password:'',meetingPointInstructions:'',externalConfirmedParticipants:'0',minParticipants:'2',registrationOpeningMode:'IMMEDIATE',communityId:null,registrationDay:'',registrationTime:'',recurrence:'NONE',recurrenceOccurrences:'4',recurrenceTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',venueId:null,seasonGame:false,communityRankingsEnabled:false,confirmActivateRankings:false});
 const [sportSearch,setSportSearch]=useState('');
 const [communities,setCommunities]=useState<CommunityGroup[]>([]);
 const [communityError,setCommunityError]=useState('');
 const [venueQuery,setVenueQuery]=useState('');
 const [venueMatches,setVenueMatches]=useState<VenueSummary[]>([]);
 const [venueChosen,setVenueChosen]=useState<VenueSummary|null>(null);
 const [venueLoading,setVenueLoading]=useState(false);
 const [venueError,setVenueError]=useState('');
 async function findVenues(){
  if(venueLoading||busy)return;
  setVenueLoading(true);setVenueError('');setVenueMatches([]);
  try{
   const results=await venues({name:venueQuery.trim(),city:form.city.trim(),sport:form.sport||undefined,page:0});
   setVenueMatches(results.venues.filter(v=>venueSupportsSport(v,form.sport)).slice(0,20));
  }catch(e){setVenueError(e instanceof Error?e.message:'Não foi possível procurar recintos.');}
  finally{setVenueLoading(false);}
 }
 function useVenue(v:VenueSummary){
  setVenueChosen(v);
  setForm(previous=>({...previous,venueId:v.id,city:v.city,address:v.address}));
  setVenueMatches([]);
 }
 function removeVenue(){
  setVenueChosen(null);setForm(previous=>({...previous,venueId:null}));
 }
 function venueSupportsSport(v:VenueSummary,sport:string){
  return !v.sports?.trim()||!sport||v.sports.split(';').map(item=>item.trim().toLocaleLowerCase('pt-PT')).includes(sport.toLocaleLowerCase('pt-PT'));
 }
 const loadCommunities=useCallback(async()=>{
  if(!auth.token||!auth.username){setCommunities([]);return;}
  try{setCommunities(await myCommunities(auth.token,auth.username));setCommunityError('');}
  catch{setCommunities([]);setCommunityError('Não foi possível carregar as tuas comunidades.');}
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void loadCommunities();},[loadCommunities]));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const patch=(key:keyof CreateSessionForm,value:string|boolean|number|null)=>setForm(prev=>({...prev,[key]:value}));
 const selectedCommunity=communities.find(c=>c.id===form.communityId)||null;
 const suggestions=SPORTS.filter(s=>s.toLocaleLowerCase('pt-PT').includes(sportSearch.trim().toLocaleLowerCase('pt-PT'))).slice(0,12);
 function confirm(){
  if(locked.current||busy||DEMO_MODE||!auth.token||!auth.username)return;
  let payload:ReturnType<typeof createSessionPayload>;
  try{
   if(form.communityId&&!selectedCommunity)throw Error('Atualiza a lista de comunidades antes de continuar.');
   if(form.seasonGame&&(!selectedCommunity||form.communityRankingsEnabled!==selectedCommunity.rankingsEnabled))
    throw Error('O estado das classificações da comunidade mudou. Seleciona novamente a comunidade.');
   if(form.venueId&&(!venueChosen||venueChosen.id!==form.venueId||!venueSupportsSport(venueChosen,form.sport)))
    throw Error('O recinto selecionado não é válido para a modalidade. Pesquisa novamente.');
   payload=createSessionPayload(form,SPORTS);setError('');
  }
  catch(e){setError(e instanceof Error?e.message:'Verifica os dados da sessão.');return;}
  Alert.alert('Criar sessão desportiva?',payload.sport+' · '+payload.city+' · '+form.day+' '+form.time+
   ' · '+payload.maxParticipants+' participantes · '+(payload.privateGame?'Privada':'Pública')+
   ' · '+(payload.seasonCompetitionCommunityId?'Jogo de época'+(payload.confirmActivateRankings?' · ativar classificações':'')+' · ':'')+(payload.venueId&&venueChosen?'Recinto '+venueChosen.name+' · ':'')+(payload.recurrence!=='NONE'?payload.recurrenceOccurrences+' semanas de repetição ('+(payload.recurrence==='WEEKLY'?'semanal':'quinzenal')+') · ':'')+(payload.communityId?'Comunidade '+(communities.find(c=>c.id===payload.communityId)?.name||'selecionada')+' · ':'')+payload.externalConfirmedParticipants+' confirmados externos · inscrições '+(payload.registrationOpeningMode==='MANUAL'?'manuais':payload.registrationOpeningMode==='SCHEDULED'?'programadas':'imediatas')+'. O organizador fica automaticamente inscrito.',[
   {text:'Voltar',style:'cancel'},
   {text:'Criar sessão',onPress:async()=>{
    if(locked.current)return;
    locked.current=true;setBusy(true);setError('');
    try{
     const result=await createSession(form,auth.token!,auth.username!);
     router.replace({pathname:'/sessions/[id]',params:{id:String(result.id)}});
    }catch(e){setError((e instanceof Error?e.message:'Não foi possível criar a sessão.')+
      ' Verifica as tuas sessões antes de tentares novamente, para evitar duplicados.');}
    finally{locked.current=false;setBusy(false);}
   }}
  ]);
 }
 const field=(label:string,key:keyof CreateSessionForm,placeholder:string,keyboardType:'default'|'numeric'|'decimal-pad'='default')=>
  <View style={styles.field}><Text style={styles.label}>{label}</Text>
   <TextInput style={styles.input} value={String(form[key])} onChangeText={v=>patch(key,v)}
    placeholder={placeholder} placeholderTextColor={C.muted} keyboardType={keyboardType}
    editable={!busy} accessibilityLabel={label}/></View>;
 return <Page><DemoBanner/><Eyebrow>JYNLO · ORGANIZAR</Eyebrow>
  <Text style={styles.title}>Criar uma sessão</Text>
  <Text style={styles.note}>Encontra jogadores para praticar a tua modalidade. Preenche os dados e confirma antes de publicar.</Text>
  {!auth.token?<Button title="Entrar para criar" onPress={()=>router.push({pathname:'/login',params:{redirect:'/sessions/create'}})}/>:null}
  {DEMO_MODE?<Message>Na demonstração a criação real está desativada. Liga a app à API Jynlo para publicar.</Message>:null}
  {error?<Message tone="error">{error}</Message>:null}
  <View style={styles.panel}><Text style={styles.heading}>Modalidade</Text>
   {form.sport?<Badge text={form.sport}/>:null}
   <TextInput style={styles.input} value={sportSearch} onChangeText={setSportSearch}
    placeholder="Pesquisar modalidade (ex.: Padel)" placeholderTextColor={C.muted} editable={!busy}/>
   {suggestions.map(s=><Pressable key={s} accessibilityRole="button" onPress={()=>{setForm(prev=>({...prev,sport:s,venueId:prev.sport===s?prev.venueId:null}));if(form.sport!==s)setVenueChosen(null);setSportSearch(s);}} style={[styles.option,form.sport===s&&styles.chosen]}>
    <Text style={styles.optionText}>{s}{form.sport===s?' ✓':''}</Text>
   </Pressable>)}
  </View>
  <View style={styles.panel}><Text style={styles.heading}>Comunidade (opcional)</Text>
   {communityError?<Message tone="error">{communityError}</Message>:null}
   <Text style={styles.note}>Uma sessão associada a uma comunidade é apenas para membros. O backend verifica as tuas permissões.</Text>
   <Button title="Sessão independente" secondary={form.communityId!==null} disabled={busy}
    onPress={()=>setForm(prev=>({...prev,communityId:null,registrationOpeningMode:'IMMEDIATE',recurrence:'NONE',seasonGame:false,communityRankingsEnabled:false,confirmActivateRankings:false}))}/>
   {communities.map(c=><Button key={c.id} title={c.name+(c.sport?' · '+c.sport:'')}
    secondary={form.communityId!==c.id} disabled={busy}
    onPress={()=>setForm(prev=>({...prev,communityId:c.id,seasonGame:false,communityRankingsEnabled:c.rankingsEnabled,confirmActivateRankings:false}))}/>)}
  </View>
  {selectedCommunity?<View style={styles.panel}>
   <Text style={styles.heading}>Jogo de época</Text>
   <Text style={styles.note}>Associa esta sessão à época ativa da comunidade. Se não existir, o servidor cria a época por defeito. Os resultados e as classificações dependem da modalidade.</Text>
   <View style={styles.inline}>
    <Button title="Não contar para a época" secondary={form.seasonGame===true} disabled={busy}
     onPress={()=>setForm(prev=>({...prev,seasonGame:false,confirmActivateRankings:false}))}/>
    <Button title="Contar para a época" secondary={form.seasonGame!==true} disabled={busy}
     onPress={()=>setForm(prev=>({...prev,seasonGame:true,confirmActivateRankings:false}))}/>
   </View>
   {form.seasonGame&&!selectedCommunity.rankingsEnabled?<View style={styles.option}>
    <Message>As classificações ainda não estão ativas nesta comunidade. A criação de um jogo de época poderá ativá-las e criar uma época por defeito.</Message>
    <Button title={form.confirmActivateRankings?'Ativação autorizada ✓':'Autorizar ativação das classificações'}
     secondary={form.confirmActivateRankings!==true} disabled={busy}
     onPress={()=>patch('confirmActivateRankings',!form.confirmActivateRankings)}/>
   </View>:null}
   {form.seasonGame&&selectedCommunity.rankingsEnabled?<Message>As classificações desta comunidade já estão ativas.</Message>:null}
  </View>:null}
  <View style={styles.panel}><Text style={styles.heading}>Quando e onde?</Text>
   {field('Data','day','AAAA-MM-DD')}{field('Hora local','time','HH:mm (24h)')}
   {venueChosen?<View style={styles.option}>
    <Text style={styles.optionText}>Recinto selecionado: {venueChosen.name}</Text>
    <Text style={styles.note}>{venueChosen.address} · {venueChosen.city}</Text>
    <Button title="Retirar recinto" secondary disabled={busy} onPress={removeVenue}/>
   </View>:null}
   <Text style={styles.label}>Procurar recinto Jynlo (opcional)</Text>
   <TextInput style={styles.input} value={venueQuery} onChangeText={setVenueQuery}
    placeholder="Nome do recinto" placeholderTextColor={C.muted} editable={!busy&&!venueLoading}/>
   <Button secondary title={venueLoading?'A pesquisar…':'Procurar recintos'} disabled={busy||venueLoading||!form.sport} onPress={()=>{void findVenues();}}/>
   {venueError?<Message tone="error">{venueError}</Message>:null}
   {venueMatches.map(v=><Pressable key={v.id} accessibilityRole="button" style={styles.option} disabled={busy}
    onPress={()=>useVenue(v)}>
    <Text style={styles.optionText}>{v.name}</Text>
    <Text style={styles.note}>{v.city} · {v.address}</Text>
   </Pressable>)}
   {venueChosen?<Text style={styles.note}>A morada e a localidade são fornecidas pelo recinto selecionado. Retira o recinto para introduzir uma morada própria.</Text>:<>
    {field('Localidade','city','Ex.: Lisboa')}
    {field('Morada','address','Rua e número, recinto ou ponto de referência')}
   </>}
   {field('Ponto de encontro (opcional)','meetingPointInstructions','Ex.: Entrada principal')}
  </View>
  <View style={styles.panel}><Text style={styles.heading}>Participação</Text>
   {field('Capacidade total, incluindo organizador','maxParticipants','10','numeric')}
   {field('Preço por participante (€)','price','0','decimal-pad')}
   {field('Mínimo de participantes para realizar','minParticipants','2','numeric')}
   {field('Jogadores já confirmados sem conta (exclui organizador)','externalConfirmedParticipants','0','numeric')}
   <Text style={styles.label}>Repetição</Text>
   <View style={styles.inline}>
    <Button title="Única" secondary={form.recurrence!=='NONE'} disabled={busy} onPress={()=>patch('recurrence','NONE')}/>
    <Button title="Semanal" secondary={form.recurrence!=='WEEKLY'} disabled={busy||!form.communityId} onPress={()=>patch('recurrence','WEEKLY')}/>
    <Button title="Quinzenal" secondary={form.recurrence!=='BIWEEKLY'} disabled={busy||!form.communityId} onPress={()=>patch('recurrence','BIWEEKLY')}/>
   </View>
   {form.recurrence!=='NONE'?<>
    {field('Número de ciclos (2 a 52)','recurrenceOccurrences','4','numeric')}
    <Text style={styles.note}>Uma sessão por ciclo, à mesma hora local. O servidor valida todas as datas antes de criar a série (máximo 52 sessões).</Text>
   </>:null}
   <Text style={styles.label}>Abertura das inscrições</Text>
   <View style={styles.inline}>
    <Button secondary={form.registrationOpeningMode!=='IMMEDIATE'} title="Imediata" disabled={busy} onPress={()=>patch('registrationOpeningMode','IMMEDIATE')}/>
    <Button secondary={form.registrationOpeningMode!=='MANUAL'} title="Manual" disabled={busy||!form.communityId} onPress={()=>patch('registrationOpeningMode','MANUAL')}/>
    <Button secondary={form.registrationOpeningMode!=='SCHEDULED'} title="Programada" disabled={busy||!form.communityId} onPress={()=>patch('registrationOpeningMode','SCHEDULED')}/>
   </View>
   {form.registrationOpeningMode==='SCHEDULED'?<>
    {field('Data de abertura','registrationDay','AAAA-MM-DD')}
    {field('Hora de abertura','registrationTime','HH:mm (24h)')}
   </>:null}
   {form.registrationOpeningMode==='MANUAL'?<Text style={styles.note}>As inscrições só abrem quando o organizador as ativar na sessão.</Text>:null}
   <Text style={styles.label}>Visibilidade</Text>
   <View style={styles.inline}><Button secondary={form.privateGame} title="Pública" disabled={busy} onPress={()=>patch('privateGame',false)}/>
    <Button secondary={!form.privateGame} title="Privada" disabled={busy} onPress={()=>patch('privateGame',true)}/></View>
   {form.privateGame?field('Palavra-passe da sessão','password','Mínimo de 4 caracteres'):null}
   <Text style={styles.note}>Múltiplas sessões por semana e partilha em várias comunidades terão fluxos específicos. Os jogadores externos já confirmados contam para a ocupação da sessão.</Text>
  </View>
  <Button title={busy?'A criar…':'Confirmar e criar sessão'} disabled={busy||!auth.token||!auth.username||DEMO_MODE||!form.sport} onPress={confirm}/>
  <Button secondary title="Voltar às minhas sessões" onPress={()=>router.push('/my-sessions')}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:28,fontWeight:'900'},note:{color:C.muted,fontSize:12,lineHeight:19},
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16,gap:11},
 heading:{color:C.white,fontWeight:'900',fontSize:19},
 field:{gap:6},label:{fontSize:13,color:C.muted,fontWeight:'700'},
 input:{borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface2,color:C.white,padding:13,minHeight:48},
 inline:{flexDirection:'row',gap:10,flexWrap:'wrap'},
 option:{padding:10,borderWidth:1,borderColor:C.border,borderRadius:10},
 chosen:{borderColor:C.mint,backgroundColor:C.surface2},optionText:{color:C.white,fontSize:14,fontWeight:'700'}
});
