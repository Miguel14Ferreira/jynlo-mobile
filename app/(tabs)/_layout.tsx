import React from 'react';
import {Tabs} from 'expo-router';
import {Text} from 'react-native';
import {C} from '../../src/lib/theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
export default function TabsLayout(){const insets=useSafeAreaInsets();return <Tabs screenOptions={{
  headerShown:false,tabBarActiveTintColor:'#26E0CD',tabBarInactiveTintColor:'#85A8B0',
  tabBarStyle:{backgroundColor:'#06121D',borderTopColor:'#0B3946',height:62+Math.max(insets.bottom,0),paddingBottom:Math.max(insets.bottom,8),paddingTop:7},
  tabBarLabelStyle:{fontSize:11,fontWeight:'800'},
}}>
  <Tabs.Screen name="index" options={{title:'Feed',tabBarIcon:({color})=><Text style={{fontSize:22,color}}>▣</Text>}}/>
  <Tabs.Screen name="explore" options={{title:'Explorar',tabBarIcon:({color})=><Text style={{fontSize:22,color}}>⌕</Text>}}/>
  <Tabs.Screen name="communities" options={{title:'Comunidades',tabBarIcon:({color})=><Text style={{fontSize:21,color}}>◎</Text>}}/>
  <Tabs.Screen name="messages" options={{title:'Mensagens',tabBarIcon:({color})=><Text style={{fontSize:20,color}}>✉</Text>}}/>
  <Tabs.Screen name="profile" options={{title:'Perfil',tabBarIcon:({color})=><Text style={{fontSize:20,color}}>◉</Text>}}/>
  <Tabs.Screen name="tournaments" options={{href:null,title:'Torneios'}}/>
</Tabs>;}
