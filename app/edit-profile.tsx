import React,{useCallback,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import type {ImagePickerAsset} from 'expo-image-picker';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../src/components/UI';
import {useAuth} from '../src/lib/auth';
import {DEMO_MODE,request} from '../src/lib/api';
import {C} from '../src/lib/theme';
import {uploadMyProfilePhoto} from '../src/lib/profile-photo';
import {parseFavoriteSports,normalizeCatalog,toggleFavoriteSport,validateFavoriteSports,filterSports} from '../src/lib/favorite-sports.cjs';
import {sportName} from '../src/lib/sport-names.cjs';

type Profile={
 username:string;fullName?:string|null;nickname?:string|null;
 dateOfBirth?:string|null;address?:string|null;country?:string|null;
 location?:string|null;postalCode?:string|null;
 indicativePhone?:string|null;phone?:string|null;gender?:string|null;
 email?:string|null;favoriteSports?:string|null;bio?:string|null;
 skillLevel?:string|null;availability?:string|null;mfa?:boolean|null;
 profilePicUrl?:string|null;
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
 const [selectedPhoto,setSelectedPhoto]=useState<ImagePickerAsset|null>(null);
 const [photoBusy,setPhotoBusy]=useState(false),[photoSuccess,setPhotoSuccess]=useState(false);
 const [catalog,setCatalog]=useState<string[]>([]),[catalogReady,setCatalogReady]=useState(false);
 const [sportsSearch,setSportsSearch]=useState(''),[showSports,setShowSports]=useState(false);
 useFocusEffect(useCallback(()=>{
  if(!auth.token||DEMO_MODE){setLoading(false);return;}
  let active=true;setLoading(true);setError('');setSuccess(false);setPhotoSuccess(false);setSelectedPhoto(null);
  setCatalogReady(false);setCatalog([]);
  Promise.all([request<Profile>('/api/profile/me/mobile',{token:auth.token}),
    request<string[]>('/api/profile/sports-catalog',{token:auth.token})])
   .then(([profile,sports])=>{if(!active)return;setCatalog(normalizeCatalog(sports));setCatalogReady(true);setOriginal(profile);
    const initial:Editable={};
    for(const {key} of fields)initial[key]=normalize(profile[key]);
    initial.gender=normalize(profile.gender);
    initial.skillLevel=normalize(profile.skillLevel);
    setValues(initial);
   }).catch(()=>{if(active)setError(t('Não foi possível carregar o perfil. Tenta abrir novamente.'));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[auth.token]));
 const set=(key:Field,value:string)=>setValues(v=>({...v,[key]:value}));
 async function choosePhoto(){
  if(photoBusy||busy||!auth.token||DEMO_MODE)return;
  setError('');setPhotoSuccess(false);
  try{
   const ImagePicker=await import('expo-image-picker');
   const result=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.75,
    exif:false,base64:false
   });
   if(!result.canceled&&result.assets?.[0])setSelectedPhoto(result.assets[0]);
  }catch{setError(t('Não foi possível abrir a galeria de fotografias.'));}
 }
 async function savePhoto(){
  if(!selectedPhoto||photoBusy||busy||!auth.token||DEMO_MODE)return;
  setError('');setPhotoBusy(true);setPhotoSuccess(false);
  try{
   const updated=await uploadMyProfilePhoto(auth.token,selectedPhoto);
   setOriginal(prev=>prev?{...prev,profilePicUrl:updated.profilePicUrl}:prev);
   setSelectedPhoto(null);
   setPhotoSuccess(true);
  }catch(e){setError(e instanceof Error?e.message:t('Não foi possível confirmar o envio da fotografia.'));}
  finally{setPhotoBusy(false);}
 }
 async function save(){
  if(busy||!original||!auth.token||DEMO_MODE)return;
  const date=normalize(values.dateOfBirth),email=normalize(values.email).trim();
  const sportsError=validateFavoriteSports(normalize(values.favoriteSports),catalog);
  if(!catalogReady||sportsError){setError(sportsError||t('Carrega o catálogo de modalidades antes de guardar.'));return;}
  if(!isAdult(date)){setError(t('Introduz uma data de nascimento válida (mínimo de 18 anos).'));return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError(t('Introduz um email válido.'));return;}
  const indicativePhone=normalize(values.indicativePhone).trim(),phone=normalize(values.phone).trim();
  if(Boolean(indicativePhone)!==Boolean(phone)|| (indicativePhone&&!/^\d{1,4}$/.test(indicativePhone))||
    (phone&&!/^\d{4,15}$/.test(phone))||indicativePhone.length+phone.length>15){
    setError(t('Confirma o indicativo e o número de telemóvel.'));return;
  }
  setBusy(true);setError('');setSuccess(false);
  try{
   const payload={
    fullName:normalize(values.fullName).trim(),nickname:normalize(values.nickname).trim(),
    dateOfBirth:date,address:normalize(values.address).trim(),country:normalize(values.country).trim(),
    location:normalize(values.location).trim(),postalCode:normalize(values.postalCode).trim(),
    indicativePhone,phone,gender:normalize(values.gender),
    email,favoriteSports:parseFavoriteSports(values.favoriteSports).join(','),bio:normalize(values.bio).trim(),
    skillLevel:normalize(values.skillLevel),availability:normalize(values.availability).trim(),
    // Never silently disable or enable MFA when editing unrelated profile fields.
    mfa:original.mfa??false
   };
   const updated=await request<Profile>('/api/profile/me',{token:auth.token,method:'PUT',body:payload});
   setOriginal(updated);setSuccess(true);
  }catch(e){setError(t('Não foi possível guardar. Verifica os dados e tenta novamente.'));}
  finally{setBusy(false);}
 }
 return <Page><Eyebrow>{t('EDITAR DADOS')}</Eyebrow>
  {!auth.token||DEMO_MODE?<Message>{t('Inicia sessão numa conta real para editar o perfil.')}</Message>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {success?<Message>{t('Dados guardados com sucesso.')}</Message>:null}
  {photoSuccess?<Message>{t('Fotografia atualizada com sucesso.')}</Message>:null}
  {original&&!loading?<View style={styles.form}>
   <Text style={styles.identity}>{t('Conta: {a}',{a:original.username})}</Text>
   <Eyebrow>{t('FOTOGRAFIA DE PERFIL')}</Eyebrow>
   {selectedPhoto?.uri||original.profilePicUrl?
    <Image source={{uri:selectedPhoto?.uri||original.profilePicUrl||''}} style={styles.photo}/>:
    <Message>{t('Ainda não tens fotografia de perfil.')}</Message>}
   <Button title={t('Escolher fotografia')} secondary onPress={()=>{void choosePhoto();}} disabled={busy||photoBusy}/>
   {selectedPhoto?<View style={styles.photoActions}>
    <Message>{t('A fotografia selecionada só será enviada quando confirmares.')}</Message>
    <Button title={photoBusy?t('A enviar…'):t('Guardar fotografia')} disabled={photoBusy||busy}
     onPress={()=>{void savePhoto();}}/>
    <Button title={t('Cancelar seleção')} secondary disabled={photoBusy}
     onPress={()=>setSelectedPhoto(null)}/>
   </View>:null}
   {fields.map(f=>({...f,label:t(f.label)})).map(({key,label,limit})=><View key={key} style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={[styles.input,key==='bio'&&styles.bio]} value={normalize(values[key])}
     onChangeText={v=>set(key,v)} maxLength={limit}
     multiline={key==='bio'} autoCapitalize={key==='email'?'none':'sentences'}
     keyboardType={key==='email'?'email-address':key==='phone'||key==='indicativePhone'?'phone-pad':'default'}
     editable={!busy&&key!=='email'} placeholderTextColor={C.muted}/>
    {key==='email'?<Pressable accessibilityRole="button" onPress={()=>router.push('/change-email')}><Text style={styles.emailHint}>{t('Para mudar o email, toca aqui: confirmamos a palavra-passe e o novo endereço.')}</Text></Pressable>:null}
   </View>)}
   <Eyebrow>{t('MODALIDADES FAVORITAS')}</Eyebrow>
   <Text style={styles.label}>{t('Escolhe as modalidades que praticas')}</Text>
   <Text style={styles.identity}>{t('{a} selecionadas',{a:parseFavoriteSports(values.favoriteSports).length})}</Text>
   <View style={styles.options}>{parseFavoriteSports(values.favoriteSports).map(sport=><Pressable
     accessibilityRole="checkbox" accessibilityState={{checked:true}} key={sport}
     style={[styles.option,styles.selected]} disabled={busy||!catalogReady}
     onPress={()=>{try{set('favoriteSports',toggleFavoriteSport(normalize(values.favoriteSports),sport,catalog));}
      catch(e){setError(e instanceof Error?e.message:t('Não foi possível alterar a seleção.'));}}}>
     <Text style={styles.selected}>✓ {sportName(sport)} ×</Text>
    </Pressable>)}</View>
   <Button title={showSports?t('Fechar modalidades'):t('Adicionar modalidades')} secondary
     disabled={!catalogReady||busy} onPress={()=>setShowSports(v=>!v)}/>
   {showSports&&catalogReady?<View style={styles.sportsSearchBox}>
    <TextInput style={styles.input} value={sportsSearch} onChangeText={setSportsSearch}
      placeholder={t('Pesquisar modalidades')} placeholderTextColor={C.muted}/>
    {filterSports(catalog,sportsSearch).slice(0,30).map(sport=>{
     const checked=parseFavoriteSports(values.favoriteSports).includes(sport);
     return <Pressable key={sport} accessibilityRole="checkbox" accessibilityState={{checked}}
       style={[styles.sportRow,checked&&styles.sportRowSelected]}
       disabled={busy||photoBusy}
       onPress={()=>{try{set('favoriteSports',toggleFavoriteSport(normalize(values.favoriteSports),sport,catalog));setError('');}
        catch(e){setError(e instanceof Error?e.message:t('Não foi possível alterar a seleção.'));}}}>
      <Text style={styles.sportText}>{checked?'☑':'☐'} {sportName(sport)}</Text>
     </Pressable>;
    })}
    {filterSports(catalog,sportsSearch).length>30?<Text style={styles.identity}>{t('Mostradas 30 modalidades. Pesquisa para veres mais.')}</Text>:null}
   </View>:null}
   <Text style={styles.label}>{t('Género')}</Text>
   <View style={styles.options}>{(['','masculino','feminino','outro'] as const).map(v=>
    <Text key={v} style={[styles.option,values.gender===v&&styles.selected]} onPress={()=>set('gender',v)}>
     {v||t('Não indicar')}
    </Text>)}</View>
   <Text style={styles.label}>{t('Nível')}</Text>
   <View style={styles.options}>{(['','BEGINNER','INTERMEDIATE','ADVANCED'] as const).map(v=>
    <Text key={v} style={[styles.option,values.skillLevel===v&&styles.selected]}
     onPress={()=>set('skillLevel',v)}>{v||t('Não indicar')}</Text>)}</View>
   <Message>{t('Modalidades sincronizadas com o catálogo da Jynlo. A segurança MFA é gerida separadamente.')}</Message>
   <Button title={busy?t('A guardar…'):t('Guardar alterações')} disabled={busy||!catalogReady||photoBusy} onPress={()=>{void save();}}/>
  </View>:null}
  <Button title={t('Voltar ao perfil')} secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 emailHint:{color:C.mint,fontSize:12,fontWeight:'700',paddingTop:4},
 form:{gap:14},field:{gap:6},label:{color:C.white,fontSize:13,fontWeight:'700'},
 input:{minHeight:50,color:C.white,borderColor:C.border,borderWidth:1,borderRadius:13,
  backgroundColor:C.surface,paddingHorizontal:14,fontSize:15},
 bio:{minHeight:98,textAlignVertical:'top',paddingTop:12},
 identity:{color:C.muted,fontSize:13},
 options:{flexDirection:'row',flexWrap:'wrap',gap:7},
 option:{color:C.white,backgroundColor:C.surface,borderColor:C.border,borderWidth:1,
  borderRadius:9,padding:9,fontSize:12},
 selected:{color:C.mint,borderColor:C.mint},
 photo:{height:124,width:124,borderRadius:62,alignSelf:'center',backgroundColor:C.surface},
 photoActions:{gap:8},
 sportsSearchBox:{gap:8,padding:12,borderRadius:14,backgroundColor:C.surface},
 sportRow:{padding:12,borderColor:C.border,borderWidth:1,borderRadius:10},
 sportRowSelected:{borderColor:C.mint},
 sportText:{color:C.white,fontSize:14}
});
