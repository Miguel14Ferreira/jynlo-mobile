import React,{useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter,useLocalSearchParams} from 'expo-router';
import {Button,Message,Page} from '../src/components/UI';
import BirthDatePicker from '../src/components/BirthDatePicker';
import {useAuth} from '../src/lib/auth';
import {validAdultDate} from '../src/lib/native-registration';
import {safeRedirect} from '../src/lib/routes.cjs';
import {C} from '../src/lib/theme';

/** The Google ID token stays in memory only until registration completes. */
export default function GoogleOnboarding(){
 const router=useRouter(),auth=useAuth();
 const params=useLocalSearchParams<{redirect?:string}>();
 const redirect=safeRedirect(params.redirect);
 const [username,setUsername]=useState('');
 const [nickname,setNickname]=useState('');
 const [birth,setBirth]=useState('');
 const [country,setCountry]=useState('Portugal');
 const [accepted,setAccepted]=useState(false);
 const submitInFlight=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const ready=Boolean(auth.googleOnboardingEmail&&username.trim().length>=3&&
  validAdultDate(birth.trim())&&country.trim()&&accepted&&!busy);
 async function submit(){
  if(!ready||submitInFlight.current)return;
  submitInFlight.current=true;setBusy(true);setError('');
  try{
   await auth.completeGoogleRegistration({
    username:username.trim(),nickname:nickname.trim()||null,dateOfBirth:birth.trim(),
    country:country.trim(),indicativePhone:null,phone:null,gender:null,acceptedLegalTerms:true
   });
   router.replace(redirect as any);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir o registo Google.');}
  finally{submitInFlight.current=false;setBusy(false);}
 }
 if(!auth.googleOnboardingEmail)return <Page><Message>
  O registo Google não está ativo. Volta ao login e escolhe novamente a tua conta Google.
 </Message><Button title="Voltar ao login" onPress={()=>router.replace('/login')}/></Page>;
 return <Page>
  <Text style={styles.eyebrow}>QUASE PRONTO · CONTA GOOGLE</Text>
  <Text style={styles.title}>Cria o teu perfil Jynlo</Text>
  <Text style={styles.subtitle}>Google confirmado. Escolhe como queres aparecer na Jynlo.</Text>
  <Text style={styles.email} numberOfLines={2}>{auth.googleOnboardingEmail}</Text>
  {error?<Message tone="error">{error}</Message>:null}
  <View style={styles.group}>
   <Text style={styles.label}>Nome de utilizador *</Text>
   <TextInput style={styles.input} value={username} onChangeText={setUsername}
    maxLength={50} autoCapitalize="none" autoCorrect={false} autoComplete="username"
    placeholder="Como te vão encontrar" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Nome pelo qual queres ser tratado</Text>
   <TextInput style={styles.input} value={nickname} onChangeText={setNickname}
    maxLength={80} placeholder="Opcional" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Data de nascimento *</Text>
   <BirthDatePicker onChange={setBirth} disabled={busy}/>
   <Text style={styles.hint}>Escolhe dia, mês e ano. Tens de ter pelo menos 18 anos.</Text>
   <Text style={styles.label}>País *</Text>
   <TextInput style={styles.input} value={country} onChangeText={setCountry}
    maxLength={100} placeholder="Portugal" placeholderTextColor={C.muted}/>
  </View>
  <Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted}}
    onPress={()=>setAccepted(previous=>!previous)} style={styles.consent}>
    <View style={[styles.check,accepted&&styles.checked]}><Text style={{color:C.background}}>{accepted?'✓':''}</Text></View>
    <Text style={styles.consentText}>Li e aceito os Termos de Utilização e a Política de Privacidade da Jynlo.</Text>
  </Pressable>
  <View style={styles.links}>
   <Text style={styles.link} onPress={()=>router.push({pathname:'/legal',params:{document:'terms'}})}>Termos de Utilização</Text>
   <Text style={styles.link} onPress={()=>router.push({pathname:'/legal',params:{document:'privacy'}})}>Política de Privacidade</Text>
  </View>
  <Button title={busy?'A criar conta…':'Concluir registo'} disabled={!ready} onPress={()=>{void submit();}}/>
  <Text style={styles.hint}>A Google autentica a identidade; a Jynlo valida e cria o teu perfil no servidor. Não guardamos aqui a tua palavra-passe Google.</Text>
 </Page>;
}
const styles=StyleSheet.create({
 eyebrow:{color:C.mint,fontSize:12,fontWeight:'900',letterSpacing:1.1},
 title:{color:C.white,fontSize:25,fontWeight:'900'},subtitle:{color:C.muted,fontSize:14,lineHeight:21},
 email:{color:C.white,fontSize:13,fontWeight:'700',lineHeight:19},
 group:{gap:10},label:{color:C.white,fontSize:14,fontWeight:'800'},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:15,color:C.white,fontSize:15},
 hint:{color:C.muted,fontSize:13,lineHeight:19},
 consent:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:13,borderRadius:15,backgroundColor:C.surface},
 check:{width:22,height:22,borderRadius:6,borderWidth:1,borderColor:C.mint,alignItems:'center',justifyContent:'center'},checked:{backgroundColor:C.mint},
 consentText:{flex:1,color:C.white,fontSize:13,lineHeight:20},links:{flexDirection:'row',flexWrap:'wrap',gap:16},link:{color:C.mint,textDecorationLine:'underline',fontWeight:'700',fontSize:13}
});
