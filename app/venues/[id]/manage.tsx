import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams} from 'expo-router';
import {t,useLanguage} from '../../../src/lib/i18n';
import {useAuth} from '../../../src/lib/auth';
import {Button,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {C} from '../../../src/lib/theme';
import {bookingError,bookingStatusLabel} from '../../../src/components/VenueJynloBooking';
import {answerBooking,confirmBookingPaid,managedVenues,managerOffer,saveCourts,saveHours,saveVenuePayment,venueRequests,
 type BookingHours,type BookingOffer,type VenueBooking} from '../../../src/lib/venue-jynlo-api';
import {phoneLabel} from '../../../src/lib/session-payments-api';
import {formatPrice,lisbonDateTime,lisbonTime,parsePrice,priceField,validateHours} from '../../../src/lib/venue-jynlo-booking.cjs';

type CourtRow={id:number|null;name:string;sport:string;price:string;slotMinutes:number;active:boolean};
type Range={open:string;close:string};
const WEEKDAYS=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DURATIONS=[30,60,90,120];

/** Courts, opening hours and booking requests of a venue the person manages. */
export default function VenueManageScreen(){
 const auth=useAuth();
 const {language}=useLanguage();
 const params=useLocalSearchParams<{id:string}>();
 const venueId=typeof params.id==='string'&&/^[1-9]\d*$/.test(params.id)?Number(params.id):0;
 const [name,setName]=useState('');
 const [offer,setOffer]=useState<BookingOffer|null>(null);
 const [requests,setRequests]=useState<VenueBooking[]>([]);
 const [notes,setNotes]=useState<Record<number,string>>({});
 const [courts,setCourts]=useState<CourtRow[]>([]);
 const [week,setWeek]=useState<Range[][]>([[],[],[],[],[],[],[]]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[requestError,setRequestError]=useState('');
 const [courtsMsg,setCourtsMsg]=useState(''),[courtsError,setCourtsError]=useState('');
 const [hoursMsg,setHoursMsg]=useState(''),[hoursError,setHoursError]=useState('');
 const [payMethod,setPayMethod]=useState<'MBWAY'|'IN_PERSON'|null>(null),[payPhone,setPayPhone]=useState('');
 const [payMsg,setPayMsg]=useState(''),[payError,setPayError]=useState('');

 function applyOffer(o:BookingOffer,withHours:boolean){
  setOffer(o);
  setCourts(o.courts.map(c=>({id:c.id,name:c.name,sport:c.sport??'',price:priceField(c.priceCents),slotMinutes:c.slotMinutes,active:c.active})));
  if(withHours){setPayMethod(o.paymentMethod??null);if(o.mbwayPhone)setPayPhone(phoneLabel(o.mbwayPhone));}
  if(withHours)setWeek([1,2,3,4,5,6,7].map(d=>o.hours.filter(h=>h.dayOfWeek===d).map(h=>({open:h.openTime,close:h.closeTime}))));
 }

 useFocusEffect(useCallback(()=>{
  let alive=true;
  const token=auth.token;
  if(!token||!venueId){setLoading(false);return()=>{alive=false;};}
  setLoading(true);setError('');setOffer(null);
  void (async()=>{
   const [o,r,m]=await Promise.allSettled([managerOffer(venueId,token),venueRequests(venueId,token),managedVenues(token)]);
   if(!alive)return;
   if(o.status==='fulfilled')applyOffer(o.value,true);else setError(bookingError(o.reason,t('Não foi possível carregar a gestão do recinto.')));
   if(r.status==='fulfilled')setRequests(r.value);
   if(m.status==='fulfilled')setName(m.value.find(v=>v.venueId===venueId)?.name??'');
   setLoading(false);
  })();
  return()=>{alive=false;};
 },[auth.token,venueId]));

 async function decide(r:VenueBooking,confirm:boolean){
  if(!auth.token||busy)return;
  setBusy(true);setRequestError('');
  try{
   const updated=await answerBooking(r.id,auth.token,confirm,(notes[r.id]??'').trim()||null);
   setRequests(list=>list.map(x=>x.id===updated.id?updated:x));
  }catch(e){setRequestError(bookingError(e,t('Não foi possível responder ao pedido.')));}
  finally{setBusy(false);}
 }
 async function storePayment(){
  if(!auth.token||busy)return;
  setBusy(true);setPayError('');setPayMsg('');
  try{const o=await saveVenuePayment(venueId,auth.token,payMethod,payMethod==='MBWAY'?payPhone.trim():null);
   setPayMethod(o.paymentMethod??null);setPayMsg(t('Pagamento guardado.'));}
  catch(e){setPayError(bookingError(e,t('Não foi possível guardar. Tenta outra vez.')));}
  finally{setBusy(false);}
 }
 async function paidReceived(r:VenueBooking,paid:boolean){
  if(!auth.token||busy)return;
  setBusy(true);setRequestError('');
  try{const updated=await confirmBookingPaid(r.id,auth.token,paid);setRequests(list=>list.map(x=>x.id===updated.id?updated:x));}
  catch(e){setRequestError(bookingError(e,t('Não foi possível guardar. Tenta outra vez.')));}
  finally{setBusy(false);}
 }
 async function storeCourts(){
  if(!auth.token||busy)return;
  const input=[];
  for(const c of courts){
   const cents=parsePrice(c.price);
   if(cents===undefined){setCourtsError(t('Indica o preço em euros, por exemplo 24 ou 24,50.'));return;}
   input.push({id:c.id,name:c.name.trim(),sport:c.sport.trim()||null,priceCents:cents,slotMinutes:c.slotMinutes,active:c.active});
  }
  setBusy(true);setCourtsError('');setCourtsMsg('');
  try{applyOffer(await saveCourts(venueId,auth.token,input),false);setCourtsMsg(t('Campos guardados.'));}
  catch(e){setCourtsError(bookingError(e,t('Não foi possível guardar os campos.')));}
  finally{setBusy(false);}
 }
 async function storeHours(){
  if(!auth.token||busy)return;
  const rows:BookingHours[]=[];
  week.forEach((ranges,i)=>ranges.forEach(r=>rows.push({dayOfWeek:i+1,openTime:r.open.trim(),closeTime:r.close.trim()})));
  const problem=validateHours(rows);
  if(problem){setHoursError(problem==='format'?t('Indica as horas no formato HH:mm.'):problem==='order'?
   t('A hora de abertura tem de ser antes da hora de fecho.'):t('Há horários sobrepostos no mesmo dia.'));return;}
  setBusy(true);setHoursError('');setHoursMsg('');
  try{applyOffer(await saveHours(venueId,auth.token,rows),true);setHoursMsg(t('Horário guardado.'));}
  catch(e){setHoursError(bookingError(e,t('Não foi possível guardar o horário.')));}
  finally{setBusy(false);}
 }
 const editCourt=(i:number,patch:Partial<CourtRow>)=>setCourts(list=>list.map((c,j)=>j===i?{...c,...patch}:c));
 const editRange=(d:number,i:number,patch:Partial<Range>)=>setWeek(w=>w.map((rs,j)=>j===d?rs.map((r,k)=>k===i?{...r,...patch}:r):rs));

 if(!auth.token)return <Page><Message>{t('Inicia sessão para gerir o recinto.')}</Message></Page>;
 return <Page>
  <Eyebrow>{t('Gestão do recinto')}</Eyebrow>
  <Text style={styles.h1}>{name||t('Recinto')}</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {offer&&!error?<Text style={[styles.state,offer.acceptsBookings&&styles.stateOn]}>{offer.acceptsBookings
   ?'✓ '+t('Aceita reservas na Jynlo. Os jogadores já veem os teus horários livres.')
   :t('Ainda não aceita reservas: adiciona pelo menos um campo e o horário de funcionamento.')}</Text>:null}

  {offer&&!error?<>
  <View style={styles.card}>
   <Text style={styles.h2}>{t('Pedidos de reserva')}</Text>
   {!requests.length?<Text style={styles.muted}>{t('Ainda não há pedidos.')}</Text>:null}
   {requests.map(r=><View key={r.id} style={styles.row}>
    <Text style={styles.strong}>{lisbonDateTime(r.startAt)}–{lisbonTime(r.endAt)} · {r.courtName}</Text>
    <Text style={styles.muted}>@{r.requesterUsername}{formatPrice(r.priceCents,language)?' · '+formatPrice(r.priceCents,language):''} · {bookingStatusLabel(r.status,true)}</Text>
    {r.playerNote?<Text style={styles.note}>“{r.playerNote}”</Text>:null}
    {r.status==='CONFIRMED'?<View style={styles.payRow}>
     <Text style={[styles.muted,r.paidConfirmedAt?{color:'#7ae5c5',fontWeight:'800'}:r.paidClaimedAt?{color:'#fcd34d'}:null]}>
      {r.paidConfirmedAt?t('✅ Pago'):r.paidClaimedAt?t('⏳ Diz que pagou'):t('Por pagar')}</Text>
     <Button secondary={!!r.paidConfirmedAt} title={r.paidConfirmedAt?t('Anular'):t('Pagamento recebido')} disabled={busy}
      onPress={()=>{void paidReceived(r,!r.paidConfirmedAt);}}/>
    </View>:null}
    {r.status==='PENDING'?<>
     <TextInput value={notes[r.id]??''} onChangeText={v=>setNotes(n=>({...n,[r.id]:v}))} maxLength={300}
      placeholder={t('Mensagem (opcional)')} placeholderTextColor={C.muted} accessibilityLabel={t('Mensagem para o jogador')} style={styles.input}/>
     <Button title={t('Confirmar')} disabled={busy} onPress={()=>{void decide(r,true);}}/>
     <Button secondary title={t('Recusar')} disabled={busy} onPress={()=>{void decide(r,false);}}/>
    </>:null}
   </View>)}
   {requestError?<Text style={styles.error}>{requestError}</Text>:null}
  </View>

  <View style={styles.card}>
   <Text style={styles.h2}>{t('Campos')}</Text>
   <Text style={styles.muted}>{t('O preço é por reserva e pago no recinto. Deixa em branco se preferires combinar no local.')}</Text>
   {courts.map((c,i)=><View key={i} style={styles.row}>
    <TextInput value={c.name} onChangeText={v=>editCourt(i,{name:v})} maxLength={80} placeholder={t('Ex.: Campo 1')}
     placeholderTextColor={C.muted} accessibilityLabel={t('Nome')} style={styles.input}/>
    <TextInput value={c.sport} onChangeText={v=>editCourt(i,{sport:v})} maxLength={80} placeholder={t('Ex.: Padel')}
     placeholderTextColor={C.muted} accessibilityLabel={t('Modalidade')} style={styles.input}/>
    <TextInput value={c.price} onChangeText={v=>editCourt(i,{price:v})} maxLength={8} keyboardType="decimal-pad"
     placeholder={t('Preço (€)')} placeholderTextColor={C.muted} accessibilityLabel={t('Preço (€)')} style={styles.input}/>
    <View style={styles.chips}>
     {DURATIONS.map(m=><Pressable key={m} accessibilityRole="button" accessibilityState={{selected:c.slotMinutes===m}}
       onPress={()=>editCourt(i,{slotMinutes:m})} style={[styles.chip,c.slotMinutes===m&&styles.chipOn]}>
      <Text style={[styles.chipText,c.slotMinutes===m&&styles.chipTextOn]}>{t('{n} min',{n:m})}</Text>
     </Pressable>)}
    </View>
    <View style={styles.switchRow}>
     <Text style={styles.muted}>{t('Disponível')}</Text>
     <Switch value={c.active} onValueChange={v=>editCourt(i,{active:v})} accessibilityLabel={t('Disponível')}/>
    </View>
   </View>)}
   <Button secondary title={'＋ '+t('Adicionar campo')}
    onPress={()=>setCourts(list=>[...list,{id:null,name:t('Campo {n}',{n:list.length+1}),sport:'',price:'',slotMinutes:60,active:true}])}/>
   <Button title={t('Guardar campos')} disabled={busy} onPress={()=>{void storeCourts();}}/>
   {courtsMsg?<Text style={styles.ok}>{courtsMsg}</Text>:null}
   {courtsError?<Text style={styles.error}>{courtsError}</Text>:null}
  </View>

  <View style={styles.card}>
   <Text style={styles.h2}>{t('Pagamento das reservas')}</Text>
   <Text style={styles.muted}>{t('Recebe por MB WAY no teu número ou no local. A Jynlo não recebe nem guarda dinheiro.')}</Text>
   <View style={styles.chips}>
    {(['MBWAY','IN_PERSON'] as const).map(m=><Pressable key={m} accessibilityRole="radio" accessibilityState={{checked:payMethod===m}}
      onPress={()=>setPayMethod(m)} style={[styles.chip,payMethod===m&&styles.chipOn]}>
     <Text style={[styles.chipText,payMethod===m&&styles.chipTextOn]}>{m==='MBWAY'?'📱 '+t('MB WAY'):'🤝 '+t('No local')}</Text>
    </Pressable>)}
   </View>
   {payMethod==='MBWAY'?<>
    <TextInput value={payPhone} onChangeText={setPayPhone} maxLength={20} keyboardType="phone-pad" placeholder="912 345 678"
     placeholderTextColor={C.muted} accessibilityLabel={t('Número MB WAY do recinto')} style={styles.input}/>
    <Text style={styles.muted}>{t('Só quem tem uma reserva confirmada vê este número.')}</Text>
   </>:null}
   <Button title={t('Guardar pagamento')} disabled={busy||!payMethod} onPress={()=>{void storePayment();}}/>
   {payMsg?<Text style={styles.ok}>{payMsg}</Text>:null}
   {payError?<Text style={styles.error}>{payError}</Text>:null}
  </View>
  <View style={styles.card}>
   <Text style={styles.h2}>{t('Horário de funcionamento')}</Text>
   <Text style={styles.muted}>{t('Os horários livres são criados a partir deste horário e da duração de cada campo.')}</Text>
   {week.map((ranges,d)=><View key={d} style={styles.row}>
    <Text style={styles.strong}>{t(WEEKDAYS[d]??'')}</Text>
    {!ranges.length?<Text style={styles.muted}>{t('Fechado')}</Text>:null}
    {ranges.map((r,i)=><View key={i} style={styles.range}>
     <TextInput value={r.open} onChangeText={v=>editRange(d,i,{open:v})} maxLength={5} placeholder="09:00"
      placeholderTextColor={C.muted} accessibilityLabel={t('Abre')} style={[styles.input,styles.time]}/>
     <Text style={styles.muted}>–</Text>
     <TextInput value={r.close} onChangeText={v=>editRange(d,i,{close:v})} maxLength={5} placeholder="22:00"
      placeholderTextColor={C.muted} accessibilityLabel={t('Fecha')} style={[styles.input,styles.time]}/>
     <Pressable accessibilityRole="button" accessibilityLabel={t('Retirar período')} style={styles.remove}
      onPress={()=>setWeek(w=>w.map((rs,j)=>j===d?rs.filter((_,k)=>k!==i):rs))}><Text style={styles.removeText}>×</Text></Pressable>
    </View>)}
    {ranges.length<3?<Pressable accessibilityRole="button" style={styles.addRange}
      onPress={()=>setWeek(w=>w.map((rs,j)=>j===d?[...rs,{open:'09:00',close:'22:00'}]:rs))}>
     <Text style={styles.linkText}>＋ {t('Período')}</Text></Pressable>:null}
   </View>)}
   <Button secondary title={t('Copiar segunda para todos os dias')} onPress={()=>setWeek(w=>w.map((rs,j)=>j===0?rs:(w[0]??[]).map(r=>({...r}))))}/>
   <Button title={t('Guardar horário')} disabled={busy} onPress={()=>{void storeHours();}}/>
   {hoursMsg?<Text style={styles.ok}>{hoursMsg}</Text>:null}
   {hoursError?<Text style={styles.error}>{hoursError}</Text>:null}
  </View>
  </>:null}
 </Page>;
}

const styles=StyleSheet.create({
 h1:{color:C.white,fontSize:26,fontWeight:'900',marginBottom:6},
 h2:{color:C.white,fontSize:18,fontWeight:'900'},
 state:{color:'#fcd34d',fontWeight:'800',fontSize:14,lineHeight:20,marginBottom:10},stateOn:{color:'#7ae5c5'},
 card:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,marginBottom:14},
 row:{gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:C.border},
 strong:{color:C.white,fontWeight:'900',fontSize:15},
 muted:{color:C.muted,fontSize:14,lineHeight:20},
 note:{color:C.white,fontStyle:'italic'},
 input:{minHeight:46,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.background,color:C.white,fontSize:15},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.border},
 chipOn:{backgroundColor:'#62e6c4',borderColor:'#62e6c4'},
 chipText:{color:C.white,fontWeight:'800'},chipTextOn:{color:'#063a35'},
 switchRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},
 range:{flexDirection:'row',alignItems:'center',gap:8},
 time:{width:86,textAlign:'center'},
 remove:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.border},
 removeText:{color:C.white,fontSize:20,fontWeight:'800'},
 addRange:{minHeight:44,justifyContent:'center'},
 linkText:{color:'#7ae5c5',fontWeight:'800',fontSize:15},
 ok:{color:'#7ae5c5',fontWeight:'800'},
 payRow:{gap:8},
 error:{color:'#ffb4b4',fontSize:14}
});
