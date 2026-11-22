import {Platform} from 'react-native';
// Load expo-notifications only when the user enables push or logs out.
// expo-crypto is only needed if push opt-in creates a new installation ID.
import {currentLanguage} from './i18n-core.cjs';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {DEMO_MODE} from './api';
import {registerPushDevice,unregisterPushDevice,getPushDeviceStatus} from './push-device-api';

const INSTALL_ID_KEY='jynlo.mobile.push.installId';
const REGISTERED_ACCOUNT_KEY='jynlo.mobile.push.account';
// Logout invalidates native permission and registration tasks still in flight.
let pushOperationEpoch=0;
let pushOptInPending=false;
/** Immediately invalidate pending opt-in; no SecureStore or native bridge needed. */
export function invalidatePendingPushRegistration():void{pushOperationEpoch++;}

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
 // A stale status query cannot remove a registration created by a newer opt-in.
 const revision=pushOperationEpoch;
 if(pushOptInPending)return false;
 const registered=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(registered!==username.toLowerCase()||pushOperationEpoch!==revision||pushOptInPending)return false;
 const id=await SecureStore.getItemAsync(INSTALL_ID_KEY);
 if(!id||pushOperationEpoch!==revision||pushOptInPending)return false;
 // Local ownership alone is insufficient: the backend must confirm it.
 const actual=await getPushDeviceStatus(token,id);
 if(pushOperationEpoch!==revision||pushOptInPending)return false;
 if(!actual){
  const latest=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
  if(pushOperationEpoch===revision&&!pushOptInPending&&latest===registered)
   await SecureStore.deleteItemAsync(REGISTERED_ACCOUNT_KEY);
 }
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
 if(pushOptInPending)throw Error('Já existe uma ativação de notificações em curso neste dispositivo.');
 pushOptInPending=true;
 try{
 const operation=++pushOperationEpoch;
 const ensureActive=()=>{if(operation!==pushOperationEpoch)throw Error('Ativação cancelada após mudança de sessão.');};
 const prior=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(prior&&prior!==username.toLowerCase())
  throw Error('Este dispositivo ainda tem o registo push de outra conta. Entra nessa conta e desativa as notificações antes de ativá-las nesta. Por segurança não é possível transferir o registo automaticamente.');
 const easProjectId=projectId();
 const Notifications=await import('expo-notifications');
 ensureActive();
 if(Platform.OS==='android'){
  await Notifications.setNotificationChannelAsync('jynlo-messages',{
   name:'Mensagens Jynlo',
   importance:Notifications.AndroidImportance.HIGH
  });
 }
 const current=await Notifications.getPermissionsAsync();
 const permission=current.granted?current:await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw Error('Não concedeste permissão para notificações. Podes alterar nas definições do telemóvel.');
 ensureActive();
 let expoPushToken:string;
 try{expoPushToken=(await Notifications.getExpoPushTokenAsync({projectId:easProjectId})).data;}
 catch(e){
  const reason=e instanceof Error?e.message:'';
  if(/FirebaseApp|Firebase|FCM|SERVICE_NOT_AVAILABLE/i.test(reason))
   throw Error('O Firebase/FCM não está operacional nesta APK. Confirma o ficheiro google-services.json e as credenciais da build Preview.');
  throw Error('Não foi possível obter o token push neste dispositivo. Verifica os Google Play Services e a ligação à Internet.');
 }
 ensureActive();
 const deviceId=await installId();
 ensureActive();
 await registerPushDevice(token,{
  deviceId,expoPushToken,
  platform:Platform.OS as 'android'|'ios',
  language:currentLanguage()==='en'?'en':'pt'
 });
 // Logout might happen while the server is processing the authenticated PUT.
 if(operation!==pushOperationEpoch){
  try{await unregisterPushDevice(token,deviceId);}
  catch{throw Error('A sessão mudou durante o registo. Não foi possível confirmar a revogação do dispositivo.');}
  throw Error('Ativação cancelada após mudança de sessão.');
 }
 try{
  await SecureStore.setItemAsync(REGISTERED_ACCOUNT_KEY,username.toLowerCase());
 }catch{
  // The server registered this device but local ownership could not be saved.
  // Compensate by revoking the just-created record while this token is valid.
  try{await unregisterPushDevice(token,deviceId);}
  catch{throw Error('O dispositivo foi registado, mas a confirmação local falhou e não foi possível revogar o registo. Volta a esta conta para tentar desativar as notificações.');}
  throw Error('Não foi possível guardar a ativação das notificações no telemóvel. Tenta novamente.');
 }
 // A local SecureStore write can finish after logout. Revoke and remove only
 // this account's marker; never let stale work re-enable notifications.
 if(operation!==pushOperationEpoch){
  try{await unregisterPushDevice(token,deviceId);}
  catch{throw Error('A sessão mudou durante a ativação. Não foi possível confirmar a revogação do dispositivo.');}
  if((await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY))===username.toLowerCase())
   await SecureStore.deleteItemAsync(REGISTERED_ACCOUNT_KEY);
  throw Error('Ativação cancelada após mudança de sessão.');
 }
 }finally{
  pushOptInPending=false;
 }
}
/** Server revocation is attempted before logout; local state remains if it fails. */
/**
 * After the app language changes, tell the server so lock-screen notifications
 * follow it. Only for a device already registered for this account; never asks
 * for permission and never registers a new device.
 */
export async function refreshPushLanguage(username:string,token:string):Promise<void>{
 if(DEMO_MODE||!username||!token||(Platform.OS!=='android'&&Platform.OS!=='ios'))return;
 if(!androidPushConfigured()||pushOptInPending)return;
 try{
  if((await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY))!==username.toLowerCase())return;
  const Notifications=await import('expo-notifications');
  if(!(await Notifications.getPermissionsAsync()).granted)return;
  const expoPushToken=(await Notifications.getExpoPushTokenAsync({projectId:projectId()})).data;
  const deviceId=await installId();
  if((await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY))!==username.toLowerCase())return;
  await registerPushDevice(token,{deviceId,expoPushToken,platform:Platform.OS as 'android'|'ios',
   language:currentLanguage()==='en'?'en':'pt'});
 }catch{
  // Best effort: the next manual activation sends the language again.
 }
}

export async function disableMobilePush(username:string,token:string):Promise<void>{
 // Invalidate an opt-in still waiting for native permission, Firebase or HTTP.
 invalidatePendingPushRegistration();
 if(!username||!token||DEMO_MODE)return;
 const registered=await SecureStore.getItemAsync(REGISTERED_ACCOUNT_KEY);
 if(registered!==username.toLowerCase())return;
 const id=await SecureStore.getItemAsync(INSTALL_ID_KEY);
 if(id)await unregisterPushDevice(token,id);
 await SecureStore.deleteItemAsync(REGISTERED_ACCOUNT_KEY);
}

/** Clear notification presentation without making logout depend on a broken native bridge. */
export async function clearNativePushPresentation():Promise<void>{
 let Notifications:typeof import('expo-notifications');
 try{Notifications=await import('expo-notifications');}
 catch{return;}
 try{await Notifications.clearLastNotificationResponse();}catch{}
 try{await Notifications.dismissAllNotificationsAsync();}catch{}
}
