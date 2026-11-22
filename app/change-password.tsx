import React,{useState} from 'react';
import {t} from '../src/lib/i18n';
import {StyleSheet,Text,TextInput} from 'react-native';
import {useRouter} from 'expo-router';
import {Button,Eyebrow,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {DEMO_MODE,request} from '../src/lib/api';
import {C} from '../src/lib/theme';

export default function ChangePasswordScreen(){
 const router=useRouter(),auth=useAuth();
 const [currentPassword,setCurrentPassword]=useState('');
 const [newPassword,setNewPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [saved,setSaved]=useState(false);
 async function submit(){
  if(busy||!auth.token||DEMO_MODE)return;
  if(!currentPassword){setError(t('Introduz a palavra-passe atual.'));return;}
  if(newPassword.length<8||newPassword.length>128){
   setError(t('A nova palavra-passe deve ter entre 8 e 128 caracteres.'));return;
  }
  if(currentPassword===newPassword){setError(t('Escolhe uma palavra-passe diferente da atual.'));return;}
  if(newPassword!==confirmPassword){setError(t('As novas palavras-passe não coincidem.'));return;}
  setError('');setBusy(true);setSaved(false);
  try{
   await request('/api/profile/me/password',{token:auth.token,method:'PUT',body:{currentPassword,newPassword}});
   setCurrentPassword('');setNewPassword('');setConfirmPassword('');setSaved(true);
  }catch(e){
   // Deliberately generic: a wrong current password must not expose account details.
   setError(t('Não foi possível alterar a palavra-passe. Confirma a palavra-passe atual e tenta novamente.'));
  }finally{setBusy(false);}
 }
 return <Page>
  
  <Eyebrow>{t('ALTERAR PALAVRA-PASSE')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Protege a tua conta.')}</Text>
  {!auth.token||DEMO_MODE?<Message>{t('Inicia sessão numa conta real para alterar a palavra-passe.')}</Message>:null}
  {saved?<Message>{t('Palavra-passe alterada com sucesso.')}</Message>:null}
  {error?<Message tone="error">{error}</Message>:null}
  <Text style={styles.label}>{t('Palavra-passe atual')}</Text>
  <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword}
   secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={!busy&&!!auth.token&&!DEMO_MODE}/>
  <Text style={styles.label}>{t('Nova palavra-passe')}</Text>
  <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword}
   secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!busy&&!!auth.token&&!DEMO_MODE}/>
  <Text style={styles.label}>{t('Confirmar nova palavra-passe')}</Text>
  <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
   secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!busy&&!!auth.token&&!DEMO_MODE}/>
  <Button title={busy?t('A guardar…'):t('Alterar palavra-passe')} onPress={()=>{void submit();}}
   disabled={busy||!auth.token||DEMO_MODE||!currentPassword||!newPassword||!confirmPassword}/>
  <Button title={t('Voltar ao perfil')} secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:28,fontWeight:'900'},
 label:{color:C.white,fontSize:13,fontWeight:'700'},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:15,color:C.white,fontSize:15}
});
