import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Tabs,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '../../src/lib/auth';
import {myCommunities} from '../../src/lib/community-api';
import type {CommunityGroup} from '../../src/lib/types';
import {MobileTheme} from '../../src/lib/theme';

const colors=MobileTheme.colors;
type NavSymbol='▣'|'⌕'|'✉'|'◉';
function TabSymbol({symbol,color,focused}:{symbol:NavSymbol;color:string;focused:boolean}){
 return <View style={[styles.iconWrap,focused&&styles.iconActive]}>
  <Text style={[styles.symbol,{color}]}>{symbol}</Text>
 </View>;
}
export default function TabsLayout(){
 const insets=useSafeAreaInsets(),router=useRouter(),auth=useAuth();
 const [open,setOpen]=useState(false);
 const [eligible,setEligible]=useState<CommunityGroup[]>([]);
 const [checking,setChecking]=useState(false);
 const [checkError,setCheckError]=useState(false);
 const close=useCallback(()=>setOpen(false),[]);
 useEffect(()=>{
  if(!open||!auth.token||!auth.username){setEligible([]);setChecking(false);return;}
  let active=true;setChecking(true);setCheckError(false);setEligible([]);
  void myCommunities(auth.token,auth.username).then(groups=>{
   if(active)setEligible(groups.filter(c=>c.myRole==='OWNER'||c.myRole==='ADMIN'));
  }).catch(()=>{if(active)setCheckError(true);})
   .finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;};
 },[open,auth.token,auth.username]);
 const action=(destination:'session'|'post'|'story'|'community'|'tournament'|'venue')=>{
  close();
  if(!auth.token||!auth.username){
   router.push({pathname:'/login',params:{redirect:'/'}});
   return;
  }
  if(destination==='session')router.push('/sessions/create');
  else if(destination==='community')router.push('/communities/create');
  else if(destination==='venue')router.push('/venues/create');
  else if(destination==='tournament')router.push('/tournaments/create');
  else router.push({pathname:'/(tabs)',params:{compose:destination}});
 };
 return <>
  <Tabs screenOptions={{
   headerShown:false,tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.tabInactive,
   tabBarStyle:{backgroundColor:colors.tabBackground,borderTopColor:colors.border,height:64+Math.max(insets.bottom,0),paddingBottom:Math.max(insets.bottom,8),paddingTop:7},
   tabBarLabelStyle:{fontSize:MobileTheme.typography.label,fontWeight:'800'},
   tabBarItemStyle:{minHeight:MobileTheme.touchTarget},
  }}>
   <Tabs.Screen name="index" options={{title:'Início',tabBarIcon:({color,focused})=><TabSymbol symbol="▣" color={color} focused={focused}/>}}/>
   <Tabs.Screen name="explore" options={{title:'Explorar',tabBarIcon:({color,focused})=><TabSymbol symbol="⌕" color={color} focused={focused}/>}}/>
   <Tabs.Screen name="create" options={{title:'Criar',tabBarButton:()=>(
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu de criação" onPress={()=>setOpen(true)} style={styles.createTab}>
     <View style={styles.createCircle}><Text style={styles.createPlus}>＋</Text></View>
     <Text style={styles.createLabel}>Criar</Text>
    </Pressable>)}}/>
   <Tabs.Screen name="messages" options={{title:'Mensagens',tabBarIcon:({color,focused})=><TabSymbol symbol="✉" color={color} focused={focused}/>}}/>
   <Tabs.Screen name="profile" options={{title:'Perfil',tabBarIcon:({color,focused})=><TabSymbol symbol="◉" color={color} focused={focused}/>}}/>
   <Tabs.Screen name="communities" options={{href:null,title:'Comunidades'}}/>
   <Tabs.Screen name="tournaments" options={{href:null,title:'Torneios'}}/>
  </Tabs>
  <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
   <View style={styles.overlay}>
    <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar menu de criação"/>
    <View style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,16)}]}>
     <View style={styles.handle}/>
     <View style={styles.sheetHeader}><View style={{flex:1,gap:5}}>
      <Text style={styles.sheetTitle}>O que vamos criar?</Text>
      <Text style={styles.sheetSubtitle}>Junta pessoas através do desporto.</Text>
     </View><Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.actions}>
      <View style={styles.primaryGrid}>
       <Pressable accessibilityRole="button" style={[styles.actionCard,styles.mainAction]} onPress={()=>action('session')}>
        <Text style={styles.mainActionIcon}>▣</Text><Text style={styles.mainActionTitle}>Criar sessão</Text><Text style={styles.mainActionHint}>Organiza um jogo</Text>
       </Pressable>
       <Pressable accessibilityRole="button" style={styles.actionCard} onPress={()=>action('post')}>
        <Text style={styles.actionIcon}>▤</Text><Text style={styles.actionTitle}>Publicação</Text><Text style={styles.actionHint}>Partilha um momento</Text>
       </Pressable>
       <Pressable accessibilityRole="button" style={styles.actionCard} onPress={()=>action('venue')}>
        <Text style={styles.actionIcon}>⌖</Text><Text style={styles.actionTitle}>Sugerir recinto</Text><Text style={styles.actionHint}>Partilha um local</Text>
       </Pressable>
       <Pressable accessibilityRole="button" style={styles.actionCard} onPress={()=>action('community')}>
        <Text style={styles.actionIcon}>◎</Text><Text style={styles.actionTitle}>Comunidade</Text><Text style={styles.actionHint}>Junta a tua malta</Text>
       </Pressable>
      </View>
      {auth.token&&auth.username?checking?<View style={styles.checking}><ActivityIndicator color={colors.accent}/><Text style={styles.secondaryHint}>A verificar as tuas comunidades…</Text></View>:checkError?<Text style={styles.info}>Não foi possível confirmar as permissões para torneios. Abre novamente este menu para tentar.</Text>:eligible.length>0?
       <Pressable accessibilityRole="button" style={styles.secondaryAction} onPress={()=>action('tournament')}>
        <Text style={styles.secondaryIcon}>♜</Text><View style={{flex:1}}><Text style={styles.secondaryTitle}>Criar torneio</Text><Text style={styles.secondaryHint}>Escolhe uma comunidade que administras</Text></View><Text style={styles.chevron}>›</Text>
       </Pressable>:<Text style={styles.info}>Para criar torneios, precisas de administrar uma comunidade. Podes criar uma acima.</Text>
       :<Text style={styles.info}>Para criar conteúdos ou organizar atividades, inicia sessão na Jynlo.</Text>}
      <Text style={styles.info}>Campeonatos exigem uma comunidade e gestão própria. A criação ficará disponível aqui quando o respetivo fluxo Mobile estiver integrado.</Text>
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
 createCircle:{width:49,height:49,borderRadius:25,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent,marginTop:-13},
 createPlus:{fontSize:32,fontWeight:'800',color:colors.background,includeFontPadding:false},
 createLabel:{fontSize:11,fontWeight:'800',color:colors.accent},
 overlay:{flex:1,justifyContent:'flex-end'},
 scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.70)'},
 sheet:{maxHeight:'86%',backgroundColor:colors.background,borderTopLeftRadius:28,borderTopRightRadius:28,borderTopWidth:1,borderColor:colors.border,padding:18,gap:15},
 handle:{height:4,width:42,alignSelf:'center',borderRadius:4,backgroundColor:colors.border},
 sheetHeader:{flexDirection:'row',alignItems:'center',gap:12},
 sheetTitle:{fontSize:23,fontWeight:'900',color:colors.text},sheetSubtitle:{fontSize:13,color:colors.muted},
 close:{width:MobileTheme.touchTarget,height:MobileTheme.touchTarget,alignItems:'center',justifyContent:'center'},
 closeText:{fontSize:30,color:colors.text},
 actions:{gap:12,paddingBottom:14},
 primaryGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
 actionCard:{width:'48%',minHeight:122,padding:15,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,justifyContent:'flex-end',gap:5},
 mainAction:{backgroundColor:colors.accent,borderColor:colors.accent},
 mainActionIcon:{color:colors.background,fontSize:23,fontWeight:'900'},mainActionTitle:{color:colors.background,fontSize:15,fontWeight:'900'},mainActionHint:{color:colors.background,fontSize:11},
 actionIcon:{fontSize:23,color:colors.accent},actionTitle:{fontSize:15,fontWeight:'900',color:colors.text},actionHint:{fontSize:11,color:colors.muted},
 secondaryAction:{minHeight:65,padding:12,borderRadius:15,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:12},
 secondaryIcon:{fontSize:26,color:colors.accent,width:31,textAlign:'center'},
 secondaryTitle:{fontSize:14,color:colors.text,fontWeight:'900'},secondaryHint:{fontSize:11,color:colors.muted,marginTop:3},
 chevron:{fontSize:26,color:colors.accent},checking:{flexDirection:'row',alignItems:'center',gap:10,padding:10},
 info:{color:colors.muted,fontSize:11,lineHeight:17,paddingHorizontal:5},
});
