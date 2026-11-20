import React,{useCallback,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams,useRouter} from 'expo-router';
import {Button,Eyebrow,Loader,Message,Page} from '../../../src/components/UI';
import {useAuth} from '../../../src/lib/auth';
import {ApiError,DEMO_MODE,request} from '../../../src/lib/api';
import {venueDetails} from '../../../src/lib/parity-api';
import type {VenueSummary} from '../../../src/lib/types';
import {C} from '../../../src/lib/theme';

type EditField='name'|'city'|'district'|'address'|'openingHours'|'website'|'contact'|'coordinates';
type FieldItem={key:EditField;label:string;limit:number};
const FIELDS:FieldItem[]=[
 {key:'name',label:'Nome do recinto',limit:140},
 {key:'city',label:'Cidade',limit:120},
 {key:'district',label:'Distrito',limit:120},
 {key:'address',label:'Morada',limit:255},
 {key:'openingHours',label:'Horário de funcionamento',limit:1000},
 {key:'website',label:'Website HTTPS',limit:255},
 {key:'contact',label:'Contacto público',limit:255},
 {key:'coordinates',label:'Localização GPS',limit:30},
];
type VenueEditSuggestion={id:number;status:string;submittedAt:string;reason:string;proposed:Record<string,string>};
function valueOf(venue:VenueSummary,field:EditField):string{
 if(field==='coordinates'){
  return venue.latitude!=null&&venue.longitude!=null?venue.latitude+','+venue.longitude:'';
 }
 const v=venue[field];
 return typeof v==='string'?v:'';
}
function sourceValid(value:string):boolean{
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&!!u.hostname&&u.hostname.includes('.')&&!u.hostname.endsWith('.')&&
    !u.username&&!u.password&&!u.hash&&(u.port===''||u.port==='443')&&
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(u.hostname)&&!/^[\d.]+$/.test(u.hostname);
 }catch{return false;}
}
function coordinates(value:string):{latitude:string;longitude:string}|null{
 const match=value.match(/^\s*(-?(?:0|[1-9]\d{0,2})(?:\.\d{1,7})?)\s*,\s*(-?(?:0|[1-9]\d{0,2})(?:\.\d{1,7})?)\s*$/);
 if(!match)return null;
 const lat=Number(match[1]),lon=Number(match[2]);
 if(lat<32||lat>43||lon< -32||lon> -6)return null;
 return {latitude:String(lat),longitude:String(lon)};
}
function buildChanges(field:EditField,value:string):Record<string,string>|null{
 if(field==='coordinates')return coordinates(value);
 const trimmed=value.trim();
 if(!['openingHours','website','contact'].includes(field)&&!trimmed)return null;
 return {[field]:trimmed};
}
export default function SuggestVenueEditScreen(){
 const router=useRouter(),auth=useAuth(),params=useLocalSearchParams<{id:string}>();
 const id=typeof params.id==='string'&&/^[1-9]\d*$/.test(params.id)?Number(params.id):NaN;
 const [venue,setVenue]=useState<VenueSummary|null>(null);
 const [mine,setMine]=useState<VenueEditSuggestion|null>(null);
 const [field,setField]=useState<EditField>('name'),[value,setValue]=useState('');
 const [reason,setReason]=useState(''),[sourceUrl,setSourceUrl]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[completed,setCompleted]=useState(false);
 useFocusEffect(useCallback(()=>{
  let active=true;setLoading(true);setError('');setCompleted(false);
  setVenue(null);setMine(null);
  if(!auth.token||DEMO_MODE||!Number.isSafeInteger(id)||id<=0){
   setLoading(false);
   return()=>{active=false;};
  }
  void Promise.all([
   venueDetails(id),
   request<VenueEditSuggestion>(`/api/venues/${id}/edit-suggestions/mine`,{token:auth.token})
    .catch(e=>{if(e instanceof ApiError&&e.status===404)return null;throw e;})
  ]).then(([detail,previous])=>{
   if(!active)return;
   setVenue(detail);setMine(previous);setValue(valueOf(detail,'name'));
  }).catch(()=>{if(active)setError('Não foi possível carregar o recinto ou verificar sugestões anteriores.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[id,auth.token]));
 const hasPending=mine?.status==='PENDING';
 const requiresSource=field==='coordinates'||field==='contact'&&!!value.trim();
 async function submit(){
  if(!auth.token||DEMO_MODE||busy||!venue||hasPending||completed)return;
  const changes=buildChanges(field,value);
  if(!changes){setError('Introduz uma alteração válida. Para GPS utiliza latitude,longitude.');return;}
  const fieldLimit=FIELDS.find(x=>x.key===field)?.limit??255;
  if(value.trim().length>fieldLimit){setError('O valor excede o limite permitido.');return;}
  if(field==='district'&&!['Aveiro','Beja','Braga','Bragança','Castelo Branco','Coimbra','Évora','Faro','Guarda','Leiria','Lisboa','Portalegre','Porto','Santarém','Setúbal','Viana do Castelo','Vila Real','Viseu'].includes(value.trim())){
   setError('Escolhe um distrito português válido.');return;
  }
  if(field==='website'&&value.trim()&&!sourceValid(value.trim())){
   setError('O website deve utilizar HTTPS.');return;
  }
  if(reason.trim().length<10||reason.trim().length>1000){
   setError('Explica a alteração em 10 a 1000 caracteres.');return;
  }
  if(sourceUrl.trim()&&!sourceValid(sourceUrl.trim())){
   setError('A fonte deve ser um endereço HTTPS público válido.');return;
  }
  if(requiresSource&&!sourceUrl.trim()){
   setError('Indica uma fonte HTTPS pública para o contacto ou a localização GPS.');return;
  }
  setBusy(true);setError('');
  try{
   const created=await request<VenueEditSuggestion>(`/api/venues/${id}/edit-suggestions`,{
    token:auth.token,method:'POST',
    body:{changes,reason:reason.trim(),sourceUrl:sourceUrl.trim()||null}
   });
   setMine(created);setCompleted(true);
  }catch(e){
   if(e instanceof ApiError&&e.status===409){
    setError('Já tens uma proposta pendente neste recinto. Reabre esta página para confirmar o estado.');
   }else{
    setError('Não foi possível confirmar o envio. Verifica as propostas anteriores antes de tentar novamente.');
   }
  }finally{setBusy(false);}
 }
 return <Page><Eyebrow>SUGERIR CORREÇÃO</Eyebrow>
  {!auth.token||DEMO_MODE?<Message>Inicia sessão com uma conta real para sugerires alterações.</Message>:null}
  {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
  {completed?<Message>Sugestão enviada para análise. As informações do recinto não são alteradas imediatamente.</Message>:null}
  {mine?<Message>Última sugestão: {mine.status==='PENDING'?'Em análise':mine.status==='APPROVED'?'Aprovada':mine.status==='REJECTED'?'Rejeitada':mine.status}.</Message>:null}
  {venue&&!loading?<View style={styles.form}>
   <Text style={styles.heading}>{venue.name}</Text>
   <Message>Escolhe uma informação, propõe a correção e explica o motivo. Um moderador irá analisar a sugestão.</Message>
   <Eyebrow>INFORMAÇÃO A CORRIGIR</Eyebrow>
   <View style={styles.fields}>{FIELDS.map(item=>
    <Pressable accessibilityRole="radio" accessibilityState={{selected:field===item.key}}
      disabled={busy||hasPending||completed} key={item.key}
      onPress={()=>{setField(item.key);setValue(valueOf(venue,item.key));setError('');}}
      style={[styles.choice,field===item.key&&styles.choiceSelected]}>
      <Text style={styles.choiceText}>{item.label}</Text>
    </Pressable>
   )}</View>
   <Text style={styles.label}>Valor atual</Text>
   <Text style={styles.muted}>{valueOf(venue,field)||'Não indicado'}</Text>
   <Text style={styles.label}>Valor proposto {field==='coordinates'?'(latitude,longitude)':''}</Text>
   <TextInput style={styles.input} value={value} maxLength={FIELDS.find(x=>x.key===field)?.limit||255}
    editable={!busy&&!hasPending&&!completed} onChangeText={setValue}
    autoCapitalize={field==='website'||field==='coordinates'?'none':'sentences'}
    placeholderTextColor={C.muted} placeholder={field==='coordinates'?'38.72,-9.14':'Nova informação'}/>
   <Text style={styles.label}>Motivo (10–1000 caracteres)</Text>
   <TextInput multiline value={reason} maxLength={1000} onChangeText={setReason}
    editable={!busy&&!hasPending&&!completed} style={[styles.input,styles.longInput]}
    placeholder="Explica por que motivo esta informação deve ser corrigida" placeholderTextColor={C.muted}/>
   <Text style={styles.label}>Fonte pública HTTPS {requiresSource?'(obrigatória)':'(opcional)'}</Text>
   <TextInput style={styles.input} value={sourceUrl} maxLength={500} onChangeText={setSourceUrl}
    editable={!busy&&!hasPending&&!completed} autoCapitalize="none" keyboardType="url"
    placeholder="https://..." placeholderTextColor={C.muted}/>
   <Button title={busy?'A enviar…':'Enviar sugestão para aprovação'}
    disabled={busy||hasPending||completed} onPress={()=>{void submit();}}/>
  </View>:null}
  <Button title="Voltar ao recinto" secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 form:{gap:12},heading:{fontSize:22,fontWeight:'900',color:C.white},
 label:{fontSize:13,fontWeight:'700',color:C.white},
 muted:{fontSize:13,color:C.muted},
 fields:{flexDirection:'row',flexWrap:'wrap',gap:8},
 choice:{padding:10,borderWidth:1,borderColor:C.border,borderRadius:10,backgroundColor:C.surface},
 choiceSelected:{borderColor:C.mint},
 choiceText:{color:C.white,fontSize:12},
 input:{minHeight:50,borderRadius:13,borderWidth:1,borderColor:C.border,
  backgroundColor:C.surface,paddingHorizontal:12,color:C.white,fontSize:14},
 longInput:{height:110,textAlignVertical:'top',paddingTop:10}
});
