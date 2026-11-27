import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {t} from '../lib/i18n';
import {venues as searchVenues} from '../lib/parity-api';
import type {VenueSummary} from '../lib/types';
import {sportName} from '../lib/sport-names.cjs';
import {MobileTheme} from '../lib/theme';

const MAX_EMPTY_VENUES=3;

/**
 * Explore with no games is the moment a new user decides the app is empty.
 * Offer the next step (mark the first game, already with the sport) and show
 * real venues for that sport and city, so there is always something to do.
 */
export function ExploreEmpty({sport,city,loggedIn,onReset}:{sport:string;city:string;loggedIn:boolean;onReset:()=>void}){
 const router=useRouter();
 const [places,setPlaces]=useState<VenueSummary[]>([]);
 useEffect(()=>{
  let active=true;setPlaces([]);
  if(!sport&&!city)return;
  searchVenues({sport,city}).then(page=>{if(active)setPlaces(page.venues.slice(0,MAX_EMPTY_VENUES));}).catch(()=>{});
  return()=>{active=false;};
 },[sport,city]);
 const name=sport?sportName(sport):'',place=city.trim();
 const title=name&&place?t('Ainda não há jogos de {sport} em {city}',{sport:name,city:place})
  :name?t('Ainda não há jogos de {sport}',{sport:name})
  :place?t('Ainda não há jogos em {city}',{city:place}):t('Ainda não encontrámos jogos');
 const cta=name?t('Marcar um jogo de {sport}',{sport:name}):t('Marcar um jogo');
 const venuesTitle=name&&place?t('RECINTOS DE {sport} EM {city}',{sport:name.toLocaleUpperCase('pt-PT'),city:place.toLocaleUpperCase('pt-PT')})
  :t('RECINTOS ONDE PODES JOGAR');
 const create=(venueId?:number)=>{
  if(!loggedIn){router.push({pathname:'/login',params:{redirect:'/sessions/create'}});return;}
  router.push({pathname:'/sessions/create',params:{...(sport?{sport}:{}),...(venueId?{venueId:String(venueId)}:{})}});
 };
 return <View style={styles.panel}>
  <Text style={styles.title}>{title}</Text>
  <Text style={styles.detail}>{t('Sê o primeiro: marca um jogo e convida a tua malta. Quem procurar na tua zona também o encontra.')}</Text>
  <Pressable accessibilityRole="button" onPress={()=>create()} style={styles.primary}>
   <Text style={styles.primaryText}>{cta}</Text>
  </Pressable>
  {places.length?<View style={styles.venues}>
   <Text style={styles.venuesTitle}>{venuesTitle}</Text>
   {places.map(item=><View key={item.id} style={styles.venue}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir recinto {v}',{v:item.name})} style={{flex:1,gap:2}}
     onPress={()=>router.push({pathname:'/venues/[id]',params:{id:String(item.id)}})}>
     <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>
     <Text style={styles.venueMeta} numberOfLines={1}>{[item.city,item.venueType].filter(Boolean).join(' · ')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('Marcar jogo em {v}',{v:item.name})} onPress={()=>create(item.id)} style={styles.chip}>
     <Text style={styles.chipText}>{t('Marcar aqui')}</Text>
    </Pressable>
   </View>)}
  </View>:null}
  <Pressable accessibilityRole="button" onPress={onReset} style={styles.secondary}>
   <Text style={styles.secondaryText}>{t('Ver todas as modalidades')}</Text>
  </Pressable>
 </View>;
}

const T=MobileTheme.colors;
const styles=StyleSheet.create({
 panel:{gap:12,padding:19,borderWidth:1,borderColor:T.border,borderRadius:MobileTheme.radius.lg,backgroundColor:T.surface},
 title:{fontSize:17,fontWeight:'900',color:T.text},
 detail:{fontSize:13,lineHeight:20,color:T.muted},
 primary:{backgroundColor:T.accent,borderRadius:MobileTheme.radius.md,minHeight:MobileTheme.touchTarget,justifyContent:'center',paddingHorizontal:15},
 primaryText:{color:T.background,fontWeight:'900',fontSize:14,textAlign:'center'},
 venues:{gap:8,marginTop:4},
 venuesTitle:{fontSize:12,fontWeight:'900',color:T.accent,letterSpacing:1},
 venue:{flexDirection:'row',alignItems:'center',gap:10,minHeight:MobileTheme.touchTarget},
 venueName:{fontSize:14,fontWeight:'800',color:T.text},
 venueMeta:{fontSize:12,color:T.muted},
 chip:{borderWidth:1,borderColor:T.accent,borderRadius:MobileTheme.radius.pill,paddingHorizontal:12,minHeight:36,justifyContent:'center'},
 chipText:{color:T.accent,fontWeight:'800',fontSize:12},
 secondary:{alignSelf:'flex-start',minHeight:MobileTheme.touchTarget,justifyContent:'center'},
 secondaryText:{color:T.accent,fontWeight:'800',fontSize:12},
});
