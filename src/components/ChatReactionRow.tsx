import React,{useEffect,useRef,useState} from 'react';
import {Alert,AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../lib/theme';
import {JynloIcon} from './JynloIcon';
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
   Alert.alert('Reações '+emoji,selected.length?shown+(selected.length>25?'\nE mais '+(selected.length-25)+' pessoas.':''):'Ainda não existem reações deste tipo.');
  }catch{if(activeIdentity.current===currentIdentity)Alert.alert('Reações','Não foi possível consultar quem reagiu.');}
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
    Alert.alert('Reação não confirmada','Confirma o estado da mensagem antes de voltares a tentar.');
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
     accessibilityLabel={emoji+' · '+summary!.counts[emoji]+' reações; manter pressionado para ver participantes'}
     accessibilityState={{selected:summary?.myEmoji===emoji,disabled:busy}}
     disabled={busy} onPress={()=>apply(emoji)} onLongPress={()=>{if(!busy)void onInspect(id,emoji);}}
     style={[styles.chip,summary?.myEmoji===emoji&&styles.selected]}>
     <Text style={styles.chipText}>{emoji} {summary!.counts[emoji]}</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel={open?'Fechar reações':'Reagir à mensagem'}
      accessibilityState={{expanded:open,disabled:busy}} disabled={busy}
      onPress={()=>setOpen(previous=>!previous)} style={styles.add}>
      <JynloIcon name="like" size={16} color={C.mint}/>
      <Text style={styles.addLabel}>+</Text>
    </Pressable>
   </View>
   {open?<View style={styles.picker}>
    {CHAT_REACTION_EMOJIS.map(emoji=><Pressable key={emoji} accessibilityRole="button"
      accessibilityLabel={'Reagir com '+emoji} disabled={busy}
      accessibilityState={{selected:summary?.myEmoji===emoji,disabled:busy}}
      onPress={()=>apply(emoji)} style={[styles.choice,summary?.myEmoji===emoji&&styles.selected]}>
      <Text style={styles.choiceText}>{emoji}</Text>
    </Pressable>)}
   </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:6,marginTop:5},row:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},
 chip:{borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:16,paddingVertical:5,paddingHorizontal:9,minHeight:32,justifyContent:'center'},
 selected:{borderColor:C.mint},chipText:{fontSize:12,color:C.white},
 add:{width:36,height:36,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:1,borderRadius:18,borderWidth:1,borderColor:C.border},
 addLabel:{fontSize:14,color:C.mint,fontWeight:'800'},picker:{flexDirection:'row',gap:5,flexWrap:'wrap'},
 choice:{minWidth:39,height:39,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface},
 choiceText:{fontSize:20}
});
