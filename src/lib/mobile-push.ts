import {Platform} from 'react-native';
// Load expo-notifications only when the user enables push or logs out.
// expo-crypto is only needed if push opt-in creates a new installation ID.
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {DEMO_MODE} from './api';
import {registerPushDevice,unregisterPushDevice,getPushDeviceStatus} from './push-device-api';

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
 const Crypto=await import('expo-crypto');
 const id=Crypto.randomUUID();
 await SecureStore.setItemAsync(INSTALL_ID_KEY,id);
 return id;
}
export async function pushRegistrationStatus(username:string,token:string):Promise<boolean>{
 if(!username||!token||DEMO_MODE)return false;
 const registered=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(registered!==username.toLowerCase())return false;
 const id=await SecureStore.getItemAsync(INSTALL_ID_KEY);
 if(!id)return false;
 // Local marker alone does not prove a server-side registration remains active.
 const actual=await getPushDeviceStatus(token,id);
 if(!actual)await SecureStore.deleteItemAsync(REGISTERED_ACCOUNT_KEY);
 return actual;
}
/** A standalone APK must contain Firebase client configuration before requesting an FCM token. */
export function androidPushConfigured():boolean{
 return Platform.OS!=='android'||Constants.expoConfig?.extra?.nativePushConfigured===true;
}
/** Explicit opt-in only. No permission prompt occurs at launch or login. */
export async function enableMobilePush(username:string,token:string):Promise<void>{
 if(DEMO_MODE||!username||!token)throw Error('Inicia sessão para ativar notificações.');
 if(Platform.OS!=='android'&&Platform.OS!=='ios')throw Error('Notificações só disponíveis em Android e iOS.');
 if(!androidPushConfigured())throw Error('As notificações Android ainda precisam da configuração Firebase. A lista de notificações da Jynlo continua disponível nesta página.');
 const prior=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(prior&&prior!==username.toLowerCase())
  throw Error('Este dispositivo ainda está associado a outra conta. Termina sessão nessa conta primeiro.');
 const easProjectId=projectId();
 const Notifications=await import('expo-notifications');
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

/** Clear notification-tray content and consumed navigation intent on account exit. */
export async function clearNativePushPresentation():Promise<void>{
 const Notifications=await import('expo-notifications');
 await Notifications.clearLastNotificationResponse();
 await Notifications.dismissAllNotificationsAsync();
}
