import React,{useEffect,useRef,useState} from 'react';
import {Keyboard,KeyboardAvoidingView,Platform,View} from 'react-native';
import type {HostInstance,StyleProp,ViewStyle} from 'react-native';
import {keyboardOverlap} from '../lib/keyboard-core.cjs';

/**
 * Keeps a bottom composer (chat input) above the keyboard.
 * Android draws edge-to-edge, so the window is not always resized for the
 * keyboard: measure how much of this frame the keyboard really covers and pad
 * exactly that. If the system did resize the window the overlap is 0.
 */
export function KeyboardFrame({style,children}:{style?:StyleProp<ViewStyle>;children:React.ReactNode}){
  const frame=useRef<HostInstance|null>(null);
  const [padding,setPadding]=useState(0);
  useEffect(()=>{
    if(Platform.OS!=='android')return;
    let keyboardTop:number|null=null;
    const measure=()=>{
      if(keyboardTop==null){setPadding(0);return;}
      const top=keyboardTop;
      frame.current?.measureInWindow((_x,y,_w,height)=>setPadding(keyboardOverlap(y,height,top)));
    };
    const shown=Keyboard.addListener('keyboardDidShow',event=>{keyboardTop=event.endCoordinates.screenY;measure();});
    const hidden=Keyboard.addListener('keyboardDidHide',()=>{keyboardTop=null;setPadding(0);});
    return()=>{shown.remove();hidden.remove();};
  },[]);
  if(Platform.OS==='ios')return <KeyboardAvoidingView style={style} behavior="padding">{children}</KeyboardAvoidingView>;
  return <View ref={frame} style={[style,padding>0&&{paddingBottom:padding}]}>{children}</View>;
}
