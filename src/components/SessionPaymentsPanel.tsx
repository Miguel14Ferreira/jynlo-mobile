import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {AppState,Linking,Platform,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {Button,Message} from './UI';
import {C} from '../lib/theme';
import {money} from '../lib/format.cjs';
import {claimPayment,confirmPayment,onlinePaymentOnboarding,onlinePaymentStatus,phoneLabel,reminderBlocked,remindUnpaid,sessionPayments,setPaymentMethod,startOnlinePayment,type OnlinePaymentStatus,type SessionPayments} from '../lib/session-payments-api';

/**
 * "Quem já pagou?" for a paid session. Players pay the organiser directly
 * (MB WAY or in person); Jynlo only keeps the list.
 */
export default function SessionPaymentsPanel({sessionId,token}:{sessionId:number;token:string|null}){
 const [data,setData]=useState<SessionPayments|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[phone,setPhone]=useState(''),[mbwayDraft,setMbwayDraft]=useState(false);
 const [online,setOnline]=useState<OnlinePaymentStatus|null>(null),[onlineDraft,setOnlineDraft]=useState(false);
 const identity=useRef('');
 const awaitingReturn=useRef(false);
 const [askPaid,setAskPaid]=useState(false);
 const awaitingMbway=useRef(false);
 // Back from Stripe (payment page or the organiser's sign-up): the server already knows, so read it again.
 useEffect(()=>{
  const sub=AppState.addEventListener('change',state=>{
   if(state==='active'&&awaitingMbway.current){awaitingMbway.current=false;setAskPaid(true);}
   if(state!=='active'||!awaitingReturn.current)return;
   awaitingReturn.current=false;
   const key=identity.current;
   const refresh=()=>sessionPayments(sessionId,token).then(r=>{if(identity.current===key)apply(r);}).catch(()=>{});
   void refresh();setTimeout(()=>void refresh(),4000);
   onlinePaymentStatus(token).then(st=>{if(identity.current===key)setOnline(st);}).catch(()=>{});
  });
  return()=>sub.remove();
 },[sessionId,token]);
 useEffect(()=>{
  const key=sessionId+'|'+token;identity.current=key;setData(null);setError('');
  sessionPayments(sessionId,token).then(result=>{if(identity.current===key)apply(result);})
   .catch(()=>{if(identity.current===key)setError(t('Não foi possível carregar os pagamentos.'));});
 },[sessionId,token]);
 function apply(result:SessionPayments){
  setData(result);
  if(result.organiser){
   if(result.mbwayPhone)setPhone(phoneLabel(result.mbwayPhone));
   setMbwayDraft(result.method==='MBWAY');
   setOnlineDraft(result.method==='ONLINE');
   onlinePaymentStatus(token).then(setOnline).catch(()=>{ /* in-app payments simply stay hidden */ });
  }
 }
 async function run(action:()=>Promise<SessionPayments>){
  if(busy)return;
  const key=identity.current;setBusy(true);setError('');
  try{const result=await action();if(identity.current===key)apply(result);}
  catch(e){if(identity.current===key)setError(e instanceof Error&&e.message?e.message:t('Não foi possível guardar. Tenta outra vez.'));}
  finally{setBusy(false);}
 }
 async function openStripe(action:()=>Promise<{url:string}>){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const link=await action();
   if(link?.url?.startsWith('https://')){awaitingReturn.current=true;await Linking.openURL(link.url);}
  }catch(e){setError(e instanceof Error&&e.message?e.message:t('Não foi possível abrir o pagamento. Tenta outra vez.'));}
  finally{setBusy(false);}
 }
 /** Copies the number, opens MB WAY and, back in Jynlo, asks "Já pagaste?" with a one-tap answer. */
 async function payByMbway(phoneNumber:string){
  try{await Clipboard.setStringAsync(phoneNumber);}catch{ /* the number stays on screen */ }
  awaitingMbway.current=true;
  setAskPaid(true);
  try{await Linking.openURL(Platform.OS==='android'?'market://details?id=pt.sibs.android.mbway':'https://apps.apple.com/pt/app/mb-way/id918126133');}
  catch{awaitingMbway.current=false;}
 }
 if(!data)return error?<Message>{error}</Message>:null;
 const amount=money(data.priceAmount??0);
 const pending=data.playerCount-data.confirmedCount;
 return <View style={styles.panel} accessibilityLabel={t('Pagamentos')}>
  <View style={styles.head}>
   <Text style={styles.title}>{t('💶 Pagamentos')}</Text>
   <Text style={styles.count} accessibilityRole="text">{t('{a} de {b} pagos',{a:data.confirmedCount,b:data.playerCount})}</Text>
  </View>
  {data.organiser?<>
   <Text style={styles.label}>{t('Como se paga este jogo?')}</Text>
   <View style={styles.row}>
    <Choice label={t('📱 MB WAY para mim')} selected={mbwayDraft} disabled={busy} onPress={()=>{setOnlineDraft(false);setMbwayDraft(true);}}/>
    <Choice label={t('🤝 Em mão, no dia')} selected={!mbwayDraft&&!onlineDraft&&data.method==='IN_PERSON'} disabled={busy}
     onPress={()=>{setMbwayDraft(false);setOnlineDraft(false);if(data.method!=='IN_PERSON')void run(()=>setPaymentMethod(sessionId,'IN_PERSON',null,token));}}/>
    {online?.available?<Choice label={t('💳 Na app (MB WAY ou cartão)')} selected={onlineDraft} disabled={busy}
     onPress={()=>{setMbwayDraft(false);setOnlineDraft(true);if(online.chargesEnabled&&data.method!=='ONLINE')void run(()=>setPaymentMethod(sessionId,'ONLINE',null,token));}}/>:null}
   </View>
   {onlineDraft?(online?.chargesEnabled
    ?<Text style={styles.muted}>{data.method==='ONLINE'?t('Os jogadores pagam na app e ficam marcados como pagos automaticamente.')
     :t('Os jogadores pagam aqui na Jynlo e ficam marcados como pagos automaticamente. O dinheiro vai direto para a tua conta Stripe, que cobra 1,5% + 0,25 € por pagamento.')}</Text>
    :<>
     <Text style={styles.muted}>{t('Os jogadores pagam aqui na Jynlo e ficam marcados como pagos automaticamente. O dinheiro vai direto para a tua conta Stripe, que cobra 1,5% + 0,25 € por pagamento.')}</Text>
     <Button title={t('Ativar pagamentos na app')+' ↗'} disabled={busy} onPress={()=>void openStripe(()=>onlinePaymentOnboarding(sessionId,token))}/>
     <Text style={styles.muted}>{t('Abre o formulário do Stripe (identificação e IBAN). Demora uns 5 minutos e só tens de o fazer uma vez.')}</Text>
    </>):null}
   {mbwayDraft?<>
    <Text style={styles.label}>{t('O teu número MB WAY para receberes')}</Text>
    <TextInput value={phone} onChangeText={setPhone} placeholder="912 345 678" placeholderTextColor={C.muted}
     keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!busy} style={styles.input} accessibilityLabel={t('Número MB WAY')}/>
    <Button title={t('Guardar número')} disabled={busy||!phone.trim()} onPress={()=>void run(()=>setPaymentMethod(sessionId,'MBWAY',phone.trim(),token))}/>
    <Text style={styles.muted}>{t('Só os jogadores inscritos veem este número.')}</Text>
   </>:null}
   {data.players.length===0?<Text style={styles.muted}>{t('Ainda não há jogadores inscritos.')}</Text>:
    data.players.map(player=><View key={player.username} style={styles.player}>
     <Text style={styles.name} numberOfLines={1}>{player.username}</Text>
     <Text style={[styles.state,player.confirmedAt?styles.paid:player.claimedAt?styles.claimed:null]}>
      {player.confirmedAt?t('✅ Pago'):player.claimedAt?t('⏳ Diz que pagou'):t('Por pagar')}</Text>
     <Pressable accessibilityRole="button" disabled={busy} style={[styles.small,!player.confirmedAt&&styles.smallPrimary]}
      accessibilityLabel={player.confirmedAt?t('Anular pagamento de {user}',{user:player.username}):t('Marcar como pago: {user}',{user:player.username})}
      onPress={()=>void run(()=>confirmPayment(sessionId,player.username,!player.confirmedAt,token))}>
      <Text style={[styles.smallText,!player.confirmedAt&&styles.smallTextPrimary]}>{player.confirmedAt?t('Anular'):t('Marcar pago')}</Text>
     </Pressable>
    </View>)}
   {data.method&&pending>0?(reminderBlocked(data.lastReminderAt)
    ?<Text style={styles.muted}>{t('🔔 Lembrete enviado. Podes voltar a lembrar daqui a 12 horas.')}</Text>
    :<Button secondary title={t('🔔 Lembrar quem falta ({a})',{a:pending})} disabled={busy} onPress={()=>void run(()=>remindUnpaid(sessionId,token))}/>):null}
  </>:<>
   {data.me?.confirmedAt?<Text style={styles.ok}>{t('✅ O organizador confirmou o teu pagamento.')}</Text>:<>
    {data.method==='ONLINE'?<>
      <Button title={'💳 '+t('Pagar {a} na app',{a:amount})+' ↗'} disabled={busy} onPress={()=>void openStripe(()=>startOnlinePayment(sessionId,token))}/>
      <Text style={styles.muted}>{t('MB WAY ou cartão. Fica marcado como pago automaticamente.')}</Text>
     </>
     :data.method==='IN_PERSON'?<Text style={styles.text}>{t('Paga {a} ao organizador no dia do jogo.',{a:amount})}</Text>
     :data.mbwayPhone?<>
      <Text style={styles.text}>{t('Paga {a} por MB WAY ao organizador:',{a:amount})}</Text>
      {data.payee?.fullName||data.payee?.username?<Text style={styles.muted}>{t('Número de')} <Text style={styles.text}>{data.payee?.fullName||data.payee?.username}</Text>{data.payee?.fullName&&data.payee?.username?' · @'+data.payee.username:''}</Text>:null}
      <Text selectable style={styles.phone}>{phoneLabel(data.mbwayPhone)}</Text>
      <Button title={t('Copiar número e abrir o MB WAY')} disabled={busy} onPress={()=>void payByMbway(data.mbwayPhone!)}/>
      <Text style={styles.muted}>{t('No MB WAY: Enviar dinheiro, colar o número e pôr {a}.',{a:amount})}</Text>
     </>:<Text style={styles.muted}>{t('O organizador ainda não indicou como pagar.')}</Text>}
    {data.method==='ONLINE'?null:askPaid&&!data.me?.claimedAt?<View style={styles.ask}>
     <Text style={styles.label}>{t('Já pagaste {a} no MB WAY?',{a:amount})}</Text>
     <View style={styles.row}>
      <Button title={t('Sim, já paguei')} disabled={busy} onPress={()=>{setAskPaid(false);void run(()=>claimPayment(sessionId,true,token));}}/>
      <Button secondary title={t('Ainda não')} disabled={busy} onPress={()=>setAskPaid(false)}/>
     </View>
    </View>:data.me?.claimedAt?<>
     <Text style={styles.muted}>{t('⏳ Disseste que já pagaste. Falta o organizador confirmar.')}</Text>
     <Button secondary title={t('Afinal ainda não paguei')} disabled={busy} onPress={()=>void run(()=>claimPayment(sessionId,false,token))}/>
    </>:<Button title={t('Já paguei')} disabled={busy} onPress={()=>void run(()=>claimPayment(sessionId,true,token))}/>}
   </>}
  </>}
  {error?<Text style={styles.error} accessibilityRole="alert">{error}</Text>:null}
  <Text style={styles.muted}>{t('O pagamento é feito diretamente ao organizador. A Jynlo não recebe nem guarda dinheiro.')}</Text>
 </View>;
}

function Choice({label,selected,disabled,onPress}:{label:string;selected:boolean;disabled:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected,disabled}} disabled={disabled} onPress={onPress}
  style={[styles.choice,selected&&styles.choiceSelected]}><Text style={[styles.choiceText,selected&&styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

const styles=StyleSheet.create({
 panel:{gap:10,padding:16,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 title:{color:C.white,fontSize:18,fontWeight:'900'},
 count:{color:C.mint,fontSize:13,fontWeight:'900'},
 label:{color:C.white,fontSize:14,fontWeight:'800'},
 text:{color:C.white,fontSize:15},
 muted:{color:C.muted,fontSize:12},
 ok:{color:C.mint,fontSize:15,fontWeight:'900'},
 ask:{gap:8,padding:12,borderRadius:14,borderWidth:1,borderColor:C.mint,backgroundColor:'rgba(111,240,212,.1)'},
 error:{color:'#ffb4a8',fontSize:13},
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 phone:{color:C.white,fontSize:22,fontWeight:'900',letterSpacing:1},
 input:{minHeight:48,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.background,color:C.white,fontSize:16},
 choice:{minHeight:44,paddingHorizontal:14,borderRadius:22,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 choiceSelected:{backgroundColor:C.mint,borderColor:C.mint},
 choiceText:{color:C.white,fontSize:14,fontWeight:'800'},
 choiceTextSelected:{color:C.background},
 player:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:10,borderRadius:12,backgroundColor:'rgba(255,255,255,.04)'},
 name:{flex:1,color:C.white,fontSize:15,fontWeight:'800'},
 state:{color:C.muted,fontSize:12},
 paid:{color:C.mint,fontWeight:'900'},
 claimed:{color:'#ffd27a'},
 small:{minHeight:40,paddingHorizontal:12,borderRadius:20,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 smallPrimary:{backgroundColor:C.mint,borderColor:C.mint},
 smallText:{color:C.white,fontSize:13,fontWeight:'800'},
 smallTextPrimary:{color:C.background},
});
