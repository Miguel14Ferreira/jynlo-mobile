import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Share,StyleSheet,Text,TextInput,View} from 'react-native';
import {t,useLanguage} from '../lib/i18n';
import {Button} from './UI';
import {C} from '../lib/theme';
import {phoneLabel,type PaymentMethod} from '../lib/session-payments-api';
import {claimTournamentPayment,confirmTournamentPayment,setTournamentPayment,tournamentPayments,type TournamentPayments} from '../lib/tournament-payments-api';
import {formatPrice,parsePrice,priceField} from '../lib/venue-jynlo-booking.cjs';
import {bookingError} from './VenueJynloBooking';

/** Tournament entry fee: organisers choose MB WAY to their number or in person; players mark it paid. */
export default function TournamentPaymentsPanel({communityId,tournamentId,token}:{communityId:number;tournamentId:number;token:string}){
 const {language}=useLanguage();
 const [data,setData]=useState<TournamentPayments|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [fee,setFee]=useState(''),[phone,setPhone]=useState(''),[method,setMethod]=useState<PaymentMethod|null>(null);
 const identity=useRef('');
 useEffect(()=>{
  const key=communityId+'|'+tournamentId+'|'+token;identity.current=key;setData(null);setError('');
  tournamentPayments(communityId,tournamentId,token).then(r=>{if(identity.current===key)apply(r);}).catch(()=>{/* optional panel */});
 },[communityId,tournamentId,token]);
 function apply(r:TournamentPayments){
  setData(r);
  if(r.organiser){
   if(r.method)setMethod(r.method);
   if(r.mbwayPhone)setPhone(phoneLabel(r.mbwayPhone));
   if(r.entryFeeCents!==null)setFee(priceField(r.entryFeeCents));
  }
 }
 async function run(action:()=>Promise<TournamentPayments>){
  if(busy)return;
  const key=identity.current;setBusy(true);setError('');
  try{const r=await action();if(identity.current===key)apply(r);}
  catch(e){if(identity.current===key)setError(bookingError(e,t('Não foi possível guardar. Tenta outra vez.')));}
  finally{setBusy(false);}
 }
 function save(){
  const cents=parsePrice(fee);
  if(cents===undefined){setError(t('Indica o preço em euros, por exemplo 24 ou 24,50.'));return;}
  void run(()=>setTournamentPayment(communityId,tournamentId,token,cents,method,method==='MBWAY'?phone.trim():null));
 }
 if(!data||(!data.organiser&&!data.method))return null;
 const price=formatPrice(data.entryFeeCents,language);
 return <View style={styles.panel} accessibilityLabel={t('Inscrição')}>
  <View style={styles.head}>
   <Text style={styles.title}>💶 {t('Inscrição')}{price?' · '+price:''}</Text>
   {data.method&&data.playerCount?<Text style={styles.count}>{t('{a} de {b} pagos',{a:data.confirmedCount,b:data.playerCount})}</Text>:null}
  </View>
  {data.organiser?<>
   <Text style={styles.label}>{t('Valor da inscrição por jogador (€)')}</Text>
   <TextInput value={fee} onChangeText={setFee} placeholder="10" placeholderTextColor={C.muted} keyboardType="decimal-pad"
    maxLength={8} editable={!busy} style={styles.input} accessibilityLabel={t('Valor da inscrição por jogador (€)')}/>
   <Text style={styles.label}>{t('Como se paga a inscrição?')}</Text>
   <View style={styles.row}>
    <Choice label={t('📱 MB WAY para mim')} selected={method==='MBWAY'} disabled={busy} onPress={()=>setMethod('MBWAY')}/>
    <Choice label={'🤝 '+t('No local')} selected={method==='IN_PERSON'} disabled={busy} onPress={()=>setMethod('IN_PERSON')}/>
   </View>
   {method==='MBWAY'?<>
    <Text style={styles.label}>{t('O teu número MB WAY para receberes')}</Text>
    <TextInput value={phone} onChangeText={setPhone} placeholder="912 345 678" placeholderTextColor={C.muted}
     keyboardType="phone-pad" autoComplete="tel" maxLength={20} editable={!busy} style={styles.input} accessibilityLabel={t('Número MB WAY')}/>
    <Text style={styles.muted}>{t('Só os jogadores inscritos no torneio veem este número.')}</Text>
   </>:null}
   <Button title={t('Guardar')} disabled={busy||!method} onPress={save}/>
   {data.method?<Button secondary title={t('Sem inscrição paga')} disabled={busy}
     onPress={()=>{setMethod(null);void run(()=>setTournamentPayment(communityId,tournamentId,token,null,null,null));}}/>:null}
   {data.method?(data.players.length===0?<Text style={styles.muted}>{t('Ainda não há jogadores inscritos.')}</Text>:
    data.players.map(p=><View key={p.username} style={styles.player}>
     <Text style={styles.name} numberOfLines={1}>{p.fullName||p.username}</Text>
     <Text style={[styles.state,p.confirmedAt?styles.paid:p.claimedAt?styles.claimed:null]}>
      {p.confirmedAt?t('✅ Pago'):p.claimedAt?t('⏳ Diz que pagou'):t('Por pagar')}</Text>
     <Pressable accessibilityRole="button" disabled={busy} style={[styles.small,!p.confirmedAt&&styles.smallPrimary]}
      accessibilityLabel={p.confirmedAt?t('Anular pagamento de {user}',{user:p.username}):t('Marcar como pago: {user}',{user:p.username})}
      onPress={()=>void run(()=>confirmTournamentPayment(communityId,tournamentId,token,p.username,!p.confirmedAt))}>
      <Text style={[styles.smallText,!p.confirmedAt&&styles.smallTextPrimary]}>{p.confirmedAt?t('Anular'):t('Marcar pago')}</Text>
     </Pressable>
    </View>)):null}
  </>:data.participant?<>
   {data.mine?.confirmedAt?<Text style={styles.ok}>{t('✅ O organizador confirmou o teu pagamento.')}</Text>:<>
    {data.method==='MBWAY'&&data.mbwayPhone?<>
     <Text style={styles.text}>{t('Paga a inscrição por MB WAY ao organizador:')}</Text>
     <View style={styles.row}>
      <Text selectable style={styles.phone}>{phoneLabel(data.mbwayPhone)}</Text>
      <Pressable accessibilityRole="button" style={styles.small} onPress={()=>void Share.share({message:data.mbwayPhone!})}>
       <Text style={styles.smallText}>{t('Partilhar número')}</Text></Pressable>
     </View>
    </>:<Text style={styles.text}>{t('Paga a inscrição ao organizador, no local.')}</Text>}
    {data.mine?.claimedAt?<>
     <Text style={styles.muted}>{t('⏳ Disseste que já pagaste. Falta o organizador confirmar.')}</Text>
     <Button secondary title={t('Afinal ainda não paguei')} disabled={busy} onPress={()=>void run(()=>claimTournamentPayment(communityId,tournamentId,token,false))}/>
    </>:<Button title={t('Já paguei')} disabled={busy} onPress={()=>void run(()=>claimTournamentPayment(communityId,tournamentId,token,true))}/>}
   </>}
  </>:<Text style={styles.muted}>{data.method==='MBWAY'?t('Paga-se por MB WAY ao organizador depois de te inscreveres.'):t('Paga-se ao organizador, no local.')}</Text>}
  {error?<Text style={styles.error} accessibilityRole="alert">{error}</Text>:null}
  <Text style={styles.muted}>{t('O pagamento é feito diretamente ao organizador. A Jynlo não recebe nem guarda dinheiro.')}</Text>
 </View>;
}

function Choice({label,selected,disabled,onPress}:{label:string;selected:boolean;disabled:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected,disabled}} disabled={disabled} onPress={onPress}
  style={[styles.choice,selected&&styles.choiceSelected]}><Text style={[styles.choiceText,selected&&styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

const styles=StyleSheet.create({
 panel:{gap:10,padding:16,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,marginVertical:8},
 head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
 title:{color:C.white,fontSize:18,fontWeight:'900'},
 count:{color:C.mint,fontSize:13,fontWeight:'900'},
 label:{color:C.white,fontSize:14,fontWeight:'800'},
 text:{color:C.white,fontSize:15},
 muted:{color:C.muted,fontSize:12},
 ok:{color:C.mint,fontSize:15,fontWeight:'900'},
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
 small:{minHeight:44,paddingHorizontal:12,borderRadius:22,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 smallPrimary:{backgroundColor:C.mint,borderColor:C.mint},
 smallText:{color:C.white,fontSize:13,fontWeight:'800'},
 smallTextPrimary:{color:C.background},
});
