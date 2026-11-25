import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {usePathname,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {t} from '../lib/i18n';
import {C} from '../lib/theme';
import {activeCall,subscribeActiveCall,type ActiveCall} from '../lib/active-call';

/** Shown on every other screen while a call is running, like WhatsApp's green bar. */
export function ActiveCallBar(){
 const [call,setCall]=useState<ActiveCall|null>(activeCall());
 const pathname=usePathname(),router=useRouter(),insets=useSafeAreaInsets();
 useEffect(()=>subscribeActiveCall(setCall),[]);
 if(!call||pathname==='/messages/call')return null;
 return <Pressable accessibilityRole="button" accessibilityLabel={t('Voltar à chamada com @{a}',{a:call.peer})}
   // Go back to the call screen that is still open underneath (never open a second one).
   onPress={()=>router.dismissTo({pathname:'/messages/call',params:{peer:call.peer}})}
   style={[styles.bar,{paddingTop:insets.top+6}]}>
  <View style={styles.dot}/>
  <Text style={styles.text} numberOfLines={1}>{t('Chamada em curso com @{a} · toca para voltar',{a:call.peer})}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 bar:{position:'absolute',top:0,left:0,right:0,zIndex:50,flexDirection:'row',alignItems:'center',gap:8,
  paddingHorizontal:16,paddingBottom:8,backgroundColor:'#0E7A5F'},
 dot:{width:9,height:9,borderRadius:5,backgroundColor:C.white},
 text:{color:C.white,fontWeight:'800',fontSize:13,flexShrink:1},
});
