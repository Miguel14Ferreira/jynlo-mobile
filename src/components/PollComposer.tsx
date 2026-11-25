import React,{useEffect,useState} from 'react';
import {KeyboardFrame} from './KeyboardFrame';
import {t} from '../lib/i18n';
import {Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {C} from '../lib/theme';
import {encodePoll,POLL_MAX_OPTION,POLL_MAX_OPTIONS,POLL_MAX_QUESTION} from '../lib/chat-poll.cjs';

/** Create a sondagem: question + 2–6 options. onSend receives the encoded message. */
export function PollComposer({visible,onClose,onSend}:{visible:boolean;onClose:()=>void;onSend:(text:string)=>void}){
 const [question,setQuestion]=useState(''),[options,setOptions]=useState(['','']),[invalid,setInvalid]=useState(false);
 useEffect(()=>{if(visible){setQuestion('');setOptions(['','']);setInvalid(false);}},[visible]);
 function submit(){
  const text=encodePoll(question,options);
  if(!text){setInvalid(true);return;}
  onSend(text);
 }
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <KeyboardFrame style={styles.overlay}>
   <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Fechar')}/>
   <View style={styles.sheet}>
    <Text style={styles.title}>{t('📊 Criar sondagem')}</Text>
    <ScrollView style={{maxHeight:380}} contentContainerStyle={{gap:10}} keyboardShouldPersistTaps="handled">
     <View style={styles.templates}>
      {/* Quick polls friends use before a game. */}
      <Pressable accessibilityRole="button" style={styles.template} onPress={()=>{setQuestion(t('Quem leva o quê?'));setOptions([t('Levo bola'),t('Levo coletes'),t('Levo água')]);setInvalid(false);}}>
       <Text style={styles.templateText}>{t('Quem leva o quê?')}</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.template} onPress={()=>{setQuestion(t('Contamos contigo?'));setOptions([t('Vou'),t('Talvez'),t('Não posso')]);setInvalid(false);}}>
       <Text style={styles.templateText}>{t('Contamos contigo?')}</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.template} onPress={()=>{setQuestion(t('Que dia dá mais jeito?'));setOptions([t('Sábado'),t('Domingo')]);setInvalid(false);}}>
       <Text style={styles.templateText}>{t('Que dia dá mais jeito?')}</Text></Pressable>
     </View>
     <Text style={styles.label}>{t('Pergunta')}</Text>
     <TextInput value={question} maxLength={POLL_MAX_QUESTION} placeholder={t('Ex.: Que dia jogamos?')} placeholderTextColor={C.muted}
      onChangeText={value=>{setQuestion(value);setInvalid(false);}} style={styles.input} accessibilityLabel={t('Pergunta')}/>
     {options.map((option,index)=><View key={index} style={styles.row}>
      <TextInput value={option} maxLength={POLL_MAX_OPTION} placeholder={'Opção '+(index+1)} placeholderTextColor={C.muted}
       onChangeText={value=>{setOptions(current=>current.map((o,i)=>i===index?value:o));setInvalid(false);}}
       style={[styles.input,{flex:1}]} accessibilityLabel={'Opção '+(index+1)}/>
      {options.length>2?<Pressable accessibilityRole="button" accessibilityLabel={t('Remover opção {v}',{v:(index+1)})} style={styles.remove}
       onPress={()=>setOptions(current=>current.filter((_,i)=>i!==index))}><Text style={styles.removeText}>✕</Text></Pressable>:null}
     </View>)}
     {options.length<POLL_MAX_OPTIONS?<Pressable accessibilityRole="button" onPress={()=>setOptions(current=>[...current,''])} style={styles.add}>
      <Text style={styles.addText}>{t('+ Adicionar opção')}</Text></Pressable>:null}
    </ScrollView>
    <Text style={styles.visible}>{t('Os votos são visíveis para quem está na conversa.')}</Text>
    {invalid?<Text style={styles.error}>{t('Escreve a pergunta e pelo menos 2 opções diferentes.')}</Text>:null}
    <Pressable accessibilityRole="button" onPress={submit} style={styles.send}><Text style={styles.sendText}>{t('Enviar sondagem')}</Text></Pressable>
   </View>
  </KeyboardFrame>
 </Modal>;
}
const styles=StyleSheet.create({
 templates:{flexDirection:'row',flexWrap:'wrap',gap:6},
 template:{borderWidth:1,borderColor:C.border,borderRadius:999,paddingHorizontal:10,paddingVertical:6},
 templateText:{color:C.white,fontSize:12,fontWeight:'700'},
 visible:{color:C.muted,fontSize:12},
 overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.6)'},
 sheet:{gap:12,padding:18,paddingBottom:30,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:C.background,borderWidth:1,borderColor:C.border},
 title:{color:C.white,fontSize:20,fontWeight:'900'},
 label:{color:C.muted,fontSize:13,fontWeight:'800'},
 input:{minHeight:46,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,color:C.white,fontSize:15},
 row:{flexDirection:'row',alignItems:'center',gap:8},
 remove:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:C.surface},
 removeText:{color:C.white,fontSize:16},
 add:{minHeight:40,justifyContent:'center'},
 addText:{color:C.mint,fontSize:14,fontWeight:'900'},
 error:{color:'#ffb4a8',fontSize:13},
 send:{minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:C.mint},
 sendText:{color:C.background,fontSize:16,fontWeight:'900'},
});
