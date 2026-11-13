import React,{useEffect,useRef} from 'react';
import {ActivityIndicator,Image,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DEMO_MODE} from '../lib/api';
import {C,MobileTheme} from '../lib/theme';
import type {SessionSummary} from '../lib/types';
import {formatDate,money} from '../lib/format.cjs';
import {sessionCardStatus,participationProgress} from '../lib/session-card-core.cjs';
import {sportIcon} from '../lib/tournament-discovery-core.cjs';

export function Page({children,scroll=true,autoScrollToEnd=false}:{children:React.ReactNode;scroll?:boolean;autoScrollToEnd?:boolean}){
  const scrollRef=useRef<ScrollView|null>(null);
  const nearBottom=useRef(true);
  // When a chat composer receives focus Android can resize the window without
  // moving the last message and input into view. Scroll after the keyboard
  // transition; the shared Page uses this only for chat views that explicitly
  // opt into autoScrollToEnd.
  useEffect(()=>{
    if(!autoScrollToEnd)return;
    const event=Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow';
    const subscription=Keyboard.addListener(event,()=>{
      nearBottom.current=true;
      scrollRef.current?.scrollToEnd({animated:true});
    });
    return()=>subscription.remove();
  },[autoScrollToEnd]);
  return <SafeAreaView style={styles.page} edges={['top','bottom','left','right']}>
    <KeyboardAvoidingView style={styles.keyboardFrame} behavior={Platform.OS==='ios'?'padding':'height'}>
    {scroll ? <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      onScroll={autoScrollToEnd?event=>{
        const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;
        nearBottom.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-90;
      }:undefined}
      scrollEventThrottle={100}
      onContentSizeChange={autoScrollToEnd?()=>{if(nearBottom.current)scrollRef.current?.scrollToEnd({animated:false});}:undefined}>
        {children}
      </ScrollView>
      : <View style={styles.content}>{children}</View>}
    </KeyboardAvoidingView>
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
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} onPress={onPress} disabled={disabled} style={({pressed})=>[
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
  const status=sessionCardStatus(session);
  const progress=participationProgress(session);
  const hasCapacity=Number.isFinite(session.maxParticipants)&&session.maxParticipants>0;
  const count=Number.isFinite(session.participantCount)?Math.max(0,session.participantCount):0;
  const location=[session.city,session.distanceKm!==null&&Number.isFinite(session.distanceKm)?`${session.distanceKm.toLocaleString('pt-PT')} km`:null].filter(Boolean).join(' · ');
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver sessão de ${session.sport} em ${session.city||'local a confirmar'}`}
    onPress={onPress} style={({pressed})=>[styles.card,pressed&&styles.cardPressed]}>
    <View style={styles.cardTop}>
      <View style={styles.sportBox}><Text style={styles.sportIcon}>{sportIcon(session.sport)}</Text></View>
      <View style={styles.cardIdentity}>
        <Text style={styles.cardTitle} numberOfLines={1}>{session.sport}</Text>
        <Text style={styles.cardCity} numberOfLines={1}>⌖  {location||'Local a confirmar'}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </View>
    <View style={styles.metrics}>
      <View style={styles.metricCell}><Text style={styles.metricKey}>DATA E HORA</Text><Text style={styles.metricValue}>{formatDate(session.gameDate)}</Text></View>
      <View style={styles.metricCell}><Text style={styles.metricKey}>PREÇO</Text><Text style={styles.metricValue}>{money(session.priceAmount)}</Text></View>
    </View>
    <View style={styles.participationHead}>
      <Text style={styles.participationLabel}>{hasCapacity?`${count}/${session.maxParticipants} jogadores`:'Participantes por confirmar'}</Text>
      <View style={[styles.statusPill,status.tone==='available'&&styles.statusAvailable,status.tone==='joined'&&styles.statusJoined]}>
        <Text style={[styles.statusText,(status.tone==='available'||status.tone==='joined')&&styles.statusTextHighlight]}>{status.label}</Text>
      </View>
    </View>
    {hasCapacity?<View style={styles.capacityTrack} accessibilityLabel="Ocupação da sessão"><View style={[styles.capacityFill,{width:`${Math.round(progress*100)}%`}]}/></View>:null}
    <View style={styles.sessionFooter}><Text style={styles.sessionFooterText}>Ver detalhes da sessão</Text><Text style={styles.sessionFooterArrow}>↗</Text></View>
  </Pressable>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:C.background},keyboardFrame:{flex:1},content:{paddingHorizontal:22,paddingTop:20,paddingBottom:88,gap:18},
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
  card:{backgroundColor:MobileTheme.colors.surface,borderRadius:MobileTheme.radius.xl,padding:MobileTheme.spacing.lg,borderColor:MobileTheme.colors.border,borderWidth:1,gap:15},
  cardPressed:{opacity:.8,transform:[{scale:.99}]},
  cardTop:{flexDirection:'row',alignItems:'center',gap:12},
  cardIdentity:{flex:1,gap:4},
  sportBox:{height:55,width:55,borderRadius:MobileTheme.radius.lg,backgroundColor:MobileTheme.colors.raised,alignItems:'center',justifyContent:'center'},
  sportIcon:{fontSize:27},
  cardTitle:{color:MobileTheme.colors.text,fontSize:19,fontWeight:'900'},
  cardCity:{color:MobileTheme.colors.muted,fontSize:12},
  arrow:{color:MobileTheme.colors.accent,fontSize:28},
  metrics:{flexDirection:'row',gap:12},
  metricCell:{flex:1,backgroundColor:MobileTheme.colors.raised,borderRadius:MobileTheme.radius.md,padding:12,gap:6},
  metricKey:{color:MobileTheme.colors.muted,fontSize:10,letterSpacing:.6,fontWeight:'800'},
  metricValue:{color:MobileTheme.colors.text,fontWeight:'800',fontSize:13},
  participationHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  participationLabel:{fontSize:12,color:MobileTheme.colors.muted,flexShrink:1},
  statusPill:{borderRadius:MobileTheme.radius.pill,paddingHorizontal:11,paddingVertical:7,backgroundColor:MobileTheme.colors.raised},
  statusAvailable:{backgroundColor:'#10483F'},statusJoined:{backgroundColor:'#10483F'},
  statusText:{color:MobileTheme.colors.muted,fontSize:11,fontWeight:'800'},
  statusTextHighlight:{color:MobileTheme.colors.accent},
  capacityTrack:{width:'100%',height:5,backgroundColor:MobileTheme.colors.raised,borderRadius:MobileTheme.radius.pill,overflow:'hidden'},
  capacityFill:{height:'100%',backgroundColor:MobileTheme.colors.accent,borderRadius:MobileTheme.radius.pill},
  sessionFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:MobileTheme.colors.border,paddingTop:12},
  sessionFooterText:{fontSize:12,color:MobileTheme.colors.accent,fontWeight:'800'},
  sessionFooterArrow:{fontSize:17,color:MobileTheme.colors.accent},
});
