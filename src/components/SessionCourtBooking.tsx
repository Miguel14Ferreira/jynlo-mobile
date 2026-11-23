import React,{useEffect,useState} from 'react';
import {Linking,StyleSheet,Text,TextInput,View} from 'react-native';
import {t} from '../lib/i18n';
import {request,ApiError} from '../lib/api';
import {safeBookingUrl} from '../lib/venue-booking.cjs';
import {Button} from './UI';
import {C} from '../lib/theme';

type CourtBooking={organiser:boolean;bookingUrl:string|null;suggestedUrl:string|null;venueName:string|null;
 booked:boolean;bookedAt:string|null;editable:boolean};

/** Organiser books on the club's site and marks it here; players only see whether the court is booked. */
export default function SessionCourtBooking({sessionId,token}:{sessionId:number;token:string|null}){
 const [data,setData]=useState<CourtBooking|null>(null);
 const [draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const path=`/api/sessions/${sessionId}/court-booking`;
 function apply(d:CourtBooking){setData(d);setDraft(d.bookingUrl||d.suggestedUrl||'');}
 useEffect(()=>{
  let alive=true;setData(null);
  if(!token)return;
  request<CourtBooking>(path,{token}).then(d=>{if(alive)apply(d);}).catch(()=>{/* optional panel */});
  return()=>{alive=false;};
 },[sessionId,token]);
 if(!data)return null;
 async function save(booked:boolean){
  if(busy||!token)return;
  setBusy(true);setError('');
  try{apply(await request<CourtBooking>(path,{token,method:'PUT',body:{bookingUrl:draft.trim()||null,booked}}));}
  catch(e){setError(e instanceof ApiError&&e.status<500&&e.message?e.message:t('Não foi possível guardar. Tenta novamente.'));}
  finally{setBusy(false);}
 }
 const open=safeBookingUrl(draft);
 return <View style={[styles.panel,data.booked&&styles.booked]}>
  <View style={styles.head}>
   <Text style={styles.title}>{t('Campo')}</Text>
   <Text style={[styles.state,data.booked&&styles.stateOk]}>{t(data.booked?'✓ Campo reservado':'Campo por reservar')}</Text>
  </View>
  {data.editable?<>
   <Text style={styles.hint}>{t('Reserva no site do clube e depois marca aqui. Os jogadores veem que o campo está garantido.')}</Text>
   <TextInput value={draft} onChangeText={setDraft} editable={!busy} autoCapitalize="none" autoCorrect={false}
    keyboardType="url" maxLength={500} placeholder={t('Link de reserva do clube')} placeholderTextColor={C.muted}
    accessibilityLabel={t('Link de reserva do clube')} style={styles.input}/>
   {open?<Button title={t('Reservar campo')+' ↗'} onPress={()=>{void Linking.openURL(open).catch(()=>{});}}/>:null}
   <Button secondary disabled={busy} title={t(data.booked?'Desmarcar reserva':'Já reservei o campo')} onPress={()=>{void save(!data.booked);}}/>
   {draft.trim()!==(data.bookingUrl||'')?<Button secondary disabled={busy} title={t('Guardar link')} onPress={()=>{void save(data.booked);}}/>:null}
  </>:!data.booked?<Text style={styles.hint}>{t('O organizador ainda vai reservar o campo.')}</Text>:null}
  {error?<Text style={styles.error}>{error}</Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 panel:{gap:10,padding:16,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 booked:{borderColor:'rgba(94,230,200,0.55)'},
 head:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:8},
 title:{color:C.white,fontSize:17,fontWeight:'900'},
 state:{color:'#fcd34d',fontWeight:'800',fontSize:14},stateOk:{color:'#7ae5c5'},
 hint:{color:C.muted,fontSize:14,lineHeight:20},
 input:{minHeight:46,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.background,color:C.white,fontSize:15},
 error:{color:'#ffb4b4',fontSize:14}
});
