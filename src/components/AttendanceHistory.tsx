import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {C} from '../lib/theme';
import {Message} from './UI';
import {myAttendanceHistory,reliabilitySummary,disputeNoShow} from '../lib/reliability-api';
import {attendanceLabel,disputeLabel,externalHistory,formatRate,markDisputed,validateDisputeReason,MAX_REASON,
 type AttendanceHistoryItem,type ReliabilitySummary} from '../lib/reliability-core.cjs';

const fmtDate=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':
 d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'})+' · '+d.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});};

/** Reliability numbers + attendance history with "Contestar falta" — parity with the web "Minhas sessões". */
export function AttendanceHistory({token,username,ownedSessionIds,onOpenSession}:{
 token:string;username:string;ownedSessionIds:number[];onOpenSession:(id:number)=>void;
}){
 const [items,setItems]=useState<AttendanceHistoryItem[]>([]);
 const [summary,setSummary]=useState<ReliabilitySummary|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pending,setPending]=useState<AttendanceHistoryItem|null>(null);
 const generation=useRef(0);
 const load=useCallback(async()=>{
  const id=++generation.current;setLoading(true);setError('');
  const [h,s]=await Promise.allSettled([myAttendanceHistory(token),reliabilitySummary(username,token)]);
  if(id!==generation.current)return;
  if(h.status==='fulfilled')setItems(h.value);else{setItems([]);setError(t('Não foi possível carregar o histórico de presenças.'));}
  setSummary(s.status==='fulfilled'?s.value:null);
  setLoading(false);
 },[token,username]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const list=externalHistory(items,ownedSessionIds);
 return <View style={styles.wrap}>
  <Text style={styles.kicker}>{t('FIABILIDADE')}</Text>
  <Text style={styles.title}>{t('Histórico de presenças · {a}',{a:list.length})}</Text>
  {summary?<View style={styles.grid} accessibilityLabel={t('Taxa de presença {v}',{v:formatRate(summary.attendanceRate)})}>
   <Stat label={t('Taxa de presença')} value={formatRate(summary.attendanceRate)}/>
   <Stat label={t('Sessões concluídas')} value={String(summary.completedSessions??0)}/>
   <Stat label={t('Faltas')} value={String(summary.noShows??0)}/>
   <Stat label={t('Cancelamentos tardios')} value={String(summary.lateCancellations??0)}/>
  </View>:null}
  {notice?<Message>{notice}</Message>:null}
  {loading?<ActivityIndicator color={C.mint} style={{padding:16}}/>:null}
  {!loading&&error?<><Message tone="error">{error}</Message>
   <Pressable accessibilityRole="button" onPress={()=>{void load();}} style={styles.outline}><Text style={styles.outlineText}>{t('Tentar novamente')}</Text></Pressable></>:null}
  {!loading&&!error&&list.length===0?<Text style={styles.empty}>{t('Ainda não tens presenças registadas em sessões concluídas.')}</Text>:null}
  {!loading&&!error?list.map(item=>{const dispute=disputeLabel(item.disputeStatus);
   return <View key={item.participantId} style={styles.card}>
    <View style={styles.row}>
     <View style={{flex:1,gap:2}}>
      <Text style={styles.sport} numberOfLines={1}>{item.sport}{item.city?' · '+item.city:''}</Text>
      <Text style={styles.date}>{fmtDate(item.gameDate)}</Text>
     </View>
     <Text style={[styles.badge,item.attendanceStatus==='ATTENDED'&&styles.ok,item.attendanceStatus==='NO_SHOW'&&styles.bad,
      item.attendanceStatus==='LATE_CANCELLED'&&styles.warn]}>{attendanceLabel(item.attendanceStatus)}</Text>
    </View>
    {dispute?<Text style={[styles.dispute,item.disputeStatus==='ACCEPTED'&&{color:C.mint},item.disputeStatus==='REJECTED'&&{color:C.danger}]}>{t('Contestação: {a}',{a:dispute})}</Text>:null}
    <View style={styles.actions}>
     <Pressable accessibilityRole="button" onPress={()=>onOpenSession(item.sessionId)} style={styles.link}><Text style={styles.linkText}>{t('Ver sessão')}</Text></Pressable>
     {item.canDispute?<Pressable accessibilityRole="button" accessibilityLabel={t('Contestar falta em {v}',{v:item.sport})}
      onPress={()=>{setNotice('');setPending(item);}} style={styles.outline}><Text style={styles.outlineText}>{t('Contestar falta')}</Text></Pressable>:null}
    </View>
   </View>;}):null}
  <DisputeSheet item={pending} token={token} onClose={()=>setPending(null)}
   onSent={id=>{setItems(prev=>markDisputed(prev,id));setPending(null);setNotice(t('Contestação enviada. O estado fica agora em análise.'));}}/>
 </View>;
}
function Stat({label,value}:{label:string;value:string}){
 return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function DisputeSheet({item,token,onClose,onSent}:{item:AttendanceHistoryItem|null;token:string;onClose:()=>void;onSent:(participantId:number)=>void}){
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const inFlight=useRef(false);
 useEffect(()=>{setReason('');setError('');setBusy(false);inFlight.current=false;},[item?.participantId]);
 if(!item)return null;
 const current=item;
 async function send(){
  if(inFlight.current)return;
  try{validateDisputeReason(reason);}catch(e){setError(e instanceof Error?e.message:t('Confirma a justificação.'));return;}
  inFlight.current=true;setBusy(true);setError('');
  try{await disputeNoShow(current.participantId,reason,token);onSent(current.participantId);}
  catch(e){setError((e instanceof Error?e.message:t('Não foi possível enviar a contestação.'))+' '+t('Atualiza o histórico antes de tentar de novo.'));}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <Modal visible transparent animationType="fade" onRequestClose={busy?()=>{}:onClose}>
  <View style={styles.backdrop}>
   <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('Fechar contestação')} onPress={busy?undefined:onClose}/>
   <View style={styles.sheet} accessibilityViewIsModal>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:12}}>
     <Text style={styles.kicker}>{t('CONTESTAÇÃO DE PRESENÇA')}</Text>
     <Text style={styles.sheetTitle}>{t('Contestar falta em {a}',{a:current.sport})}</Text>
     <Text style={styles.text}>{t('{a}. Explica de forma objetiva por que motivo consideras que o registo de falta está incorreto. A equipa Jynlo analisa e decide.',{a:fmtDate(current.gameDate)})}</Text>
     <TextInput value={reason} onChangeText={t=>{setReason(t);setError('');}} editable={!busy} multiline maxLength={MAX_REASON}
      placeholder={t('Ex.: Estive presente na sessão e fui registado por engano como falta.')} placeholderTextColor={C.muted}
      style={styles.input} accessibilityLabel={t('Justificação')}/>
     {error?<Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>:null}
     <Pressable accessibilityRole="button" disabled={busy||!reason.trim()} onPress={()=>{void send();}}
      style={[styles.primary,(busy||!reason.trim())&&{opacity:.5}]}>
      {busy?<ActivityIndicator color={C.background}/>:<Text style={styles.primaryText}>{t('Enviar contestação')}</Text>}
     </Pressable>
     <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>{t('Cancelar')}</Text></Pressable>
    </ScrollView>
   </View>
  </View>
 </Modal>;
}
const styles=StyleSheet.create({
 wrap:{gap:12},kicker:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:1.2},
 title:{color:C.white,fontSize:21,fontWeight:'900'},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 stat:{flexGrow:1,flexBasis:'45%',padding:12,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:2},
 statValue:{color:C.white,fontSize:22,fontWeight:'900'},statLabel:{color:C.muted,fontSize:12,fontWeight:'700'},
 empty:{color:C.muted,paddingVertical:4},
 card:{padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:8},
 row:{flexDirection:'row',alignItems:'center',gap:10},
 sport:{color:C.white,fontSize:16,fontWeight:'800'},date:{color:C.muted,fontSize:13},
 badge:{color:C.white,fontSize:12,fontWeight:'900',paddingHorizontal:10,paddingVertical:5,borderRadius:999,borderWidth:1,borderColor:C.border,overflow:'hidden'},
 ok:{color:C.mint,borderColor:C.mint},bad:{color:C.danger,borderColor:C.danger},warn:{color:'#F5C26B',borderColor:'#F5C26B'},
 dispute:{color:'#F5C26B',fontSize:13,fontWeight:'800'},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 link:{minHeight:40,justifyContent:'center',paddingHorizontal:4},linkText:{color:C.mint,fontWeight:'800'},
 outline:{minHeight:40,justifyContent:'center',paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:C.border},
 outlineText:{color:C.white,fontWeight:'800'},
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.7)'},
 sheet:{maxHeight:'88%',backgroundColor:'#06212C',borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:1,borderColor:C.border,padding:18},
 sheetTitle:{color:C.white,fontSize:19,fontWeight:'900'},text:{color:C.muted,fontSize:14,lineHeight:20},
 input:{minHeight:110,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,backgroundColor:C.surface,textAlignVertical:'top'},
 error:{color:C.danger,fontSize:13},
 primary:{minHeight:50,borderRadius:14,backgroundColor:C.mint,alignItems:'center',justifyContent:'center'},
 primaryText:{color:C.background,fontWeight:'900',fontSize:15},
 secondary:{minHeight:46,alignItems:'center',justifyContent:'center'},secondaryText:{color:C.white,fontWeight:'800'}
});
