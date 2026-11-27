import React,{useCallback,useEffect,useRef,useState} from 'react';
import {currentLocale,t} from '../lib/i18n';
import {ActivityIndicator,Alert,Image,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {HostInstance,ScrollViewInstance} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation,usePathname} from 'expo-router';
import {DEMO_MODE} from '../lib/api';
import {C,MobileTheme} from '../lib/theme';
import {JynloIcon} from './JynloIcon';
import {FriendsGoing} from './FriendsGoing';
import type {SessionSummary} from '../lib/types';
import {formatDate,money} from '../lib/format.cjs';
import {sessionCardStatus,participationProgress} from '../lib/session-card-core.cjs';
import {sportIcon} from '../lib/tournament-discovery-core.cjs';
import {isLevel,levelLabel} from '../lib/session-level-core.cjs';
import {sportName} from '../lib/sport-names.cjs';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {KeyboardFrame} from './KeyboardFrame';

export function Page({children,scroll=true,autoScrollToEnd=false}:{children:React.ReactNode;scroll?:boolean;autoScrollToEnd?:boolean}){
  const scrollRef=useRef<ScrollViewInstance|null>(null);
  const nearBottom=useRef(true);
  // Under a native title bar the status bar is already covered: adding the top
  // safe-area inset again left an empty band below the bar on every pushed screen.
  const navigation=useNavigation();
  let underHeader=false;
  const pathname=usePathname();
  // Stack screens declared with headerShown:false in app/_layout.tsx keep the top inset.
  const headerless=/^\/(welcome|communities\/[^/]+\/chat|messages\/(?!call$|requests$)[^/]+)$/.test(pathname||'');
  // Any screen of the root stack has the native title bar (tab screens belong to the tab navigator), even when
  // it is the first in the stack (opened from a link): checking the index left a big empty band on those.
  try{const state=navigation?.getState?.();underHeader=!headerless&&(state?.type==='stack'||(!state&&!!navigation?.canGoBack?.()));}catch{underHeader=false;}
  // react-native-keyboard-controller follows the real keyboard frame on Android
  // edge-to-edge and iOS alike: the focused field (and the next one) is scrolled
  // above the keyboard, and the bottom of the page gets the keyboard's height.
  const body=scroll ? <KeyboardAwareScrollView ref={scrollRef as never} bottomOffset={28} extraKeyboardSpace={16}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      onScroll={event=>{
        if(!autoScrollToEnd)return;
        const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;
        nearBottom.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-90;
      }}
      scrollEventThrottle={50}
      onContentSizeChange={()=>{if(autoScrollToEnd&&nearBottom.current)scrollRef.current?.scrollToEnd({animated:false});}}>
        {children}
      </KeyboardAwareScrollView>
      : <KeyboardFrame style={styles.keyboardFrame}><View style={[styles.content,{flex:1,paddingBottom:16}]}>{children}</View></KeyboardFrame>;
  return <SafeAreaView style={styles.page} edges={underHeader?['bottom','left','right']:['top','bottom','left','right']}>{body}</SafeAreaView>;
}
export function Brand({subtitle}:{subtitle?:string}){
  // Pushed screens already show the native title bar with a back arrow: a second
  // JYNLO header there only pushes the content down. Keep it on the main tabs.
  let pushed=false;
  const navigation=useNavigation();
  try{const state=navigation?.getState?.();pushed=state?.type==='stack'||(!state&&!!navigation?.canGoBack?.());}catch{pushed=false;}
  if(pushed)return null;
  return <View style={styles.brandRow}>
    <Image source={require('../../assets/jynlo-icon.png')} style={styles.logo} />
    <View style={{flexShrink:1}}><Text maxFontSizeMultiplier={1.2} style={styles.brandTitle}>JYNLO</Text>{subtitle?<Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.brandSubtitle}>{subtitle}</Text>:null}</View>
  </View>;
}
export function DemoBanner(){return DEMO_MODE?<View style={styles.demoBanner}>
  <Text style={styles.demoText}>{t('● MODO DEMONSTRAÇÃO')}</Text>
  <Text style={styles.demoSub}>{t('Sessões e perfis fictícios. Nada é enviado para a Jynlo real.')}</Text>
</View>:null;}
export function Eyebrow({children}:{children:React.ReactNode}){
  return <Text style={styles.eyebrow}>{children}</Text>;
}
/** When the person last pressed a button: an error right after it is shown as a pop-up. */
let lastActionAt=0;
export const ACTION_ERROR_WINDOW_MS=10000;
export function markUserAction(){lastActionAt=Date.now();}
function messageText(node:React.ReactNode):string{
  if(node==null||typeof node==='boolean')return '';
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(messageText).join('');
  return '';
}
export function Button({title,onPress,disabled=false,secondary=false,danger=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} onPress={()=>{markUserAction();onPress();}} disabled={disabled} style={({pressed})=>[
    styles.button,secondary&&styles.buttonSecondary,danger&&styles.buttonDanger,
    (pressed||disabled)&&{opacity:0.65}] }>
    <Text style={[styles.buttonText,secondary&&styles.buttonTextSecondary,danger&&styles.buttonTextDanger]}>{title}</Text>
  </Pressable>;
}
export function Badge({text}:{text:string}){
  return <View style={styles.badge}><Text style={styles.badgeText}>{text}</Text></View>;
}
export function Message({children,tone='normal'}:{children:React.ReactNode;tone?:'normal'|'error'}){
  const text=tone==='error'?messageText(children).trim():'';
  // Errors that follow a button press (save, create, send…) also open in the
  // middle of the screen; the inline message stays for reference.
  React.useEffect(()=>{
    if(text&&Date.now()-lastActionAt<ACTION_ERROR_WINDOW_MS)Alert.alert(t('Algo correu mal'),text);
  },[text]);
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
  // Players still needed for the game to happen (custom minimum or the sport's default).
  const open=['OPEN','FULL'].includes(String(session.status||'OPEN').toUpperCase());
  const sportLower=String(session.sport||'').toLowerCase();
  const minimum=session.minPlayers??Math.min(Math.max(2,session.maxParticipants||2),/futebol|futsal|basquetebol|basketball/.test(sportLower)?6:/padel|pádel/.test(sportLower)?4:2);
  const missing=open&&hasCapacity?Math.max(0,minimum-count):0;
  const location=[session.city,session.distanceKm!==null&&Number.isFinite(session.distanceKm)?`${session.distanceKm.toLocaleString(currentLocale())} km`:null].filter(Boolean).join(' · ');
  return <Pressable accessibilityRole="button" accessibilityLabel={t('Ver sessão de {sport} em {city}',{sport:sportName(session.sport),city:session.city||t('local a confirmar')})}
    onPress={onPress} style={({pressed})=>[styles.card,pressed&&styles.cardPressed]}>
    <View style={styles.cardTop}>
      <View style={styles.sportBox}><Text maxFontSizeMultiplier={1.3} style={styles.sportIcon}>{sportIcon(session.sport)}</Text></View>
      <View style={styles.cardIdentity}>
        <Text style={styles.cardTitle} numberOfLines={1}>{sportName(session.sport)}</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:4}}><JynloIcon name="location" size={14} color={MobileTheme.colors.muted}/><Text style={styles.cardCity} numberOfLines={1}>{location||t('Local a confirmar')}</Text></View>
        {isLevel(session.skillLevel)?<Text style={styles.cardLevel}>🎯 {levelLabel(session.skillLevel)}</Text>:null}
        {session.courtBooked===true?<Text style={styles.cardLevel}>{t('✓ Campo reservado')}</Text>:null}
        <FriendsGoing sessionId={session.id}/>
      </View>
      <JynloIcon name="chevron-right" size={25} color={MobileTheme.colors.accent}/>
    </View>
    <View style={styles.metrics}>
      <View style={styles.metricCell}><Text style={styles.metricKey}>{t('DATA E HORA')}</Text><Text style={styles.metricValue}>{formatDate(session.gameDate)}</Text></View>
      <View style={styles.metricCell}><Text style={styles.metricKey}>{t('PREÇO')}</Text><Text style={styles.metricValue}>{money(session.priceAmount)}</Text></View>
    </View>
    <View style={styles.participationHead}>
      <Text style={styles.participationLabel}>{hasCapacity?t('{count}/{max} jogadores',{count,max:session.maxParticipants}):t('Participantes por confirmar')}</Text>
      <View style={[styles.statusPill,status.tone==='available'&&styles.statusAvailable,status.tone==='joined'&&styles.statusJoined]}>
        <Text style={[styles.statusText,(status.tone==='available'||status.tone==='joined')&&styles.statusTextHighlight]}>{status.label}</Text>
      </View>
    </View>
    {missing>0?<Text style={styles.missingPlayers}>{missing===1?t('Falta 1 para haver jogo'):t('Faltam {n} para haver jogo',{n:missing})}</Text>:null}
    {hasCapacity?<View style={styles.capacityTrack} accessibilityLabel={t('Ocupação da sessão')}><View style={[styles.capacityFill,{width:`${Math.round(progress*100)}%`}]}/></View>:null}
    <View style={styles.sessionFooter}><Text style={styles.sessionFooterText}>{t('Ver detalhes da sessão')}</Text><JynloIcon name="chevron-right" size={19} color={MobileTheme.colors.accent}/></View>
  </Pressable>;
}
const styles=StyleSheet.create({
  missingPlayers:{color:'#FCD34D',fontSize:13,fontWeight:'800'},
  cardLevel:{color:MobileTheme.colors.accent,fontSize:12,fontWeight:'800',marginTop:2},
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
