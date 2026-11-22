import React,{useEffect,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {Alert,AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../lib/theme';
import {CHAT_REACTION_EMOJIS,changeChatReaction,chatReactionParticipants,listChatReactions} from '../lib/chat-reactions-api';
import type {ChatReactionEmoji,ChatReactionKind,ChatReactionSummary} from '../lib/chat-reactions-api';

type ReactionState={
 summaries:Record<number,ChatReactionSummary>;
 busyIds:ReadonlySet<number>;
 react:(id:number,emoji:ChatReactionEmoji|null)=>Promise<void>;
 inspect:(id:number,emoji:ChatReactionEmoji)=>Promise<void>;
};
export function useChatReactions(kind:ChatReactionKind,conversationId:string,token:string|null|undefined,
 messageIds:readonly number[],enabled=true):ReactionState{
 const [summaries,setSummaries]=useState<Record<number,ChatReactionSummary>>({});
 const [busyIds,setBusyIds]=useState<ReadonlySet<number>>(()=>new Set());
 const pending=useRef(new Set<string>());
 const identity=kind+'|'+conversationId+'|'+(token||'');
 const activeIdentity=useRef(identity);
 activeIdentity.current=identity;
 const idKey=messageIds.filter(id=>Number.isSafeInteger(id)&&id>0).slice(-60).join(',');
 useEffect(()=>{setSummaries({});setBusyIds(new Set());},[identity]);
 useEffect(()=>{
  let active=true;
  const ids=idKey.split(',').map(Number).filter(id=>Number.isSafeInteger(id)&&id>0);
  if(!token||!enabled||ids.length===0)return ()=>{active=false;};
  const refresh=()=>{
   if(AppState.currentState!=='active')return;
   void listChatReactions(kind,conversationId,ids,token).then(data=>{
    if(!active)return;
    setSummaries(current=>{
     const next={...current};
     for(const item of data)if(!pending.current.has(identity+'|'+item.messageId))next[item.messageId]=item;
     return next;
    });
   }).catch(()=>{ /* Reactions must not interrupt reading or sending messages. */ });
  };
  refresh();
  const interval=setInterval(refresh,30000);
  return()=>{active=false;clearInterval(interval);};
 },[kind,conversationId,token,idKey,enabled]);
 const inspect=async(messageId:number,emoji:ChatReactionEmoji)=>{
  if(!token||!enabled)return;
  const currentIdentity=identity;
  try{
   const participants=await chatReactionParticipants(kind,conversationId,messageId,token);
   if(activeIdentity.current!==currentIdentity)return;
   const selected=participants.filter(member=>member.emoji===emoji);
   const shown=selected.slice(0,25).map(member=>member.displayName+(member.mine?' (tu)':'')).join('\n');
   Alert.alert(t('Reações {v}',{v:emoji}),selected.length?shown+(selected.length>25?t('\nE mais {v}',{v:(selected.length-25)})+' pessoas.':''):t('Ainda não existem reações deste tipo.'));
  }catch{if(activeIdentity.current===currentIdentity)Alert.alert(t('Reações'),t('Não foi possível consultar quem reagiu.'));}
 };
 const react=async(messageId:number,emoji:ChatReactionEmoji|null)=>{
  if(!token||!enabled||pending.current.has(identity+'|'+messageId))return;
  const currentIdentity=identity;
  pending.current.add(identity+'|'+messageId);setBusyIds(previous=>new Set([...previous,messageId]));
  try{
   const confirmed=await changeChatReaction(kind,conversationId,messageId,emoji,token);
   if(activeIdentity.current===currentIdentity)
    setSummaries(previous=>({...previous,[messageId]:confirmed}));
  }catch{
   // The server may have applied an update before the network failed.
   // Do not optimistically update the reaction or retry a mutation.
   if(activeIdentity.current===currentIdentity)
    Alert.alert(t('Reação não confirmada'),t('Confirma o estado da mensagem antes de voltares a tentar.'));
  }finally{
   pending.current.delete(currentIdentity+'|'+messageId);
   if(activeIdentity.current===currentIdentity)setBusyIds(previous=>{
    const next=new Set(previous);next.delete(messageId);return next;
   });
  }
 };
 return {summaries,busyIds,react,inspect};
}

export function ChatReactionRow({id,summary,disabled=false,busy=false,onReact,onInspect}:{
 id:number;summary?:ChatReactionSummary;disabled?:boolean;busy?:boolean;
 onReact:(id:number,emoji:ChatReactionEmoji|null)=>Promise<void>;
 onInspect:(id:number,emoji:ChatReactionEmoji)=>Promise<void>;
}){
 const [open,setOpen]=useState(false);
 if(disabled)return null;
 const counts=CHAT_REACTION_EMOJIS.filter(emoji=>(summary?.counts[emoji]||0)>0);
 const apply=(emoji:ChatReactionEmoji)=>{
  if(busy)return;
  setOpen(false);
  void onReact(id,summary?.myEmoji===emoji?null:emoji);
 };
 return <View style={styles.container}>
   <View style={styles.row}>
    {counts.map(emoji=><Pressable key={emoji} accessibilityRole="button"
     accessibilityLabel={emoji+' · '+summary!.counts[emoji]+' '+t('reações; manter pressionado para ver participantes')}
     accessibilityState={{selected:summary?.myEmoji===emoji,disabled:busy}}
     disabled={busy} onPress={()=>apply(emoji)} onLongPress={()=>{if(!busy)void onInspect(id,emoji);}}
     style={[styles.chip,summary?.myEmoji===emoji&&styles.selected]}>
     <Text style={styles.chipText}>{emoji} {summary!.counts[emoji]}</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel={open?t('Fechar reações'):t('Reagir à mensagem')}
      accessibilityState={{expanded:open,disabled:busy}} disabled={busy}
      onPress={()=>setOpen(previous=>!previous)} style={styles.add}>
      <Text style={styles.addLabel}>☺ +</Text>
    </Pressable>
   </View>
   {open?<View style={styles.picker}>
    {CHAT_REACTION_EMOJIS.map(emoji=><Pressable key={emoji} accessibilityRole="button"
      accessibilityLabel={t('Reagir com {v}',{v:emoji})} disabled={busy}
      accessibilityState={{selected:summary?.myEmoji===emoji,disabled:busy}}
      onPress={()=>apply(emoji)} style={[styles.choice,summary?.myEmoji===emoji&&styles.selected]}>
      <Text style={styles.choiceText}>{emoji}</Text>
    </Pressable>)}
   </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:5,marginTop:5,alignSelf:'flex-start'},
 row:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},
 chip:{borderWidth:1,borderColor:'#478681',backgroundColor:'#163E49',borderRadius:20,paddingVertical:4,paddingHorizontal:10,minHeight:30,justifyContent:'center'},
 selected:{borderColor:C.mint,backgroundColor:'#195A53'},
 chipText:{fontSize:12,color:C.white,fontWeight:'700'},
 add:{minWidth:36,minHeight:30,paddingHorizontal:8,flexDirection:'row',alignItems:'center',
  justifyContent:'center',borderRadius:18,borderWidth:1,borderColor:'#447D80',backgroundColor:'#123D49'},
 addLabel:{fontSize:12,color:C.mint,fontWeight:'800'},
 picker:{flexDirection:'row',gap:5,flexWrap:'wrap',backgroundColor:'#0D3441',
  borderWidth:1,borderColor:'#4B9991',borderRadius:16,padding:7},
 choice:{minWidth:38,height:38,justifyContent:'center',alignItems:'center',
  borderWidth:1,borderColor:'#4A8386',borderRadius:12,backgroundColor:'#153F4B'},
 choiceText:{fontSize:20}
});
