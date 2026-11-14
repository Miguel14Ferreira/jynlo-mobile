import React from 'react';
import {Pressable,StyleSheet} from 'react-native';
import {JynloIcon} from './JynloIcon';

/** Accessible close action with an invisible touch target and no circular chrome. */
export function CloseIconButton({onPress,label='Fechar',disabled=false,color='#FFFFFF'}:{
 onPress:()=>void;
 label?:string;
 disabled?:boolean;
 color?:string;
}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label}
  accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
  hitSlop={8} style={({pressed})=>[styles.touchTarget,(pressed||disabled)&&styles.dimmed]}>
  <JynloIcon name="close" size={25} color={color}/>
 </Pressable>;
}
const styles=StyleSheet.create({
 touchTarget:{width:44,height:44,alignItems:'center',justifyContent:'center',backgroundColor:'transparent',borderWidth:0,borderRadius:0},
 dimmed:{opacity:.6},
});
