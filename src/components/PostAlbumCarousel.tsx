import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {JynloIcon} from './JynloIcon';
import AdaptivePostPhoto from './AdaptivePostPhoto';
import {resolveJynloMedia} from '../lib/social-feed-api';

type AlbumEntry={url:string;type:'image'|'video'};
type Props={items:AlbumEntry[];onExpand:(photos:{uris:string[];index:number})=>void;renderVideo:(uri:string)=>React.ReactNode};
const uriFor=(url:string)=>(url.startsWith('file:')||url.startsWith('content:'))?url:resolveJynloMedia(url);

/**
 * Measured carousels page by the card's own width, never the device width.
 * Mixed portrait images and videos keep their full aspect ratio inside the card.
 */
export default function PostAlbumCarousel({items,onExpand,renderVideo}:Props){
 const [width,setWidth]=useState(0),[active,setActive]=useState(0);
 return <View style={styles.frame} onLayout={event=>{
  const next=Math.round(event.nativeEvent.layout.width);
  if(next>0&&next!==width){setWidth(next);setActive(0);}
 }}>
  {width>0?<ScrollView key={width} horizontal pagingEnabled
   showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
   onMomentumScrollEnd={event=>{
    const index=Math.round(event.nativeEvent.contentOffset.x/width);
    setActive(Math.min(items.length-1,Math.max(0,index)));
   }}
   accessibilityLabel={'Álbum com '+items.length+' ficheiros'}>
   {items.map((entry,index)=>{
    const uri=uriFor(entry.url);
    return <View key={entry.url+'-'+index} style={{width}}>
      {uri?(entry.type==='video'?(index===active?renderVideo(uri):<View style={styles.videoInactive}><JynloIcon name="video" size={26} color="#B9D8DA"/><Text style={styles.videoInactiveText}>Vídeo {index+1} de {items.length}</Text></View>):
        <AdaptivePostPhoto uri={uri} width={width}
          label={'Ampliar fotografia '+(index+1)+' de '+items.length}
          onExpand={()=>{const images=items.filter(item=>item.type==='image').map(item=>uriFor(item.url)).filter((value):value is string=>Boolean(value));onExpand({uris:images,index:images.indexOf(uri)});}}/>):null}
    </View>;
   })}
  </ScrollView>:<View style={styles.placeholder}/>}
  {items.length>1?<View style={styles.pagination}>
    <Text style={styles.counter} accessibilityLabel={'Ficheiro '+(active+1)+' de '+items.length}>
      {active+1} / {items.length}
    </Text>
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map((entry,index)=><View key={entry.url+'-'+index}
        style={[styles.dot,index===active&&styles.dotActive]}/>)}
    </View>
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 frame:{width:'100%',gap:7},placeholder:{width:'100%',height:220,backgroundColor:'#020A10',borderRadius:12},
 pagination:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:24,paddingHorizontal:3},
 counter:{color:'#B9D8DA',fontSize:11,fontWeight:'800'},
 dots:{flexDirection:'row',alignItems:'center',gap:5},
 dot:{height:5,width:5,borderRadius:3,backgroundColor:'#527C85'},
 dotActive:{width:15,backgroundColor:'#4BE2CD'},
 videoInactive:{height:300,backgroundColor:'#020A10',borderRadius:12,justifyContent:'center',alignItems:'center',gap:9},
 videoInactiveText:{fontSize:12,color:'#B9D8DA',fontWeight:'700'}
});
