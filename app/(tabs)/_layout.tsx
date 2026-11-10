import React from 'react';
import {Tabs} from 'expo-router';
import {StyleSheet,Text,View} from 'react-native';
import {MobileTheme} from '../../src/lib/theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const colors=MobileTheme.colors;
type NavSymbol='▣'|'⌕'|'◎'|'✉'|'◉';
function TabSymbol({symbol,color,focused}:{symbol:NavSymbol;color:string;focused:boolean}){
  return <View style={[styles.iconWrap,focused&&styles.iconActive]}>
    <Text style={[styles.symbol,{color}]}>{symbol}</Text>
  </View>;
}
export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:colors.accent,
    tabBarInactiveTintColor:colors.tabInactive,
    tabBarStyle:{
      backgroundColor:colors.tabBackground,borderTopColor:colors.border,
      height:64+Math.max(insets.bottom,0),paddingBottom:Math.max(insets.bottom,8),
      paddingTop:7
    },
    tabBarLabelStyle:{fontSize:MobileTheme.typography.label,fontWeight:'800'},
    tabBarItemStyle:{minHeight:MobileTheme.touchTarget},
  }}>
    <Tabs.Screen name="index" options={{title:'Feed',tabBarIcon:({color,focused})=><TabSymbol symbol="▣" color={color} focused={focused}/>}}/>
    <Tabs.Screen name="explore" options={{title:'Explorar',tabBarIcon:({color,focused})=><TabSymbol symbol="⌕" color={color} focused={focused}/>}}/>
    <Tabs.Screen name="communities" options={{title:'Comunidades',tabBarIcon:({color,focused})=><TabSymbol symbol="◎" color={color} focused={focused}/>}}/>
    <Tabs.Screen name="messages" options={{title:'Mensagens',tabBarIcon:({color,focused})=><TabSymbol symbol="✉" color={color} focused={focused}/>}}/>
    <Tabs.Screen name="profile" options={{title:'Perfil',tabBarIcon:({color,focused})=><TabSymbol symbol="◉" color={color} focused={focused}/>}}/>
    <Tabs.Screen name="tournaments" options={{href:null,title:'Torneios'}}/>
  </Tabs>;
}
const styles=StyleSheet.create({
  iconWrap:{height:30,minWidth:52,borderRadius:MobileTheme.radius.pill,alignItems:'center',justifyContent:'center'},
  iconActive:{backgroundColor:colors.surface},
  symbol:{fontSize:21,fontWeight:'700',textAlign:'center',includeFontPadding:false},
});
