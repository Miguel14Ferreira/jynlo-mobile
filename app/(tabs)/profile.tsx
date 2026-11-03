import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE} from '../../src/lib/api';
import {C} from '../../src/lib/theme';
export default function ProfileScreen(){
  const router=useRouter();const auth=useAuth();
  return <Page><Brand subtitle="A TUA JYNLO"/><DemoBanner/><Eyebrow>PERFIL</Eyebrow>
    <View style={styles.profile}>
      <View style={styles.avatar}><Text style={{fontSize:28,fontWeight:'900',color:C.mint}}>{auth.username?.charAt(0).toUpperCase()||'?'}</Text></View>
      <Text style={styles.name}>{auth.username||'Visitante'}</Text>
      <Text style={styles.sub}>{auth.username?'Sessão iniciada':'Entra para participares nas atividades'}</Text>
    </View>
    <Eyebrow>EXPLORAR A JYNLO</Eyebrow>
    <Button title="Feed" secondary onPress={()=>router.push('/feed')}/>
    <Button title="Recintos desportivos" secondary onPress={()=>router.push('/venues')}/>
    <Button title="As minhas sessões" secondary onPress={()=>router.push('/my-sessions')}/>
    {!auth.username?<Button title="Iniciar sessão" onPress={()=>router.push('/login')}/>:
      <Button title="Terminar sessão" secondary onPress={()=>{void auth.logout().then(()=>router.replace('/login'),()=>router.replace('/login'));}}/>}
    <Message>{auth.username?'Para entrares com outra conta, termina a sessão e autentica-te novamente. Não existe troca instantânea entre contas.':'Uma conta de cada vez, tal como na Jynlo Web.'}</Message>
    {DEMO_MODE?<Message>Modo de demonstração: as contas Tiago e André são fictícias. Não há ligação à produção.</Message>:null}
  </Page>;
}
const styles=StyleSheet.create({
 profile:{padding:26,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:22,alignItems:'center',gap:10},
 avatar:{width:72,height:72,borderRadius:36,backgroundColor:'#245148',alignItems:'center',justifyContent:'center'},
 name:{color:C.white,fontSize:25,fontWeight:'900'},sub:{color:C.muted,fontSize:13,textAlign:'center'},
});
