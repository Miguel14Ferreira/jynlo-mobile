import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ScrollViewInstance} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DEMO_MODE} from '../lib/api';
import {C,MobileTheme} from '../lib/theme';
import {JynloIcon} from './JynloIcon';
import type {SessionSummary} from '../lib/types';
import {formatDate,money} from '../lib/format.cjs';
import {sessionCardStatus,participationProgress} from '../lib/session-card-core.cjs';
import {sportIcon} from '../lib/tournament-discovery-core.cjs';

export function Page({children,scroll=true,autoScrollToEnd=false}:{children:React.ReactNode;scroll?:boolean;autoScrollToEnd?:boolean}){
  const scrollRef=useRef<ScrollViewInstance|null>(null);
  const nearBottom=useRef(true);
  const [keyboardHeight,setKeyboardHeight]=useState(0);
  const keyboardVisible=useRef(false);
  const scrollFocused=useCallback(()=>{
    const focused=TextInput.State.currentlyFocusedInput?.();
    if(focused)scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(focused,64,true);
  },[]);
  // Measure the actual focused field instead of blindly jumping to the bottom.
  // A caption, reply or edit box can be above the last message in long chats.
  useEffect(()=>{
    if(!scroll)return;
    // Android adjustResize is enabled, but some keyboards resize the native
    // window after keyboardDidShow. Keep extra scrollable space so mid-form
    // inputs remain reachable even when the keyboard overlays the activity.
    const shown=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow',event=>{
      keyboardVisible.current=true;
      if(Platform.OS==='android')setKeyboardHeight(Math.max(0,event.endCoordinates.height));
      // First pass after the native keyboard appears.
      scrollFocused();
    });
    const hidden=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillHide':'keyboardDidHide',()=>{
      keyboardVisible.current=false;
      setKeyboardHeight(0);
    });
    return()=>{shown.remove();hidden.remove();keyboardVisible.current=false;};
  },[scroll,scrollFocused]);

  return <SafeAreaView style={styles.page} edges={['top','bottom','left','right']}>
    <KeyboardAvoidingView style={styles.keyboardFrame} behavior={Platform.OS==='ios'?'padding':'height'}>
    {scroll ? <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content,keyboardHeight>0&&{paddingBottom:keyboardHeight+88}]} showsVerticalScrollIndicator={false}
      onLayout={()=>{if(keyboardVisible.current)scrollFocused();}}
      onScroll={autoScrollToEnd?event=>{
        const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;
        nearBottom.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-90;
      }:undefined}
      scrollEventThrottle={100}
      onContentSizeChange={()=>{
        // Retry once after the list relays out around the native keyboard.
        if(keyboardVisible.current)scrollFocused();
        else if(autoScrollToEnd&&nearBottom.current)scrollRef.current?.scrollToEnd({animated:false});
      }}>
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
    <Text style={[styles.buttonText,secondary&&styles.buttonTextSecondary,danger&&styles.buttonTextDanger]}>{title}</Text>
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
        <View style={{flexDirection:'row',alignItems:'center',gap:4}}><JynloIcon name="location" size={14} color={MobileTheme.colors.muted}/><Text style={styles.cardCity} numberOfLines={1}>{location||'Local a confirmar'}</Text></View>
      </View>
      <JynloIcon name="chevron-right" size={25} color={MobileTheme.colors.accent}/>
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
    <View style={styles.sessionFooter}><Text style={styles.sessionFooterText}>Ver detalhes da sessão</Text><JynloIcon name="chevron-right" size={19} color={MobileTheme.colors.accent}/></View>
  </Pressable>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:C.background},keyboardFrame:{flex:1},content:{paddingHorizontal:16,paddingTop:16,paddingBottom:88,gap:16},
  brandRow:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:4},logo:{width:34,height:34,borderRadius:10},
  brandTitle:{fontSize:20,fontWeight:'900',letterSpacing:2.4,color:C.white},brandSubtitle:{color:C.muted,fontSize:11,letterSpacing:1},
  demoBanner:{padding:13,borderRadius:14,backgroundColor:'#15362F',borderWidth:1,borderColor:'#306B59',gap:4},
  demoText:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:0.8},demoSub:{fontSize:13,lineHeight:19,color:'#C0D9D1'},
  eyebrow:{fontSize:12,color:C.mint,fontWeight:'800',letterSpacing:1.5,textTransform:'uppercase'},
  button:{minHeight:52,borderRadius:16,backgroundColor:C.mint,paddingVertical:14,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},
  buttonSecondary:{backgroundColor:C.surface2,borderColor:C.border,borderWidth:1},buttonDanger:{backgroundColor:'#61383A'},
  buttonText:{color:C.background,fontSize:15,fontWeight:'800'},buttonTextSecondary:{color:C.white},
  // Light text on the dark red background (dark text was unreadable).
  buttonTextDanger:{color:'#FFE1DE'},
  badge:{borderRadius:8,paddingHorizontal:10,paddingVertical:7,backgroundColor:'#1B473E'},badgeText:{color:C.mint,fontSize:12,fontWeight:'800'},
  message:{padding:16,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface},
  messageText:{color:C.white,fontSize:14,lineHeight:21},
  card:{backgroundColor:MobileTheme.colors.surface,borderRadius:MobileTheme.radius.xl,padding:MobileTheme.spacing.lg,borderColor:MobileTheme.colors.border,borderWidth:1,gap:15},
  cardPressed:{opacity:.8,transform:[{scale:.99}]},
  cardTop:{flexDirection:'row',alignItems:'center',gap:12},
  cardIdentity:{flex:1,gap:4},
  sportBox:{height:55,width:55,borderRadius:MobileTheme.radius.lg,backgroundColor:MobileTheme.colors.raised,alignItems:'center',justifyContent:'center'},
  sportIcon:{fontSize:27},
  cardTitle:{color:MobileTheme.colors.text,fontSize:19,fontWeight:'900'},
  cardCity:{color:MobileTheme.colors.muted,fontSize:13,lineHeight:19},
  arrow:{color:MobileTheme.colors.accent,fontSize:28},
  metrics:{flexDirection:'row',gap:12},
  metricCell:{flex:1,backgroundColor:MobileTheme.colors.raised,borderRadius:MobileTheme.radius.md,padding:12,gap:6},
  metricKey:{color:MobileTheme.colors.muted,fontSize:12,letterSpacing:.4,fontWeight:'800'},
  metricValue:{color:MobileTheme.colors.text,fontWeight:'800',fontSize:13},
  participationHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  participationLabel:{fontSize:13,color:MobileTheme.colors.muted,flexShrink:1},
  statusPill:{borderRadius:MobileTheme.radius.pill,paddingHorizontal:11,paddingVertical:7,backgroundColor:MobileTheme.colors.raised},
  statusAvailable:{backgroundColor:'#10483F'},statusJoined:{backgroundColor:'#10483F'},
  statusText:{color:MobileTheme.colors.muted,fontSize:12,fontWeight:'800'},
  statusTextHighlight:{color:MobileTheme.colors.accent},
  capacityTrack:{width:'100%',height:5,backgroundColor:MobileTheme.colors.raised,borderRadius:MobileTheme.radius.pill,overflow:'hidden'},
  capacityFill:{height:'100%',backgroundColor:MobileTheme.colors.accent,borderRadius:MobileTheme.radius.pill},
  sessionFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:MobileTheme.colors.border,paddingTop:12},
  sessionFooterText:{fontSize:12,color:MobileTheme.colors.accent,fontWeight:'800'},
  sessionFooterArrow:{fontSize:17,color:MobileTheme.colors.accent},
});
