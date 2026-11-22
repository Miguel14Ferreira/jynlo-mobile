import React,{useCallback,useRef,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Image,Linking,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {ApiError} from '../src/lib/api';
import {C} from '../src/lib/theme';
import {mfaEnabled,startMfaSetup,confirmMfaSetup,disableMfa,type MfaSetup} from '../src/lib/mfa-settings-api';
import {formatSecret,mfaErrorMessage,normalizeTotp,safeOtpauthUri,safeQrDataUrl} from '../src/lib/mfa-settings-core.cjs';

/** Turn the authenticator-app second step on or off — same server flow as the web profile. */
export default function SecurityMfaScreen(){
 const auth=useAuth(),router=useRouter();
 const [enabled,setEnabled]=useState<boolean|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [setup,setSetup]=useState<MfaSetup|null>(null);
 const [disabling,setDisabling]=useState(false);
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false);
 const inFlight=useRef(false),generation=useRef(0);
 const load=useCallback(async()=>{
  const id=++generation.current;setError('');
  if(!auth.token){setLoading(false);return;}
  setLoading(true);
  try{const on=await mfaEnabled(auth.token);if(id===generation.current)setEnabled(on);}
  catch{if(id===generation.current)setError(t('Não foi possível confirmar o estado da verificação em dois passos.'));}
  finally{if(id===generation.current)setLoading(false);}
 },[auth.token]);
 useFocusEffect(useCallback(()=>{void load();return()=>{generation.current++;};},[load]));
 const fail=(e:unknown,fallback:string)=>setError(mfaErrorMessage(e instanceof ApiError?e.status:null,e instanceof Error&&!(e instanceof ApiError)?e.message:fallback));
 async function begin(){
  if(inFlight.current||!auth.token)return;inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{setSetup(await startMfaSetup(auth.token));setCode('');}
  catch(e){fail(e,t('Não foi possível iniciar a configuração.'));}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function confirm(){
  if(inFlight.current||!auth.token)return;
  try{normalizeTotp(code);}catch(e){setError(e instanceof Error?e.message:'');return;}
  inFlight.current=true;setBusy(true);setError('');
  try{await confirmMfaSetup(code,auth.token);setSetup(null);setCode('');setEnabled(true);
   setNotice(t('Verificação em dois passos ativada. A partir de agora, ao iniciar sessão, pedimos também o código da app autenticadora.'));}
  catch(e){fail(e,t('Não foi possível ativar.'));}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function turnOff(){
  if(inFlight.current||!auth.token)return;
  try{normalizeTotp(code);}catch(e){setError(e instanceof Error?e.message:'');return;}
  inFlight.current=true;setBusy(true);setError('');
  try{await disableMfa(code,auth.token);setDisabling(false);setCode('');setEnabled(false);setNotice(t('Verificação em dois passos desativada. Enviámos um aviso para o teu email.'));}
  catch(e){fail(e,t('Não foi possível desativar.'));}
  finally{inFlight.current=false;setBusy(false);}
 }
 const qr=safeQrDataUrl(setup?.qrCodeDataUrl);
 const link=safeOtpauthUri(setup?.otpauthUri);
 const codeInput=<TextInput value={code} onChangeText={v=>{setCode(v.replace(/\D/g,'').slice(0,6));setError('');}} editable={!busy}
  keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6}
  placeholder="000000" placeholderTextColor={C.muted} style={styles.code} accessibilityLabel={t('Código de 6 dígitos')}/>;
 return <Page>
  <Eyebrow>{t('SEGURANÇA DA CONTA')}</Eyebrow>
  <Text maxFontSizeMultiplier={1.3} style={styles.heading}>{t('Verificação em dois passos')}</Text>
  <Text style={styles.sub}>{t('Além da palavra-passe, pedimos um código de 6 dígitos de uma app autenticadora (Google Authenticator, Microsoft Authenticator ou outra) ao iniciar sessão.')}</Text>
  {!auth.token?<Button title={t('Iniciar sessão')} onPress={()=>router.push({pathname:'/login',params:{redirect:'/security-mfa'}})}/>:null}
  {loading?<Loader/>:null}
  {notice?<Message>{notice}</Message>:null}
  {!loading&&enabled!==null?<View style={[styles.status,enabled&&styles.statusOn]}>
   <Text style={[styles.statusText,enabled&&{color:C.mint}]}>{enabled?t('✓ Ativa'):t('Desativada')}</Text>
  </View>:null}
  {!loading&&enabled===false&&!setup?<Button title={busy?t('A preparar…'):t('Ativar verificação em dois passos')} disabled={busy} onPress={()=>{void begin();}}/>:null}
  {setup?<View style={styles.panel}>
   <Text style={styles.step}>{t('1. Instala ou abre uma app autenticadora.')}</Text>
   {link?<><Text style={styles.step}>{t('2. Se a app está neste telemóvel, toca no botão para lhe passar a chave:')}</Text>
    <Button title={t('Abrir na app autenticadora')} disabled={busy} onPress={()=>{Linking.openURL(link).catch(()=>setError(t('Não encontrámos uma app autenticadora. Usa a chave abaixo ou o QR code noutro dispositivo.')));}}/></>:null}
   <Text style={styles.step}>{t('{a} introduz esta chave na app (toque longo para copiar):',{a:link?t('Ou'):'2.'})}</Text>
   <Text selectable style={styles.secret} accessibilityLabel={t('Chave de configuração')}>{formatSecret(setup.secret)}</Text>
   {qr?<><Text style={styles.step}>{t('Ou digitaliza o QR code com outro dispositivo:')}</Text>
    <View style={styles.qrWrap}><Image source={{uri:qr}} style={styles.qr} accessibilityLabel={t('QR code para configurar a verificação em dois passos')}/></View></>:null}
   <Text style={styles.step}>{t('3. Introduz o código de 6 dígitos mostrado na app:')}</Text>
   {codeInput}
   {error?<Message tone="error">{error}</Message>:null}
   <Button title={busy?t('A confirmar…'):t('Confirmar e ativar')} disabled={busy||code.length!==6} onPress={()=>{void confirm();}}/>
   <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setSetup(null);setCode('');setError('');}}/>
  </View>:null}
  {!loading&&enabled===true&&!disabling?<Button secondary title={t('Desativar verificação em dois passos')} onPress={()=>{setDisabling(true);setCode('');setError('');setNotice('');}}/>:null}
  {disabling?<View style={styles.panel}>
   <Text style={styles.step}>{t('Para desativar, introduz o código atual da tua app autenticadora. A sessão sozinha não chega, para proteger a conta.')}</Text>
   {codeInput}
   {error?<Message tone="error">{error}</Message>:null}
   <Button danger title={busy?t('A confirmar…'):t('Desativar')} disabled={busy||code.length!==6} onPress={()=>{void turnOff();}}/>
   <Button secondary title={t('Cancelar')} disabled={busy} onPress={()=>{setDisabling(false);setCode('');setError('');}}/>
  </View>:null}
  {error&&!setup&&!disabling?<><Message tone="error">{error}</Message>{enabled===null?<Button secondary title={t('Tentar novamente')} onPress={()=>{void load();}}/>:null}</>:null}
 </Page>;
}
const styles=StyleSheet.create({
 heading:{color:C.white,fontSize:28,fontWeight:'900'},sub:{color:C.muted,fontSize:14,lineHeight:21},
 status:{alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:7,borderRadius:999,borderWidth:1,borderColor:C.border},
 statusOn:{borderColor:C.mint},statusText:{color:C.white,fontWeight:'900'},
 panel:{gap:12,padding:16,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:'#0D2A35'},
 step:{color:C.white,fontSize:14,lineHeight:20,fontWeight:'700'},
 secret:{color:C.mint,fontSize:18,fontWeight:'900',letterSpacing:1,padding:12,borderRadius:12,backgroundColor:C.surface,textAlign:'center'},
 qrWrap:{alignSelf:'center',padding:10,backgroundColor:'#FFFFFF',borderRadius:12},qr:{width:180,height:180},
 code:{minHeight:56,borderWidth:1,borderColor:C.border,borderRadius:14,color:C.white,backgroundColor:C.surface,fontSize:26,fontWeight:'900',letterSpacing:8,textAlign:'center'}
});
