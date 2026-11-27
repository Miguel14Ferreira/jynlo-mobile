import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Linking,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {useFocusEffect,useRouter} from 'expo-router';
import {t,useLanguage} from '../src/lib/i18n';
import {useAuth} from '../src/lib/auth';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {C} from '../src/lib/theme';
import {bookingError,bookingStatusLabel} from '../src/components/VenueJynloBooking';
import {bookingCheckout,cancelBooking,managedVenues,markBookingPaid,myBookings,type ManagedVenue,type VenueBooking} from '../src/lib/venue-jynlo-api';
import {phoneLabel} from '../src/lib/session-payments-api';
import {canCancel,createGameParams,formatPrice,lisbonDateTime,lisbonTime} from '../src/lib/venue-jynlo-booking.cjs';
import {useBookingsOpen} from '../src/lib/use-bookings-open';

/** "As minhas reservas": court requests the person made and the venues they manage. */
export default function VenueBookingsScreen(){
 const auth=useAuth();
 const router=useRouter();
 const {language}=useLanguage();
 const bookingsOpen=useBookingsOpen();
 const [bookings,setBookings]=useState<VenueBooking[]>([]);
 const [managed,setManaged]=useState<ManagedVenue[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [askPaid,setAskPaid]=useState(0);
 const awaitingMbway=useRef(0);
 const awaitingStripe=useRef(false);
 // Back in Jynlo: after MB WAY ask "Já pagaste?"; after Stripe read the bookings again (the webhook may lag a little).
 useEffect(()=>{
  const sub=AppState.addEventListener('change',state=>{
   if(state!=='active')return;
   if(awaitingMbway.current){setAskPaid(awaitingMbway.current);awaitingMbway.current=0;}
   if(awaitingStripe.current&&auth.token){
    awaitingStripe.current=false;
    const token=auth.token;
    const refresh=()=>myBookings(token).then(setBookings).catch(()=>{});
    void refresh();setTimeout(()=>void refresh(),4000);setTimeout(()=>void refresh(),10000);
   }
  });
  return()=>sub.remove();
 },[auth.token]);

 useFocusEffect(useCallback(()=>{
  let alive=true;
  const token=auth.token;
  if(!token){setLoading(false);return()=>{alive=false;};}
  setLoading(true);setError('');
  void (async()=>{
   const [mine,venues]=await Promise.allSettled([myBookings(token),managedVenues(token)]);
   if(!alive)return;
   if(mine.status==='fulfilled')setBookings(mine.value);else setError(bookingError(mine.reason,t('Não foi possível carregar as tuas reservas.')));
   if(venues.status==='fulfilled')setManaged(venues.value);
   setLoading(false);
  })();
  return()=>{alive=false;};
 },[auth.token]));

 async function paid(b:VenueBooking,value:boolean){
  if(!auth.token||busy)return;
  setBusy(true);setError('');
  try{const updated=await markBookingPaid(b.id,auth.token,value);setAskPaid(0);setBookings(list=>list.map(x=>x.id===updated.id?updated:x));}
  catch(e){setError(bookingError(e,t('Não foi possível guardar. Tenta outra vez.')));}
  finally{setBusy(false);}
 }
 async function payOnline(b:VenueBooking){
  if(!auth.token||busy)return;
  setBusy(true);setError('');
  try{const link=await bookingCheckout(b.id,auth.token);
   if(link?.url?.startsWith('https://')){awaitingStripe.current=true;await Linking.openURL(link.url);}}
  catch(e){setError(bookingError(e,t('Não foi possível abrir o pagamento. Tenta outra vez.')));}
  finally{setBusy(false);}
 }
 /** Copies the number, opens MB WAY and, back in Jynlo, asks "Já pagaste?". */
 async function payByMbway(b:VenueBooking){
  try{await Clipboard.setStringAsync(b.mbwayPhone??'');}catch{ /* the number stays on screen */ }
  awaitingMbway.current=b.id;setAskPaid(b.id);
  try{await Linking.openURL(Platform.OS==='android'?'market://details?id=pt.sibs.android.mbway':'https://apps.apple.com/pt/app/mb-way/id918126133');}
  catch{awaitingMbway.current=0;}
 }
 async function cancel(b:VenueBooking){
  if(!auth.token||busy)return;
  setBusy(true);setError('');
  try{const updated=await cancelBooking(b.id,auth.token);setBookings(list=>list.map(x=>x.id===updated.id?updated:x));}
  catch(e){setError(bookingError(e,t('Não foi possível cancelar. Tenta novamente.')));}
  finally{setBusy(false);}
 }

 if(!auth.token)return <Page><Message>{t('Inicia sessão para veres as tuas reservas.')}</Message></Page>;
 return <Page>
  <Eyebrow>{t('Reservas de campos')}</Eyebrow>
  <Text style={styles.h1}>{t('As minhas reservas')}</Text>
  <Text style={styles.muted}>{t('Pedidos feitos na Jynlo. Recintos com o selo “Aceita reservas na Jynlo” confirmam aqui.')}</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {managed.length?<View style={styles.card}>
   <Text style={styles.h2}>{t('Recintos que geres')}</Text>
   {managed.map(v=><Pressable key={v.venueId} accessibilityRole="button" style={styles.venue}
     onPress={()=>router.push({pathname:'/venues/[id]/manage',params:{id:String(v.venueId)}})}>
    <View style={{flex:1}}><Text style={styles.strong}>{v.name}</Text><Text style={styles.muted}>{v.city}</Text></View>
    <Text style={[styles.chip,v.pendingRequests>0&&styles.chipAlert]}>
     {v.pendingRequests===1?t('1 pedido por responder'):t('{n} pedidos por responder',{n:v.pendingRequests})}</Text>
   </Pressable>)}
  </View>:null}
  <View style={styles.card}>
   <Text style={styles.h2}>{t('Os meus pedidos')}</Text>
   {!loading&&!bookings.length?<>
    {bookingsOpen?<>
     <Text style={styles.muted}>{t('Ainda não pediste nenhuma reserva. Vê os horários livres em “Reservar campo”.')}</Text>
     <Button title={t('Reservar campo')} onPress={()=>router.push('/book-court' as never)}/>
    </>:<>
     <Text style={styles.muted}>{t('Ainda não pediste nenhuma reserva. Procura um recinto com o selo “Aceita reservas na Jynlo”.')}</Text>
     <Button title={t('Ver recintos')} onPress={()=>router.push('/venues')}/>
    </>}
   </>:null}
   {bookings.map(b=><View key={b.id} style={styles.row}>
    <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/venues/[id]',params:{id:String(b.venueId)}})}>
     <Text style={styles.strong}>{b.venueName}</Text></Pressable>
    <Text style={styles.muted}>{lisbonDateTime(b.startAt)}–{lisbonTime(b.endAt)} · {b.courtName}{formatPrice(b.priceCents,language)?' · '+formatPrice(b.priceCents,language):''}</Text>
    <Text style={[styles.status,b.status==='CONFIRMED'&&styles.statusOk,(b.status==='DECLINED'||b.status==='CANCELLED')&&styles.statusOff]}>
     {bookingStatusLabel(b.status,false)}</Text>
    {b.ownerNote?<Text style={styles.note}>{t('Recinto')}: “{b.ownerNote}”</Text>:null}
    {b.status==='CONFIRMED'?(b.paidConfirmedAt?<Text style={styles.statusOk}>{t('✅ O recinto confirmou o teu pagamento.')}</Text>:<>
     {b.paymentMethod==='ONLINE'?<>
      <Button title={'💳 '+t('Pagar agora (MB WAY ou cartão)')+(formatPrice(b.priceCents,language)?' · '+formatPrice(b.priceCents,language):'')+' ↗'} disabled={busy} onPress={()=>{void payOnline(b);}}/>
      <Text style={styles.muted}>{t('Fica pago automaticamente, sem teres de avisar o recinto.')}</Text>
     </>:<>
      {b.paymentMethod==='MBWAY'&&b.mbwayPhone?<>
       <Text style={styles.muted}>{t('Paga por MB WAY ao recinto:')}</Text>
       <Text selectable style={styles.phone}>{phoneLabel(b.mbwayPhone)}</Text>
       <Button title={t('Copiar número e abrir o MB WAY')} disabled={busy} onPress={()=>{void payByMbway(b);}}/>
      </>:<Text style={styles.muted}>{t('Pagas no recinto.')}</Text>}
      {b.paidClaimedAt?<>
       <Text style={styles.muted}>{t('Disseste que já pagaste. Falta o recinto confirmar.')}</Text>
       <Button secondary title={t('Afinal ainda não paguei')} disabled={busy} onPress={()=>{void paid(b,false);}}/>
      </>:askPaid===b.id?<View style={styles.ask}>
       <Text style={styles.strong}>{t('Já pagaste {a} no MB WAY?',{a:formatPrice(b.priceCents,language)??''})}</Text>
       <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <Button title={t('Sim, já paguei')} disabled={busy} onPress={()=>{void paid(b,true);}}/>
        <Button secondary title={t('Ainda não')} disabled={busy} onPress={()=>setAskPaid(0)}/>
       </View>
      </View>:<Button title={t('Já paguei')} disabled={busy} onPress={()=>{void paid(b,true);}}/>}
     </>}
    </>):null}
    {canCancel(b)&&!b.sessionId?<Button title={t('Criar jogo neste campo')} onPress={()=>router.push({pathname:'/sessions/create',params:createGameParams(b,null)})}/>:null}
    {b.sessionId?<Button secondary title={t('Ver o jogo')} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(b.sessionId)}})}/>:null}
    {canCancel(b)?<Button secondary title={t('Cancelar pedido')} disabled={busy} onPress={()=>{void cancel(b);}}/>:null}
   </View>)}
  </View>
 </Page>;
}

const styles=StyleSheet.create({
 h1:{color:C.white,fontSize:26,fontWeight:'900',marginBottom:6},
 h2:{color:C.white,fontSize:18,fontWeight:'900'},
 card:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,marginVertical:8},
 row:{gap:6,paddingTop:10,borderTopWidth:1,borderTopColor:C.border},
 venue:{flexDirection:'row',alignItems:'center',gap:10,minHeight:52,paddingTop:10,borderTopWidth:1,borderTopColor:C.border},
 strong:{color:C.white,fontWeight:'900',fontSize:15},
 muted:{color:C.muted,fontSize:14,lineHeight:20},
 note:{color:C.white,fontStyle:'italic'},
 chip:{color:'#7ae5c5',fontWeight:'800',fontSize:12},chipAlert:{color:'#fcd34d'},
 status:{color:'#fcd34d',fontWeight:'800'},
 ask:{gap:8,padding:12,borderRadius:12,backgroundColor:'rgba(252,211,77,.12)'},
 phone:{color:C.white,fontSize:20,fontWeight:'900',letterSpacing:1},statusOk:{color:'#7ae5c5'},statusOff:{color:'#ffb4b4'}
});
