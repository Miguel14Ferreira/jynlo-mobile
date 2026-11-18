import {PermissionsAndroid,Platform} from 'react-native';

/** Request capture access before creating a server-side Live event or accepting
 * publishing privileges. A denied permission must never start a new broadcast.
 * Expo SDK 58: image-picker checks the camera grant; expo-audio checks mic access.
 */
export async function ensureLiveCapturePermissions():Promise<void>{
 if(Platform.OS==='android'){
  const granted=await PermissionsAndroid.requestMultiple([
   PermissionsAndroid.PERMISSIONS.CAMERA,
   PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
  ]);
  if(granted[PermissionsAndroid.PERMISSIONS.CAMERA]!=='granted')
   throw Error('Autoriza a câmara nas definições para transmitires em direto.');
  if(granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]!=='granted')
   throw Error('Autoriza o microfone nas definições para transmitires em direto.');
  return;
 }
 if(Platform.OS==='ios'){
  const ImagePicker=await import('expo-image-picker');
  const camera=await ImagePicker.requestCameraPermissionsAsync();
  if(!camera.granted)throw Error('Autoriza a câmara nas definições para transmitires em direto.');
  const {AudioModule}=await import('expo-audio');
  const microphone=await AudioModule.requestRecordingPermissionsAsync();
  if(!microphone.granted)throw Error('Autoriza o microfone nas definições para transmitires em direto.');
  return;
 }
 throw Error('A transmissão necessita de Android ou iOS com câmara e microfone.');
}
