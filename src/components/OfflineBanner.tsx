import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNetworkStatus} from '../lib/network-status';
import {savedLabel} from '../lib/offline-core.cjs';
import {C} from '../lib/theme';

/** Floating notice at the top while there is no connection; says when saved data is shown. Never blocks touches. */
export function OfflineBanner(){
 const {offline,savedSince}=useNetworkStatus();
 const insets=useSafeAreaInsets();
 if(!offline)return null;
 return <View style={[styles.bar,{paddingTop:insets.top+6}]} accessibilityRole="alert" accessibilityLiveRegion="polite">
  <Text style={styles.text}>Sem ligação à internet.{savedSince?` A mostrar dados guardados ${savedLabel(savedSince)}.`:' Algumas ações só funcionam com rede.'}</Text>
 </View>;
}
const styles=StyleSheet.create({
 bar:{position:'absolute',left:16,right:16,zIndex:50,elevation:8,backgroundColor:'#61383A',paddingHorizontal:14,paddingVertical:9,borderRadius:14,borderWidth:1,borderColor:'#8A5153'},
 text:{color:C.white,fontSize:13,fontWeight:'800',textAlign:'center'},
});
