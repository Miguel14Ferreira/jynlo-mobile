import React,{useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {JynloIcon,type JynloIconName} from './JynloIcon';
import {NAV_SLOTS,availableNavTabs,setNavSlot} from '../lib/nav-tabs.cjs';
import {saveNavTabs,useNavTabs} from '../lib/use-nav-tabs';

/** "Personalizar a barra": pick what the two middle tabs of the bottom bar open. */
export function NavTabsEditor({visible,onClose}:{visible:boolean;onClose:()=>void}){
 const bar=useNavTabs();
 const [draft,setDraft]=useState<string[]|null>(null);
 const ids=draft??bar.ids;
 const choices=availableNavTabs(bar.manager,bar.bookingsOpen);
 const close=()=>{setDraft(null);onClose();};
 const save=(next:string[]|null)=>{if(bar.username)void saveNavTabs(bar.username,next);close();};
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
  <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('Fechar')}/>
  <View style={styles.sheet}>
   <Text style={styles.title}>{t('Personalizar a barra')}</Text>
   <Text style={styles.hint}>{t('Escolhe o que aparece na barra de baixo, entre o Início e o Criar. O Perfil fica sempre no fim.')}</Text>
   <ScrollView style={{maxHeight:420}} contentContainerStyle={{gap:14}}>
    {Array.from({length:NAV_SLOTS},(_,slot)=><View key={slot} style={{gap:8}}>
     <Text style={styles.slot}>{t('Posição')} {slot+1}</Text>
     <View style={styles.choices}>
      {choices.map(choice=>{const on=ids[slot]===choice.id;
       return <Pressable key={choice.id} accessibilityRole="radio" accessibilityState={{checked:on}}
        onPress={()=>setDraft(setNavSlot(ids,slot,choice.id))} style={[styles.choice,on&&styles.choiceOn]}>
        <JynloIcon name={choice.icon as JynloIconName} size={17} color={on?C.background:C.mint}/>
        <Text style={[styles.choiceText,on&&styles.choiceTextOn]}>{t(choice.label)}</Text>
       </Pressable>;})}
     </View>
    </View>)}
   </ScrollView>
   <View style={styles.actions}>
    <Pressable accessibilityRole="button" style={styles.primary} onPress={()=>save(ids)}><Text style={styles.primaryText}>{t('Guardar')}</Text></Pressable>
    <Pressable accessibilityRole="button" style={styles.secondary} onPress={()=>save(null)}><Text style={styles.secondaryText}>{t('Repor a barra inicial')}</Text></Pressable>
   </View>
  </View>
 </Modal>;
}
const styles=StyleSheet.create({
 backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.55)'},
 sheet:{backgroundColor:C.background,padding:18,gap:12,borderTopLeftRadius:24,borderTopRightRadius:24,borderTopWidth:1,borderColor:C.border},
 title:{fontSize:20,fontWeight:'900',color:C.white},hint:{fontSize:13,color:C.muted,lineHeight:19},
 slot:{fontSize:14,fontWeight:'800',color:C.white},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:8},
 choice:{flexDirection:'row',alignItems:'center',gap:6,minHeight:40,paddingHorizontal:12,borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 choiceOn:{backgroundColor:C.mint,borderColor:C.mint},
 choiceText:{color:C.white,fontWeight:'700',fontSize:13},choiceTextOn:{color:C.background},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:10,paddingBottom:12},
 primary:{minHeight:46,paddingHorizontal:20,borderRadius:14,backgroundColor:C.mint,justifyContent:'center'},
 primaryText:{color:C.background,fontWeight:'900'},
 secondary:{minHeight:46,paddingHorizontal:16,borderRadius:14,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 secondaryText:{color:C.white,fontWeight:'700'},
});
