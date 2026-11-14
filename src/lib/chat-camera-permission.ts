import {Alert,Linking} from 'react-native';

/** Shared across direct, session, and community chats.
 * The gallery works independently when Android camera permission is denied.
 */
export async function ensureChatCameraPermission():Promise<boolean>{
 const ImagePicker=await import('expo-image-picker');
 const permission=await ImagePicker.requestCameraPermissionsAsync();
 if(permission.granted)return true;
 Alert.alert('Câmara sem autorização',
  'Autoriza o acesso à câmara nas definições do telemóvel ou utiliza a galeria.',[
   {text:'Cancelar',style:'cancel'},
   {text:'Abrir definições',onPress:()=>{
    void Linking.openSettings().catch(()=>{
     Alert.alert('Permissões','Abre as definições da Jynlo e autoriza a câmara.');
    });
   }}
  ]);
 return false;
}
