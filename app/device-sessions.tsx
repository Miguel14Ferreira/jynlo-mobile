import React,{useCallback,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {t} from '../src/lib/i18n';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import {endAllBrowserSessions,endDeviceSession,listDeviceSessions,type DeviceSession} from '../src/lib/device-sessions-api';

function when(iso:string){
  const d=new Date(iso);
  return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
}

/** Lists the account's signed-in browsers and lets the person end them from the phone. */
export default function DeviceSessionsScreen(){
  const auth=useAuth();
  const [items,setItems]=useState<DeviceSession[]|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=useCallback(async()=>{
    setError('');
    try{setItems(await listDeviceSessions(auth.token));}
    catch(e){setItems([]);setError(e instanceof Error?e.message:t('Não foi possível carregar as sessões.'));}
  },[auth.token]);
  useFocusEffect(useCallback(()=>{setItems(null);setNotice('');void load();},[load]));
  async function run(action:()=>Promise<void>,done:string){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{await action();setNotice(done);await load();}
    catch(e){setError(e instanceof Error?e.message:t('Não foi possível terminar a sessão.'));}
    finally{setBusy(false);}
  }
  function endOne(s:DeviceSession){
    Alert.alert(t('Terminar esta sessão?'),t('{d} vai ter de voltar a iniciar sessão.',{d:s.device}),[
      {text:t('Cancelar'),style:'cancel'},
      {text:t('Terminar'),style:'destructive',onPress:()=>{void run(()=>endDeviceSession(auth.token,s.id),t('Sessão terminada.'));}}
    ]);
  }
  function endAll(){
    Alert.alert(t('Terminar todas as sessões no site?'),t('Todos os navegadores onde entraste na Jynlo vão ter de voltar a iniciar sessão. Esta app continua ligada.'),[
      {text:t('Cancelar'),style:'cancel'},
      {text:t('Terminar todas'),style:'destructive',onPress:()=>{void run(()=>endAllBrowserSessions(auth.token),t('Sessões no site terminadas.'));}}
    ]);
  }
  return <Page>
    <Eyebrow>{t('SEGURANÇA')}</Eyebrow>
    <Text style={styles.title}>{t('Sessões no site')}</Text>
    <Text style={styles.muted}>{t('Navegadores onde a tua conta tem sessão iniciada. Se não reconheces algum, termina-o e muda a palavra-passe.')}</Text>
    {notice?<Message>{notice}</Message>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {items===null?<Loader/>:items.length===0?<Text style={styles.muted}>{t('Não há sessões ativas no site.')}</Text>:<>
      {items.map(s=><View key={s.id} style={styles.card}>
        <View style={{gap:3}}>
          <Text style={styles.device}>{s.device}</Text>
          <Text style={styles.meta}>{t('Desde {d} · expira a {e}',{d:when(s.createdAt),e:when(s.expiresAt)})}</Text>
        </View>
        <Button secondary title={t('Terminar')} disabled={busy} onPress={()=>endOne(s)}/>
      </View>)}
      <Button title={busy?t('A terminar…'):t('Terminar todas as sessões no site')} disabled={busy} onPress={endAll}/>
    </>}
  </Page>;
}
const styles=StyleSheet.create({
  title:{color:C.white,fontSize:24,fontWeight:'900'},
  muted:{color:C.muted,fontSize:14,lineHeight:20},
  card:{gap:10,padding:14,borderRadius:16,backgroundColor:C.surface,borderWidth:1,borderColor:C.border},
  device:{color:C.white,fontSize:16,fontWeight:'800'},
  meta:{color:C.muted,fontSize:13}
});
