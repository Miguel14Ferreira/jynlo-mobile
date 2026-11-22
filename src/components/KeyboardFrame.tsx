import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Keyboard,KeyboardAvoidingView,Platform,TextInput,View} from 'react-native';
import type {HostInstance,ScrollViewInstance,StyleProp,ViewStyle} from 'react-native';
import {keyboardOverlap,scrollToReveal} from '../lib/keyboard-core.cjs';

/**
 * Keeps a bottom composer (chat input) above the keyboard.
 * Android draws edge-to-edge, so the window is not always resized for the
 * keyboard: measure how much of this frame the keyboard really covers and pad
 * exactly that. If the system did resize the window the overlap is 0.
 */
export function KeyboardFrame({style,children,accessibilityLabel}:{style?:StyleProp<ViewStyle>;children:React.ReactNode;accessibilityLabel?:string}){
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
  if(Platform.OS==='ios')return <KeyboardAvoidingView style={style} behavior="padding" accessibilityLabel={accessibilityLabel}>{children}</KeyboardAvoidingView>;
  return <View ref={frame} style={[style,padding>0&&{paddingBottom:padding}]} accessibilityLabel={accessibilityLabel}>{children}</View>;
}

/**
 * For a ScrollView with text fields (forms in sheets and dialogs): on Android,
 * measure the focused field against the keyboard and scroll just enough for it
 * to stay visible, following the focus from field to field.
 * Attach scrollRef/onScroll to the ScrollView and frameRef to a View around it.
 */
export function useKeyboardReveal(){
  const scrollRef=useRef<ScrollViewInstance|null>(null);
  const frameRef=useRef<HostInstance|null>(null);
  const scrollY=useRef(0);
  const keyboardTop=useRef<number|null>(null);
  const lastFocused=useRef<unknown>(null);
  const [keyboardHeight,setKeyboardHeight]=useState(0);
  const reveal=useCallback(()=>{
    const focused=TextInput.State.currentlyFocusedInput?.() as HostInstance|null;
    lastFocused.current=focused;
    if(!focused||keyboardTop.current==null)return;
    const top=keyboardTop.current;
    const measureField=(frameY:number)=>focused.measureInWindow?.((_x,y,_w,height)=>{
      const delta=scrollToReveal(y,height,top,frameY);
      if(delta!==0)scrollRef.current?.scrollTo({y:Math.max(0,scrollY.current+delta),animated:true});
    });
    if(frameRef.current)frameRef.current.measureInWindow((_fx:number,frameY:number)=>measureField(frameY));
    else measureField(0);
  },[]);
  useEffect(()=>{
    if(Platform.OS!=='android')return;
    let watcher:ReturnType<typeof setInterval>|null=null;
    const shown=Keyboard.addListener('keyboardDidShow',event=>{
      keyboardTop.current=event.endCoordinates.screenY;
      setKeyboardHeight(Math.max(0,event.endCoordinates.height));
      if(watcher)clearInterval(watcher);
      watcher=setInterval(()=>{
        const focused=TextInput.State.currentlyFocusedInput?.();
        if(focused&&focused!==lastFocused.current)reveal();
      },250);
      setTimeout(reveal,80);
    });
    const hidden=Keyboard.addListener('keyboardDidHide',()=>{
      keyboardTop.current=null;lastFocused.current=null;setKeyboardHeight(0);
      if(watcher){clearInterval(watcher);watcher=null;}
    });
    return()=>{shown.remove();hidden.remove();if(watcher)clearInterval(watcher);};
  },[reveal]);
  const onScroll=useCallback((event:{nativeEvent:{contentOffset:{y:number}}})=>{scrollY.current=event.nativeEvent.contentOffset.y;},[]);
  return {scrollRef,frameRef,keyboardHeight,reveal,onScroll};
}
