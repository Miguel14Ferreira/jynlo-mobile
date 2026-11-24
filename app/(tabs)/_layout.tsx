import React,{useCallback,useEffect,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Tabs,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '../../src/lib/auth';
import {myCommunities} from '../../src/lib/community-api';
import type {CommunityGroup} from '../../src/lib/types';
import {MobileTheme} from '../../src/lib/theme';
import {JynloIcon,type JynloIconName} from '../../src/components/JynloIcon';
import {useUnreadMessages} from '../../src/lib/use-unread-messages';
import {formatUnreadBadge} from '../../src/lib/inbox-filter.cjs';
import {firstStepsDue} from '../../src/lib/first-steps-api';
import {useBookingsOpen} from '../../src/lib/use-bookings-open';

const colors=MobileTheme.colors;
function TabSymbol({name,color,focused}:{name:JynloIconName;color:string;focused:boolean}){
 return <View style={[styles.iconWrap,focused&&styles.iconActive]}>
  <JynloIcon name={name} color={color} size={24} active={focused}/>
 </View>;
}
export default function TabsLayout(){
 const insets=useSafeAreaInsets(),router=useRouter(),auth=useAuth();
 const [open,setOpen]=useState(false);
 const bookingsOpen=useBookingsOpen();
 const unread=useUnreadMessages(auth.token,auth.username);
 const badge=formatUnreadBadge(unread.count);
 const [eligible,setEligible]=useState<CommunityGroup[]>([]);
 const [checking,setChecking]=useState(false);
 const [checkError,setCheckError]=useState(false);
 const [chooseChampionship,setChooseChampionship]=useState(false);
 const [moreOpen,setMoreOpen]=useState(false);
 const close=useCallback(()=>{setOpen(false);setChooseChampionship(false);setMoreOpen(false);},[]);
 // New accounts choose sports and city once; "Agora não" is remembered on this device.
 useEffect(()=>{
  let active=true;
  void firstStepsDue(auth.token,auth.username).then(due=>{if(active&&due)router.push('/first-steps');});
  return()=>{active=false;};
 },[auth.token,auth.username,router]);
 useEffect(()=>{
  if(!open||!auth.token||!auth.username){setEligible([]);setChecking(false);return;}
  let active=true;setChecking(true);setCheckError(false);setEligible([]);
  void myCommunities(auth.token,auth.username).then(groups=>{
   if(active)setEligible(groups.filter(c=>c.myRole==='OWNER'||c.myRole==='ADMIN'));
  }).catch(()=>{if(active)setCheckError(true);})
   .finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;};
 },[open,auth.token,auth.username]);
 const openChampionshipPicker=()=>{
  if(checking||checkError||eligible.length===0||!auth.token||!auth.username)return;
  if(eligible.length===1){
   const community=eligible[0];
   if(!community)return;
   close();
   router.push({pathname:'/communities/[id]/championships/create',params:{id:String(community.id)}});
  }else setChooseChampionship(true);
 };
 const selectChampionshipCommunity=(id:number)=>{
  if(!auth.token||!auth.username||!eligible.some(group=>group.id===id))return;
  close();
  router.push({pathname:'/communities/[id]/championships/create',params:{id:String(id)}});
 };
 const action=(destination:'session'|'post'|'community'|'team'|'tournament'|'venue'|'book')=>{
  close();
  // Anyone can look at free slots; signing in is asked only to send the request.
  if(destination==='book'){router.push('/book-court' as never);return;}
  if(!auth.token||!auth.username){
   router.push({pathname:'/login',params:{redirect:'/'}});
   return;
  }
  if(destination==='session')router.push('/sessions/create');
  else if(destination==='community')router.push('/communities/create');
  else if(destination==='team')router.push({pathname:'/teams',params:{create:'1'}});
  else if(destination==='venue')router.push('/venues/create');
  else if(destination==='tournament')router.push('/tournaments/create');
  else router.push({pathname:'/(tabs)',params:{compose:destination}});
 };
 return <>
  <Tabs screenListeners={{focus:()=>{void unread.refresh();}}} screenOptions={{
   headerShown:false,tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.tabInactive,
   tabBarStyle:{backgroundColor:colors.tabBackground,borderTopColor:colors.border,height:58+Math.max(insets.bottom,0),paddingBottom:Math.max(insets.bottom,8),paddingTop:8},
   // Icons only (no truncated labels on narrow phones); each tab keeps its name for screen readers.
   tabBarShowLabel:false,
   tabBarItemStyle:{minHeight:MobileTheme.touchTarget},
  }}>
   <Tabs.Screen name="index" options={{title:t('Início'),tabBarButtonTestID:'tab-home',tabBarAccessibilityLabel:t('Início'),tabBarIcon:({color,focused})=><TabSymbol name="home" color={String(color)} focused={focused}/>}}/>
   <Tabs.Screen name="explore" options={{title:t('Explorar'),tabBarButtonTestID:'tab-explore',tabBarAccessibilityLabel:t('Explorar'),tabBarIcon:({color,focused})=><TabSymbol name="explore" color={String(color)} focused={focused}/>}}/>
   <Tabs.Screen name="create" options={{title:t('Criar'),tabBarButton:()=>(
    <Pressable accessibilityRole="button" accessibilityLabel={t('Abrir menu de criação')} onPress={()=>setOpen(true)} style={styles.createTab}>
     <View style={styles.createCircle}><JynloIcon name="plus" color={colors.background} size={32}/></View>
    </Pressable>)}}/>
   <Tabs.Screen name="messages" options={{title:t('Mensagens'),tabBarButtonTestID:'tab-messages',tabBarAccessibilityLabel:badge?t('Mensagens, {count} por ler',{count:badge}):t('Mensagens'),
    tabBarBadge:badge||undefined,tabBarBadgeStyle:{backgroundColor:'#FF5A5F',color:'#FFFFFF',fontSize:10,fontWeight:'800'},tabBarIcon:({color,focused})=><TabSymbol name="messages" color={String(color)} focused={focused}/>}}/>
   <Tabs.Screen name="profile" options={{title:t('Perfil'),tabBarButtonTestID:'tab-profile',tabBarAccessibilityLabel:t('Perfil'),tabBarIcon:({color,focused})=><TabSymbol name="profile" color={String(color)} focused={focused}/>}}/>
  </Tabs>
  <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
   <View style={styles.overlay}>
    <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel={t('Fechar menu de criação')}/>
    <View style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,16)}]}>
     <View style={styles.handle}/>
     <View style={styles.sheetHeader}><View style={{flex:1,gap:5}}>
      <Text style={styles.sheetTitle}>{t('O que vamos criar?')}</Text>
      <Text style={styles.sheetSubtitle}>{t('Junta pessoas através do desporto.')}</Text>
     </View><Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('Fechar')} style={styles.close}><JynloIcon name="close" size={25} color={colors.text}/></Pressable></View>
     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Criar sessão desportiva')} accessibilityHint={t('Organiza um jogo, convida participantes e gere equipas')} style={styles.sessionHero} onPress={()=>action('session')}>
       <View style={styles.sessionHeroIcon}><JynloIcon name="session" size={26} color={colors.accent}/></View>
       <View style={styles.sessionHeroCopy}><Text style={styles.sessionHeroEyebrow}>{t('AÇÃO PRINCIPAL')}</Text><Text style={styles.sessionHeroTitle}>{t('Criar sessão')}</Text><Text style={styles.sessionHeroSubtitle}>{t('Marca o jogo, reúne jogadores e organiza as equipas.')}</Text></View>
       <JynloIcon name="chevron-right" size={25} color={colors.background}/>
      </Pressable>
      <Text style={styles.moreActionsTitle}>{t('Também podes criar')}</Text>
      <View style={styles.primaryGrid}>
       <Pressable accessibilityRole="button" style={styles.actionCard} onPress={()=>action('post')}>
        <JynloIcon name="post" size={27} color={colors.accent}/><Text style={styles.actionTitle}>{t('Publicação')}</Text><Text style={styles.actionHint}>{t('Partilha um momento')}</Text>
       </Pressable>
       <Pressable accessibilityRole="button" style={styles.actionCard} onPress={()=>action('community')}>
        <JynloIcon name="community" size={27} color={colors.accent}/><Text style={styles.actionTitle}>{t('Comunidade')}</Text><Text style={styles.actionHint}>{t('Junta a tua malta')}</Text>
       </Pressable>
       {bookingsOpen?<Pressable accessibilityRole="button" accessibilityLabel={t('Reservar campo')} accessibilityHint={t('Vê os horários livres e reserva')} style={[styles.actionCard,styles.teamCard]} onPress={()=>action('book')}>
        <View style={styles.teamIcon}><JynloIcon name="calendar" size={27} color={colors.accent}/></View><View style={styles.teamCopy}><Text style={styles.actionTitle}>{t('Reservar campo')}</Text><Text style={styles.actionHint}>{t('Vê os horários livres e reserva')}</Text></View><JynloIcon name="chevron-right" size={23} color={colors.accent}/>
       </Pressable>:null}
       <Pressable accessibilityRole="button" accessibilityLabel={t('Criar torneio')} accessibilityHint={t('Organiza um torneio ou liga numa comunidade tua')} style={[styles.actionCard,styles.teamCard]} onPress={()=>action('tournament')}>
        <View style={styles.teamIcon}><JynloIcon name="championship" size={27} color={colors.accent}/></View><View style={styles.teamCopy}><Text style={styles.actionTitle}>{t('Torneio')}</Text><Text style={styles.actionHint}>{t('Liga, eliminatórias ou grupos, com classificação automática')}</Text></View><JynloIcon name="chevron-right" size={23} color={colors.accent}/>
       </Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel={t('Criar uma equipa')} style={[styles.actionCard,styles.teamCard]} onPress={()=>action('team')}>
        <View style={styles.teamIcon}><JynloIcon name="tournament" size={27} color={colors.accent}/></View><View style={styles.teamCopy}><Text style={styles.actionTitle}>{t('Equipa')}</Text><Text style={styles.actionHint}>{t('Cria a tua equipa e gere o plantel')}</Text></View><JynloIcon name="chevron-right" size={23} color={colors.accent}/>
       </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Mostrar outras ferramentas de criação')}
       accessibilityState={{expanded:moreOpen}} style={styles.moreToggle} onPress={()=>setMoreOpen(value=>!value)}>
       <Text style={styles.moreToggleLabel}>{t('Outras ferramentas')}</Text><JynloIcon name={moreOpen?'chevron-up':'chevron-down'} size={23} color={colors.accent}/>
      </Pressable>
      {moreOpen?<>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Sugerir um recinto desportivo')} style={styles.secondaryAction} onPress={()=>action('venue')}>
       <JynloIcon name="venue" size={25} color={colors.accent}/><View style={{flex:1}}><Text style={styles.secondaryTitle}>{t('Sugerir recinto')}</Text><Text style={styles.secondaryHint}>{t('Acrescenta um espaço desportivo à Jynlo')}</Text></View><JynloIcon name="chevron-right" size={22} color={colors.accent}/>
      </Pressable>
      {auth.token&&auth.username?checking?<View style={styles.checking}><ActivityIndicator color={colors.accent}/><Text style={styles.secondaryHint}>{t('A verificar as tuas comunidades…')}</Text></View>:checkError?<Text style={styles.info}>{t('Não foi possível verificar as tuas comunidades. Abre novamente este menu para tentar.')}</Text>:null
       :<Text style={styles.info}>{t('Para criar conteúdos ou organizar atividades, inicia sessão na Jynlo.')}</Text>}
      {auth.token&&auth.username&&!checking&&!checkError&&eligible.length>0?<>
       <Pressable accessibilityRole="button" accessibilityLabel={t('Criar campeonato')} style={styles.secondaryAction} onPress={openChampionshipPicker}>
        <JynloIcon name="championship" size={25} color={colors.accent}/><View style={{flex:1}}><Text style={styles.secondaryTitle}>{t('Criar campeonato')}</Text><Text style={styles.secondaryHint}>{t('Várias provas numa época · comunidade que administras')}</Text></View><JynloIcon name="chevron-right" size={22} color={colors.accent}/>
       </Pressable>
       {chooseChampionship?<View style={styles.communityPicker}>
        <Text style={styles.pickerTitle}>{t('Escolhe a comunidade')}</Text>
        {eligible.map(group=><Pressable key={group.id} accessibilityRole="button" accessibilityLabel={t('Criar campeonato na comunidade {name}',{name:group.name})} style={styles.communityChoice} onPress={()=>selectChampionshipCommunity(group.id)}>
          <Text style={styles.communityChoiceText} numberOfLines={1}>{group.name}</Text><JynloIcon name="chevron-right" size={22} color={colors.accent}/>
        </Pressable>)}
       </View>:null}
      </>:null}
      </>:null}
     </ScrollView>
    </View>
   </View>
  </Modal>
 </>;
}
const styles=StyleSheet.create({
 iconWrap:{height:30,minWidth:52,borderRadius:MobileTheme.radius.pill,alignItems:'center',justifyContent:'center'},
 iconActive:{backgroundColor:colors.surface},symbol:{fontSize:21,fontWeight:'700',textAlign:'center',includeFontPadding:false},
 createTab:{flex:1,minHeight:MobileTheme.touchTarget,alignItems:'center',justifyContent:'center',gap:2},
 createCircle:{width:49,height:49,borderRadius:25,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent,marginTop:-6},
 createPlus:{fontSize:32,fontWeight:'800',color:colors.background,includeFontPadding:false},
 createLabel:{fontSize:11,fontWeight:'800',color:colors.accent},
 overlay:{flex:1,justifyContent:'flex-end'},
 scrim:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,.70)'},
 sheet:{maxHeight:'86%',backgroundColor:colors.background,borderTopLeftRadius:28,borderTopRightRadius:28,borderTopWidth:1,borderColor:colors.border,padding:18,gap:15},
 handle:{height:4,width:42,alignSelf:'center',borderRadius:4,backgroundColor:colors.border},
 sheetHeader:{flexDirection:'row',alignItems:'center',gap:12},
 sheetTitle:{fontSize:23,fontWeight:'900',color:colors.text},sheetSubtitle:{fontSize:13,color:colors.muted},
 close:{width:MobileTheme.touchTarget,height:MobileTheme.touchTarget,alignItems:'center',justifyContent:'center'},
 closeText:{fontSize:30,color:colors.text},
 actions:{gap:12,paddingBottom:14},
 moreToggle:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
 moreToggleLabel:{fontSize:13,fontWeight:'800',color:colors.text},
 primaryGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:10},
 sessionHero:{width:'100%',minHeight:142,borderRadius:20,backgroundColor:colors.accent,padding:18,flexDirection:'row',alignItems:'center',gap:13},
 sessionHeroIcon:{width:51,height:51,borderRadius:16,backgroundColor:colors.background,alignItems:'center',justifyContent:'center'},
 sessionHeroIconText:{color:colors.accent,fontSize:34,fontWeight:'800',includeFontPadding:false},
 sessionHeroCopy:{flex:1,gap:5},sessionHeroEyebrow:{color:colors.background,fontSize:10,fontWeight:'900',letterSpacing:1.1},
 sessionHeroTitle:{color:colors.background,fontSize:23,fontWeight:'900'},
 sessionHeroSubtitle:{color:colors.background,fontSize:12,lineHeight:18},
 sessionHeroArrow:{color:colors.background,fontSize:34,fontWeight:'700'},
 moreActionsTitle:{color:colors.muted,fontWeight:'800',fontSize:12,marginTop:4},
 actionCard:{width:'48%',minHeight:122,padding:15,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,justifyContent:'flex-end',gap:5},
 teamCard:{width:'100%',minHeight:94,flexDirection:'row',alignItems:'center',justifyContent:'flex-start',gap:12,paddingVertical:14},
 teamIcon:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:colors.raised},
 teamCopy:{flex:1,gap:5},
 actionIcon:{fontSize:23,color:colors.accent},actionTitle:{fontSize:15,fontWeight:'900',color:colors.text},actionHint:{fontSize:11,color:colors.muted},
 secondaryAction:{minHeight:65,padding:12,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:12},
 secondaryIcon:{fontSize:26,color:colors.accent,width:31,textAlign:'center'},
 secondaryTitle:{fontSize:14,color:colors.text,fontWeight:'900'},secondaryHint:{fontSize:11,color:colors.muted,marginTop:3},
 communityPicker:{gap:8,padding:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.raised,borderRadius:15},
 pickerTitle:{fontSize:13,fontWeight:'900',color:colors.text},
 communityChoice:{padding:12,minHeight:MobileTheme.touchTarget,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:colors.border},
 communityChoiceText:{flex:1,fontSize:13,fontWeight:'800',color:colors.text},
 chevron:{fontSize:26,color:colors.accent},checking:{flexDirection:'row',alignItems:'center',gap:10,padding:10},
 info:{color:colors.muted,fontSize:11,lineHeight:17,paddingHorizontal:5},
});
