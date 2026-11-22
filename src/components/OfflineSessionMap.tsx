import React from 'react';
import {t} from '../lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {SessionSummary} from '../lib/types';
import {sportName} from '../lib/sport-names.cjs';

type Props={sessions:SessionSummary[];selectedId:number|null;onSelect:(id:number)=>void};
const boundaries={north:42.2,south:36.8,west:-9.6,east:-6.0};
const clamp=(n:number)=>Math.max(3,Math.min(97,n));
const isMainland=(s:SessionSummary)=>s.latitude!=null&&s.longitude!=null&&
 Number.isFinite(s.latitude)&&Number.isFinite(s.longitude)&&
 s.latitude>=boundaries.south&&s.latitude<=boundaries.north&&
 s.longitude>=boundaries.west&&s.longitude<=boundaries.east;
/** Safe geographic fallback when the signed APK does not contain Google Maps. */
export default function OfflineSessionMap({sessions,selectedId,onSelect}:Props){
 const mainland=sessions.filter(isMainland);
 return <View style={styles.frame} accessibilityLabel={t('Esquema aproximado das sessões em Portugal continental')}>
   <Text style={styles.heading}>{t('Portugal continental · esquema de localizações')}</Text>
   <Text style={styles.hint}>{t('Pinos baseados nas coordenadas públicas. Sem fundo cartográfico nem ruas.')}</Text>
   <View style={styles.plot}>
    <Text style={styles.north}>N ↑</Text>
    <View pointerEvents="none" style={styles.continent}/>
    {mainland.map(s=><Pressable key={s.id} accessibilityRole="button"
      accessibilityLabel={(s.city?t('Ver sessão de {sport} em {city}',{sport:sportName(s.sport),city:s.city}):t('Ver sessão de {v}',{v:sportName(s.sport)}))}
      onPress={()=>onSelect(s.id)} style={[styles.pin,{
       left:(clamp(100*((s.longitude!-boundaries.west)/(boundaries.east-boundaries.west))))+'%' as `${number}%`,
       top:(clamp(100*((boundaries.north-s.latitude!)/(boundaries.north-boundaries.south))))+'%' as `${number}%`,
      },selectedId===s.id&&styles.selected]}>
      <Text style={styles.pinText}>{selectedId===s.id?'●':'•'}</Text>
     </Pressable>)}
    <Text style={styles.south}>S ↓</Text>
   </View>
   <Text style={styles.hint}>{t('{a} sessões neste esquema · {b} fora da área continental ou sem posição representável',{a:mainland.length,b:sessions.length-mainland.length})}</Text>
  </View>;
}
const styles=StyleSheet.create({
 frame:{gap:9,padding:13,borderRadius:16,backgroundColor:'#10262B',borderWidth:1,borderColor:'#2D5961'},
 heading:{fontSize:14,fontWeight:'800',color:'#F8FAFC'},
 hint:{fontSize:11,color:'#B6CCD0',lineHeight:17},
 plot:{height:355,position:'relative',backgroundColor:'#14313A',borderRadius:13,overflow:'hidden',borderWidth:1,borderColor:'#37606A'},
 continent:{position:'absolute',left:'22%',top:'7%',width:'44%',height:'86%',backgroundColor:'#275D4A',opacity:.38,borderRadius:90,transform:[{rotate:'-12deg'}]},
 north:{position:'absolute',top:8,right:11,color:'#E9FAFB',fontWeight:'900'},
 south:{position:'absolute',bottom:8,right:11,color:'#E9FAFB',fontWeight:'800'},
 pin:{position:'absolute',width:34,height:34,marginLeft:-17,marginTop:-17,borderRadius:17,backgroundColor:'#60DAB6',borderWidth:2,borderColor:'#15332D',alignItems:'center',justifyContent:'center'},
 selected:{backgroundColor:'#FFF4A5',borderColor:'#FFFFFF',transform:[{scale:1.15}]},
 pinText:{fontSize:25,fontWeight:'900',lineHeight:29,color:'#092923'},
});
