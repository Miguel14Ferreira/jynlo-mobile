import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {safeTeamKitColor,type TeamKitPattern,type TeamKitGarment} from '../lib/sports-teams-api';

type Props={
 primary?:string|null;secondary?:string|null;pattern?:TeamKitPattern|null;
 accent?:string|null;garment?:TeamKitGarment|null;side?:'front'|'back';
 playerName?:string;playerNumber?:string;size?:number;
};

/** Deliberately image-free kit preview: identical saved colors and pattern on iOS/Android. */
export default function TeamKitPreview({primary,secondary,pattern='PLAIN',
 accent,garment='jersey',side='front',playerName='',playerNumber='',size=64}:Props){
 const third=safeTeamKitColor(accent,'#FFFFFF');
 const sleeveless=garment==='singlet'||garment==='vest';
 const main=safeTeamKitColor(primary,'#19CBB6');
 const contrast=safeTeamKitColor(secondary,'#F0FAFB');
 const choice:TeamKitPattern=['PLAIN','STRIPES','DIAGONAL','HOOPS','HALVES','CHEVRON'].includes(pattern||'')?(pattern||'PLAIN'):'PLAIN';
 const unit=size/64;
 const shirtStyle={width:38*unit,height:47*unit,left:13*unit,top:13*unit,
   borderTopLeftRadius:6*unit,borderTopRightRadius:6*unit};
 return <View accessibilityLabel={'Equipamento '+(choice==='STRIPES'?'às riscas verticais':choice==='DIAGONAL'?'com faixa diagonal':choice==='HOOPS'?'às riscas horizontais':choice==='HALVES'?'em metades':choice==='CHEVRON'?'em V':'liso')}
  style={{width:size,height:size,position:'relative'}}>
   {!sleeveless?<><View style={[styles.sleeve,{backgroundColor:main,left:2*unit,top:15*unit,
     width:18*unit,height:18*unit,transform:[{rotate:'19deg'}]}]}/>
   <View style={[styles.sleeve,{backgroundColor:main,right:2*unit,top:15*unit,
     width:18*unit,height:18*unit,transform:[{rotate:'-19deg'}]}]}/></>:null}
   <View style={[styles.torso,shirtStyle,
    sleeveless&&{width:35*unit,left:14.5*unit,borderTopLeftRadius:11*unit,borderTopRightRadius:11*unit},
    {backgroundColor:main}]}>
    {choice==='STRIPES'?<View style={styles.stripes}>
      {Array.from({length:7},(_,i)=><View key={i} style={{flex:1,
       backgroundColor:i%2?contrast:main}}/>)}
    </View>:null}
    {choice==='HOOPS'?<View style={{flex:1,flexDirection:'column'}}>
      {Array.from({length:8},(_,i)=><View key={i} style={{flex:1,backgroundColor:i%2?contrast:main}}/>)}
    </View>:null}
    {choice==='HALVES'?<View style={{position:'absolute',right:0,top:0,bottom:0,width:'50%',backgroundColor:contrast}}/>:null}
    {choice==='CHEVRON'?<>
      <View style={{position:'absolute',height:7*unit,width:31*unit,top:13*unit,left:-4*unit,
        backgroundColor:contrast,transform:[{rotate:'31deg'}]}}/>
      <View style={{position:'absolute',height:7*unit,width:31*unit,top:13*unit,right:-4*unit,
        backgroundColor:contrast,transform:[{rotate:'-31deg'}]}}/>
    </>:null}
    {choice==='DIAGONAL'?<View style={{
      position:'absolute',width:15*unit,height:95*unit,left:12*unit,top:-23*unit,
      backgroundColor:contrast,transform:[{rotate:'38deg'}]
    }}/>:null}
    {side==='back'&&size>=120?<View style={{position:'absolute',top:6*unit,
      left:0,right:0,alignItems:'center'}}>
      <Text numberOfLines={1} style={{fontSize:Math.max(9,9*unit),fontWeight:'900',color:third}}>
       {playerName.toUpperCase().slice(0,14)}</Text>
      <Text style={{fontSize:Math.max(18,24*unit),fontWeight:'900',color:third}}>
       {playerNumber.slice(0,2)}</Text>
    </View>:null}
   </View>
   <View style={[styles.collar,{top:12*unit,left:26*unit,width:12*unit,height:6*unit,
     borderColor:third,borderWidth:2*unit}]}/>
  </View>;
}
const styles=StyleSheet.create({
 sleeve:{position:'absolute',borderRadius:4},
 torso:{position:'absolute',overflow:'hidden',borderBottomLeftRadius:4,borderBottomRightRadius:4},
 stripes:{flex:1,flexDirection:'row'},
 collar:{position:'absolute',borderBottomLeftRadius:8,borderBottomRightRadius:8,
   borderTopWidth:0,backgroundColor:'#0B2A38'}
});
