import React,{Suspense,lazy} from 'react';
import {ActivityIndicator,View} from 'react-native';

// Expo Router may evaluate route entry modules during startup. Import native
// LiveKit only when the user actually navigates to the call screen.
const DirectCallScreen=lazy(()=>import('../../src/features/direct-call-screen'));

export default function CallRoute(){
 return <Suspense fallback={<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>}>
  <DirectCallScreen/>
 </Suspense>;
}
