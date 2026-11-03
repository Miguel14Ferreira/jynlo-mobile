import React from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DEMO_MODE} from '../lib/api';
import {C} from '../lib/theme';
import type {SessionSummary} from '../lib/types';
import {vacancies,formatDate,money} from '../lib/format.cjs';

export function Page({children,scroll=true}:{children:React.ReactNode;scroll?:boolean}){
  return <SafeAreaView style={styles.page} edges={['top','left','right']}>
    {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      : <View style={styles.content}>{children}</View>}
  </SafeAreaView>;
}
export function Brand({subtitle}:{subtitle?:string}){
  return <View style={styles.brandRow}>
    <Image source={require('../../assets/jynlo-icon.png')} style={styles.logo} />
    <View><Text style={styles.brandTitle}>JYNLO</Text>{subtitle?<Text style={styles.brandSubtitle}>{subtitle}</Text>:null}</View>
  </View>;
}
export function DemoBanner(){return DEMO_MODE?<View style={styles.demoBanner}>
  <Text style={styles.demoText}>● MODO DEMONSTRAÇÃO</Text>
  <Text style={styles.demoSub}>Sessões e perfis fictícios. Nada é enviado para a Jynlo real.</Text>
</View>:null;}
export function Eyebrow({children}:{children:React.ReactNode}){
  return <Text style={styles.eyebrow}>{children}</Text>;
}
export function Button({title,onPress,disabled=false,secondary=false,danger=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){
  return <Pressable onPress={onPress} disabled={disabled} style={({pressed})=>[
    styles.button,secondary&&styles.buttonSecondary,danger&&styles.buttonDanger,
    (pressed||disabled)&&{opacity:0.65}] }>
    <Text style={[styles.buttonText,secondary&&styles.buttonTextSecondary]}>{title}</Text>
  </Pressable>;
}
export function Badge({text}:{text:string}){
  return <View style={styles.badge}><Text style={styles.badgeText}>{text}</Text></View>;
}
export function Message({children,tone='normal'}:{children:React.ReactNode;tone?:'normal'|'error'}){
  return <View style={[styles.message,tone==='error'&&{borderColor:C.danger}]}>
    <Text style={[styles.messageText,tone==='error'&&{color:C.danger}]}>{children}</Text>
  </View>;
}
export function Loader(){return <View style={{padding:48,alignItems:'center'}}><ActivityIndicator color={C.mint} size="large"/></View>;}
export function SessionCard({session,onPress}:{session:SessionSummary;onPress:()=>void}){
  const available=vacancies(session);
  return <Pressable onPress={onPress} style={({pressed})=>[styles.card,pressed&&{opacity:0.8}]}>
    <View style={styles.cardTop}>
      <View style={styles.sportBox}><Text style={styles.sportIcon}>{session.sport==='Futebol'?'⚽':session.sport==='Voleibol'?'🏐':session.sport==='Karting'?'🏎️':'🏃'}</Text></View>
      <View style={{flex:1}}><Text style={styles.cardTitle}>{session.sport}</Text><Text style={styles.cardCity}>⌖  {session.city}{session.distanceKm!==null?`  ·  ${session.distanceKm.toLocaleString('pt-PT')} km`:''}</Text></View>
      <Text style={styles.arrow}>↗</Text>
    </View>
    <View style={styles.cardDivider}/>
    <View style={styles.metrics}>
      <View><Text style={styles.metricKey}>QUANDO</Text><Text style={styles.metricValue}>{formatDate(session.gameDate)}</Text></View>
      <View><Text style={styles.metricKey}>VALOR</Text><Text style={styles.metricValue}>{money(session.priceAmount)}</Text></View>
    </View>
    <View style={styles.cardBottom}>
      <Text style={{color:C.muted,fontSize:12}}>{session.participantCount}/{session.maxParticipants} jogadores</Text>
      <Badge text={session.joinedByViewer?'Já vais!':session.waitlistedByViewer?'Lista de espera':session.status==='OPEN'?`${available} vagas`:'Indisponível'}/>
    </View>
  </Pressable>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:C.background},content:{paddingHorizontal:22,paddingTop:20,paddingBottom:40,gap:18},
  brandRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:8},logo:{width:45,height:45,borderRadius:13},
  brandTitle:{fontSize:26,fontWeight:'900',letterSpacing:3,color:C.white},brandSubtitle:{color:C.muted,fontSize:11,letterSpacing:1.3},
  demoBanner:{padding:13,borderRadius:14,backgroundColor:'#15362F',borderWidth:1,borderColor:'#306B59',gap:4},
  demoText:{color:C.mint,fontSize:11,fontWeight:'900',letterSpacing:0.8},demoSub:{fontSize:11,lineHeight:16,color:'#C0D9D1'},
  eyebrow:{fontSize:11,color:C.mint,fontWeight:'800',letterSpacing:1.5,textTransform:'uppercase'},
  button:{minHeight:52,borderRadius:16,backgroundColor:C.mint,paddingVertical:14,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},
  buttonSecondary:{backgroundColor:C.surface2,borderColor:C.border,borderWidth:1},buttonDanger:{backgroundColor:'#61383A'},
  buttonText:{color:C.background,fontSize:15,fontWeight:'800'},buttonTextSecondary:{color:C.white},
  badge:{borderRadius:8,paddingHorizontal:10,paddingVertical:7,backgroundColor:'#1B473E'},badgeText:{color:C.mint,fontSize:11,fontWeight:'800'},
  message:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface},
  messageText:{color:C.white,fontSize:13,lineHeight:20},
  card:{backgroundColor:C.surface,borderRadius:22,padding:18,borderColor:C.border,borderWidth:1,gap:14},
  cardTop:{flexDirection:'row',alignItems:'center',gap:12},
  sportBox:{height:52,width:52,borderRadius:16,backgroundColor:C.surface2,alignItems:'center',justifyContent:'center'},
  sportIcon:{fontSize:25},cardTitle:{color:C.white,fontSize:20,fontWeight:'800'},cardCity:{color:C.muted,fontSize:12,marginTop:5},arrow:{color:C.mint,fontSize:23},
  cardDivider:{height:1,backgroundColor:C.border},metrics:{flexDirection:'row',justifyContent:'space-between',gap:8},
  metricKey:{color:C.muted,fontSize:10,letterSpacing:1.2,fontWeight:'700'},metricValue:{color:C.white,fontWeight:'700',fontSize:14,marginTop:5},
  cardBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
});
