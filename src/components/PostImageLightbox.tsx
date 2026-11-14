import React,{useState} from 'react';
import {Image,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {JynloIcon} from './JynloIcon';

export type ExpandedPostPhotos={uris:string[];index:number};
type Props={photos:ExpandedPostPhotos|null;onClose:()=>void};

/** Full-screen, uncropped photo review with album navigation and visible exit. */
export default function PostImageLightbox({photos,onClose}:Props){
 const [viewWidth,setViewWidth]=useState(0);
 const entries=photos?.uris||[];
 const initial=photos?.index??0;
 const [offset,setOffset]=useState(0);
 // Keying by selected photo identity remounts this viewer when a new album opens.
 const index=Math.max(0,Math.min(entries.length-1,initial+offset));
 const previous=()=>setOffset(current=>Math.max(-initial,current-1));
 const next=()=>setOffset(current=>Math.min(entries.length-1-initial,current+1));
 return <Modal visible={Boolean(photos&&entries.length)} animationType="fade"
  presentationStyle="fullScreen" onRequestClose={onClose}>
  <SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
   <View style={styles.header}>
    <Text style={styles.counter}>{entries.length>1?index+1+' / '+entries.length:'Fotografia'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar fotografia ampliada"
     onPress={onClose} hitSlop={10} style={styles.close}><JynloIcon name="close" size={26} color="#fff"/></Pressable>
   </View>
   <View style={styles.photoArea} onLayout={e=>setViewWidth(e.nativeEvent.layout.width)}>
    {entries[index]?<Image key={entries[index]} source={{uri:entries[index]}}
      resizeMode="contain" style={styles.image} accessibilityLabel={'Fotografia '+(index+1)+' de '+entries.length}/>:null}
   </View>
   {entries.length>1?<View style={styles.navigation}>
    <Pressable accessibilityRole="button" accessibilityLabel="Fotografia anterior"
     disabled={index===0} onPress={previous} style={[styles.arrow,index===0&&styles.disabled]}>
     <JynloIcon name="back" size={23} color="#fff"/>
    </Pressable>
    <Text style={styles.hint}>Fotografia completa, sem cortes</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Fotografia seguinte"
     disabled={index===entries.length-1} onPress={next} style={[styles.arrow,index===entries.length-1&&styles.disabled]}>
     <JynloIcon name="chevron-right" size={23} color="#fff"/>
    </Pressable>
   </View>:<View style={styles.navigation}><Text style={styles.hint}>Fotografia completa, sem cortes</Text></View>}
  </SafeAreaView>
 </Modal>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#020A10'},
 header:{height:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 counter:{fontSize:14,color:'#fff',fontWeight:'800'},
 close:{height:44,width:44,alignItems:'center',justifyContent:'center'},
 photoArea:{flex:1,alignItems:'center',justifyContent:'center'},
 image:{width:'100%',height:'100%'},
 navigation:{minHeight:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,gap:12},
 arrow:{height:48,width:48,borderRadius:15,backgroundColor:'#173A43',alignItems:'center',justifyContent:'center'},
 disabled:{opacity:.3},
 hint:{color:'#B9D8DA',fontSize:12,textAlign:'center',flex:1}
});
