import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {JynloIcon} from './JynloIcon';
import {CHAT_REACTION_EMOJIS} from '../lib/chat-reactions-api';

/** Short date and time for the long-press menu (the bubble itself shows no time). */
export function chatMenuTime(value:string|null|undefined):string{
 if(!value||!Number.isFinite(Date.parse(value)))return '';
 return new Date(value).toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}

/**
 * Instagram-style actions shown under a message after a long press:
 * quick reactions, reply, more options and when it was sent.
 */
export function ChatMessageMenu({emojis=CHAT_REACTION_EMOJIS,myEmoji,busy=false,onReact,onReply,onOptions,optionsLabel,sentAt,edited=false}:{
 emojis?:readonly string[];myEmoji?:string|null;busy?:boolean;
 onReact?:(emoji:string)=>void;onReply?:()=>void;onOptions?:()=>void;optionsLabel?:string;
 sentAt?:string|null;edited?:boolean;
}){
 const time=chatMenuTime(sentAt);
 return <View style={styles.menu}>
  {onReact?<View style={styles.reactions}>
   {emojis.map(emoji=><Pressable key={emoji} accessibilityRole="button" accessibilityLabel={t('Reagir com {v}',{v:emoji})}
     accessibilityState={{selected:myEmoji===emoji,disabled:busy}} disabled={busy}
     onPress={()=>onReact(emoji)} style={[styles.reaction,myEmoji===emoji&&styles.reactionOn]}>
     <Text style={styles.reactionText}>{emoji}</Text>
   </Pressable>)}
  </View>:null}
  <View style={styles.row}>
   {onReply?<Pressable accessibilityRole="button" accessibilityLabel={t('Responder')} onPress={onReply} style={styles.action}>
    <JynloIcon name="reply" size={17} color={C.mint}/><Text style={styles.actionText}>{t('Responder')}</Text>
   </Pressable>:null}
   {onOptions?<Pressable accessibilityRole="button" accessibilityLabel={optionsLabel||t('Mais opções')} disabled={busy} onPress={onOptions} style={styles.action}>
    <JynloIcon name="more" size={18} color={C.mint}/><Text style={styles.actionText}>{optionsLabel||t('Mais opções')}</Text>
   </Pressable>:null}
   {time?<Text style={styles.time}>{time}{edited?' · '+t('editada'):''}</Text>:null}
  </View>
 </View>;
}

const styles=StyleSheet.create({
 menu:{marginTop:8,paddingTop:8,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.1)',gap:8},
 reactions:{flexDirection:'row',flexWrap:'wrap',gap:6},
 reaction:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.06)'},
 reactionOn:{backgroundColor:'rgba(56,224,192,.22)',borderWidth:1,borderColor:C.mint},
 reactionText:{fontSize:19},
 row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:14},
 action:{flexDirection:'row',alignItems:'center',gap:5,minHeight:36},
 actionText:{color:C.mint,fontWeight:'700',fontSize:13},
 time:{color:C.muted,fontSize:11,marginLeft:'auto'},
});
