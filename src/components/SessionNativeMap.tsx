import React from 'react';
import {t} from '../lib/i18n';
import {Platform,StyleSheet} from 'react-native';
import MapView,{Marker,PROVIDER_GOOGLE} from 'react-native-maps';
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
  mapType="standard" loadingEnabled accessibilityLabel={t('Mapa de sessões')}
  onRegionChangeComplete={onRegionChange}>
  {sessions.map(s=><Marker key={s.id} coordinate={{latitude:s.latitude!,longitude:s.longitude!}}
   title={s.sport} description={s.city} onPress={()=>onSelectSession(s.id)}/>)}
 </MapView>;
}
const styles=StyleSheet.create({map:{height:430,borderRadius:14,overflow:'hidden'}});
