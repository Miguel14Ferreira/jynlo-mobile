import React,{useEffect,useRef} from 'react';
import {AccessibilityInfo,Animated,Easing,StyleSheet,Text,View} from 'react-native';

/** WhatsApp-style "is typing": an incoming bubble with three bouncing dots (and who, in groups). */
export function TypingBubble({label,showName=false}:{label:string;showName?:boolean}){
 const dots=useRef([new Animated.Value(0),new Animated.Value(0),new Animated.Value(0)]).current;
 useEffect(()=>{
  let loop:Animated.CompositeAnimation|null=null;
  let alive=true;
  void AccessibilityInfo.isReduceMotionEnabled().then(reduce=>{
   if(!alive||reduce)return;
   loop=Animated.loop(Animated.stagger(150,dots.map(v=>Animated.sequence([
    Animated.timing(v,{toValue:1,duration:300,easing:Easing.out(Easing.quad),useNativeDriver:true}),
    Animated.timing(v,{toValue:0,duration:300,easing:Easing.in(Easing.quad),useNativeDriver:true}),
    Animated.delay(300),
   ]))));
   loop.start();
  }).catch(()=>{});
  return()=>{alive=false;loop?.stop();};
 },[dots]);
 return <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={label} accessibilityLiveRegion="polite">
  <View style={styles.bubble}>
   {dots.map((v,i)=><Animated.View key={i} style={[styles.dot,{
    opacity:v.interpolate({inputRange:[0,1],outputRange:[.4,1]}),
    transform:[{translateY:v.interpolate({inputRange:[0,1],outputRange:[0,-4]})}],
   }]}/>)}
  </View>
  {showName&&label?<Text style={styles.who} numberOfLines={1}>{label}</Text>:null}
 </View>;
}

const styles=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:8,paddingVertical:4,minHeight:34},
 bubble:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:12,paddingVertical:10,
  borderTopLeftRadius:16,borderTopRightRadius:16,borderBottomRightRadius:16,borderBottomLeftRadius:4,
  backgroundColor:'rgba(36,74,90,.92)',borderWidth:1,borderColor:'rgba(96,176,182,.25)'},
 dot:{width:7,height:7,borderRadius:4,backgroundColor:'#9fe8d6'},
 who:{color:'#8fd9c8',fontSize:12,fontWeight:'600',flexShrink:1},
});
