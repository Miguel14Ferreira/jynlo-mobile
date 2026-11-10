import React from 'react';
import {Platform,StyleSheet} from 'react-native';
import MapView,{Marker,UrlTile,PROVIDER_GOOGLE} from 'react-native-maps';
import type {Region} from 'react-native-maps';
import type {SessionSummary} from '../lib/types';

type Props={
 initialRegion:Region;
 sessions:SessionSummary[];
 onRegionChange:(region:Region)=>void;
 onSelectSession:(id:number)=>void;
};
/** Only loaded after Explore explicitly opens a configured native map. */
export default function SessionNativeMap({initialRegion,sessions,onRegionChange,onSelectSession}:Props){
 return <MapView style={styles.map} initialRegion={initialRegion}
  provider={Platform.OS==='android'?PROVIDER_GOOGLE:undefined}
  mapType="none" loadingEnabled accessibilityLabel="Mapa de sessões"
  onRegionChangeComplete={onRegionChange}>
  <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false}/>
  {sessions.map(s=><Marker key={s.id} coordinate={{latitude:s.latitude!,longitude:s.longitude!}}
   title={s.sport} description={s.city} onPress={()=>onSelectSession(s.id)}/>)}
 </MapView>;
}
const styles=StyleSheet.create({map:{height:430,borderRadius:14,overflow:'hidden'}});
