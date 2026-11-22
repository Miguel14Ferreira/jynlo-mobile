import React,{useEffect,useState} from 'react';
import {t} from '../lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../lib/theme';
import type {ChatPollContent} from '../lib/chat-poll.cjs';
import {pollResults,votePoll,type ChatPollKind,type ChatPollResult} from '../lib/chat-poll-api';

/** Sondagem in a group chat: tap to vote, tap the same option again to remove the vote. */
export function PollCard({poll,kind,conversationId,messageId,token}:{poll:ChatPollContent;kind:ChatPollKind;conversationId:number;messageId:number;token:string|null}){
 const [result,setResult]=useState<ChatPollResult|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  let alive=true;setResult(null);setFailed(false);
  void pollResults(kind,conversationId,messageId,token).then(r=>{if(alive)setResult(r);}).catch(()=>{if(alive)setFailed(true);});
  return()=>{alive=false;};
 },[kind,conversationId,messageId,token]);
 async function choose(index:number){
  if(busy||!token)return;
  setBusy(true);setFailed(false);
  try{setResult(await votePoll(kind,conversationId,messageId,result?.mine===index?null:index,token));}
  catch{setFailed(true);}
  finally{setBusy(false);}
 }
 const total=result?.total??0;
 return <View style={styles.card} accessibilityLabel={t('Sondagem: {v}',{v:poll.question})}>
  <Text style={styles.kind}>{t('📊 Sondagem')}</Text>
  <Text style={styles.question}>{poll.question}</Text>
  {poll.options.map((option,index)=>{
   const count=result?.counts?.[index]??0,mine=result?.mine===index;
   const percent=total>0?Math.round(count*100/total):0;
   return <Pressable key={index} accessibilityRole="button" accessibilityState={{selected:mine,disabled:busy}}
    accessibilityLabel={option+', '+count+(count===1?' voto':' votos')} disabled={busy||!token}
    onPress={()=>void choose(index)} style={[styles.option,mine&&styles.optionMine]}>
    <View style={[styles.bar,{width:`${percent}%`}]}/>
    <Text style={[styles.label,mine&&styles.labelMine]} numberOfLines={2}>{mine?'✓ ':''}{option}</Text>
    <Text style={styles.count}>{count}</Text>
   </Pressable>;
  })}
  <Text style={styles.meta}>{failed?t('Não foi possível atualizar a sondagem.')
   :`${total} ${total===1?'voto':'votos'} · ${result?.mine==null?t('toca para votar'):t('toca de novo para retirar')}`}</Text>
 </View>;
}
const styles=StyleSheet.create({
 card:{gap:7,minWidth:220,paddingVertical:2},
 kind:{color:C.muted,fontSize:12,fontWeight:'800'},
 question:{color:C.white,fontSize:16,fontWeight:'900'},
 option:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:12,
  borderRadius:12,borderWidth:1,borderColor:C.border,overflow:'hidden'},
 optionMine:{borderColor:C.mint},
 bar:{position:'absolute',left:0,top:0,bottom:0,backgroundColor:'rgba(34,197,94,.22)'},
 label:{flex:1,color:C.white,fontSize:14},
 labelMine:{fontWeight:'900'},
 count:{color:C.muted,fontSize:13,fontWeight:'800'},
 meta:{color:C.muted,fontSize:12},
});
