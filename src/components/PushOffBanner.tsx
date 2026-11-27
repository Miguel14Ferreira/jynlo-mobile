import React,{useCallback,useState} from 'react';
import {Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {t} from '../lib/i18n';
import {useAuth} from '../lib/auth';
import {enableMobilePush,pushPermissionState} from '../lib/mobile-push';
import {pushDeliveryReady} from '../lib/push-device-api';

const DISMISSED_KEY='jynlo.mobile.push.bannerDismissed';
const HIDE_MS=7*24*60*60*1000;

/** "Notificações desligadas": shown on the home screen while the phone cannot get Jynlo notifications. */
export function PushOffBanner(){
 const auth=useAuth();
 const [state,setState]=useState<'ask'|'blocked'|null>(null);
 const [busy,setBusy]=useState(false);
 useFocusEffect(useCallback(()=>{
  let alive=true;
  const token=auth.token;
  if(!token||!auth.username){setState(null);return()=>{alive=false;};}
  void (async()=>{
   try{
    const dismissed=Number(await SecureStore.getItemAsync(DISMISSED_KEY)||0);
    if(Date.now()-dismissed<HIDE_MS){if(alive)setState(null);return;}
    if(!(await pushDeliveryReady(token))){if(alive)setState(null);return;}
    const s=await pushPermissionState();
    if(alive)setState(s==='ask'||s==='blocked'?s:null);
   }catch{if(alive)setState(null);}
  })();
  return()=>{alive=false;};
 },[auth.token,auth.username]));
 if(!state)return null;
 async function turnOn(){
  if(busy||!auth.token||!auth.username)return;
  if(state==='blocked'){void Linking.openSettings();return;}
  setBusy(true);
  try{await enableMobilePush(auth.username,auth.token);setState(null);}
  catch{setState(await pushPermissionState()==='blocked'?'blocked':'ask');}
  finally{setBusy(false);}
 }
 async function dismiss(){
  setState(null);
  try{await SecureStore.setItemAsync(DISMISSED_KEY,String(Date.now()));}catch{ /* shows again next time */ }
 }
 return <View style={styles.box} accessibilityRole="alert">
  <Text style={styles.title}>🔕 {t('As notificações estão desligadas')}</Text>
  <Text style={styles.text}>{t('Com a app fechada não vais saber de mensagens, convites e jogos. Liga-as para não perderes nada.')}</Text>
  <View style={styles.row}>
   <Pressable accessibilityRole="button" onPress={()=>{void turnOn();}} disabled={busy} style={[styles.primary,busy&&{opacity:.6}]}>
    <Text style={styles.primaryText}>{state==='blocked'?t('Abrir definições'):t('Ativar notificações')}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" onPress={()=>{void dismiss();}} style={styles.secondary}>
    <Text style={styles.secondaryText}>{t('Agora não')}</Text>
   </Pressable>
  </View>
 </View>;
}

const styles=StyleSheet.create({
 box:{gap:8,padding:14,borderRadius:16,borderWidth:1,borderColor:'rgba(252,211,77,.35)',backgroundColor:'rgba(252,211,77,.1)',marginHorizontal:16,marginVertical:8},
 title:{color:'#fde68a',fontWeight:'900',fontSize:15},
 text:{color:'#e5e7eb',fontSize:14,lineHeight:20},
 row:{flexDirection:'row',gap:10,flexWrap:'wrap'},
 primary:{minHeight:44,paddingHorizontal:16,borderRadius:12,backgroundColor:'#62e6c4',justifyContent:'center'},
 primaryText:{color:'#06231c',fontWeight:'900'},
 secondary:{minHeight:44,paddingHorizontal:12,justifyContent:'center'},
 secondaryText:{color:'#b9d4d6',fontWeight:'700'},
});
