import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C} from '../lib/theme';
import {request} from '../lib/api';
import {reasonsFor,type ExclusionReason} from '../lib/future-exclusion.cjs';

const path=(sessionId:number,participantId:number)=>`/api/sessions/${sessionId}/participants/${participantId}/future-exclusion`;

/** Opened per player from the roster: checks the current state, then block or allow future sign-ups. */
export function FutureExclusionSheet({sessionId,participant,token,onClose}:{
 sessionId:number;participant:{id:number;username:string;attendanceStatus?:string|null}|null;token:string;onClose:()=>void;
}){
 const [excluded,setExcluded]=useState<boolean|null>(null);
 const [reason,setReason]=useState<ExclusionReason|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState('');
 const inFlight=useRef(false);
 useEffect(()=>{
  setExcluded(null);setReason(null);setError('');setDone('');
  if(!participant)return;
  let live=true;
  request<{excluded:boolean}>(path(sessionId,participant.id),{token})
   .then(r=>{if(live)setExcluded(!!r?.excluded);})
   .catch(()=>{if(live)setError(t('Não foi possível verificar a restrição.'));});
  return()=>{live=false;};
 },[sessionId,participant?.id,token]);
 if(!participant)return null;
 const p=participant;
 async function apply(block:boolean){
  if(inFlight.current||(block&&!reason))return;
  inFlight.current=true;setBusy(true);setError('');
  try{
   const r=await request<{excluded:boolean}>(path(sessionId,p.id),block?{token,method:'PUT',body:{reason}}:{token,method:'DELETE'});
   setExcluded(!!r?.excluded);
   setDone(r?.excluded?p.username+' '+t('já não se pode inscrever nas tuas próximas sessões.'):p.username+' '+t('pode voltar a inscrever-se nas tuas sessões.'));
  }catch{setError(block?t('Não foi possível guardar a restrição.'):t('Não foi possível retirar a restrição.'));}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <Modal visible transparent animationType="fade" onRequestClose={busy?()=>{}:onClose}>
  <View style={styles.backdrop}>
   <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('Fechar')} onPress={busy?undefined:onClose}/>
   <View style={styles.sheet} accessibilityViewIsModal>
    <ScrollView contentContainerStyle={{gap:12}}>
     <Text style={styles.kicker}>{t('INSCRIÇÕES FUTURAS')}</Text>
     <Text style={styles.title}>{p.username}</Text>
     <Text style={styles.text}>{t('Decisão privada e reversível. Só afeta futuras inscrições nas tuas sessões; não altera presenças nem classificações, e o jogador não é avisado do motivo.')}</Text>
     {excluded===null&&!error?<ActivityIndicator color={C.mint}/>:null}
     {done?<Text style={styles.done}>{done}</Text>:null}
     {excluded===true?<>
      {done?null:<Text style={styles.state}>{t('Este jogador está impedido de se inscrever nas tuas próximas sessões.')}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void apply(false);}} style={styles.secondaryBtn}>
       {busy?<ActivityIndicator color={C.white}/>:<Text style={styles.secondaryText}>{t('Voltar a permitir')}</Text>}</Pressable>
     </>:null}
     {excluded===false?<>
      <Text style={styles.label}>{t('Motivo da restrição')}</Text>
      {reasonsFor(p.attendanceStatus).map(r=><Pressable key={r.id} accessibilityRole="radio" accessibilityState={{checked:reason===r.id,disabled:busy}}
       disabled={busy} onPress={()=>setReason(r.id)} style={[styles.option,reason===r.id&&styles.optionOn]}>
       <Text style={[styles.optionText,reason===r.id&&{color:C.mint}]}>{r.label}</Text></Pressable>)}
      <Pressable accessibilityRole="button" disabled={busy||!reason} onPress={()=>{void apply(true);}} style={[styles.dangerBtn,(busy||!reason)&&{opacity:.5}]}>
       {busy?<ActivityIndicator color={C.white}/>:<Text style={styles.dangerText}>{t('Impedir futuras inscrições')}</Text>}</Pressable>
     </>:null}
     {error?<Text style={styles.error}>{error}</Text>:null}
     <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.close}><Text style={styles.secondaryText}>{t('Fechar')}</Text></Pressable>
    </ScrollView>
   </View>
  </View>
 </Modal>;
}
const styles=StyleSheet.create({
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.7)'},
 sheet:{maxHeight:'88%',backgroundColor:'#06212C',borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:1,borderColor:C.border,padding:18},
 kicker:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:1.2},title:{color:C.white,fontSize:20,fontWeight:'900'},
 text:{color:C.muted,fontSize:14,lineHeight:20},state:{color:'#FFB8B8',fontSize:14,fontWeight:'800'},done:{color:C.mint,fontSize:14,fontWeight:'800'},
 label:{color:C.white,fontWeight:'800',fontSize:14},
 option:{minHeight:46,justifyContent:'center',paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 optionOn:{borderColor:C.mint,backgroundColor:'#124B48'},optionText:{color:C.white,fontWeight:'700'},
 dangerBtn:{minHeight:50,borderRadius:14,backgroundColor:'#61383A',alignItems:'center',justifyContent:'center'},dangerText:{color:'#FFE1DE',fontWeight:'900',fontSize:15},
 secondaryBtn:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
 secondaryText:{color:C.white,fontWeight:'800'},close:{minHeight:46,alignItems:'center',justifyContent:'center'},
 error:{color:C.danger,fontSize:13}
});
