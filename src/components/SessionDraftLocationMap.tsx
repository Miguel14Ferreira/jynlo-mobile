import React from 'react';
import {t} from '../lib/i18n';
import {Linking,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import Constants from 'expo-constants';
import MapView,{Marker,PROVIDER_GOOGLE} from 'react-native-maps';
import {C} from '../lib/theme';
import {googleMapsPreview,validCoordinates} from '../lib/session-location-api';

type Point={latitude:number;longitude:number};
type Props={
 point:Point|null;
 venueName?:string|null;
 address:string;
 city:string;
 onEdit:()=>void;
};

/**
 * Preview only. Never geocode a street address into a misleading marker and
 * never change the selected session location from a map pan or tap.
 */
export default function SessionDraftLocationMap({point,venueName,address,city,onEdit}:Props){
 const coordinates=point&&validCoordinates(point.latitude,point.longitude)?point:null;
 const mapsEnabled=Platform.OS!=='android'||Constants.expoConfig?.extra?.nativeGoogleMapsConfigured===true;
 const search=[venueName,address,city].filter(value=>typeof value==='string'&&value.trim()).join(', ');
 const destination=coordinates?googleMapsPreview(coordinates.latitude,coordinates.longitude):
  search?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(search):null;
 const openMaps=()=>{if(destination)void Linking.openURL(destination).catch(()=>{});};
 return <View style={styles.container}>
  <Text style={styles.heading}>{t('Confirmar localização no mapa')}</Text>
  {coordinates&&mapsEnabled?<View style={styles.mapWrap}>
    <MapView key={coordinates.latitude+'|'+coordinates.longitude} style={styles.map}
      provider={Platform.OS==='android'?PROVIDER_GOOGLE:undefined}
      initialRegion={{...coordinates,latitudeDelta:0.008,longitudeDelta:0.008}}
      scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      accessibilityLabel={t('Pré-visualização do ponto exato do jogo')}>
      <Marker coordinate={coordinates} title={venueName||t('Local do jogo')}/>
    </MapView>
   </View>:<View style={styles.fallback}>
    <Text style={styles.description}>{coordinates
     ?t('Este build ainda não tem o Google Maps nativo configurado. Podes confirmar o ponto exato na aplicação Google Maps.')
     :t('Este recinto ainda não tem coordenadas GPS confirmadas. A pesquisa pela morada não garante um ponto exato.')}</Text>
   </View>}
  {coordinates?<Text style={styles.description}>{t('O marcador representa o ponto GPS escolhido, sem alterações.')}</Text>:null}
  {destination?<Pressable accessibilityRole="link"
    accessibilityLabel={coordinates?t('Abrir ponto exato no Google Maps'):t('Pesquisar morada no Google Maps')}
    onPress={openMaps} style={styles.primaryButton}>
   <Text style={styles.primaryText}>{coordinates?t('Abrir ponto no Google Maps'):t('Pesquisar morada no Google Maps')}</Text>
  </Pressable>:null}
  {!coordinates?<Pressable accessibilityRole="button" accessibilityLabel={t('Voltar e confirmar a localização')}
    onPress={onEdit} style={styles.secondaryButton}>
   <Text style={styles.secondaryText}>{t('Voltar e confirmar localização')}</Text>
  </Pressable>:null}
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:11,padding:13,backgroundColor:C.surface2,borderWidth:1,borderColor:C.border,borderRadius:14},
 heading:{fontSize:15,fontWeight:'900',color:C.white},
 mapWrap:{borderRadius:12,overflow:'hidden'},
 map:{height:210,width:'100%'},
 fallback:{minHeight:90,justifyContent:'center',padding:12,borderRadius:11,backgroundColor:C.surface},
 description:{color:C.white,fontSize:13,lineHeight:19},
 primaryButton:{minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:11,backgroundColor:C.mint,paddingHorizontal:12},
 primaryText:{fontSize:14,fontWeight:'900',color:C.background,textAlign:'center'},
 secondaryButton:{minHeight:46,alignItems:'center',justifyContent:'center',borderRadius:11,borderColor:C.border,borderWidth:1,paddingHorizontal:12},
 secondaryText:{fontSize:13,fontWeight:'800',color:C.white,textAlign:'center'}
});
