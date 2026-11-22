import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useLanguage} from '../lib/i18n';
import type {AppLanguage} from '../lib/i18n-core.cjs';
import {C,MobileTheme} from '../lib/theme';

const OPTIONS:{value:AppLanguage;label:string}[]=[{value:'pt',label:'Português'},{value:'en',label:'English'}];

/** Language choice. Both labels stay in their own language so anyone can find theirs. */
export function LanguageSwitch(){
 const {language,setLanguage}=useLanguage();
 return <View style={styles.box} accessibilityRole="radiogroup" accessibilityLabel="Idioma · Language">
  <Text style={styles.label}>Idioma · Language</Text>
  <View style={styles.row}>
   {OPTIONS.map(o=>{const on=language===o.value;return <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{checked:on}}
    accessibilityLabel={o.label} onPress={()=>{if(!on)setLanguage(o.value);}} style={[styles.chip,on&&styles.chipOn]}>
    <Text style={[styles.chipText,on&&styles.chipTextOn]}>{on?'✓ ':''}{o.label}</Text></Pressable>;})}
  </View>
 </View>;
}

const styles=StyleSheet.create({
 box:{gap:8,padding:14,borderRadius:16,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 label:{color:C.muted,fontSize:12,fontWeight:'800',letterSpacing:0.6},
 row:{flexDirection:'row',gap:8,flexWrap:'wrap'},
 chip:{minHeight:MobileTheme.touchTarget,paddingHorizontal:16,borderRadius:999,borderWidth:1,borderColor:C.border,justifyContent:'center'},
 chipOn:{borderColor:C.mint,backgroundColor:'rgba(42,224,202,0.16)'},
 chipText:{color:C.white,fontWeight:'800'},
 chipTextOn:{color:C.mint},
});
