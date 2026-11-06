import React,{useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Message,Page} from '../src/components/UI';
import {C} from '../src/lib/theme';
import {registerNative,validateNativeRegistration} from '../src/lib/native-registration';

export default function RegisterScreen(){
 const router=useRouter();
 const [username,setUsername]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [nickname,setNickname]=useState('');
 const [dateOfBirth,setDateOfBirth]=useState('');
 const [country,setCountry]=useState('Portugal');
 const [gender,setGender]=useState<string|null>(null);
 const [acceptedLegalTerms,setAcceptedLegalTerms]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [registered,setRegistered]=useState(false);

 async function submit(){
  if(busy)return;
  const reason=validateNativeRegistration({username,password,confirmPassword,email,dateOfBirth,country,acceptedLegalTerms});
  if(reason){setError(reason);return;}
  setBusy(true);setError('');
  try{
   await registerNative({
    username:username.trim(),email:email.trim(),password,nickname:nickname.trim()||null,
    dateOfBirth:dateOfBirth.trim(),country:country.trim(),
    indicativePhone:null,phone:null,gender,acceptedLegalTerms:true,
    returnSessionId:null,returnCommunityId:null
   });
   setPassword('');setConfirmPassword('');setRegistered(true);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a conta.');}
  finally{setBusy(false);}
 }
 if(registered)return <Page>
  <Brand subtitle="CONTA CRIADA"/>
  <Eyebrow>CONFIRMAÇÃO POR EMAIL</Eyebrow>
  <Text style={styles.title}>Verifica a tua caixa de correio.</Text>
  <Message>A conta foi registada. Confirma o teu email para conseguires iniciar sessão na Jynlo.</Message>
  <Button title="Confirmar email na aplicação" onPress={()=>router.replace({pathname:'/confirm-email',params:{username}})}/>
  <Button title="Voltar ao início de sessão" secondary onPress={()=>router.replace('/login')}/>
 </Page>;
 return <Page>
  <Brand subtitle="JUNTA-TE À JYNLO"/>
  <DemoBanner/>
  <Eyebrow>REGISTO NA APLICAÇÃO</Eyebrow>
  <Text style={styles.title}>Encontra as tuas pessoas.</Text>
  <Text style={styles.hint}>Cria a tua conta diretamente na app. Os mesmos dados e regras são usados no website.</Text>
  {error?<Message tone="error">{error}</Message>:null}
  <View style={styles.form}>
   <Text style={styles.label}>Nome de utilizador *</Text>
   <TextInput style={styles.input} value={username} onChangeText={setUsername} maxLength={50} autoCapitalize="none" autoComplete="username" autoCorrect={false} placeholder="Mínimo de 3 caracteres" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Email *</Text>
   <TextInput style={styles.input} value={email} onChangeText={setEmail} maxLength={254} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="o.teu@email.com" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Palavra-passe *</Text>
   <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry maxLength={128} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Confirmar palavra-passe *</Text>
   <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry maxLength={128} autoComplete="new-password" placeholder="Repetir palavra-passe" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Nome pelo qual queres ser tratado</Text>
   <TextInput style={styles.input} value={nickname} onChangeText={setNickname} maxLength={80} placeholder="Opcional" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Data de nascimento * (AAAA-MM-DD)</Text>
   <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} maxLength={10} keyboardType="numbers-and-punctuation" placeholder="1998-05-24" placeholderTextColor={C.muted}/>
   <Text style={styles.hint}>Tens de ter pelo menos 18 anos.</Text>
   <Text style={styles.label}>País *</Text>
   <TextInput style={styles.input} value={country} onChangeText={setCountry} maxLength={100} placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Género (opcional)</Text>
   <View style={styles.gender}>
    {([{value:null,label:'Não indicar'},{value:'masculino',label:'Masculino'},{value:'feminino',label:'Feminino'},{value:'outro',label:'Outro'}] as const).map(option=>
      <Text key={option.label} onPress={()=>setGender(option.value)}
       style={[styles.choice,gender===option.value&&styles.choiceActive]}>{option.label}</Text>)}
   </View>
   <Text onPress={()=>setAcceptedLegalTerms(value=>!value)} accessibilityRole="checkbox"
    accessibilityState={{checked:acceptedLegalTerms}} style={styles.legal}>
    {acceptedLegalTerms?'☑':'☐'} Li e aceito os Termos de Utilização e a Política de Privacidade da Jynlo.
   </Text>
   <Text style={styles.hint}>Os termos e a política de privacidade estão disponíveis em d24sports.com/terms e d24sports.com/privacy.</Text>
   <Button title={busy?'A criar conta…':'Criar conta'} disabled={busy} onPress={()=>{void submit();}}/>
   <Button title="Já tenho conta" secondary onPress={()=>router.replace('/login')}/>
  </View>
 </Page>;
}
const styles=StyleSheet.create({
 title:{color:C.white,fontSize:29,fontWeight:'900'},
 hint:{fontSize:12,lineHeight:19,color:C.muted},
 label:{color:C.white,fontSize:13,fontWeight:'700'},
 input:{height:52,borderRadius:13,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,paddingHorizontal:15,color:C.white,fontSize:15},
 form:{gap:10},
 legal:{color:C.white,fontSize:13,lineHeight:23,backgroundColor:C.surface,padding:16,borderRadius:12},
 gender:{flexDirection:'row',flexWrap:'wrap',gap:8},
 choice:{color:C.white,padding:9,borderWidth:1,borderColor:C.border,borderRadius:10,backgroundColor:C.surface},
 choiceActive:{borderColor:C.mint,color:C.mint}
});
