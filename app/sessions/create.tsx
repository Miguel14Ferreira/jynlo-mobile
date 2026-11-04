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
  maxParticipants:'10',price:'0',privateGame:false,password:'',meetingPointInstructions:'',externalConfirmedParticipants:'0',minParticipants:'2',registrationOpeningMode:'IMMEDIATE',communityId:null,registrationDay:'',registrationTime:'',recurrence:'NONE',recurrenceOccurrences:'4',recurrenceTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',venueId:null,seasonGame:false,communityRankingsEnabled:false,confirmActivateRankings:false,additionalWeeklySlots:[],communityShareIds:[]});
 const [step,setStep]=useState(0);
 const stepLabels=['Modalidade','Local e data','Participação','Rever'];
 const [sportSearch,setSportSearch]=useState('');
 const [extraDay,setExtraDay]=useState(''),[extraTime,setExtraTime]=useState('');
 function addWeeklySlot(){
  const next=[...(form.additionalWeeklySlots||[]),{day:extraDay.trim(),time:extraTime.trim()}];
  try{
   const input={...form,additionalWeeklySlots:next};
   createSessionPayload(input,SPORTS);
   setForm(input);setExtraDay('');setExtraTime('');setError('');
  }catch(e){setError(e instanceof Error?e.message:'Horário adicional inválido.');}
 }
 function removeWeeklySlot(index:number){
  setForm(prev=>({...prev,additionalWeeklySlots:(prev.additionalWeeklySlots||[]).filter((_,i)=>i!==index)}));
 }
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
 const sharedIds=form.communityShareIds||[];
 const sharedCommunities=communities.filter(c=>sharedIds.includes(c.id));
 const hasCommunity=!!form.communityId||sharedIds.length>0;
 function toggleShared(id:number){
  setForm(prev=>{
   const list=prev.communityShareIds||[];
   const next=list.includes(id)?list.filter(x=>x!==id):list.length<5?[...list,id]:list;
   return {...prev,communityId:null,communityShareIds:next,privateGame:false,password:'',
    seasonGame:false,confirmActivateRankings:false,communityRankingsEnabled:false,
    ...(next.length===0?{registrationOpeningMode:'IMMEDIATE' as const,recurrence:'NONE' as const,additionalWeeklySlots:[]}:null)};
  });
 }
 const suggestions=SPORTS.filter(s=>s.toLocaleLowerCase('pt-PT').includes(sportSearch.trim().toLocaleLowerCase('pt-PT'))).slice(0,12);
 function nextStep(){
  if(busy)return;
  setError('');
  if(step===0){
   if(!form.sport){setError('Escolhe uma modalidade.');return;}
   if(form.communityId&&!selectedCommunity){setError('Seleciona novamente a comunidade.');return;}
   if(sharedCommunities.length!==sharedIds.length){setError('Atualiza a seleção de comunidades.');return;}
  }
  if(step===1&&!form.day.trim()||step===1&&!form.time.trim()||step===1&&!form.city.trim()||step===1&&!form.address.trim()){
   setError('Preenche a data, hora, localidade e morada antes de continuar.');return;
  }
  if(step===2){
   try{createSessionPayload(form,SPORTS);}
   catch(e){setError(e instanceof Error?e.message:'Verifica as informações da sessão.');return;}
  }
  setStep(current=>Math.min(3,current+1));
 }
 function confirm(){
  if(step!==3||locked.current||busy||DEMO_MODE||!auth.token||!auth.username)return;
  let payload:ReturnType<typeof createSessionPayload>;
  try{
   if(form.communityId&&!selectedCommunity)throw Error('Atualiza a lista de comunidades antes de continuar.');
   if(sharedCommunities.length!==sharedIds.length)throw Error('Uma comunidade partilhada já não está disponível. Atualiza a seleção.');
   if(form.seasonGame&&(!selectedCommunity||form.communityRankingsEnabled!==selectedCommunity.rankingsEnabled))
    throw Error('O estado das classificações da comunidade mudou. Seleciona novamente a comunidade.');
   if(form.venueId&&(!venueChosen||venueChosen.id!==form.venueId||!venueSupportsSport(venueChosen,form.sport)))
    throw Error('O recinto selecionado não é válido para a modalidade. Pesquisa novamente.');
   payload=createSessionPayload(form,SPORTS);setError('');
  }
  catch(e){setError(e instanceof Error?e.message:'Verifica os dados da sessão.');return;}
  Alert.alert('Criar sessão desportiva?',payload.sport+' · '+payload.city+' · '+form.day+' '+form.time+
   ' · '+payload.maxParticipants+' participantes · '+(payload.privateGame?'Privada':'Pública')+
   ' · '+(payload.communityShareIds.length?'Partilhada com '+sharedCommunities.map(c=>c.name).join(', ')+' · Apenas membros · ':'')+(payload.seasonCompetitionCommunityId?'Jogo de época'+(payload.confirmActivateRankings?' · ativar classificações':'')+' · ':'')+(payload.venueId&&venueChosen?'Recinto '+venueChosen.name+' · ':'')+(payload.recurrence!=='NONE'?payload.recurrenceOccurrences+' ciclos de repetição ('+(payload.recurrence==='WEEKLY'?'semanal':'quinzenal')+') · '+(payload.additionalWeeklyGameDates.length+1)+' horários/ciclo · ':'')+(payload.communityId?'Comunidade '+(communities.find(c=>c.id===payload.communityId)?.name||'selecionada')+' · ':'')+payload.externalConfirmedParticipants+' confirmados externos · inscrições '+(payload.registrationOpeningMode==='MANUAL'?'manuais':payload.registrationOpeningMode==='SCHEDULED'?'programadas':'imediatas')+'. O organizador fica automaticamente inscrito.',[
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
  <Text style={styles.note}>Configura a sessão em quatro etapas. Os dados só são enviados depois da confirmação final.</Text>
  <View style={styles.steps}>{stepLabels.map((label,index)=><Pressable key={label}
   accessibilityRole="button" disabled={busy||index>step} onPress={()=>{setStep(index);setError('');}}
   style={[styles.stepChip,index===step&&styles.stepActive]}>
   <Text style={[styles.stepText,index===step&&styles.stepTextActive]}>{index+1}. {label}</Text>
  </Pressable>)}</View>
  <Text style={styles.note}>Etapa {step+1} de 4 · {stepLabels[step]}</Text>
  {!auth.token?<Button title="Entrar para criar" onPress={()=>router.push({pathname:'/login',params:{redirect:'/sessions/create'}})}/>:null}
  {DEMO_MODE?<Message>Na demonstração a criação real está desativada. Liga a app à API Jynlo para publicar.</Message>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {step===0?<>
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
   <Button title="Sessão independente" secondary={hasCommunity} disabled={busy}
    onPress={()=>setForm(prev=>({...prev,communityId:null,communityShareIds:[],registrationOpeningMode:'IMMEDIATE',recurrence:'NONE',additionalWeeklySlots:[],seasonGame:false,communityRankingsEnabled:false,confirmActivateRankings:false}))}/>
   {communities.map(c=><Button key={c.id} title={c.name+(c.sport?' · '+c.sport:'')}
    secondary={form.communityId!==c.id} disabled={busy}
    onPress={()=>setForm(prev=>({...prev,communityId:c.id,communityShareIds:[],seasonGame:false,communityRankingsEnabled:c.rankingsEnabled,confirmActivateRankings:false}))}/>)}
   <Text style={styles.label}>Partilhar a mesma sessão entre comunidades (até 5)</Text>
   <Text style={styles.note}>A sessão partilhada é apenas para membros das comunidades escolhidas e não usa palavra-passe. O servidor confirma as permissões de criação em cada comunidade.</Text>
   {communities.map(c=><Button key={'share-'+c.id}
    title={(sharedIds.includes(c.id)?'✓ ':'')+c.name}
    secondary={!sharedIds.includes(c.id)} disabled={busy||(!sharedIds.includes(c.id)&&sharedIds.length>=5)}
    onPress={()=>toggleShared(c.id)}/>)}
   {sharedIds.length>0?<Message>{sharedIds.length} comunidade(s) selecionada(s) para partilha.</Message>:null}
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
  </>:null}
  {step===1?<View style={styles.panel}><Text style={styles.heading}>Quando e onde?</Text>
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
  </View>:null}
  {step===2?<View style={styles.panel}><Text style={styles.heading}>Participação</Text>
   {field('Capacidade total, incluindo organizador','maxParticipants','10','numeric')}
   {field('Preço por participante (€)','price','0','decimal-pad')}
   {field('Mínimo de participantes para realizar','minParticipants','2','numeric')}
   {field('Jogadores já confirmados sem conta (exclui organizador)','externalConfirmedParticipants','0','numeric')}
   <Text style={styles.label}>Repetição</Text>
   <View style={styles.inline}>
    <Button title="Única" secondary={form.recurrence!=='NONE'} disabled={busy} onPress={()=>setForm(prev=>({...prev,recurrence:'NONE',additionalWeeklySlots:[]}))}/>
    <Button title="Semanal" secondary={form.recurrence!=='WEEKLY'} disabled={busy||!hasCommunity} onPress={()=>patch('recurrence','WEEKLY')}/>
    <Button title="Quinzenal" secondary={form.recurrence!=='BIWEEKLY'} disabled={busy||!hasCommunity} onPress={()=>setForm(prev=>({...prev,recurrence:'BIWEEKLY',additionalWeeklySlots:[]}))}/>
   </View>
   {form.recurrence!=='NONE'?<>
    {field('Número de ciclos (2 a 52)','recurrenceOccurrences','4','numeric')}
    <Text style={styles.note}>O primeiro horário é a data indicada acima. O servidor valida os próximos ciclos e garante no máximo 52 sessões.</Text>
    {form.recurrence==='WEEKLY'?<View style={styles.field}>
     <Text style={styles.label}>Mais horários na primeira semana (até seis adicionais)</Text>
     {(form.additionalWeeklySlots||[]).map((slot,index)=><View key={index} style={styles.option}>
      <Text style={styles.optionText}>{index+2}. {slot.day} às {slot.time}</Text>
      <Button secondary title="Remover horário" disabled={busy} onPress={()=>removeWeeklySlot(index)}/>
     </View>)}
     <TextInput style={styles.input} value={extraDay} onChangeText={setExtraDay}
      placeholder="Data adicional (AAAA-MM-DD)" placeholderTextColor={C.muted} editable={!busy}/>
     <TextInput style={styles.input} value={extraTime} onChangeText={setExtraTime}
      placeholder="Hora adicional (HH:mm)" placeholderTextColor={C.muted} editable={!busy}/>
     <Button secondary title="Adicionar horário" disabled={busy||(form.additionalWeeklySlots||[]).length>=6||!extraDay||!extraTime}
      onPress={addWeeklySlot}/>
    </View>:null}
   </>:null}
   <Text style={styles.label}>Abertura das inscrições</Text>
   <View style={styles.inline}>
    <Button secondary={form.registrationOpeningMode!=='IMMEDIATE'} title="Imediata" disabled={busy} onPress={()=>patch('registrationOpeningMode','IMMEDIATE')}/>
    <Button secondary={form.registrationOpeningMode!=='MANUAL'} title="Manual" disabled={busy||!hasCommunity} onPress={()=>patch('registrationOpeningMode','MANUAL')}/>
    <Button secondary={form.registrationOpeningMode!=='SCHEDULED'} title="Programada" disabled={busy||!hasCommunity} onPress={()=>patch('registrationOpeningMode','SCHEDULED')}/>
   </View>
   {form.registrationOpeningMode==='SCHEDULED'?<>
    {field('Data de abertura','registrationDay','AAAA-MM-DD')}
    {field('Hora de abertura','registrationTime','HH:mm (24h)')}
   </>:null}
   {form.registrationOpeningMode==='MANUAL'?<Text style={styles.note}>As inscrições só abrem quando o organizador as ativar na sessão.</Text>:null}
   <Text style={styles.label}>Visibilidade</Text>
   {sharedIds.length>0?<Message>Partilha entre comunidades: visibilidade apenas para membros, sem palavra-passe.</Message>:null}
   <View style={styles.inline}><Button secondary={form.privateGame} title="Pública" disabled={busy} onPress={()=>patch('privateGame',false)}/>
    <Button secondary={!form.privateGame} title="Privada" disabled={busy||sharedIds.length>0} onPress={()=>patch('privateGame',true)}/></View>
   {form.privateGame?field('Palavra-passe da sessão','password','Mínimo de 4 caracteres'):null}
   <Text style={styles.note}>Os jogadores externos já confirmados contam para a ocupação da sessão.</Text>
  </View>
  </View>:null}
  {step===3?<View style={styles.panel}>
   <Text style={styles.heading}>Rever antes de publicar</Text>
   <Text style={styles.note}>Confirma todos os detalhes. A aplicação não publica nada até autorizares a criação.</Text>
   <Text style={styles.summaryTitle}>Modalidade e comunidade</Text>
   <Text style={styles.summaryValue}>{form.sport}</Text>
   <Text style={styles.summaryValue}>{selectedCommunity?'Comunidade: '+selectedCommunity.name:
    sharedCommunities.length?'Partilhada com: '+sharedCommunities.map(c=>c.name).join(', '):
    'Sessão independente'}</Text>
   <Button secondary title="Editar modalidade e comunidades" disabled={busy} onPress={()=>setStep(0)}/>
   <Text style={styles.summaryTitle}>Data e recinto</Text>
   <Text style={styles.summaryValue}>{form.day} às {form.time}</Text>
   <Text style={styles.summaryValue}>{venueChosen?'Recinto: '+venueChosen.name:form.address}</Text>
   <Text style={styles.summaryValue}>{form.city}</Text>
   {form.meetingPointInstructions?<Text style={styles.note}>Ponto de encontro: {form.meetingPointInstructions}</Text>:null}
   <Button secondary title="Editar data e recinto" disabled={busy} onPress={()=>setStep(1)}/>
   <Text style={styles.summaryTitle}>Participação e regras</Text>
   <Text style={styles.summaryValue}>Até {form.maxParticipants} participantes · mínimo {form.minParticipants} · {form.externalConfirmedParticipants} já confirmados externamente</Text>
   <Text style={styles.summaryValue}>Preço: {form.price||'0'} € · {sharedIds.length?'Apenas membros das comunidades':form.privateGame?'Privada com palavra-passe':selectedCommunity?'Apenas membros da comunidade':'Pública'}</Text>
   <Text style={styles.summaryValue}>Inscrições: {form.registrationOpeningMode==='SCHEDULED'?'Abertura '+form.registrationDay+' às '+form.registrationTime:form.registrationOpeningMode==='MANUAL'?'Abertura manual':'Abertura imediata'}</Text>
   <Text style={styles.summaryValue}>{form.recurrence==='NONE'?'Sessão única':
    (form.recurrence==='WEEKLY'?'Semanal':'Quinzenal')+' · '+form.recurrenceOccurrences+' ciclos · '+((form.additionalWeeklySlots?.length||0)+1)+' horário(s) por ciclo'}</Text>
   {form.seasonGame?<Text style={styles.summaryValue}>Jogo de época{form.confirmActivateRankings?' · ativa as classificações com autorização':''}</Text>:null}
   <Button secondary title="Editar participação e inscrições" disabled={busy} onPress={()=>setStep(2)}/>
   <Message>O organizador ocupa uma vaga automaticamente. Depois de confirmares, consulta a sessão criada antes de tentares repetir a operação se houver uma falha de ligação.</Message>
  </View>:null}
  <View style={styles.actions}>
   {step>0?<Button secondary title="Anterior" disabled={busy} onPress={()=>{setStep(current=>Math.max(0,current-1));setError('');}}/>:null}
   {step<3?<Button title="Continuar" disabled={busy} onPress={nextStep}/>:
    <Button title={busy?'A criar…':'Confirmar e criar sessão'} disabled={busy||!auth.token||!auth.username||DEMO_MODE||!form.sport} onPress={confirm}/>}
  </View>
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
