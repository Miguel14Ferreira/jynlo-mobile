import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t,useLanguage} from '../lib/i18n';
import {ApiError} from '../lib/api';
import {Button} from './UI';
import {C} from '../lib/theme';
import {bookingOffer,bookingSlots,claimVenue,managementStatus,requestBooking,venuePosterUrl,
 type BookingOffer,type BookingSlot,type BookingStatus,type CourtSlots,type DaySlots,type ManagementStatus} from '../lib/venue-jynlo-api';
import {formatPrice,lisbonTime,nextLisbonDays} from '../lib/venue-jynlo-booking.cjs';

export function bookingError(e:unknown,fallback:string):string{
 return e instanceof ApiError&&e.status>=400&&e.status<500&&e.message?e.message:fallback;
}

export function bookingStatusLabel(status:BookingStatus,forVenue:boolean):string{
 if(status==='PENDING')return forVenue?t('Por responder'):t('À espera do recinto');
 if(status==='CONFIRMED')return t('Confirmada');
 if(status==='DECLINED')return t('Recusada');
 return t('Cancelada');
}

/**
 * On a venue: book a free slot on Jynlo when the venue takes bookings, and
 * "Sou o responsável por este recinto" so the person running it can manage it.
 */
export default function VenueJynloBooking({venueId,token,sessionId}:{venueId:number;token:string|null;sessionId:number|null}){
 const router=useRouter();
 const {language}=useLanguage();
 const days=useMemo(()=>nextLisbonDays(14),[]);
 const [offer,setOffer]=useState<BookingOffer|null>(null);
 const [status,setStatus]=useState<ManagementStatus|null>(null);
 const [day,setDay]=useState<string>(days[0]??'');
 const [slots,setSlots]=useState<DaySlots|null>(null);
 const [loadingSlots,setLoadingSlots]=useState(false),[slotsError,setSlotsError]=useState('');
 const [picked,setPicked]=useState<{court:CourtSlots;slot:BookingSlot}|null>(null);
 const [note,setNote]=useState(''),[sending,setSending]=useState(false),[sent,setSent]=useState(false),[sendError,setSendError]=useState('');
 const [claimOpen,setClaimOpen]=useState(false),[claimRole,setClaimRole]=useState(''),[claimPhone,setClaimPhone]=useState('');
 const [claiming,setClaiming]=useState(false),[claimError,setClaimError]=useState('');

 const loadSlots=useCallback(async(d:string)=>{
  setLoadingSlots(true);setSlotsError('');
  try{setSlots(await bookingSlots(venueId,d));}
  catch(e){setSlotsError(bookingError(e,t('Não foi possível carregar os horários.')));}
  finally{setLoadingSlots(false);}
 },[venueId]);

 useEffect(()=>{
  let alive=true;setOffer(null);setStatus(null);setSlots(null);setPicked(null);
  bookingOffer(venueId).then(o=>{if(!alive)return;setOffer(o);if(o.acceptsBookings)void loadSlots(days[0]??'');}).catch(()=>{/* optional */});
  if(token)managementStatus(venueId,token).then(s=>{if(alive)setStatus(s);}).catch(()=>{/* optional */});
  return()=>{alive=false;};
 },[venueId,token,loadSlots,days]);

 function dayLabel(d:string){
  if(d===days[0])return t('Hoje');
  if(d===days[1])return t('Amanhã');
  return new Intl.DateTimeFormat(language==='en'?'en-GB':'pt-PT',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'UTC'})
   .format(new Date(d+'T12:00:00Z'));
 }
 function courtMeta(c:CourtSlots){
  return [c.sport,t('{n} min',{n:c.slotMinutes}),formatPrice(c.priceCents,language)].filter(Boolean).join(' · ');
 }
 async function send(){
  if(!picked||!token||sending)return;
  setSending(true);setSendError('');
  try{
   await requestBooking(venueId,token,picked.court.courtId,picked.slot.start,note.trim()||null,sessionId);
   setSent(true);setPicked(null);setNote('');void loadSlots(day);
  }catch(e){setSendError(bookingError(e,t('Não foi possível enviar o pedido. Tenta novamente.')));}
  finally{setSending(false);}
 }
 async function claim(){
  if(!token||claiming)return;
  setClaiming(true);setClaimError('');
  try{
   await claimVenue(venueId,token,claimRole.trim(),claimPhone.trim()||null);
   setClaimOpen(false);
   setStatus(s=>({manager:false,decisionNote:null,acceptsBookings:s?.acceptsBookings??false,claimStatus:'PENDING'}));
  }catch(e){setClaimError(bookingError(e,t('Não foi possível enviar o pedido. Tenta novamente.')));}
  finally{setClaiming(false);}
 }

 const price=picked?formatPrice(picked.court.priceCents,language):null;
 return <View style={{gap:12}}>
  {offer?.acceptsBookings?<View style={styles.panel}>
   <View style={styles.head}>
    <Text style={styles.title}>{t('Reservar na Jynlo')}</Text>
    <Text style={styles.badge}>✓ {t('Aceita reservas na Jynlo')}</Text>
   </View>
   <Text style={styles.hint}>{t('Escolhe o dia e o horário. O recinto confirma o pedido e pagas no local.')}</Text>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
    {days.map(d=><Pressable key={d} accessibilityRole="button" accessibilityState={{selected:d===day}}
      onPress={()=>{if(d===day)return;setDay(d);setPicked(null);void loadSlots(d);}} style={[styles.day,d===day&&styles.dayOn]}>
     <Text style={[styles.dayText,d===day&&styles.dayTextOn]}>{dayLabel(d)}</Text>
    </Pressable>)}
   </ScrollView>
   {loadingSlots?<Text style={styles.hint}>{t('A procurar horários…')}</Text>:null}
   {slotsError?<Text style={styles.error}>{slotsError}</Text>:null}
   {slots&&!loadingSlots?slots.courts.map(c=><View key={c.courtId} style={styles.court}>
    <Text style={styles.courtName}>{c.name}</Text>
    <Text style={styles.hint}>{courtMeta(c)}</Text>
    {c.slots.some(s=>s.free)?<View style={styles.slots}>
     {c.slots.map(s=>{const on=picked?.court.courtId===c.courtId&&picked.slot.start===s.start;
      return <Pressable key={s.start} accessibilityRole="button" disabled={!s.free}
       accessibilityLabel={s.free?t('Escolher {v}',{v:lisbonTime(s.start)}):t('{v} ocupado',{v:lisbonTime(s.start)})}
       accessibilityState={{disabled:!s.free,selected:on}}
       onPress={()=>{setPicked({court:c,slot:s});setSent(false);setSendError('');}}
       style={[styles.slot,!s.free&&styles.slotTaken,on&&styles.slotOn]}>
       <Text style={[styles.slotText,!s.free&&styles.slotTextTaken,on&&styles.slotTextOn]}>{lisbonTime(s.start)}</Text>
      </Pressable>;})}
    </View>:<Text style={styles.hint}>{t('Sem horários livres neste dia.')}</Text>}
   </View>):null}
   {picked?<View style={styles.confirm}>
    <Text style={styles.courtName}>{picked.court.name} · {dayLabel(day)} · {lisbonTime(picked.slot.start)}–{lisbonTime(picked.slot.end)}</Text>
    <Text style={styles.hint}>{offer?.paymentMethod==='MBWAY'?(price??t('Preço no recinto')):price?t('{price} · pagas no recinto',{price}):t('Preço no recinto')}</Text>
    {offer?.paymentMethod==='MBWAY'?<Text style={styles.hint}>📱 {t('Depois de o recinto confirmar, pagas por MB WAY ao recinto.')}</Text>:null}
    {token?<>
     <TextInput value={note} onChangeText={setNote} maxLength={300} multiline placeholder={t('Mensagem para o recinto (opcional)')}
      placeholderTextColor={C.muted} accessibilityLabel={t('Mensagem para o recinto (opcional)')} style={[styles.input,{minHeight:64}]}/>
     <Button title={sending?t('A enviar…'):t('Pedir reserva')} disabled={sending} onPress={()=>{void send();}}/>
     <Button secondary title={t('Cancelar')} disabled={sending} onPress={()=>setPicked(null)}/>
    </>:<Button title={t('Entra para pedir a reserva')} onPress={()=>router.push('/login')}/>}
   </View>:null}
   {sent?<View style={{gap:8}}>
    <Text style={styles.ok}>✓ {t('Pedido enviado. O recinto vai confirmar e recebes uma notificação.')}</Text>
    <Button secondary title={t('Ver as minhas reservas')} onPress={()=>router.push('/venue-bookings')}/>
   </View>:null}
   {sendError?<Text style={styles.error}>{sendError}</Text>:null}
  </View>:null}
  {token&&status?<View style={{gap:8}}>
   {status.manager||status.adminSetup?<>
     <Button secondary title={status.manager?t('Gerir campos e reservas'):t('Configurar campos e horário (administração)')}
      onPress={()=>router.push({pathname:'/venues/[id]/manage',params:{id:String(venueId)}})}/>
     <Button secondary title={t('Cartaz com código QR')+' ↗'}
      onPress={()=>{Linking.openURL(venuePosterUrl(venueId)).catch(()=>{ /* no browser available */ });}}/>
    </>
   :status.claimStatus==='PENDING'?<Text style={styles.hint}>{t('O teu pedido para gerir este recinto está a ser analisado.')}</Text>
   :!claimOpen?<>
     <Pressable accessibilityRole="button" onPress={()=>setClaimOpen(true)} style={styles.link}>
      <Text style={styles.linkText}>{t('Sou o responsável por este recinto')}</Text>
     </Pressable>
     {status.claimStatus==='REJECTED'?<Text style={styles.hint}>{t('O teu último pedido não foi aprovado.')}{status.decisionNote?' '+status.decisionNote:''}</Text>:null}
   </>:<View style={styles.confirm}>
     <Text style={styles.courtName}>{t('Gerir este recinto na Jynlo')}</Text>
     <Text style={styles.hint}>{t('Depois de aprovado, podes adicionar os campos e o horário e receber pedidos de reserva.')}</Text>
     <TextInput value={claimRole} onChangeText={setClaimRole} maxLength={300} multiline
      placeholder={t('Qual é a tua ligação ao recinto?')} placeholderTextColor={C.muted}
      accessibilityLabel={t('Qual é a tua ligação ao recinto?')} style={[styles.input,{minHeight:72}]}/>
     <TextInput value={claimPhone} onChangeText={setClaimPhone} maxLength={40} keyboardType="phone-pad"
      placeholder={t('Telefone para confirmarmos (opcional)')} placeholderTextColor={C.muted}
      accessibilityLabel={t('Telefone para confirmarmos (opcional)')} style={styles.input}/>
     <Button title={claiming?t('A enviar…'):t('Enviar pedido')} disabled={claiming||claimRole.trim().length<10} onPress={()=>{void claim();}}/>
     <Button secondary title={t('Cancelar')} disabled={claiming} onPress={()=>setClaimOpen(false)}/>
     {claimError?<Text style={styles.error}>{claimError}</Text>:null}
   </View>}
  </View>:null}
 </View>;
}

const styles=StyleSheet.create({
 panel:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:'rgba(94,230,200,0.5)',backgroundColor:C.surface},
 head:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:8},
 title:{color:C.white,fontSize:18,fontWeight:'900'},
 badge:{color:'#063a35',backgroundColor:'#62e6c4',borderRadius:999,paddingHorizontal:10,paddingVertical:3,fontSize:12,fontWeight:'800',overflow:'hidden'},
 hint:{color:C.muted,fontSize:14,lineHeight:20},
 day:{minHeight:44,paddingHorizontal:14,justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:C.border},
 dayOn:{backgroundColor:'#62e6c4',borderColor:'#62e6c4'},
 dayText:{color:C.white,fontWeight:'800',fontSize:14},dayTextOn:{color:'#063a35'},
 court:{gap:6,paddingTop:10,borderTopWidth:1,borderTopColor:C.border},
 courtName:{color:C.white,fontSize:16,fontWeight:'900'},
 slots:{flexDirection:'row',flexWrap:'wrap',gap:8},
 slot:{minWidth:68,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'rgba(94,230,200,0.5)'},
 slotTaken:{opacity:0.35},slotOn:{backgroundColor:'#62e6c4'},
 slotText:{color:C.white,fontWeight:'800',fontSize:15},slotTextTaken:{textDecorationLine:'line-through'},slotTextOn:{color:'#063a35'},
 confirm:{gap:10,padding:14,borderRadius:14,backgroundColor:C.background},
 input:{minHeight:46,paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,color:C.white,fontSize:15,textAlignVertical:'top'},
 ok:{color:'#7ae5c5',fontWeight:'800',fontSize:15},
 error:{color:'#ffb4b4',fontSize:14},
 link:{minHeight:44,justifyContent:'center'},
 linkText:{color:'#7ae5c5',fontWeight:'800',fontSize:15,textDecorationLine:'underline'}
});
