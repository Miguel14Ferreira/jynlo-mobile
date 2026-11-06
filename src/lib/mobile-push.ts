import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {DEMO_MODE} from './api';
import {registerPushDevice,unregisterPushDevice} from './push-device-api';

const INSTALL_ID_KEY='jynlo.mobile.push.installId';
const REGISTERED_ACCOUNT_KEY='jynlo.mobile.push.account';

function projectId():string{
 const configured=Constants.easConfig?.projectId||Constants.expoConfig?.extra?.eas?.projectId||
  process.env.EXPO_PUBLIC_JYNLO_EAS_PROJECT_ID;
 if(typeof configured!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(configured))
  throw Error('O projeto Expo EAS ainda não está configurado para notificações push.');
 return configured;
}
async function installId():Promise<string>{
 const saved=await SecureStore.getItemAsync(INSTALL_ID_KEY);
 if(saved)return saved;
 const id=Crypto.randomUUID();
 await SecureStore.setItemAsync(INSTALL_ID_KEY,id);
 return id;
}
export async function pushRegistrationStatus(username:string):Promise<boolean>{
 if(!username||DEMO_MODE)return false;
 const registered=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 return registered===username.toLowerCase();
}
/** Explicit opt-in only. No permission prompt occurs at launch or login. */
export async function enableMobilePush(username:string,token:string):Promise<void>{
 if(DEMO_MODE||!username||!token)throw Error('Inicia sessão para ativar notificações.');
 if(Platform.OS!=='android'&&Platform.OS!=='ios')throw Error('Notificações só disponíveis em Android e iOS.');
 const prior=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(prior&&prior!==username.toLowerCase())
  throw Error('Este dispositivo ainda está associado a outra conta. Termina sessão nessa conta primeiro.');
 const easProjectId=projectId();
 if(Platform.OS==='android'){
  await Notifications.setNotificationChannelAsync('jynlo-messages',{
   name:'Mensagens Jynlo',
   importance:Notifications.AndroidImportance.HIGH
  });
 }
 const current=await Notifications.getPermissionsAsync();
 const permission=current.granted?current:await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw Error('Não concedeste permissão para notificações. Podes alterar nas definições do telemóvel.');
 const expoPushToken=(await Notifications.getExpoPushTokenAsync({projectId:easProjectId})).data;
 const deviceId=await installId();
 await registerPushDevice(token,{
  deviceId,expoPushToken,
  platform:Platform.OS as 'android'|'ios'
 });
 await SecureStore.setItemAsync(REGISTERED_ACCOUNT_KEY,username.toLowerCase());
}
/** Server revocation is attempted before logout; local state remains if it fails. */
export async function disableMobilePush(username:string,token:string):Promise<void>{
 if(!username||!token||DEMO_MODE)return;
 const registered=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(registered!==username.toLowerCase())return;
 const id=await SecureStore.getItemAsync(INSTALL_ID_KEY);
 if(id)await unregisterPushDevice(token,id);
 await SecureStore.deleteItemAsync(REGISTERED_ACCOUNT_KEY);
}
