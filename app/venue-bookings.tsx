import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {t,useLanguage} from '../src/lib/i18n';
import {useAuth} from '../src/lib/auth';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {C} from '../src/lib/theme';
import {bookingError,bookingStatusLabel} from '../src/components/VenueJynloBooking';
import {cancelBooking,managedVenues,markBookingPaid,myBookings,type ManagedVenue,type VenueBooking} from '../src/lib/venue-jynlo-api';
import {phoneLabel} from '../src/lib/session-payments-api';
import {Share} from 'react-native';
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
  try{const updated=await markBookingPaid(b.id,auth.token,value);setBookings(list=>list.map(x=>x.id===updated.id?updated:x));}
  catch(e){setError(bookingError(e,t('Não foi possível guardar. Tenta outra vez.')));}
  finally{setBusy(false);}
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
  <Text style={styles.muted}>{t('Pedidos feitos na Jynlo. Recintos com o selo “Aceita reservas na Jynlo” confirmam aqui; pagas no local.')}</Text>
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
     {b.paymentMethod==='MBWAY'&&b.mbwayPhone?<>
      <Text style={styles.muted}>{t('Paga por MB WAY ao recinto:')}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}>
       <Text selectable style={styles.phone}>{phoneLabel(b.mbwayPhone)}</Text>
       <Button secondary title={t('Partilhar número')} onPress={()=>void Share.share({message:b.mbwayPhone!})}/>
      </View>
     </>:<Text style={styles.muted}>{t('Pagas no recinto.')}</Text>}
     {b.paidClaimedAt?<>
      <Text style={styles.muted}>{t('Disseste que já pagaste. Falta o recinto confirmar.')}</Text>
      <Button secondary title={t('Afinal ainda não paguei')} disabled={busy} onPress={()=>{void paid(b,false);}}/>
     </>:<Button title={t('Já paguei')} disabled={busy} onPress={()=>{void paid(b,true);}}/>}
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
 phone:{color:C.white,fontSize:20,fontWeight:'900',letterSpacing:1},statusOk:{color:'#7ae5c5'},statusOff:{color:'#ffb4b4'}
});
