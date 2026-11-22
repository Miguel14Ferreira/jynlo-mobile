import React,{Suspense,lazy} from 'react';
import {t} from '../../src/lib/i18n';
import {ActivityIndicator,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';

// Expo Router may evaluate route entry modules during startup. Import native
// LiveKit only when the user actually navigates to the call screen.
const DirectCallScreen=lazy(()=>import('../../src/features/direct-call-screen'));

class CallLoadBoundary extends React.Component<
 React.PropsWithChildren<{onBack:()=>void}>,
 {failed:boolean}
>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(this.state.failed)return <View style={{flex:1,justifyContent:'center',padding:24,gap:16}}>
   <Text style={{fontSize:19,fontWeight:'700'}}>{t('Não foi possível abrir a chamada.')}</Text>
   <Text>{t('O módulo de chamadas não está disponível neste dispositivo. Podes continuar a utilizar o chat.')}</Text>
   <Pressable accessibilityRole="button" onPress={this.props.onBack} style={{padding:14,alignItems:'center'}}>
    <Text>{t('Voltar ao chat')}</Text>
   </Pressable>
  </View>;
  return this.props.children;
 }
}

export default function CallRoute(){
 const router=useRouter();
 return <CallLoadBoundary onBack={()=>router.back()}>
  <Suspense fallback={<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>}>
   <DirectCallScreen/>
  </Suspense>
 </CallLoadBoundary>;
}
