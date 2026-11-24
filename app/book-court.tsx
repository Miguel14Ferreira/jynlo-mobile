import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t,useLanguage} from '../src/lib/i18n';
import {useAuth} from '../src/lib/auth';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {C} from '../src/lib/theme';
import {bookingError} from '../src/components/VenueJynloBooking';
import {requestBooking,searchCourts,type BookingSlot,type CourtSlots,type VenueAvailability,type VenueBooking} from '../src/lib/venue-jynlo-api';
import {createGameParams,formatPrice,lisbonTime,nextLisbonDays} from '../src/lib/venue-jynlo-booking.cjs';

const COURT_SPORTS=['Padel','Ténis','Futebol','Futsal','Basquetebol','Voleibol','Badminton','Squash','Pickleball'];
const FROM_HOURS=['','08:00','10:00','12:00','14:00','17:00','18:00','19:00','20:00','21:00'];

interface Picked{venue:VenueAvailability;court:CourtSlots;slot:BookingSlot}

/** "Reservar campo": free slots across every venue that takes Jynlo bookings. */
export default function BookCourtScreen(){
 const auth=useAuth();
 const router=useRouter();
 const {language}=useLanguage();
 const days=useRef(nextLisbonDays(14)).current;
 const [date,setDate]=useState(days[0]??'');
 const [sport,setSport]=useState('');
 const [place,setPlace]=useState('');
 const [placeQuery,setPlaceQuery]=useState('');
 const [from,setFrom]=useState('');
 const [results,setResults]=useState<VenueAvailability[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [picked,setPicked]=useState<Picked|null>(null);
 const [note,setNote]=useState('');
 const [done,setDone]=useState<{booking:VenueBooking;sport:string|null}|null>(null);
 const version=useRef(0);

 const load=useCallback(async()=>{
  const v=++version.current;
  setLoading(true);setError('');setPicked(null);
  try{const list=await searchCourts(date,sport,placeQuery,from);if(v===version.current)setResults(list);}
  catch(e){if(v===version.current){setResults([]);setError(bookingError(e,t('Não foi possível carregar os horários.')));}}
  finally{if(v===version.current)setLoading(false);}
 },[date,sport,placeQuery,from]);
 useEffect(()=>{void load();},[load]);

 function dayLabel(day:string){
  if(day===days[0])return t('Hoje');
  if(day===days[1])return t('Amanhã');
  return new Intl.DateTimeFormat(language==='en'?'en-GB':'pt-PT',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
 }

 async function send(){
  const p=picked;
  if(!p||busy||!auth.token)return;
  setBusy(true);setError('');
  try{
   const booking=await requestBooking(p.venue.venueId,auth.token,p.court.courtId,p.slot.start,note.trim()||null,null);
   setDone({booking,sport:p.court.sport||sport||null});
   setPicked(null);setNote('');
   setResults(list=>list.map(v=>v.venueId!==p.venue.venueId?v:{...v,courts:v.courts
    .map(c=>c.courtId!==p.court.courtId?c:{...c,slots:c.slots.filter(s=>s.start!==p.slot.start)}).filter(c=>c.slots.length)}).filter(v=>v.courts.length));
  }catch(e){setError(bookingError(e,t('Não foi possível enviar o pedido. Tenta outra vez.')));}
  finally{setBusy(false);}
 }

 const chip=(label:string,active:boolean,onPress:()=>void,key:string)=>
  <Pressable key={key} accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[styles.chip,active&&styles.chipOn]}>
   <Text style={[styles.chipText,active&&styles.chipTextOn]}>{label}</Text></Pressable>;

 return <Page>
  <Eyebrow>{t('Reservas de campos')}</Eyebrow>
  <Text style={styles.h1}>{t('Reservar campo')}</Text>
  <Text style={styles.muted}>{t('Escolhe a modalidade, o dia e a zona. Vês os horários livres dos recintos que aceitam reservas na Jynlo.')}</Text>

  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
   {days.map(d=>chip(dayLabel(d),d===date,()=>setDate(d),d))}
  </ScrollView>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
   {chip(t('Todas'),sport==='',()=>setSport(''),'all')}
   {COURT_SPORTS.map(s=>chip(t(s),sport===s,()=>setSport(s),s))}
  </ScrollView>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
   {FROM_HOURS.map(h=>chip(h?t('Depois das {h}',{h}):t('Qualquer hora'),from===h,()=>setFrom(h),'h'+h))}
  </ScrollView>
  <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder={t('Cidade ou distrito')} placeholderTextColor={C.muted}
   returnKeyType="search" onSubmitEditing={()=>setPlaceQuery(place.trim())} onBlur={()=>setPlaceQuery(place.trim())} maxLength={80}/>

  {done?<View style={[styles.card,styles.doneCard]}>
   <Text style={styles.strong}>{t('✅ Pedido enviado!')}</Text>
   <Text style={styles.muted}>{t('O recinto vai confirmar. Avisamos-te nas notificações.')}</Text>
   <Button title={t('Criar jogo neste campo')} onPress={()=>router.push({pathname:'/sessions/create',params:createGameParams(done.booking,done.sport)})}/>
   <Button secondary title={t('As minhas reservas')} onPress={()=>router.push('/venue-bookings')}/>
   <Text style={styles.muted}>{t('Cria o jogo para convidar jogadores: ele fica ligado a esta reserva.')}</Text>
  </View>:null}

  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {!loading&&!error&&!results.length?<View style={styles.card}>
   <Text style={styles.strong}>{t('Ainda não há horários livres com estes filtros.')}</Text>
   <Text style={styles.muted}>{t('Experimenta outro dia ou outra zona. Os recintos estão a juntar-se à Jynlo aos poucos.')}</Text>
   <Text style={styles.muted}>{t('Geres um recinto? Abre a página dele na Jynlo e ativa as reservas: é grátis.')}</Text>
   <Button secondary title={t('Ver recintos')} onPress={()=>router.push('/venues')}/>
  </View>:null}

  {results.map(v=><View key={v.venueId} style={styles.card}>
   <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/venues/[id]',params:{id:String(v.venueId)}})}>
    <Text style={styles.venueName}>{v.name}</Text></Pressable>
   <Text style={styles.muted}>{v.city}{v.paymentMethod==='MBWAY'?' · '+t('Aceita MB WAY'):''}</Text>
   {v.courts.map(c=><View key={c.courtId} style={styles.court}>
    <Text style={styles.strong}>{c.name}{c.sport?' · '+c.sport:''}{formatPrice(c.priceCents,language)?' · '+formatPrice(c.priceCents,language):''}</Text>
    <View style={styles.slots}>
     {c.slots.map(s=>chip(lisbonTime(s.start),!!picked&&picked.court.courtId===c.courtId&&picked.slot.start===s.start,
      ()=>{setPicked({venue:v,court:c,slot:s});setDone(null);setError('');},s.start))}
    </View>
    {picked&&picked.venue.venueId===v.venueId&&picked.court.courtId===c.courtId?<View style={styles.confirm}>
     <Text style={styles.strong}>{c.name} · {dayLabel(date)}, {lisbonTime(picked.slot.start)}–{lisbonTime(picked.slot.end)}</Text>
     {auth.token?<>
      <TextInput style={styles.input} value={note} onChangeText={setNote} maxLength={300}
       placeholder={t('Mensagem para o recinto (opcional)')} placeholderTextColor={C.muted}/>
      <Button title={busy?t('A enviar…'):t('Pedir reserva')} disabled={busy} onPress={()=>{void send();}}/>
      <Button secondary title={t('Cancelar')} onPress={()=>setPicked(null)}/>
      <Text style={styles.muted}>{v.paymentMethod==='MBWAY'?t('Depois de o recinto confirmar, pagas por MB WAY.'):t('Pagas no recinto.')}</Text>
     </>:<Button title={t('Entra para pedir a reserva')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/book-court'}})}/>}
    </View>:null}
   </View>)}
  </View>)}
 </Page>;
}

const styles=StyleSheet.create({
 h1:{color:C.white,fontSize:26,fontWeight:'900',marginBottom:6},
 muted:{color:C.muted,fontSize:14,lineHeight:20},
 strong:{color:C.white,fontWeight:'800',fontSize:15},
 venueName:{color:C.white,fontWeight:'900',fontSize:17},
 row:{gap:8,paddingVertical:6},
 chip:{minHeight:40,paddingHorizontal:14,justifyContent:'center',borderRadius:999,borderWidth:1,borderColor:C.border},
 chipOn:{backgroundColor:'#62e6c4',borderColor:'#62e6c4'},
 chipText:{color:C.white,fontWeight:'700'},chipTextOn:{color:'#04212b'},
 input:{minHeight:46,borderRadius:12,borderWidth:1,borderColor:C.border,color:C.white,paddingHorizontal:12,marginVertical:6},
 card:{gap:8,padding:16,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,marginVertical:8},
 doneCard:{borderColor:'#62e6c4'},
 court:{gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:C.border},
 slots:{flexDirection:'row',flexWrap:'wrap',gap:8},
 confirm:{gap:8,padding:12,borderRadius:14,backgroundColor:'rgba(98,230,196,0.08)'},
});
