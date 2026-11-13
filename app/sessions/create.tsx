import React,{useCallback,useRef,useState} from 'react';
import {Alert,Linking,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Badge,Button,DemoBanner,Eyebrow,Message,Page} from '../../src/components/UI';
import {DEMO_MODE} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {createSessionWithPayload} from '../../src/lib/session-create-api';
import {createSessionPayload,parseSessionDate,validateWeeklySlots,changeCommunityMode,formatLocalDateInput,formatLocalTimeInput,describeSessionConfirmation,chooseVenueLocation,detachVenueLocation} from '../../src/lib/session-create-core.cjs';
import {SPORTS} from '../../src/lib/sports';
import {C} from '../../src/lib/theme';
import {myCommunities} from '../../src/lib/community-api';
import {communitySports} from '../../src/lib/community-core.cjs';
import {availableSessionSports} from '../../src/lib/session-community-sports.cjs';
import {venues} from '../../src/lib/parity-api';
import {getCurrentSessionCoordinates,resolveSessionMapLink,describeSessionCoordinates,googleMapsPreview} from '../../src/lib/session-location-api';
import type {SessionCoordinates} from '../../src/lib/session-location-api';
import type {CommunityGroup,VenueSummary} from '../../src/lib/types';
import type {CreateSessionForm} from '../../src/lib/session-create-core.cjs';

function emptySessionForm():CreateSessionForm{
 return {sport:'',day:'',time:'',city:'',address:'',latitude:null,longitude:null,locationConfirmed:false,
  maxParticipants:'10',price:'0',privateGame:false,password:'',meetingPointInstructions:'',externalConfirmedParticipants:'0',minParticipants:'2',registrationOpeningMode:'IMMEDIATE',communityId:null,registrationDay:'',registrationTime:'',recurrence:'NONE',recurrenceOccurrences:'4',recurrenceTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',venueId:null,seasonGame:false,communityRankingsEnabled:false,confirmActivateRankings:false,additionalWeeklySlots:[],communityShareIds:[]};
}

type CalendarProps={value:string;onSelect:(value:string)=>void;disabled?:boolean};
function SessionDateCalendar({value,onSelect,disabled=false}:CalendarProps){
 const chosen=/^\\d{4}-\\d{2}-\\d{2}$/.test(value)?value:'';
 const [month,setMonth]=useState(()=>{
  const initial=chosen?new Date(value+'T12:00:00'):new Date();
  return new Date(initial.getFullYear(),initial.getMonth(),1);
 });
 const year=month.getFullYear(),index=month.getMonth();
 const firstWeekday=(new Date(year,index,1).getDay()+6)%7;
 const count=new Date(year,index+1,0).getDate();
 const cells=Array.from({length:Math.ceil((firstWeekday+count)/7)*7},(_,i)=>{
  const day=i-firstWeekday+1;
  return day>=1&&day<=count?day:null;
 });
 const today=new Date();
 const todayKey=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 const label=month.toLocaleDateString('pt-PT',{month:'long',year:'numeric'});
 return <View style={{borderWidth:1,borderColor:C.muted,borderRadius:14,padding:12,gap:10,marginVertical:8}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={disabled}
    onPress={()=>setMonth(new Date(year,index-1,1))} style={{padding:10}}>
    <Text style={{color:C.white,fontSize:19}}>‹</Text>
   </Pressable>
   <Text style={{color:C.white,fontWeight:'700',textTransform:'capitalize'}}>{label}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Mês seguinte" disabled={disabled}
    onPress={()=>setMonth(new Date(year,index+1,1))} style={{padding:10}}>
    <Text style={{color:C.white,fontSize:19}}>›</Text>
   </Pressable>
  </View>
  <View style={{flexDirection:'row'}}>
   {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day=><Text key={day} style={{width:'14.285%',textAlign:'center',color:C.muted,fontSize:12}}>{day}</Text>)}
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap'}}>
   {cells.map((day,i)=>{
    const key=day?[year,String(index+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-'):'';
    const selected=key===chosen;
    const past=Boolean(key&&key<todayKey);
    return <View key={i} style={{width:'14.285%',padding:2}}>
     {day?<Pressable accessibilityRole="button" accessibilityLabel={key}
       accessibilityState={{selected,disabled:disabled||past}}
       disabled={disabled||past} onPress={()=>onSelect(key)}
       style={{height:38,alignItems:'center',justifyContent:'center',borderRadius:9,
        backgroundColor:selected?C.green:'transparent',opacity:past?0.35:1}}>
       <Text style={{color:selected?'#fff':C.white,fontWeight:selected?'700':'400'}}>{day}</Text>
      </Pressable>:<View style={{height:38}}/>}
    </View>;
   })}
  </View>
  <Text style={{color:C.muted,fontSize:12}}>Escolhe uma data de hoje em diante. A hora é definida abaixo.</Text>
 </View>;
}

export default function CreateSessionScreen(){
 const auth=useAuth(),router=useRouter(),locked=useRef(false);
 const params=useLocalSearchParams<{communityId?:string;sport?:string}>();
 const requestedCommunityId=typeof params.communityId==='string'&&/^[1-9][0-9]*$/.test(params.communityId)?Number(params.communityId):null;
 const preselectionApplied=useRef(false);
 const preselectionOverridden=useRef(false);
 const communityLoadVersion=useRef(0),communityLoadIdentity=useRef('');
 const createOperation=useRef(0);
 // Persist a confirmed creation across refocus so a navigation failure cannot duplicate it.
 const confirmedCreation=useRef<{id:number;identity:string}|null>(null);
 const [createdId,setCreatedId]=useState<number|null>(null);
 const [form,setForm]=useState<CreateSessionForm>(emptySessionForm);
 const [step,setStep]=useState(0);
 const [showDateCalendar,setShowDateCalendar]=useState(false);
 const [showRegistrationCalendar,setShowRegistrationCalendar]=useState(false);
 const [showExtraCalendar,setShowExtraCalendar]=useState(false);
 // Selection controls whether an existing group of players must be counted explicitly.
 const [hasExistingPlayers,setHasExistingPlayers]=useState(false);
 const stepLabels=['Modalidade','Local e data','Participação','Rever'];
 const [sportSearch,setSportSearch]=useState('');
 const [showSportResults,setShowSportResults]=useState(false);
 const [communitySearch,setCommunitySearch]=useState('');
 const [communityMode,setCommunityMode]=useState<'INDEPENDENT'|'SINGLE'|'SHARED'>('INDEPENDENT');
 const [extraDay,setExtraDay]=useState(''),[extraTime,setExtraTime]=useState('');
 function addWeeklySlot(){
  const next=[...(form.additionalWeeklySlots||[]),{day:extraDay.trim(),time:extraTime.trim()}];
  try{
   const input={...form,additionalWeeklySlots:next};
   const count=Number(form.recurrenceOccurrences||'0');
   if(!Number.isInteger(count)||count<2||count>52)throw Error('Escolhe entre 2 e 52 ciclos de repetição.');
   validateWeeklySlots(form.day,form.time,next,form.recurrence||'NONE',count);
   setForm(input);setExtraDay('');setExtraTime('');setError('');
  }catch(e){setError(e instanceof Error?e.message:'Horário adicional inválido.');}
 }
 function removeWeeklySlot(index:number){
  setForm(prev=>({...prev,additionalWeeklySlots:(prev.additionalWeeklySlots||[]).filter((_,i)=>i!==index)}));
 }
 const [communities,setCommunities]=useState<CommunityGroup[]>([]);
 const [communityError,setCommunityError]=useState('');
 const [venueQuery,setVenueQuery]=useState('');
 const [venueCityQuery,setVenueCityQuery]=useState('');
 const [venueMatches,setVenueMatches]=useState<VenueSummary[]>([]);
 const [venueChosen,setVenueChosen]=useState<VenueSummary|null>(null);
 const [venueLoading,setVenueLoading]=useState(false);
 const [venuePage,setVenuePage]=useState(0);
 const [venueHasMore,setVenueHasMore]=useState(false);
 const [venueSearched,setVenueSearched]=useState(false);
 const venueSearchVersion=useRef(0);
 const [venueError,setVenueError]=useState('');
 const [locationMode,setLocationMode]=useState<'saved'|'link'|'gps'>('saved');
 const [mapsLink,setMapsLink]=useState('');
 const [locationLoading,setLocationLoading]=useState(false);
 const [locationMessage,setLocationMessage]=useState('');
 const locationRequest=useRef(0);
 const [locationAccuracy,setLocationAccuracy]=useState<number|null>(null);
 function clearMappedLocation(){
  locationRequest.current++;
  setLocationAccuracy(null);setLocationMessage('');
  setForm(prev=>({...prev,latitude:null,longitude:null,locationConfirmed:false}));
 }
 function selectLocationMode(mode:'saved'|'link'|'gps'){
  if(busy||locationLoading)return;
  setLocationMode(mode);setMapsLink('');setVenueChosen(null);clearVenueSearch();
  locationRequest.current++;setLocationAccuracy(null);setLocationMessage('');
  setForm(prev=>({...prev,venueId:null,latitude:null,longitude:null,locationConfirmed:false}));
 }
 async function useMappedPoint(point:SessionCoordinates,requestId:number){
  // A reverse-geocoding outage must never silently discard the real GPS pin.
  let address:{city:string;address:string}|null=null;
  try{address=await describeSessionCoordinates(point);}catch{}
  if(locationRequest.current!==requestId)return;
  setVenueChosen(null);clearVenueSearch();
  setLocationAccuracy(point.accuracyMeters);
  setForm(prev=>({...prev,venueId:null,
    city:address?.city||prev.city,address:address?.address||prev.address,
    latitude:point.latitude,longitude:point.longitude,locationConfirmed:false}));
  setLocationMessage(address?
    'Morada aproximada. Confirma o ponto no mapa antes de continuar.':
    'O ponto GPS foi obtido, mas não foi possível identificar a morada. Preenche a localidade e a morada manualmente; o ponto mantém-se inalterado.');
 }
 async function useCurrentLocation(){
  if(busy||locationLoading)return;
  const requestId=++locationRequest.current;
  setLocationLoading(true);setLocationMessage('');
  try{await useMappedPoint(await getCurrentSessionCoordinates(),requestId);}
  catch(e){if(locationRequest.current===requestId)setLocationMessage(e instanceof Error?e.message:'Não foi possível obter a localização.');}
  finally{if(locationRequest.current===requestId)setLocationLoading(false);}
 }
 async function useMapsLink(){
  if(busy||locationLoading)return;
  const requestId=++locationRequest.current;
  setLocationLoading(true);setLocationMessage('');
  try{await useMappedPoint(await resolveSessionMapLink(mapsLink),requestId);}
  catch(e){if(locationRequest.current===requestId)setLocationMessage(e instanceof Error?e.message:'Não foi possível resolver a ligação.');}
  finally{if(locationRequest.current===requestId)setLocationLoading(false);}
 }
 function previewMappedPoint(){
  if(form.latitude==null||form.longitude==null)return;
  void Linking.openURL(googleMapsPreview(form.latitude,form.longitude)).catch(()=>setLocationMessage('Não foi possível abrir o Google Maps. Confirma o ponto antes de continuar.'));
 }
 function clearVenueSearch(){
  venueSearchVersion.current+=1;
  setVenueMatches([]);
  setVenuePage(0);setVenueHasMore(false);setVenueSearched(false);
  setVenueLoading(false);
  setVenueError('');
 }
 async function findVenues(page=0){
  if(venueLoading||busy)return;
  const version=++venueSearchVersion.current;
  const selectedSport=form.sport;
  setVenueLoading(true);setVenueError('');
  if(page===0){setVenueMatches([]);setVenuePage(0);setVenueHasMore(false);setVenueSearched(false);}
  try{
   const results=await venues({name:venueQuery.trim(),city:venueCityQuery.trim(),sport:selectedSport||undefined,page});
   if(version!==venueSearchVersion.current)return;
   const matching=results.venues.filter(v=>venueSupportsSport(v,selectedSport));
   setVenueMatches(previous=>page===0?matching:
    [...previous,...matching.filter(v=>!previous.some(old=>old.id===v.id))]);
   setVenuePage(results.page);
   setVenueHasMore(results.hasMore);
   setVenueSearched(true);
  }catch(e){
   if(version===venueSearchVersion.current)setVenueError(e instanceof Error?e.message:'Não foi possível procurar recintos.');
  }finally{
   if(version===venueSearchVersion.current)setVenueLoading(false);
  }
 }
 function useVenue(v:VenueSummary){
  clearMappedLocation();clearVenueSearch();
  setVenueChosen(v);
  setForm(previous=>chooseVenueLocation(previous,v));
 }
 function removeVenue(){
  clearMappedLocation();clearVenueSearch();
  setVenueChosen(null);setForm(previous=>detachVenueLocation(previous));
 }
 function venueSupportsSport(v:VenueSummary,sport:string){
  return !v.sports?.trim()||!sport||v.sports.split(';').map(item=>item.trim().toLocaleLowerCase('pt-PT')).includes(sport.toLocaleLowerCase('pt-PT'));
 }
 const loadCommunities=useCallback(async(version=communityLoadVersion.current)=>{
  if(!auth.token||!auth.username){
   if(version===communityLoadVersion.current)setCommunities([]);
   return;
  }
  try{
   const groups=await myCommunities(auth.token,auth.username);
   if(version!==communityLoadVersion.current)return;
   setCommunities(groups);setCommunityError('');
   if(requestedCommunityId&&!preselectionApplied.current&&!preselectionOverridden.current){
    const chosen=groups.find(c=>c.id===requestedCommunityId);
    if(chosen){
     preselectionApplied.current=true;
     const sports=communitySports(chosen);
     const chosenSport=typeof params.sport==='string'&&sports.includes(params.sport)&&SPORTS.includes(params.sport)?params.sport:
       sports.length===1&&typeof sports[0]==='string'&&SPORTS.includes(sports[0])?sports[0]:'';
     setCommunityMode('SINGLE');
     setForm(previous=>({...changeCommunityMode(previous,'SINGLE'),communityId:chosen.id,
      sport:chosenSport||(sports.includes(previous.sport)?previous.sport:''),communityRankingsEnabled:chosen.rankingsEnabled}));
    }else setCommunityError('Já não pertences a esta comunidade. Seleciona outra antes de criares a sessão.');
   }
  }
  catch{
   if(version===communityLoadVersion.current){
    setCommunities([]);setCommunityError('Não foi possível carregar as tuas comunidades.');
   }
  }
 },[auth.token,auth.username,requestedCommunityId,params.sport]);
 useFocusEffect(useCallback(()=>{
  const identity=String(auth.username||'')+'|'+String(auth.token||'')+'|'+String(requestedCommunityId||'')+'|'+String(params.sport||'');
  if(communityLoadIdentity.current!==identity){
   communityLoadIdentity.current=identity;
   confirmedCreation.current=null;setCreatedId(null);
   preselectionApplied.current=false;
   preselectionOverridden.current=false;
   setCommunities([]);setCommunityError('');setCommunitySearch('');
   setCommunityMode('INDEPENDENT');
   setForm(emptySessionForm());
   setStep(0);setHasExistingPlayers(false);
   setSportSearch('');setShowSportResults(false);
   setExtraDay('');setExtraTime('');
   setVenueQuery('');setVenueCityQuery('');
   setVenueChosen(null);clearVenueSearch();
   locationRequest.current++;setLocationMode('saved');setMapsLink('');setLocationAccuracy(null);setLocationMessage('');setLocationLoading(false);
   createOperation.current++;setBusy(locked.current);setError('');
  }
  setBusy(locked.current);
  const version=++communityLoadVersion.current;
  void loadCommunities(version);
  return ()=>{
   communityLoadVersion.current++;venueSearchVersion.current++;
   createOperation.current++;
  };
 },[loadCommunities,auth.username,auth.token,requestedCommunityId]));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const patch=(key:keyof CreateSessionForm,value:string|boolean|number|null)=>{
  if(key==='city'||key==='address'){
    clearVenueSearch();
    if(form.latitude!=null||form.longitude!=null){
      setForm(prev=>({...prev,locationConfirmed:false}));
      setLocationMessage('Morada editada. O ponto GPS original mantém-se; confirma novamente o ponto no mapa.');
    }
  }
  const next=typeof value==='string'?
   (key==='day'||key==='registrationDay'?formatLocalDateInput(value):
    key==='time'||key==='registrationTime'?formatLocalTimeInput(value):value):value;
  setForm(prev=>({...prev,[key]:next}));
 };
 const selectedCommunity=communities.find(c=>c.id===form.communityId)||null;
 const sharedIds=form.communityShareIds||[];
 const sharedCommunities=communities.filter(c=>sharedIds.includes(c.id));
 const hasCommunity=!!form.communityId||sharedIds.length>0;
 function toggleShared(id:number){
  setVenueChosen(null);clearVenueSearch();
  setForm(prev=>{
   const list=prev.communityShareIds||[];
   const next=list.includes(id)?list.filter(x=>x!==id):list.length<5?[...list,id]:list;
   const allowed=availableSessionSports(communities.filter(c=>next.includes(c.id)),SPORTS);
   const sport=allowed.includes(prev.sport)?prev.sport:allowed.length===1&&typeof allowed[0]==='string'?allowed[0]:'';
   return {...prev,communityId:null,communityShareIds:next,sport,venueId:null,privateGame:false,password:'',
    seasonGame:false,confirmActivateRankings:false,communityRankingsEnabled:false,
    ...(next.length===0?{registrationOpeningMode:'IMMEDIATE' as const,recurrence:'NONE' as const,additionalWeeklySlots:[]}:null)};
  });
 }
 const availableSports=availableSessionSports(communityMode==='SINGLE'?(selectedCommunity?[selectedCommunity]:[]):
  communityMode==='SHARED'?sharedCommunities:[],SPORTS);
 const suggestions=sportSearch.trim()
  ?availableSports.filter(s=>s.toLocaleLowerCase('pt-PT').includes(sportSearch.trim().toLocaleLowerCase('pt-PT'))).slice(0,12)
  :[];
 const visibleCommunities=communities.filter(c=>!communitySearch.trim()||
  (c.name+' '+(c.sport||'')).toLocaleLowerCase('pt-PT').includes(communitySearch.trim().toLocaleLowerCase('pt-PT')));
 function nextStep(){
  if(busy)return;
  setError('');
  if(step===0){
   if(!form.sport){setError('Escolhe uma modalidade.');return;}
   if(communityMode!=='INDEPENDENT'&&!hasCommunity){setError('Seleciona pelo menos uma comunidade ou escolhe sessão independente.');return;}
   if(form.communityId&&!selectedCommunity){setError('Seleciona novamente a comunidade.');return;}
   if(selectedCommunity&&!communitySports(selectedCommunity).includes(form.sport)){
    setError('Escolhe uma modalidade permitida nesta comunidade.');return;
   }
   if(sharedCommunities.some(c=>!communitySports(c).includes(form.sport))){
    setError('A modalidade tem de pertencer a todas as comunidades selecionadas.');return;
   }
   if(sharedCommunities.length!==sharedIds.length){setError('Atualiza a seleção de comunidades.');return;}
  }
  if(step===1){
   try{
    parseSessionDate(form.day,form.time);
    if(!form.city.trim()||!form.address.trim())throw new Error('Indica a localidade e a morada.');
    if(locationLoading||(locationMode!=='saved'&&(form.latitude==null||form.longitude==null||form.locationConfirmed!==true)))throw Error('Confirma o ponto no mapa antes de continuar.');
    if(form.venueId&&(!venueChosen||venueChosen.id!==form.venueId||!venueSupportsSport(venueChosen,form.sport)))
     throw new Error('O recinto selecionado já não é compatível com a modalidade.');
   }catch(e){setError(e instanceof Error?e.message:'Verifica a data e o local.');return;}
  }
  if(step===2){
   try{
    if(hasExistingPlayers&&Number(form.externalConfirmedParticipants)<1)
     throw Error('Indica quantos jogadores já tens confirmados, sem contar contigo.');
    createSessionPayload(form,SPORTS);
   }catch(e){setError(e instanceof Error?e.message:'Verifica as informações da sessão.');return;}
  }
  setStep(current=>Math.min(3,current+1));
 }
 function confirm(){
  if(step!==3||locked.current||busy||DEMO_MODE||!auth.token||!auth.username||confirmedCreation.current)return;
  let payload:ReturnType<typeof createSessionPayload>;
  try{
   if(hasExistingPlayers&&Number(form.externalConfirmedParticipants)<1)
    throw Error('Indica quantos jogadores já tens confirmados antes de criar a sessão.');
   if(communityMode!=='INDEPENDENT'&&!hasCommunity)throw Error('Escolhe uma comunidade para continuar.');
   if(form.communityId&&!selectedCommunity)throw Error('Atualiza a lista de comunidades antes de continuar.');
   if(selectedCommunity&&!communitySports(selectedCommunity).includes(form.sport))
    throw Error('Esta modalidade não está configurada na comunidade selecionada.');
   if(sharedCommunities.some(c=>!communitySports(c).includes(form.sport)))
    throw Error('A modalidade tem de estar disponível em todas as comunidades selecionadas.');
   if(sharedCommunities.length!==sharedIds.length)throw Error('Uma comunidade partilhada já não está disponível. Atualiza a seleção.');
   if(form.seasonGame&&(!selectedCommunity||form.communityRankingsEnabled!==selectedCommunity.rankingsEnabled))
    throw Error('O estado das classificações da comunidade mudou. Seleciona novamente a comunidade.');
   if(form.venueId&&(!venueChosen||venueChosen.id!==form.venueId||!venueSupportsSport(venueChosen,form.sport)))
    throw Error('O recinto selecionado não é válido para a modalidade. Pesquisa novamente.');
   if(locationLoading||(locationMode!=='saved'&&(form.latitude==null||form.longitude==null||form.locationConfirmed!==true)))throw Error('Confirma a localização escolhida antes de criar.');
   payload=createSessionPayload(form,SPORTS);setError('');
  }
  catch(e){setError(e instanceof Error?e.message:'Verifica os dados da sessão.');return;}
  const identity=communityLoadIdentity.current;
  const version=communityLoadVersion.current;
  const actorToken=auth.token,actorUsername=auth.username;
  Alert.alert('Criar sessão desportiva?',describeSessionConfirmation(payload,{
   communityName:selectedCommunity?.name,
   sharedCommunityNames:sharedCommunities.map(c=>c.name),
   venueName:venueChosen?.name
  }),[
   {text:'Voltar',style:'cancel'},
   {text:'Criar sessão',onPress:async()=>{
    if(locked.current||confirmedCreation.current||
       version!==communityLoadVersion.current||identity!==communityLoadIdentity.current)return;
    const operation=++createOperation.current;
    locked.current=true;setBusy(true);setError('');
    try{
     const result=await createSessionWithPayload(payload,actorToken,actorUsername);
     if(operation!==createOperation.current||version!==communityLoadVersion.current||identity!==communityLoadIdentity.current)return;
     // The server confirmed the creation. Never POST this draft again.
     confirmedCreation.current={id:result.id,identity};
     setCreatedId(result.id);
     router.replace({pathname:'/sessions/[id]',params:{id:String(result.id)}});
    }catch(e){
     if(operation===createOperation.current&&version===communityLoadVersion.current&&identity===communityLoadIdentity.current)
      setError(confirmedCreation.current?
       'A sessão foi criada, mas não foi possível abrir o detalhe automaticamente. Usa o botão «Abrir sessão criada» para continuar.':
       (e instanceof Error?e.message:'Não foi possível criar a sessão.')+
       ' Verifica as tuas sessões antes de tentares novamente, para evitar duplicados.');
    }finally{
     // Do not allow another POST until this one has actually settled, even after navigation.
     locked.current=false;
     setBusy(false);
    }
   }}
  ]);
 }
 const field=(label:string,key:keyof CreateSessionForm,placeholder:string,keyboardType:'default'|'numeric'|'decimal-pad'='default')=>
  <View style={styles.field}><Text style={styles.label}>{label}</Text>
   <TextInput style={styles.input} value={String(form[key]??'')} onChangeText={v=>patch(key,v)}
    placeholder={placeholder} placeholderTextColor={C.muted} keyboardType={keyboardType}
    secureTextEntry={key==='password'} autoCorrect={key==='password'?false:undefined}
    autoCapitalize={key==='password'?'none':'sentences'}
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
  {createdId&&confirmedCreation.current?.identity===communityLoadIdentity.current?
   <View style={{gap:9}}>
    <Message>Sessão criada com sucesso. Já não é necessário repetir a criação.</Message>
    <Button title="Abrir sessão criada" onPress={()=>router.replace({pathname:'/sessions/[id]',params:{id:String(createdId)}})}/>
   </View>:null}
  {communityError?<Message tone="error">{communityError}</Message>:null}
  {communityError&&auth.token&&auth.username?<Button secondary title="Voltar a carregar comunidades" disabled={busy} onPress={()=>{void loadCommunities();}}/>:null}
  {step===0?<>
  <View style={styles.panel}><Text style={styles.heading}>Modalidade</Text>
   {form.sport?<Badge text={form.sport}/>:null}
   <TextInput style={styles.input} value={sportSearch}
    onChangeText={v=>{setSportSearch(v);setShowSportResults(true);}}
    onFocus={()=>setShowSportResults(true)}
    placeholder="Procurar uma das 121 modalidades" placeholderTextColor={C.muted} editable={!busy}
    autoCorrect={false} accessibilityLabel="Pesquisar modalidade"/>
   {showSportResults&&sportSearch.trim()?<>
    {suggestions.map(s=><Pressable key={s} accessibilityRole="button"
     accessibilityLabel={'Escolher '+s} onPress={()=>{
      // A late membership request must not overwrite a sport chosen by the user.
      preselectionOverridden.current=true;
      setForm(prev=>({...prev,sport:s,venueId:prev.sport===s?prev.venueId:null}));
      if(form.sport!==s){setVenueChosen(null);clearVenueSearch();}
      setSportSearch('');setShowSportResults(false);
     }} style={[styles.option,form.sport===s&&styles.chosen]}>
     <Text style={styles.optionText}>{s}{form.sport===s?' ✓':''}</Text>
    </Pressable>)}
    {!suggestions.length?<Text style={styles.note}>Nenhuma modalidade corresponde à pesquisa.</Text>:null}
   </>:null}
   {!form.sport?<Text style={styles.note}>Começa a escrever para escolher uma modalidade. Não são aceites nomes fora do catálogo.</Text>:null}
   {communityMode!=='INDEPENDENT'&&hasCommunity?<Text style={styles.note}>
    {availableSports.length?`${availableSports.length} modalidades compatíveis com ${communityMode==='SINGLE'?'a comunidade':'as comunidades'} selecionadas.`:
     'Estas comunidades não têm modalidades em comum. Retira uma comunidade ou escolhe outra combinação.'}
   </Text>:null}
  </View>
  <View style={styles.panel}><Text style={styles.heading}>Tipo de sessão</Text>
   <View style={styles.inline}>
    {(['INDEPENDENT','SINGLE','SHARED'] as const).map(mode=>
     <Button key={mode} title={mode==='INDEPENDENT'?'Independente':mode==='SINGLE'?'Comunidade':'Partilhar'}
      secondary={communityMode!==mode} disabled={busy}
      onPress={()=>{preselectionOverridden.current=true;if(communityMode===mode)return;setCommunityMode(mode);setCommunitySearch('');
       setForm(prev=>changeCommunityMode(prev,mode));setError('');}}/>)}
   </View>
   {communityMode==='INDEPENDENT'?<Text style={styles.note}>Sessão aberta a jogadores da Jynlo, sem comunidade associada.</Text>:null}
   {communityMode!=='INDEPENDENT'?<>
    <Text style={styles.note}>{communityMode==='SINGLE'
     ?'Escolhe uma comunidade. As sessões associadas são apenas para os seus membros.'
     :'Escolhe até cinco comunidades. Os respetivos membros poderão participar, sem palavra-passe.'}</Text>
    <TextInput style={styles.input} value={communitySearch} onChangeText={setCommunitySearch}
     placeholder="Pesquisar as minhas comunidades" placeholderTextColor={C.muted}
     autoCorrect={false} editable={!busy}/>
    {!visibleCommunities.length?<Text style={styles.note}>Sem comunidades para mostrar. Experimenta outra pesquisa.</Text>:null}
    {visibleCommunities.map(c=><Pressable key={c.id} accessibilityRole="button"
     accessibilityLabel={(communityMode==='SINGLE'?'Selecionar ':'Partilhar com ')+c.name}
     disabled={busy||(communityMode==='SHARED'&&!sharedIds.includes(c.id)&&sharedIds.length>=5)}
     onPress={()=>{
      preselectionOverridden.current=true;
      if(communityMode==='SINGLE'){
       setForm(prev=>{
        const sports=communitySports(c);
        const sport=sports.includes(prev.sport)?prev.sport:
         sports.length===1&&typeof sports[0]==='string'&&SPORTS.includes(sports[0])?sports[0]:'';
        return {...prev,communityId:c.id,communityShareIds:[],seasonGame:false,
         sport,venueId:null,
         communityRankingsEnabled:c.rankingsEnabled,confirmActivateRankings:false};
       });
       setVenueChosen(null);clearVenueSearch();
      }else toggleShared(c.id);
     }} style={[styles.option,(form.communityId===c.id||sharedIds.includes(c.id))&&styles.chosen]}>
      <Text style={styles.optionText}>{(form.communityId===c.id||sharedIds.includes(c.id))?'✓  ':''}{c.name}</Text>
      <Text style={styles.note}>{c.sport||'Modalidade não indicada'}</Text>
    </Pressable>)}
    {communityMode==='SHARED'?<Text style={styles.note}>Selecionadas: {sharedIds.length}/5. O servidor confirma as permissões em cada comunidade.</Text>:null}
   </>:null}
  </View>
  {selectedCommunity?<View style={styles.panel}>
   <View style={styles.seasonHead}>
    <Text style={styles.heading}>Jogo de época</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Saber mais sobre jogos de época" onPress={()=>Alert.alert('O que é um jogo de época?','Se escolheres «Contar para a época», esta sessão fica associada à época ativa da comunidade e os seus resultados podem contribuir para a classificação, conforme a modalidade e as regras da comunidade.\n\nSe escolheres «Não contar para a época», a sessão continua a existir normalmente, sem influenciar a classificação.\n\nAo longo das jornadas, resultados e avaliações podem ajudar a melhorar as classificações e, quando existirem dados suficientes, a formar equipas mais equilibradas.\n\nSe as classificações estiverem desativadas, a ativação exige autorização explícita.')} style={styles.seasonHelp}><Text style={styles.seasonHelpText}>ⓘ Saber mais sobre o jogo de época</Text></Pressable>
   </View>
   <Text style={styles.note}>Decide se esta sessão contribui para a época e classificações da comunidade.</Text>
   <View style={styles.playerChoices}>
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
   <Text style={styles.label}>Data da sessão</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendário da sessão"
    disabled={busy} onPress={()=>setShowDateCalendar(open=>!open)}
    style={[styles.option,{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}]}>
    <Text style={styles.optionText}>{form.day||'Escolher data no calendário'}</Text>
    <Text style={styles.optionText}>{showDateCalendar?'Fechar calendário':'📅 Calendário'}</Text>
   </Pressable>
   {showDateCalendar?<SessionDateCalendar value={form.day} disabled={busy}
    onSelect={date=>{patch('day',date);setShowDateCalendar(false);setError('');}}/>:null}
   {field('Hora local','time','HH:mm (24h)','numeric')}
   <Text style={styles.note}>Escolhe o dia no calendário e escreve a hora com quatro dígitos (ex.: 1930 → 19:30).</Text>
   <View style={styles.locationOptions}>
    <Text style={styles.heading}>Usar um recinto conhecido</Text>
    <Text style={styles.note}>Escolhe um recinto da Jynlo, partilha um link Google Maps ou confirma a localização onde estás.</Text>
    <View style={styles.locationModes}>
      {([{id:'saved',title:'Recinto guardado'},{id:'link',title:'Ligação Google Maps'},{id:'gps',title:'Estou no recinto'}] as const).map(mode=>
       <Pressable key={mode.id} accessibilityRole="button"
        accessibilityState={{selected:locationMode===mode.id}}
        disabled={busy||locationLoading} onPress={()=>selectLocationMode(mode.id)}
        style={[styles.locationModeButton,locationMode===mode.id&&styles.locationModeActive]}>
        <Text style={styles.locationModeText}>{mode.title}</Text>
       </Pressable>)}
    </View>
    {locationMode==='gps'?<View style={styles.locationModePanel}>
      <Text style={styles.note}>Já estás no campo? Autoriza o GPS apenas ao tocar no botão. Depois confirma o ponto no Google Maps.</Text>
      <Button title={locationLoading?'A obter localização…':'Usar localização atual'}
       secondary disabled={busy||locationLoading} onPress={()=>{void useCurrentLocation();}}/>
    </View>:null}
    {locationMode==='link'?<View style={styles.locationModePanel}>
      <Text style={styles.note}>Cola o link do pin partilhado no Google Maps.</Text>
      <TextInput value={mapsLink} onChangeText={v=>{setMapsLink(v);clearMappedLocation();}} editable={!locationLoading&&!busy}
       style={styles.input} autoCapitalize="none" keyboardType="url"
       placeholder="https://maps.app.goo.gl/…" placeholderTextColor={C.muted}
       accessibilityLabel="Ligação do Google Maps"/>
      <Button title={locationLoading?'A localizar…':'Usar ponto do Google Maps'}
       secondary disabled={busy||locationLoading||!mapsLink.trim()} onPress={()=>{void useMapsLink();}}/>
    </View>:null}
    {locationMessage?<Message>{locationMessage}</Message>:null}
    {locationMode!=='saved'&&form.latitude!=null&&form.longitude!=null?<View style={styles.locationModePanel}>
      <Text style={styles.optionText}>Ponto GPS identificado</Text>
      <Text style={styles.note}>Localidade: {form.city} · Morada aproximada: {form.address}</Text>
      {locationAccuracy!=null?<Text style={styles.note}>Precisão estimada: ±{Math.round(locationAccuracy)} m.</Text>:null}
      {locationAccuracy!=null&&locationAccuracy>100?<Message>O GPS tem precisão reduzida. Confirma cuidadosamente o local antes de publicar.</Message>:null}
      <Button secondary title="Confirmar ponto no Google Maps" disabled={busy} onPress={previewMappedPoint}/>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:form.locationConfirmed===true}}
       onPress={()=>setForm(prev=>({...prev,locationConfirmed:!prev.locationConfirmed}))}
       style={styles.locationConfirm}>
        <Text style={styles.optionText}>{form.locationConfirmed?'☑':'☐'} Confirmei que o ponto corresponde ao recinto correto</Text>
      </Pressable>
      <Button secondary title="Remover ponto GPS" disabled={busy} onPress={clearMappedLocation}/>
    </View>:null}
   </View>
   {locationMode==='saved'?<>
   {venueChosen?<View style={styles.option}>
    <Text style={styles.optionText}>Recinto selecionado: {venueChosen.name}</Text>
    <Text style={styles.note}>{venueChosen.address||'Morada por indicar'} · {venueChosen.city||'Localidade por indicar'}</Text>
    <Button title="Retirar recinto" secondary disabled={busy} onPress={removeVenue}/>
   </View>:null}
   <Text style={styles.label}>Procurar recinto Jynlo (opcional)</Text>
   <TextInput style={styles.input} value={venueQuery} onChangeText={v=>{setVenueQuery(v);clearVenueSearch();}}
    placeholder="Nome do recinto" placeholderTextColor={C.muted} editable={!busy}
    accessibilityLabel="Nome do recinto a procurar"/>
   <TextInput style={styles.input} value={venueCityQuery} onChangeText={v=>{setVenueCityQuery(v);clearVenueSearch();}}
    placeholder="Filtrar por localidade (opcional)" placeholderTextColor={C.muted} editable={!busy}
    accessibilityLabel="Localidade para procurar recintos"/>
   <Text style={styles.note}>Podes procurar recintos em qualquer localidade. Ao selecionar um recinto, a morada e a cidade da sessão serão atualizadas automaticamente.</Text>
   <Button secondary title={venueLoading?'A pesquisar…':'Procurar recintos'} disabled={busy||venueLoading||!form.sport} onPress={()=>{void findVenues();}}/>
   {venueError?<Message tone="error">{venueError}</Message>:null}
   {venueMatches.map(v=><Pressable key={v.id} accessibilityRole="button" style={styles.option} disabled={busy}
    onPress={()=>useVenue(v)}>
    <Text style={styles.optionText}>{v.name}</Text>
    <Text style={styles.note}>{v.city||'Localidade por indicar'} · {v.address||'Morada por indicar'}</Text>
   </Pressable>)}
   {venueSearched&&!venueLoading&&!venueMatches.length&&!venueHasMore?
    <Text style={styles.note}>Não foram encontrados recintos com estes filtros. Tenta outra localidade ou pesquisa por nome.</Text>:null}
   {venueHasMore?<Button secondary title={venueLoading?'A carregar…':'Mostrar mais recintos'}
    disabled={busy||venueLoading} onPress={()=>{void findVenues(venuePage+1);}}/>:null}
   </>:null}
   {locationMode==='saved'&&venueChosen&&venueChosen.city?.trim()&&venueChosen.address?.trim()?
    <Text style={styles.note}>A morada e a localidade são fornecidas pelo recinto selecionado. Retira o recinto para introduzir uma morada própria.</Text>:<>
    {venueChosen?<Message>Este recinto não tem uma morada ou localidade completa. Preenche os dados em falta antes de publicar a sessão.</Message>:null}
    {field('Localidade','city','Ex.: Lisboa')}
    {field('Morada','address','Rua e número, recinto ou ponto de referência')}
   </>}
   {field('Ponto de encontro (opcional)','meetingPointInstructions','Ex.: Entrada principal')}
  </View>:null}
  {step===2?<View style={styles.panel}><Text style={styles.heading}>Participação</Text>
   {field('Capacidade total, incluindo organizador','maxParticipants','10','numeric')}
   {field('Preço por participante (€)','price','0','decimal-pad')}
   {field('Mínimo de participantes para realizar','minParticipants','2','numeric')}
   <Text style={styles.label}>Como vais reunir os jogadores?</Text>
   <View style={styles.playerChoices}>
    <Pressable accessibilityRole="radio" accessibilityState={{checked:!hasExistingPlayers}} disabled={busy}
      style={[styles.playerChoice,!hasExistingPlayers&&styles.playerChoiceSelected]}
      onPress={()=>{setHasExistingPlayers(false);patch('externalConfirmedParticipants','0');setError('');}}>
      <Text style={styles.playerChoiceTitle}>{!hasExistingPlayers?'✓  ':''}Ainda não tenho jogadores</Text>
      <Text style={styles.note}>Quero abrir a sessão para encontrar participantes na Jynlo.</Text>
    </Pressable>
    <Pressable accessibilityRole="radio" accessibilityState={{checked:hasExistingPlayers}} disabled={busy}
      style={[styles.playerChoice,hasExistingPlayers&&styles.playerChoiceSelected]}
      onPress={()=>{setHasExistingPlayers(true);setError('');}}>
      <Text style={styles.playerChoiceTitle}>{hasExistingPlayers?'✓  ':''}Já tenho jogadores e quero completar</Text>
      <Text style={styles.note}>Conta os jogadores já confirmados fora da app para procurares apenas as vagas que faltam.</Text>
    </Pressable>
   </View>
   {hasExistingPlayers?<>
    {field('Jogadores já confirmados sem conta (não incluas o organizador)','externalConfirmedParticipants','Ex.: 4','numeric')}
    <Text style={styles.note}>Indica um número real de jogadores já confirmados. Não são criados perfis ou convites automaticamente.</Text>
   </>:<Text style={styles.note}>O organizador ficará automaticamente inscrito. Os restantes lugares ficam disponíveis para participantes.</Text>}
   {Number.isInteger(Number(form.maxParticipants))&&Number(form.maxParticipants)>=2&&
    Number.isInteger(Number(form.externalConfirmedParticipants))&&Number(form.externalConfirmedParticipants)>=0&&
    Number(form.externalConfirmedParticipants)<Number(form.maxParticipants)?
    <Message>Vagas inicialmente disponíveis para novas inscrições: {Number(form.maxParticipants)-1-Number(form.externalConfirmedParticipants)}. O organizador ocupa uma vaga.</Message>:null}
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
     <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendário do horário adicional"
      disabled={busy} onPress={()=>setShowExtraCalendar(value=>!value)} style={styles.option}>
      <Text style={styles.optionText}>📅 {extraDay||'Escolher dia adicional'} {showExtraCalendar?'▴':'▾'}</Text>
     </Pressable>
     {showExtraCalendar?<SessionDateCalendar value={extraDay} disabled={busy}
      onSelect={date=>{setExtraDay(date);setShowExtraCalendar(false);}}/>:null}
     <TextInput style={styles.input} value={extraTime} onChangeText={value=>setExtraTime(formatLocalTimeInput(value))}
      placeholder="Hora adicional (HH:mm)" placeholderTextColor={C.muted} keyboardType="numeric" editable={!busy}/>
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
    <Text style={styles.label}>Data de abertura das inscrições</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendário das inscrições"
     disabled={busy} onPress={()=>setShowRegistrationCalendar(value=>!value)} style={styles.option}>
     <Text style={styles.optionText}>📅 {form.registrationDay||'Escolher data de abertura'} {showRegistrationCalendar?'▴':'▾'}</Text>
    </Pressable>
    {showRegistrationCalendar?<SessionDateCalendar value={form.registrationDay} disabled={busy}
     onSelect={date=>{patch('registrationDay',date);setShowRegistrationCalendar(false);}}/>:null}
    {field('Hora de abertura','registrationTime','HH:mm (24h)','numeric')}
   </>:null}
   {form.registrationOpeningMode==='MANUAL'?<Text style={styles.note}>As inscrições só abrem quando o organizador as ativar na sessão.</Text>:null}
   <Text style={styles.label}>Visibilidade</Text>
   {sharedIds.length>0?<Message>Partilha entre comunidades: visibilidade apenas para membros, sem palavra-passe.</Message>:null}
   <View style={styles.inline}><Button secondary={form.privateGame} title={hasCommunity?'Sem palavra-passe':'Pública'} disabled={busy} onPress={()=>patch('privateGame',false)}/>
    <Button secondary={!form.privateGame} title="Privada" disabled={busy||sharedIds.length>0} onPress={()=>patch('privateGame',true)}/></View>
   {form.privateGame?<><Text style={styles.note}>A palavra-passe fica oculta enquanto escreves. Só os jogadores com a palavra-passe podem entrar.</Text>
    {field('Palavra-passe da sessão','password','Mínimo de 4 caracteres')}</>:null}
   <Text style={styles.note}>Os jogadores externos já confirmados contam para a ocupação da sessão.</Text>
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
   <Text style={styles.summaryValue}>Até {form.maxParticipants} participantes · mínimo {form.minParticipants} · {hasExistingPlayers?form.externalConfirmedParticipants:'0'} já confirmados externamente (sem contar o organizador)</Text>
   <Text style={styles.summaryValue}>{hasExistingPlayers?'Vou completar um grupo existente':'Vou encontrar jogadores na Jynlo'}</Text>
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
 locationOptions:{gap:12,padding:12,borderRadius:15,backgroundColor:C.surface2,borderColor:C.border,borderWidth:1},
 locationModes:{gap:8},
 locationModeButton:{minHeight:48,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,justifyContent:'center',alignItems:'center'},
 locationModeActive:{borderColor:C.mint,backgroundColor:'#10483F'},
 locationModeText:{color:C.white,fontSize:13,fontWeight:'800'},
 locationModePanel:{gap:10,padding:12,borderRadius:12,borderColor:C.border,borderWidth:1},
 locationConfirm:{minHeight:56,justifyContent:'center',padding:10,backgroundColor:'#10483F',borderRadius:10},

 seasonHead:{gap:10,alignItems:'flex-start'},
 seasonHelp:{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingVertical:8,paddingHorizontal:12,backgroundColor:C.surface2,borderRadius:12,borderWidth:1,borderColor:C.mint},
 seasonHelpText:{color:C.mint,fontWeight:'800',fontSize:13},
 title:{color:C.white,fontSize:28,fontWeight:'900'},note:{color:C.muted,fontSize:12,lineHeight:19},
 panel:{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16,gap:11},
 heading:{color:C.white,fontWeight:'900',fontSize:19},
 field:{gap:6},label:{fontSize:13,color:C.muted,fontWeight:'700'},
 input:{borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface2,color:C.white,padding:13,minHeight:48},
 inline:{flexDirection:'row',gap:10,flexWrap:'wrap'},
 playerChoices:{gap:9},
 playerChoice:{borderWidth:1,borderColor:C.border,borderRadius:13,padding:14,gap:5,backgroundColor:C.surface2},
 playerChoiceSelected:{borderColor:C.mint},
 playerChoiceTitle:{fontWeight:'900',color:C.white,fontSize:14},
 option:{gap:12,padding:12,borderWidth:1,borderColor:C.border,borderRadius:12},
 chosen:{borderColor:C.mint,backgroundColor:C.surface2},optionText:{color:C.white,fontSize:14,fontWeight:'700'},
 steps:{flexDirection:'row',flexWrap:'wrap',gap:7},
 stepChip:{paddingVertical:10,paddingHorizontal:11,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 stepActive:{borderColor:C.mint,backgroundColor:C.surface2},
 stepText:{color:C.muted,fontSize:12,fontWeight:'700'},
 stepTextActive:{color:C.mint},
 actions:{gap:10,marginTop:6},
 summaryTitle:{fontSize:14,fontWeight:'900',color:C.mint,marginTop:9},
 summaryValue:{fontSize:14,lineHeight:21,color:C.white}
});
