import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {mySessions} from '../lib/parity-api';
import {formatDate} from '../lib/format.cjs';
import {C} from '../lib/theme';
import type {SessionSummary} from '../lib/types';

/** Pick one of my upcoming sessions to post as a convocatória. */
export function CallUpPicker({visible,token,username,onClose,onPick}:{visible:boolean;token:string|null;username:string|null;onClose:()=>void;onPick:(id:number)=>void}){
 const router=useRouter();
 const [items,setItems]=useState<SessionSummary[]|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!visible)return;
  let alive=true;setItems(null);setFailed(false);
  void mySessions(token,username).then(mine=>{
   if(!alive)return;
   setItems((mine.created||[]).filter(s=>['OPEN','FULL'].includes(s.status)&&Date.parse(s.gameDate)>Date.now())
    .sort((a,b)=>Date.parse(a.gameDate)-Date.parse(b.gameDate)));
  }).catch(()=>{if(alive)setFailed(true);});
  return()=>{alive=false;};
 },[visible,token,username]);
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <View style={styles.overlay}>
   <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar"/>
   <View style={styles.sheet}>
    <Text style={styles.title}>📣 Convocar para um jogo</Text>
    <Text style={styles.help}>Escolhe uma das tuas próximas sessões. Quem estiver no chat pode responder "Vou" diretamente.</Text>
    {failed?<Text style={styles.help}>Não foi possível carregar as tuas sessões.</Text>
     :items===null?<ActivityIndicator color={C.mint}/>
     :items.length===0?<Text style={styles.help}>Não tens sessões futuras organizadas por ti.</Text>
     :<ScrollView style={{maxHeight:320}} contentContainerStyle={{gap:8}}>
       {items.map(s=><Pressable key={s.id} accessibilityRole="button" onPress={()=>onPick(s.id)} style={styles.item}>
        <Text style={styles.itemTitle}>{s.sport} · {s.city}</Text>
        <Text style={styles.help}>{formatDate(s.gameDate)} · {s.participantCount}/{s.maxParticipants}</Text>
       </Pressable>)}
      </ScrollView>}
    <Pressable accessibilityRole="button" onPress={()=>{onClose();router.push('/sessions/create');}} style={styles.create}>
     <Text style={styles.createText}>Criar sessão</Text>
    </Pressable>
   </View>
  </View>
 </Modal>;
}
const styles=StyleSheet.create({
 overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.6)'},
 sheet:{gap:12,padding:18,paddingBottom:30,borderTopLeftRadius:24,borderTopRightRadius:24,backgroundColor:C.background,borderWidth:1,borderColor:C.border},
 title:{color:C.white,fontSize:20,fontWeight:'900'},
 help:{color:C.muted,fontSize:13,lineHeight:19},
 item:{gap:3,padding:12,minHeight:52,borderRadius:12,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
 itemTitle:{color:C.white,fontSize:15,fontWeight:'900'},
 create:{minHeight:44,alignItems:'center',justifyContent:'center'},
 createText:{color:C.mint,fontSize:14,fontWeight:'900'},
});
