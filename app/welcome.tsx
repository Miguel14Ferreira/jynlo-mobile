import React from 'react';
import {ActivityIndicator,ImageBackground,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Redirect,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brand,Button,DemoBanner} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {DEMO_MODE} from '../src/lib/api';
const BG='#06141D',WHITE='#F5FCFE',MINT='#2AE0CA',MUTED='#B5C9D1';
export default function WelcomeScreen(){
 const auth=useAuth(),router=useRouter();
 if(!auth.ready)return <SafeAreaView style={styles.loading}><ActivityIndicator color={MINT}/></SafeAreaView>;
 if(auth.token&&auth.username)return <Redirect href="/(tabs)"/>;
 const explore=()=>{auth.browseAsGuest();router.replace('/(tabs)/explore');};
 const register=()=>router.push('/register');
 return <SafeAreaView style={styles.page} edges={['top','bottom']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <Brand subtitle="ENCONTRA AS TUAS PESSOAS"/>
  <ImageBackground source={require('../assets/jynlo-feed-sports.png')} style={styles.hero} imageStyle={styles.heroImage}>
   <View style={styles.heroShade}><Text style={styles.eyebrow}>JYNLO · DESPORTO E COMUNIDADE</Text>
    <Text maxFontSizeMultiplier={1.3} style={styles.heroTitle}>O teu desporto começa aqui.</Text>
    <Text style={styles.heroText}>Descobre onde, quando e com quem praticar desporto.</Text></View>
  </ImageBackground>
  <View style={styles.actions}>
   <Text style={styles.heading}>Encontra o teu desporto. Encontra as tuas pessoas.</Text>
   <Text style={styles.description}>Explora atividades, recintos e comunidades. Inicia sessão para participar.</Text>
   {DEMO_MODE?<DemoBanner/>:null}
   <Button title={DEMO_MODE?'Experimentar conta fictícia':'Entrar na Jynlo · Google ou palavra-passe'} onPress={()=>router.push('/login')}/>
   <Button title="Explorar como visitante" secondary onPress={explore}/>
   <Button title="Criar conta na Jynlo" secondary onPress={register}/>
   <View style={styles.legalLinks}>
    <Text style={styles.legalLink} onPress={()=>router.push({pathname:'/legal',params:{document:'privacy'}})} accessibilityRole="link">Política de Privacidade</Text>
    <Text style={styles.legalLink} onPress={()=>router.push({pathname:'/legal',params:{document:'terms'}})} accessibilityRole="link">Termos de Utilização</Text>
   </View>
   <Text style={styles.note}>{DEMO_MODE?'A demonstração não comunica com o servidor real. Escolher uma conta fictícia é voluntário.':'A tua sessão anterior só é restaurada se ainda for válida.'}</Text>
  </View>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({
 loading:{flex:1,backgroundColor:BG,justifyContent:'center',alignItems:'center'},
 page:{flex:1,backgroundColor:BG},
 content:{paddingHorizontal:22,paddingTop:25,paddingBottom:42,gap:22},
 hero:{height:286,borderRadius:22,overflow:'hidden',backgroundColor:'#0C2A36',justifyContent:'flex-end'},
 heroImage:{resizeMode:'cover'},
 heroShade:{padding:22,paddingTop:55,gap:12,backgroundColor:'rgba(3,17,25,0.70)'},
 eyebrow:{color:MINT,fontSize:10,fontWeight:'800',letterSpacing:1.3},
 heroTitle:{fontSize:34,lineHeight:39,fontWeight:'900',color:WHITE,maxWidth:320},
 heroText:{color:'#E0F0F3',fontSize:14,lineHeight:20,maxWidth:310},
 actions:{gap:14},
 legalLinks:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:18,marginTop:6},
 legalLink:{color:MINT,fontSize:13,fontWeight:'700',textDecorationLine:'underline'},
 heading:{color:WHITE,fontSize:23,lineHeight:29,fontWeight:'900'},
 description:{color:MUTED,fontSize:15,lineHeight:23},
 note:{color:MUTED,fontSize:12,lineHeight:19,textAlign:'center',marginTop:4},
});