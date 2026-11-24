import React,{useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {t,useLanguage} from '../lib/i18n';
import {C} from '../lib/theme';
import {bookingOffer,bookingSlots,type BookingOffer,type CourtSlots} from '../lib/venue-jynlo-api';
import {formatPrice,lisbonTime,nextLisbonDays,slotFormParts} from '../lib/venue-jynlo-booking.cjs';

/** The court and time the organiser picked while creating a game. */
export interface PickedVenueSlot{venueId:number;courtId:number;courtName:string;start:string;end:string;day:string;time:string}

/**
 * Game creation at a venue that takes Jynlo bookings: pick a day and a free court time.
 * Renders nothing for venues that do not take bookings, so it stays hidden until one joins.
 */
export function VenueSlotPicker({venueId,disabled,selected,onPick}:{venueId:number;disabled?:boolean;
 selected:PickedVenueSlot|null;onPick:(slot:PickedVenueSlot|null)=>void}){
 const {language}=useLanguage();
 const days=useRef(nextLisbonDays(30)).current;
 const [day,setDay]=useState(days[0]??'');
 const [offer,setOffer]=useState<BookingOffer|null>(null);
 const [courts,setCourts]=useState<CourtSlots[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const version=useRef(0);

 useEffect(()=>{
  let alive=true;setOffer(null);setCourts([]);setDay(days[0]??'');
  bookingOffer(venueId).then(o=>{if(alive)setOffer(o);}).catch(()=>{/* the venue does not take bookings here */});
  return()=>{alive=false;};
 },[venueId,days]);

 const open=!!offer&&offer.acceptsBookings&&offer.courts.length>0;
 useEffect(()=>{
  if(!open)return;
  const v=++version.current;
  setLoading(true);setError('');
  bookingSlots(venueId,day).then(r=>{if(v===version.current)setCourts(r?.courts??[]);})
   .catch(()=>{if(v===version.current){setCourts([]);setError(t('Não foi possível carregar os horários.'));}})
   .finally(()=>{if(v===version.current)setLoading(false);});
 },[open,venueId,day]);

 if(!open)return null;
 const dayLabel=(d:string)=>d===days[0]?t('Hoje'):d===days[1]?t('Amanhã'):
  new Intl.DateTimeFormat(language==='en'?'en-GB':'pt-PT',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
 const free=(c:CourtSlots)=>c.slots.filter(s=>s.free);
 const total=courts.reduce((n,c)=>n+free(c).length,0);
 const chip=(label:string,active:boolean,onPress:()=>void,key:string)=>
  <Pressable key={key} accessibilityRole="button" accessibilityState={{selected:active,disabled:!!disabled}} disabled={disabled}
   onPress={onPress} style={[styles.chip,active&&styles.chipOn]}><Text style={[styles.chipText,active&&styles.chipTextOn]}>{label}</Text></Pressable>;

 return <View style={styles.box}>
  <Text style={styles.title}>📅 {t('Este recinto aceita reservas na Jynlo')}</Text>
  <Text style={styles.muted}>{t('Escolhe o dia e um horário livre: o jogo fica nessa hora e o pedido de reserva segue para o recinto.')}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
   {days.map(d=>chip(dayLabel(d),d===day,()=>setDay(d),d))}
  </ScrollView>
  {loading?<Text style={styles.muted}>{t('A procurar horários…')}</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
  {!loading&&!error&&!total?<Text style={styles.muted}>{t('Não há horários livres neste dia. Experimenta outro dia.')}</Text>:null}
  {courts.filter(c=>free(c).length).map(c=><View key={c.courtId} style={styles.court}>
   <Text style={styles.courtName}>{c.name}{c.sport?' · '+c.sport:''}{formatPrice(c.priceCents,language)?' · '+formatPrice(c.priceCents,language):''}</Text>
   <View style={styles.wrap}>
    {free(c).map(s=>chip(lisbonTime(s.start),!!selected&&selected.courtId===c.courtId&&selected.start===s.start,()=>{
     const parts=slotFormParts(s.start);
     onPick({venueId,courtId:c.courtId,courtName:c.name,start:s.start,end:s.end,day:parts.day,time:parts.time});
    },s.start))}
   </View>
  </View>)}
  {selected?<View style={styles.picked}>
   <Text style={styles.pickedText}>✅ {t('Horário escolhido:')} {selected.courtName}, {lisbonTime(selected.start)}. {t('O recinto ainda tem de confirmar a reserva.')}</Text>
   <Pressable accessibilityRole="button" disabled={disabled} onPress={()=>onPick(null)}><Text style={styles.link}>{t('Não reservar')}</Text></Pressable>
  </View>:null}
 </View>;
}

const styles=StyleSheet.create({
 box:{gap:8,padding:14,borderRadius:16,borderWidth:1,borderColor:'rgba(98,230,196,0.45)',backgroundColor:'rgba(98,230,196,0.06)',marginVertical:8},
 title:{color:C.white,fontWeight:'800',fontSize:15},
 muted:{color:C.muted,fontSize:13,lineHeight:19},
 error:{color:'#ffb4b4'},
 row:{gap:8,paddingVertical:4},
 wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{minHeight:38,paddingHorizontal:13,justifyContent:'center',borderRadius:999,borderWidth:1,borderColor:C.border},
 chipOn:{backgroundColor:'#62e6c4',borderColor:'#62e6c4'},
 chipText:{color:C.white,fontWeight:'700'},chipTextOn:{color:'#04212b'},
 court:{gap:6},
 courtName:{color:C.white,fontWeight:'700'},
 picked:{gap:4},
 pickedText:{color:C.white},
 link:{color:'#62e6c4',textDecorationLine:'underline',fontWeight:'700'},
});
