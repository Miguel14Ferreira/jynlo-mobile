import React from 'react';
import {t} from '../src/lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {C} from '../src/lib/theme';

/** A malformed or obsolete shared link should not leave users on a blank screen. */
export default function NotFoundScreen(){
 const router=useRouter();
 return <SafeAreaView style={styles.page} edges={['top','bottom','left','right']}>
  <View style={styles.panel}>
   <Text accessibilityRole="header" style={styles.title}>{t('Não encontramos esta página')}</Text>
   <Text style={styles.description}>{t('O link pode ter expirado ou o conteúdo pode já não estar disponível. Podes continuar a utilizar a Jynlo.')}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel={t('Voltar à Jynlo')}
     style={styles.button} onPress={()=>router.replace('/(tabs)')}>
    <Text style={styles.buttonText}>{t('Voltar à Jynlo')}</Text>
   </Pressable>
  </View>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:C.background,justifyContent:'center',padding:24},
 panel:{gap:20,alignItems:'center'},
 title:{fontSize:25,fontWeight:'800',color:C.white,textAlign:'center'},
 description:{fontSize:15,lineHeight:23,color:C.muted,textAlign:'center'},
 button:{paddingHorizontal:24,paddingVertical:15,backgroundColor:C.mint,borderRadius:14},
 buttonText:{fontWeight:'800',color:C.background,fontSize:16},
});
