import React,{useRef,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {JynloIcon} from './JynloIcon';

export type ExpandedPostPhotos={uris:string[];index:number};
type Props={photos:ExpandedPostPhotos|null;onClose:()=>void};

/** Full-screen, uncropped photo review with album navigation and visible exit. */
export default function PostImageLightbox({photos,onClose}:Props){
 const entries=photos?.uris||[];
 const initial=Math.max(0,Math.min(entries.length-1,photos?.index??0));
 const [index,setIndex]=useState(initial);
 const [pageWidth,setPageWidth]=useState(0);
 const scroll=useRef<ScrollView|null>(null);
 const moveTo=(next:number)=>{
  const selected=Math.max(0,Math.min(entries.length-1,next));
  setIndex(selected);
  if(pageWidth>0)scroll.current?.scrollTo({x:selected*pageWidth,animated:true});
 };
 return <Modal visible={Boolean(photos&&entries.length)} animationType="fade"
  presentationStyle="fullScreen" onRequestClose={onClose}>
  <SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
   <View style={styles.header}>
    <Text style={styles.counter}>{entries.length>1?index+1+' / '+entries.length:'Fotografia'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar fotografia ampliada"
     onPress={onClose} hitSlop={10} style={styles.close}><JynloIcon name="close" size={26} color="#fff"/></Pressable>
   </View>
   <View style={styles.photoArea} onLayout={event=>{
    const width=Math.round(event.nativeEvent.layout.width);
    if(width>0&&width!==pageWidth){setPageWidth(width);}
   }}>
    {pageWidth>0?<ScrollView ref={scroll} key={pageWidth} style={{flex:1}} horizontal pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentOffset={{x:index*pageWidth,y:0}}
      onMomentumScrollEnd={event=>{
       const next=Math.round(event.nativeEvent.contentOffset.x/pageWidth);
       setIndex(Math.max(0,Math.min(entries.length-1,next)));
      }}
      accessibilityLabel={'Fotografias ampliadas, '+entries.length+' imagens'}>
      {entries.map((uri,i)=><View key={uri+'-'+i} style={{width:pageWidth,flex:1}}>
       <Image source={{uri}} resizeMode="contain" style={styles.image}
        accessibilityLabel={'Fotografia '+(i+1)+' de '+entries.length}/>
      </View>)}
    </ScrollView>:null}
   </View>
   {entries.length>1?<View style={styles.navigation}>
    <Pressable accessibilityRole="button" accessibilityLabel="Fotografia anterior"
     disabled={index===0} onPress={()=>moveTo(index-1)} style={[styles.arrow,index===0&&styles.disabled]}>
     <JynloIcon name="back" size={23} color="#fff"/>
    </Pressable>
    <Text style={styles.hint}>Desliza para ver outras fotografias</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Fotografia seguinte"
     disabled={index===entries.length-1} onPress={()=>moveTo(index+1)} style={[styles.arrow,index===entries.length-1&&styles.disabled]}>
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
