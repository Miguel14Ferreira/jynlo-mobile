import React,{useCallback,useState} from 'react';
import {Image,Linking,StyleSheet,Text,View} from 'react-native';
import {useLocalSearchParams,useFocusEffect} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {venueDetails,venuePhotos,venueRatingSummary,venueSportConditions} from '../../src/lib/parity-api';
import {C} from '../../src/lib/theme';
import type {VenuePhoto,VenueRatingSummary,VenueSportCondition,VenueSummary} from '../../src/lib/types';

const info=(label:string,value:unknown)=>{
 if(typeof value!=='string'||!value.trim())return null;
 return <Text style={styles.meta}>{label}: {value.trim()}</Text>;
};
const availability=(label:string,value:boolean|null|undefined)=>{
 if(value==null)return null;
 return <Text style={styles.meta}>{label}: {value?'Sim':'Não'}</Text>;
};
function safeHttps(value:string|null|undefined):string|null{
 if(!value)return null;
 try{
  const url=new URL(value.trim());
  return url.protocol==='https:'&&url.username===''&&url.password===''?url.toString():null;
 }catch{return null;}
}
async function openExternal(url:string){
 try{await Linking.openURL(url);}
 catch{ /* The device may not have an app to open this kind of link. */ }
}
export default function VenueDetailScreen(){
 const params=useLocalSearchParams<{id:string}>();
 const id=typeof params.id==='string'&&/^[1-9]\d*$/.test(params.id)?Number(params.id):NaN;
 const [venue,setVenue]=useState<VenueSummary|null>(null);
 const [photos,setPhotos]=useState<VenuePhoto[]>([]);
 const [conditions,setConditions]=useState<VenueSportCondition[]>([]);
 const [rating,setRating]=useState<VenueRatingSummary|null>(null);
 const [loading,setLoading]=useState(true),[extraError,setExtraError]=useState(false);
 const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{
  let active=true;setLoading(true);setError('');setVenue(null);setPhotos([]);
  setConditions([]);setRating(null);setExtraError(false);
  if(!Number.isSafeInteger(id)||id<=0){
   setError('Recinto inválido.');setLoading(false);
   return()=>{active=false;};
  }
  void (async()=>{
   try{
    const result=await venueDetails(id);
    if(!active)return;
    setVenue(result);
    // Optional supplementary APIs must not hide the core venue details on failure.
    const extras=await Promise.allSettled([
      venuePhotos(id),venueSportConditions(id),venueRatingSummary(id)
    ]);
    if(!active)return;
    if(extras[0].status==='fulfilled')setPhotos(extras[0].value);
    if(extras[1].status==='fulfilled')setConditions(extras[1].value);
    if(extras[2].status==='fulfilled')setRating(extras[2].value);
    setExtraError(extras.some(item=>item.status==='rejected'));
   }catch(e){
    if(active)setError(e instanceof Error?e.message:'Erro ao carregar o recinto.');
   }finally{if(active)setLoading(false);}
  })();
  return()=>{active=false};
 },[id]));
 const validCoordinates=venue?.latitude!=null&&venue?.longitude!=null&&
    Number.isFinite(venue.latitude)&&Number.isFinite(venue.longitude)&&
    Math.abs(venue.latitude)<=90&&Math.abs(venue.longitude)<=180;
 const mapUrl=validCoordinates&&venue?
  'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(
    String(venue.latitude)+','+String(venue.longitude)):null;
 const site=safeHttps(venue?.website);
 return <Page>
  <Brand subtitle="RECINTOS"/><DemoBanner/><Eyebrow>DETALHE DO RECINTO</Eyebrow>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {extraError?<Message>Algumas informações adicionais não estão disponíveis neste momento.</Message>:null}
  {venue?<View style={styles.card}>
   <Text style={styles.name}>{venue.name}</Text>
   <Text style={styles.meta}>{[venue.city,venue.district].filter(Boolean).join(' · ')}</Text>
   {info('Modalidades',venue.sports)}
   {info('Tipo de recinto',venue.venueType)}
   {info('Morada',venue.address)}
   {mapUrl?<Button title="Abrir localização no mapa" secondary
      onPress={()=>{void openExternal(mapUrl);}}/>:null}
   <Eyebrow>INSTALAÇÕES E SERVIÇOS</Eyebrow>
   {info('Superfície',venue.surfaceType)}
   {info('Ambiente',venue.environmentType)}
   {info('Horário',venue.openingHours)}
   {info('Preços',venue.priceInfo)}
   {info('Transportes',venue.transport)}
   {info('Serviços',venue.services)}
   {availability('Interior',venue.indoor)}
   {availability('Balneários',venue.changingRooms)}
   {availability('Chuveiros',venue.showers)}
   {availability('Casas de banho',venue.toilets)}
   {availability('Acessibilidade',venue.accessible)}
   {availability('Iluminação',venue.lighting)}
   {availability('Estacionamento',venue.parking)}
   {availability('Wi-Fi',venue.wifi)}
   <Eyebrow>CONTACTOS</Eyebrow>
   {info('Contacto',venue.contact)}
   {site?<Button title="Abrir website do recinto" secondary
     onPress={()=>{void openExternal(site);}}/>:null}
   {!venue.contact&&!site?<Text style={styles.meta}>Contactos não disponíveis.</Text>:null}
   <Eyebrow>AVALIAÇÕES</Eyebrow>
   {rating&&rating.averageScore!=null&&rating.ratingCount>=3?
     <Text style={styles.meta}>Avaliação média: {rating.averageScore.toFixed(1)}/5 · {rating.ratingCount} avaliações</Text>:
     <Text style={styles.meta}>Ainda não existem avaliações públicas suficientes.</Text>}
   <Eyebrow>FOTOGRAFIAS</Eyebrow>
   {photos.length?photos.filter(photo=>safeHttps(photo.photoUrl)).map(photo=>
    <Image key={photo.id} source={{uri:photo.photoUrl}} style={styles.photo} resizeMode="cover"/>):
    <Text style={styles.meta}>Ainda não existem fotografias disponíveis.</Text>}
   <Eyebrow>CONDIÇÕES POR MODALIDADE</Eyebrow>
   {conditions.length?conditions.map(condition=><View key={condition.id} style={styles.condition}>
    <Text style={styles.conditionTitle}>{condition.sport}</Text>
    <Text style={styles.meta}>{condition.conditions}</Text>
    {info('Fonte',condition.informationSource)}
   </View>):<Text style={styles.meta}>Sem informações adicionais por modalidade.</Text>}
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:18,padding:20,gap:14},
 name:{color:C.white,fontSize:25,fontWeight:'900'},meta:{color:C.muted,fontSize:14,lineHeight:21},
 photo:{width:'100%',height:190,borderRadius:12,backgroundColor:C.background},
 condition:{gap:5,padding:12,borderRadius:12,backgroundColor:C.background},
 conditionTitle:{color:C.white,fontSize:15,fontWeight:'800'}
});
