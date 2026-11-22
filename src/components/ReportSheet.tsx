import React,{useEffect,useRef,useState} from 'react';
import {KeyboardFrame} from './KeyboardFrame';
import {t} from '../lib/i18n';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {REPORT_REASONS,composeReportReason,type ReportReasonId} from '../lib/report-reasons.cjs';
import {C} from '../lib/theme';

/** Report flow for posts, comments and profiles (store requirement for user content).
 * `inline` renders inside an existing modal (e.g. the comments sheet) instead of a new one. */
export function ReportSheet({visible,title,subject,onSubmit,onClose,inline=false}:{
 visible:boolean;title:string;subject:string;onSubmit:(reason:string)=>Promise<void>;onClose:()=>void;inline?:boolean;
}){
 const [reason,setReason]=useState<ReportReasonId|null>(null);
 const [details,setDetails]=useState(''),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[done,setDone]=useState(false);
 const inFlight=useRef(false);
 useEffect(()=>{if(visible){setReason(null);setDetails('');setError('');setDone(false);setBusy(false);inFlight.current=false;}},[visible,subject]);
 if(!visible)return null;
 async function submit(){
  if(inFlight.current)return;
  let text:string;
  try{text=composeReportReason(reason,details);}catch(e){setError(e instanceof Error?e.message:t('Confirma o motivo.'));return;}
  inFlight.current=true;setBusy(true);setError('');
  try{await onSubmit(text);setDone(true);}
  catch(e){setError((e instanceof Error?e.message:t('Não foi possível enviar a denúncia.'))+' '+t('Se já tinhas enviado, não precisas de repetir.'));}
  finally{inFlight.current=false;setBusy(false);}
 }
 const body=<KeyboardFrame style={styles.backdrop}>
  <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('Fechar denúncia')} onPress={busy?undefined:onClose}/>
  <View style={styles.sheet} accessibilityViewIsModal>
   <Text style={styles.title}>{title}</Text>
   {done?<>
    <Text style={styles.text}>{t('Obrigado. A equipa Jynlo vai rever esta denúncia. Quem denunciou não é identificado à outra pessoa.')}</Text>
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>{t('Fechar')}</Text></Pressable>
   </>:<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:10}}>
    <Text style={styles.text} numberOfLines={2}>{subject}</Text>
    <Text style={styles.label}>{t('Qual é o problema?')}</Text>
    {REPORT_REASONS.map(r=><Pressable key={r.id} accessibilityRole="radio" accessibilityState={{checked:reason===r.id,disabled:busy}} disabled={busy}
      onPress={()=>{setReason(r.id);setError('');}} style={[styles.option,reason===r.id&&styles.optionSelected]}>
      <Text style={[styles.optionText,reason===r.id&&styles.optionTextSelected]}>{r.label}</Text>
     </Pressable>)}
    <TextInput value={details} onChangeText={setDetails} editable={!busy} multiline maxLength={800}
     placeholder={reason==='OTHER'?t('Explica o motivo (obrigatório)'):t('Detalhes (opcional)')} placeholderTextColor={C.muted}
     style={styles.input} accessibilityLabel={t('Detalhes da denúncia')}/>
    {error?<Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>:null}
    <Pressable accessibilityRole="button" disabled={busy||!reason} onPress={()=>{void submit();}}
     style={[styles.primary,(busy||!reason)&&{opacity:.5}]}>
     {busy?<ActivityIndicator color={C.background}/>:<Text style={styles.primaryText}>{t('Enviar denúncia')}</Text>}
    </Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>{t('Cancelar')}</Text></Pressable>
   </ScrollView>}
  </View>
 </KeyboardFrame>;
 if(inline)return <View style={[StyleSheet.absoluteFill,{zIndex:20}]}>{body}</View>;
 return <Modal visible transparent animationType="fade" onRequestClose={busy?()=>{}:onClose}>{body}</Modal>;
}
const styles=StyleSheet.create({
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.7)'},
 sheet:{maxHeight:'88%',backgroundColor:'#06212C',borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:1,borderColor:C.border,padding:18,gap:12},
 title:{color:C.white,fontSize:19,fontWeight:'900'},
 text:{color:C.muted,fontSize:14,lineHeight:20},
 label:{color:C.white,fontSize:14,fontWeight:'800'},
 option:{minHeight:46,justifyContent:'center',paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 optionSelected:{borderColor:C.mint,backgroundColor:'#124B48'},
 optionText:{color:C.white,fontSize:14,fontWeight:'700'},optionTextSelected:{color:C.mint},
 input:{minHeight:70,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,color:C.white,backgroundColor:C.surface,textAlignVertical:'top'},
 error:{color:C.danger,fontSize:13},
 primary:{minHeight:50,borderRadius:14,backgroundColor:C.mint,alignItems:'center',justifyContent:'center'},
 primaryText:{color:C.background,fontWeight:'900',fontSize:15},
 secondary:{minHeight:46,alignItems:'center',justifyContent:'center'},secondaryText:{color:C.white,fontWeight:'800'}
});
