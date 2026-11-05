import React,{useState} from 'react';
import {Alert,Linking,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {DEMO_MODE,ApiError,request} from '../../src/lib/api';
import {C} from '../../src/lib/theme';
export default function ProfileScreen(){
  const router=useRouter();const auth=useAuth();
  const [confirmUsername,setConfirmUsername]=useState('');
  const [showDelete,setShowDelete]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const canDelete=Boolean(!DEMO_MODE&&auth.username&&auth.token&&confirmUsername.trim()===auth.username&&!deleting);
  const deleteAccount=()=>{
    if(!canDelete||!auth.token)return;
    Alert.alert('Eliminar a tua conta?', 'Esta ação é irreversível. Os dados pessoais serão apagados ou anonimizados. Se tens comunidades próprias, transfere primeiro a propriedade.', [
      {text:'Manter a conta',style:'cancel'},
      {text:'Eliminar definitivamente',style:'destructive',onPress:()=>{void (async()=>{
        setDeleting(true);
        try{
          await request<void>('/api/profile/me',{token:auth.token,method:'DELETE'});
        }catch(e){
          // No automatic retry: a timeout can happen AFTER the server has deleted the account.
          const detail=e instanceof ApiError&&[403,409].includes(e.status)
            ?'O servidor não autorizou a eliminação. Se tens comunidades próprias, transfere primeiro a propriedade.'
            :e instanceof ApiError&&e.status===401
            ?'A sessão expirou. Inicia sessão novamente para verificares o estado da conta.'
            :'Não foi possível confirmar a resposta do servidor. Verifica se a conta ainda existe antes de repetires o pedido.';
          Alert.alert('Eliminação não confirmada',detail);
          setDeleting(false);
          return;
        }
        // Server deletion is confirmed; a subsequent logout/storage error must not undo that result.
        try{
          await auth.logout();
          router.replace('/welcome');
          Alert.alert('Conta eliminada','A tua conta foi eliminada e a sessão foi terminada.');
        }catch{
          router.replace('/welcome');
          Alert.alert('Conta eliminada','O servidor confirmou a eliminação, mas não foi possível concluir a limpeza local. Fecha a aplicação antes de a voltar a utilizar.');
        }finally{setDeleting(false);}
      })();}}
    ]);
  };
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
    {!auth.username?<><Button title={DEMO_MODE?'Experimentar conta de demonstração':'Iniciar sessão'} onPress={()=>router.push('/login')}/><Button title="Voltar às boas-vindas" secondary onPress={()=>router.push('/welcome')}/></>:
      <Button title="Terminar sessão" secondary onPress={()=>{void auth.logout().then(()=>router.replace('/welcome'),()=>router.replace('/welcome'));}}/>}
    {auth.username&&!DEMO_MODE?<><Eyebrow>GESTÃO DA CONTA</Eyebrow>
    <Button title={showDelete?'Ocultar eliminação de conta':'Eliminar a minha conta'} secondary onPress={()=>{setShowDelete(v=>!v);setConfirmUsername('');}}/>
    {showDelete?<View style={styles.deleteBox}>
      <Text style={styles.deleteWarning}>A eliminação é definitiva. As tuas publicações e os teus dados pessoais são apagados ou anonimizados. Se és proprietário de comunidades, transfere primeiro a propriedade.</Text>
      <Text style={styles.deleteHint}>Para confirmar, escreve exatamente: {auth.username}</Text>
      <TextInput style={styles.deleteInput} value={confirmUsername} onChangeText={setConfirmUsername} autoCapitalize="none" autoCorrect={false} placeholder="Nome de utilizador" placeholderTextColor={C.muted} accessibilityLabel="Confirmação do nome de utilizador para eliminar a conta"/>
      <Button title={deleting?'A eliminar conta…':'Eliminar definitivamente'} danger disabled={!canDelete} onPress={deleteAccount}/>
    </View>:null}
    </>:null}
    <Eyebrow>INFORMAÇÃO LEGAL</Eyebrow>
    <Button title="Política de Privacidade" secondary onPress={()=>{void Linking.openURL("https://d24sports.com/privacy").catch(()=>Alert.alert("Jynlo","Não foi possível abrir a Política de Privacidade."));}}/>
    <Button title="Termos de Utilização" secondary onPress={()=>{void Linking.openURL("https://d24sports.com/terms").catch(()=>Alert.alert("Jynlo","Não foi possível abrir os Termos de Utilização."));}}/>
    <Button title="Como pedir a eliminação da conta" secondary onPress={()=>{void Linking.openURL("https://d24sports.com/delete-account").catch(()=>Alert.alert("Jynlo","Não foi possível abrir as instruções de eliminação."));}}/>
    <Message>{auth.username?'Para entrares com outra conta, termina a sessão e autentica-te novamente. Não existe troca instantânea entre contas.':'Estás a explorar como visitante. Para participar, inicia sessão.'}</Message>
    {DEMO_MODE?<Message>Modo de demonstração: as contas Tiago e André são fictícias. Não há ligação à produção.</Message>:null}
  </Page>;
}
const styles=StyleSheet.create({
 profile:{padding:26,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,borderRadius:22,alignItems:'center',gap:10},
 avatar:{width:72,height:72,borderRadius:36,backgroundColor:'#245148',alignItems:'center',justifyContent:'center'},
 name:{color:C.white,fontSize:25,fontWeight:'900'},sub:{color:C.muted,fontSize:13,textAlign:'center'},
 deleteBox:{gap:12,padding:16,borderWidth:1,borderColor:C.danger,borderRadius:16,backgroundColor:C.surface},
 deleteWarning:{fontSize:13,lineHeight:19,color:C.white},
 deleteHint:{fontSize:13,color:C.muted},
 deleteInput:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:14,color:C.white,backgroundColor:C.background,fontSize:15},
});
