import React from 'react';
import {t} from '../lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {JynloIcon} from './JynloIcon';
import {C} from '../lib/theme';

/** A single reply preview for chats in teams, communities and sessions.
 * No private message state is stored here: the parent owns the draft and reply.
 */
export default function ChatReplyPreview({sender,body,onCancel,disabled=false}:{
 sender:string;body:string;onCancel:()=>void;disabled?:boolean
}){
 return <View style={styles.container}>
  <View style={styles.identity}><JynloIcon name="reply" size={17} color={C.mint}/></View>
  <View style={styles.copy}>
   <Text style={styles.title} numberOfLines={1}>{t('A responder a {a}',{a:sender})}</Text>
   <Text style={styles.body} numberOfLines={2}>{body||t('Mensagem anterior')}</Text>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={t('Cancelar resposta à mensagem')}
   disabled={disabled} onPress={onCancel} style={[styles.cancel,disabled&&styles.disabled]}>
   <JynloIcon name="close" size={20} color={C.mint}/>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 container:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:11,paddingVertical:9,
  borderLeftWidth:3,borderLeftColor:C.mint,borderRadius:12,backgroundColor:'#103B45'},
 identity:{width:31,height:31,borderRadius:10,backgroundColor:'#16514F',alignItems:'center',justifyContent:'center'},
 copy:{flex:1,minWidth:0,gap:3},
 title:{fontSize:12,fontWeight:'900',color:C.mint},
 body:{fontSize:12,lineHeight:17,color:C.white},
 cancel:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:12},
 disabled:{opacity:.45}
});
