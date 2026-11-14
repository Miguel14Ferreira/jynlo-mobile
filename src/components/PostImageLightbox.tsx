import React,{useRef,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {JynloIcon} from './JynloIcon';
import {CloseIconButton} from './CloseIconButton';
import {useAuth} from '../lib/auth';
import {mediaRequestSource} from '../lib/protected-media-source';

export type ExpandedPostPhotos={uris:string[];index:number};
type Props={photos:ExpandedPostPhotos|null;onClose:()=>void};

/** Full-screen, uncropped photo review with album navigation and visible exit. */
export default function PostImageLightbox({photos,onClose}:Props){
 const {token}=useAuth();
 const entries=photos?.uris||[];
 const initial=Math.max(0,Math.min(entries.length-1,photos?.index??0));
 const [index,setIndex]=useState(initial);
 const [viewport,setViewport]=useState({width:0,height:0});
 const scroll=useRef<ScrollView|null>(null);
 const moveTo=(next:number)=>{
  const selected=Math.max(0,Math.min(entries.length-1,next));
  setIndex(selected);
  if(viewport.width>0)scroll.current?.scrollTo({x:selected*viewport.width,animated:true});
 };
 return <Modal visible={Boolean(photos&&entries.length)} animationType="fade"
  presentationStyle="fullScreen" onRequestClose={onClose}>
  <SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
   <View style={styles.header}>
    <Text style={styles.counter}>{entries.length>1?index+1+' / '+entries.length:'Fotografia'}</Text>
    <CloseIconButton onPress={onClose} label="Fechar fotografia ampliada"/>
   </View>
   <View style={styles.photoArea} onLayout={event=>{
    const width=Math.round(event.nativeEvent.layout.width);
    const height=Math.round(event.nativeEvent.layout.height);
    if(width>0&&height>0&&(width!==viewport.width||height!==viewport.height))
     setViewport({width,height});
   }}>
    {viewport.width>0&&viewport.height>0?<ScrollView ref={scroll} key={viewport.width+'x'+viewport.height} style={{flex:1}} horizontal pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentOffset={{x:index*viewport.width,y:0}}
      onMomentumScrollEnd={event=>{
       const next=Math.round(event.nativeEvent.contentOffset.x/viewport.width);
       setIndex(Math.max(0,Math.min(entries.length-1,next)));
      }}
      accessibilityLabel={'Fotografias ampliadas, '+entries.length+' imagens'}>
      {entries.map((uri,i)=><View key={uri+'-'+i} style={{width:viewport.width,height:viewport.height}}>
       <Image source={mediaRequestSource(uri,token)} resizeMode="contain" style={{width:viewport.width,height:viewport.height}}
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

 navigation:{minHeight:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,gap:12},
 arrow:{height:48,width:48,borderRadius:15,backgroundColor:'#173A43',alignItems:'center',justifyContent:'center'},
 disabled:{opacity:.3},
 hint:{color:'#B9D8DA',fontSize:12,textAlign:'center',flex:1}
});
