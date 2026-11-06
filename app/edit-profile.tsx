import React,{useCallback,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {DEMO_MODE,request} from '../src/lib/api';
import {C} from '../src/lib/theme';

type Profile={
 username:string;fullName?:string|null;nickname?:string|null;
 dateOfBirth?:string|null;address?:string|null;country?:string|null;
 location?:string|null;postalCode?:string|null;
 indicativePhone?:string|null;phone?:string|null;gender?:string|null;
 email?:string|null;favoriteSports?:string|null;bio?:string|null;
 skillLevel?:string|null;availability?:string|null;mfa?:boolean|null;
};
type Editable=Pick<Profile,'fullName'|'nickname'|'dateOfBirth'|'address'|'country'|'location'|
 'postalCode'|'indicativePhone'|'phone'|'gender'|'email'|'favoriteSports'|'bio'|
 'skillLevel'|'availability'>;
type Field=keyof Editable;
const fields:{key:Field;label:string;limit:number}[]=[
 {key:'fullName',label:'Nome completo',limit:120},
 {key:'nickname',label:'Nome pelo qual queres ser tratado',limit:80},
 {key:'dateOfBirth',label:'Data de nascimento (AAAA-MM-DD)',limit:10},
 {key:'email',label:'Email',limit:254},
 {key:'bio',label:'Sobre mim',limit:280},
 {key:'country',label:'País',limit:100},
 {key:'location',label:'Localidade',limit:120},
 {key:'address',label:'Morada',limit:255},
 {key:'postalCode',label:'Código postal',limit:32},
 {key:'indicativePhone',label:'Indicativo (sem +)',limit:4},
 {key:'phone',label:'Telemóvel',limit:15},
 {key:'favoriteSports',label:'Desportos favoritos (catálogo Jynlo)',limit:255},
 {key:'availability',label:'Disponibilidade',limit:120},
];
const normalize=(value:unknown)=>typeof value==='string'?value:'';
function isAdult(date:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const y=Number(date.slice(0,4)),m=Number(date.slice(5,7)),d=Number(date.slice(8,10));
 const dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return false;
 const today=new Date(),oldest=new Date(Date.UTC(today.getUTCFullYear()-120,today.getUTCMonth(),today.getUTCDate()));
 const youngest=new Date(Date.UTC(today.getUTCFullYear()-18,today.getUTCMonth(),today.getUTCDate()));
 return dt>=oldest&&dt<=youngest;
}
export default function EditProfileScreen(){
 const auth=useAuth(),router=useRouter();
 const [original,setOriginal]=useState<Profile|null>(null);
 const [values,setValues]=useState<Editable>({});
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[success,setSuccess]=useState(false);
 useFocusEffect(useCallback(()=>{
  if(!auth.token||DEMO_MODE){setLoading(false);return;}
  let active=true;setLoading(true);setError('');setSuccess(false);
  request<Profile>('/api/profile/me/mobile',{token:auth.token})
   .then(profile=>{if(!active)return;setOriginal(profile);
    const initial:Editable={};
    for(const {key} of fields)initial[key]=normalize(profile[key]);
    initial.gender=normalize(profile.gender);
    initial.skillLevel=normalize(profile.skillLevel);
    setValues(initial);
   }).catch(()=>{if(active)setError('Não foi possível carregar o perfil. Tenta abrir novamente.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[auth.token]));
 const set=(key:Field,value:string)=>setValues(v=>({...v,[key]:value}));
 async function save(){
  if(busy||!original||!auth.token||DEMO_MODE)return;
  const date=normalize(values.dateOfBirth),email=normalize(values.email).trim();
  if(!isAdult(date)){setError('Introduz uma data de nascimento válida (mínimo de 18 anos).');return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Introduz um email válido.');return;}
  const indicativePhone=normalize(values.indicativePhone).trim(),phone=normalize(values.phone).trim();
  if(Boolean(indicativePhone)!==Boolean(phone)|| (indicativePhone&&!/^\d{1,4}$/.test(indicativePhone))||
    (phone&&!/^\d{4,15}$/.test(phone))||indicativePhone.length+phone.length>15){
    setError('Confirma o indicativo e o número de telemóvel.');return;
  }
  setBusy(true);setError('');setSuccess(false);
  try{
   const payload={
    fullName:normalize(values.fullName).trim(),nickname:normalize(values.nickname).trim(),
    dateOfBirth:date,address:normalize(values.address).trim(),country:normalize(values.country).trim(),
    location:normalize(values.location).trim(),postalCode:normalize(values.postalCode).trim(),
    indicativePhone,phone,gender:normalize(values.gender),
    email,favoriteSports:normalize(values.favoriteSports).trim(),bio:normalize(values.bio).trim(),
    skillLevel:normalize(values.skillLevel),availability:normalize(values.availability).trim(),
    // Never silently disable or enable MFA when editing unrelated profile fields.
    mfa:original.mfa??false
   };
   const updated=await request<Profile>('/api/profile/me',{token:auth.token,method:'PUT',body:payload});
   setOriginal(updated);setSuccess(true);
  }catch(e){setError('Não foi possível guardar. Verifica os dados e tenta novamente.');}
  finally{setBusy(false);}
 }
 return <Page><Brand subtitle="O TEU PERFIL"/><Eyebrow>EDITAR DADOS</Eyebrow>
  {!auth.token||DEMO_MODE?<Message>Inicia sessão numa conta real para editar o perfil.</Message>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {success?<Message>Dados guardados com sucesso.</Message>:null}
  {original&&!loading?<View style={styles.form}>
   <Text style={styles.identity}>Conta: {original.username}</Text>
   {fields.map(({key,label,limit})=><View key={key} style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={[styles.input,key==='bio'&&styles.bio]} value={normalize(values[key])}
     onChangeText={v=>set(key,v)} maxLength={limit}
     multiline={key==='bio'} autoCapitalize={key==='email'?'none':'sentences'}
     keyboardType={key==='email'?'email-address':key==='phone'||key==='indicativePhone'?'phone-pad':'default'}
     editable={!busy} placeholderTextColor={C.muted}/>
   </View>)}
   <Text style={styles.label}>Género</Text>
   <View style={styles.options}>{(['','masculino','feminino','outro'] as const).map(v=>
    <Text key={v} style={[styles.option,values.gender===v&&styles.selected]} onPress={()=>set('gender',v)}>
     {v||'Não indicar'}
    </Text>)}</View>
   <Text style={styles.label}>Nível</Text>
   <View style={styles.options}>{(['','BEGINNER','INTERMEDIATE','ADVANCED'] as const).map(v=>
    <Text key={v} style={[styles.option,values.skillLevel===v&&styles.selected]}
     onPress={()=>set('skillLevel',v)}>{v||'Não indicar'}</Text>)}</View>
   <Message>Os desportos favoritos têm de corresponder aos nomes do catálogo Jynlo. A segurança MFA é gerida separadamente.</Message>
   <Button title={busy?'A guardar…':'Guardar alterações'} disabled={busy} onPress={()=>{void save();}}/>
  </View>:null}
  <Button title="Voltar ao perfil" secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 form:{gap:14},field:{gap:6},label:{color:C.white,fontSize:13,fontWeight:'700'},
 input:{minHeight:50,color:C.white,borderColor:C.border,borderWidth:1,borderRadius:13,
  backgroundColor:C.surface,paddingHorizontal:14,fontSize:15},
 bio:{minHeight:98,textAlignVertical:'top',paddingTop:12},
 identity:{color:C.muted,fontSize:13},
 options:{flexDirection:'row',flexWrap:'wrap',gap:7},
 option:{color:C.white,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,
  borderRadius:9,padding:9,fontSize:12},
 selected:{color:C.mint,borderColor:C.mint}
});
