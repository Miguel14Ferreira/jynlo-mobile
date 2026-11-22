import React,{useCallback,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {ApiError,DEMO_MODE,request} from '../../src/lib/api';
import {C} from '../../src/lib/theme';
import {normalizeCatalog,filterSports} from '../../src/lib/favorite-sports.cjs';
import {buildVenueRequest,DISTRICTS} from '../../src/lib/venue-create.cjs';
import type {NewVenueFields} from '../../src/lib/venue-create.cjs';
import {sportName} from '../../src/lib/sport-names.cjs';

const INITIAL:NewVenueFields={
 name:'',city:'',district:'',address:'',venueType:'',surfaceType:'',
 openingHours:'',priceInfo:'',contact:'',website:'',latitude:'',longitude:'',
 environmentType:'',ownershipType:'',changingRooms:false,toilets:false,
 showers:false,accessible:false,wifi:false,lighting:false,parking:false
};
type TextField='name'|'city'|'address'|'venueType'|'surfaceType'|'openingHours'|
 'priceInfo'|'contact'|'website'|'latitude'|'longitude';
const TEXT_FIELDS:{key:TextField;label:string;limit:number;placeholder?:string}[]=[
 {key:'name',label:'Nome do recinto *',limit:140},
 {key:'city',label:'Cidade *',limit:120},
 {key:'address',label:'Morada',limit:255},
 {key:'venueType',label:'Tipo de recinto',limit:80,placeholder:'Campo, pavilhão…'},
 {key:'surfaceType',label:'Superfície',limit:80},
 {key:'openingHours',label:'Horário de funcionamento',limit:1000},
 {key:'priceInfo',label:'Informação sobre preços',limit:255},
 {key:'contact',label:'Contacto público',limit:255},
 {key:'website',label:'Website HTTPS',limit:255,placeholder:'https://…'},
 {key:'latitude',label:'Latitude GPS (opcional)',limit:15,placeholder:'38.7223'},
 {key:'longitude',label:'Longitude GPS (opcional)',limit:15,placeholder:'-9.1393'}
];
type Suggestion={id:number;status:string;submittedAt:string};
export default function CreateVenueScreen(){
 const auth=useAuth(),router=useRouter();
 const [data,setData]=useState<NewVenueFields>({...INITIAL});
 const [sports,setSports]=useState<string[]>([]);
 const [catalog,setCatalog]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);
 const [search,setSearch]=useState(''),[showSports,setShowSports]=useState(false);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [submitted,setSubmitted]=useState<Suggestion|null>(null);
 useFocusEffect(useCallback(()=>{
  let active=true;
  setError('');setLoading(true);
  if(!auth.token||DEMO_MODE){setLoading(false);return()=>{active=false};}
  void request<string[]>('/api/profile/sports-catalog',{token:auth.token})
   .then(items=>{if(active)setCatalog(normalizeCatalog(items));})
   .catch(()=>{if(active)setError(t('Não foi possível obter o catálogo de modalidades.'));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false};
 },[auth.token]));
 const text=(key:TextField,value:string)=>setData(current=>({...current,[key]:value}));
 const toggle=(key:keyof Pick<NewVenueFields,'changingRooms'|'toilets'|'showers'|'accessible'|'wifi'|'lighting'|'parking'>)=>
  setData(current=>({...current,[key]:!current[key]}));
 const pickSport=(sport:string)=>{
  if(busy||submitted)return;
  setSports(old=>old.includes(sport)?old.filter(s=>s!==sport):[...old,sport]);
 };
 async function submit(){
  if(!auth.token||DEMO_MODE||loading||busy||submitted)return;
  let payload:Record<string,unknown>;
  try{payload=buildVenueRequest(data,sports,catalog);}
  catch(e){setError(e instanceof Error?e.message:t('Verifica os campos do recinto.'));return;}
  setBusy(true);setError('');
  try{
   // POST is only sent after explicit confirmation and is never retried automatically.
   const created=await request<Suggestion>('/api/venues',{token:auth.token,method:'POST',body:payload});
   if(!Number.isSafeInteger(created.id)||!created.status)throw new Error(t('resposta inesperada'));
   setSubmitted(created);
  }catch(e){
   if(e instanceof ApiError&&e.status===409){
    setError(t('Já tens uma sugestão deste recinto em análise. Não envies novamente.'));
   }else if(e instanceof ApiError&&e.status===401){
    setError(t('A sessão expirou. Inicia sessão novamente.'));
   }else{
    setError(t('Não foi possível confirmar o envio. Antes de repetires, verifica se a sugestão já foi recebida.'));
   }
  }finally{setBusy(false);}
 }
 return <Page>
  <DemoBanner/><Eyebrow>{t('SUGERIR NOVO RECINTO')}</Eyebrow>
  <Message>{t('O novo recinto será analisado pelos moderadores antes de aparecer publicamente na Jynlo. Não é publicado automaticamente.')}</Message>
  {!auth.token||DEMO_MODE?<Message>{t('Inicia sessão com uma conta real para sugerires um recinto.')}</Message>:null}
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {submitted?<Message>{t('Sugestão #{a} recebida. Estado: {b}.',{a:submitted.id,b:submitted.status==='PENDING'?t('Em análise'):submitted.status})}</Message>:null}
  {!submitted&&!!auth.token&&!DEMO_MODE?<View style={styles.form}>
   {TEXT_FIELDS.map(f=>({...f,label:t(f.label),placeholder:f.placeholder?t(f.placeholder):undefined})).map(({key,label,limit,placeholder})=><View key={key} style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={data[key]} onChangeText={v=>text(key,v)} maxLength={limit}
     editable={!busy} placeholder={placeholder} placeholderTextColor={C.muted}
     autoCapitalize={key==='website'||key==='latitude'||key==='longitude'?'none':'sentences'}
     keyboardType={key==='latitude'||key==='longitude'?'numbers-and-punctuation':key==='website'?'url':'default'}
     style={[styles.input,key==='openingHours'&&styles.multiline]}
     multiline={key==='openingHours'}/>
   </View>)}
   <Eyebrow>{t('DISTRITO')}</Eyebrow>
   <View style={styles.choices}>{['',...DISTRICTS].map(d=><Pressable key={d||'empty'}
    accessibilityRole="radio" accessibilityState={{selected:data.district===d}}
    disabled={busy} style={[styles.choice,data.district===d&&styles.selected]}
    onPress={()=>setData(v=>({...v,district:d}))}>
    <Text style={styles.choiceText}>{d||t('Não indicado')}</Text>
   </Pressable>)}</View>
   <Eyebrow>{t('AMBIENTE DO RECINTO *')}</Eyebrow>
   <View style={styles.choices}>{([
    ['OUTDOOR',t('Ao ar livre')],['INDOOR',t('Interior')],['BOTH',t('Misto')]
   ] as const).map(([id,label])=><Pressable key={id}
    accessibilityRole="radio" accessibilityState={{selected:data.environmentType===id}}
    disabled={busy} style={[styles.choice,data.environmentType===id&&styles.selected]}
    onPress={()=>setData(v=>({...v,environmentType:id}))}>
    <Text style={styles.choiceText}>{label}</Text>
   </Pressable>)}</View>
   <Eyebrow>{t('PROPRIEDADE')}</Eyebrow>
   <View style={styles.choices}>{([
    ['',t('Não indicar')],['PUBLIC',t('Pública')],['PRIVATE',t('Privada')]
   ] as const).map(([id,label])=><Pressable key={id||'empty'}
    accessibilityRole="radio" accessibilityState={{selected:data.ownershipType===id}}
    disabled={busy} style={[styles.choice,data.ownershipType===id&&styles.selected]}
    onPress={()=>setData(v=>({...v,ownershipType:id}))}>
    <Text style={styles.choiceText}>{label}</Text>
   </Pressable>)}</View>
   <Eyebrow>{t('MODALIDADES')}</Eyebrow>
   <Text style={styles.hint}>{t('{a} modalidades selecionadas',{a:sports.length})}</Text>
   <View style={styles.choices}>{sports.map(s=><Pressable key={s} accessibilityRole="checkbox"
    accessibilityState={{checked:true}} style={[styles.choice,styles.selected]}
    onPress={()=>pickSport(s)} disabled={busy}>
    <Text style={styles.choiceText}>✓ {s} ×</Text>
   </Pressable>)}</View>
   <Button title={showSports?t('Fechar modalidades'):t('Adicionar modalidades')}
    secondary disabled={busy||!catalog.length} onPress={()=>setShowSports(v=>!v)}/>
   {showSports?<View style={styles.sportPicker}>
    <TextInput style={styles.input} value={search} onChangeText={setSearch}
      placeholder={t('Pesquisar modalidade')} placeholderTextColor={C.muted}/>
    {filterSports(catalog,search).slice(0,30).map(s=><Pressable key={s}
      accessibilityRole="checkbox" accessibilityState={{checked:sports.includes(s)}}
      style={[styles.choice,sports.includes(s)&&styles.selected]} onPress={()=>pickSport(s)}
      disabled={busy}>
      <Text style={styles.choiceText}>{sports.includes(s)?'☑':'☐'} {sportName(s)}</Text>
    </Pressable>)}
    {filterSports(catalog,search).length>30?<Text style={styles.hint}>{t('Pesquisa para encontrares mais modalidades.')}</Text>:null}
   </View>:null}
   <Eyebrow>{t('INSTALAÇÕES')}</Eyebrow>
   <View style={styles.choices}>{([
    ['changingRooms',t('Balneários')],['toilets',t('Casas de banho')],['showers',t('Chuveiros')],
    ['accessible',t('Acessibilidade')],['wifi','Wi-Fi'],['lighting',t('Iluminação')],['parking',t('Estacionamento')]
   ] as const).map(([key,label])=><Pressable key={key} accessibilityRole="checkbox"
     accessibilityState={{checked:data[key]}} style={[styles.choice,data[key]&&styles.selected]}
     onPress={()=>toggle(key)} disabled={busy}>
     <Text style={styles.choiceText}>{data[key]?'☑':'☐'} {label}</Text>
   </Pressable>)}</View>
   <Message>{t('Indica a morada ou as duas coordenadas GPS. Confirma o nome e a cidade antes de enviar, para evitar recintos duplicados.')}</Message>
   <Button title={busy?t('A enviar…'):t('Enviar recinto para aprovação')}
    disabled={busy||loading||!catalog.length} onPress={()=>{void submit();}}/>
  </View>:null}
  <Button title={t('Voltar aos recintos')} secondary onPress={()=>router.back()}/>
 </Page>;
}
const styles=StyleSheet.create({
 form:{gap:14},field:{gap:6},label:{fontSize:13,fontWeight:'700',color:C.white},
 input:{minHeight:50,paddingHorizontal:13,borderRadius:12,borderWidth:1,borderColor:C.border,
  backgroundColor:C.surface,color:C.white,fontSize:14},
 multiline:{height:95,textAlignVertical:'top',paddingTop:12},
 hint:{fontSize:13,color:C.muted},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:8},
 choice:{padding:10,borderRadius:10,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 selected:{borderColor:C.mint},choiceText:{fontSize:12,color:C.white},
 sportPicker:{padding:12,gap:8,backgroundColor:C.surface,borderRadius:12}
});
