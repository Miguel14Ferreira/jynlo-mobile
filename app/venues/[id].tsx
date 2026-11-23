import React,{useCallback,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Image,Linking,StyleSheet,Text,View} from 'react-native';
import type {ImagePickerAsset} from 'expo-image-picker';
import {useLocalSearchParams,useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {venueDetails,venuePhotos,venueRatingSummary,venueSportConditions} from '../../src/lib/parity-api';
import {C} from '../../src/lib/theme';
import {DEMO_MODE} from '../../src/lib/api';
import {useAuth} from '../../src/lib/auth';
import {uploadVenuePhoto} from '../../src/lib/venue-photo-upload';
import type {VenuePhoto,VenueRatingSummary,VenueSportCondition,VenueSummary} from '../../src/lib/types';
import {sportName,sportNames,surfaceName,venueTypeName} from '../../src/lib/sport-names.cjs';
import {venueBookingAction} from '../../src/lib/venue-booking.cjs';
import VenueJynloBooking from '../../src/components/VenueJynloBooking';

const info=(label:string,value:unknown)=>{
 if(typeof value!=='string'||!value.trim())return null;
 return <View style={styles.infoRow} accessibilityLabel={t(label)+': '+value.trim()}>
  <Text style={styles.infoLabel}>{t(label)}</Text>
  <Text style={styles.infoValue}>{value.trim()}</Text>
 </View>;
};
const availability=(label:string,value:boolean|null|undefined)=>{
 if(value==null)return null;
 return <View style={styles.infoRow} accessibilityLabel={t(label)+': '+(value?t('Sim'):t('Não'))}>
  <Text style={styles.infoLabel}>{t(label)}</Text>
  <Text style={styles.infoValue}>{value?t('Sim'):t('Não')}</Text>
 </View>;
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
 const auth=useAuth();
 const router=useRouter();
 const params=useLocalSearchParams<{id:string;session?:string}>();
 const bookingSession=typeof params.session==='string'&&/^[1-9]\d*$/.test(params.session)?Number(params.session):null;
 const id=typeof params.id==='string'&&/^[1-9]\d*$/.test(params.id)?Number(params.id):NaN;
 const [venue,setVenue]=useState<VenueSummary|null>(null);
 const [photos,setPhotos]=useState<VenuePhoto[]>([]);
 const [conditions,setConditions]=useState<VenueSportCondition[]>([]);
 const [rating,setRating]=useState<VenueRatingSummary|null>(null);
 const [loading,setLoading]=useState(true),[extraError,setExtraError]=useState(false);
 const [error,setError]=useState('');
 const [selectedPhoto,setSelectedPhoto]=useState<ImagePickerAsset|null>(null);
 const [sendingPhoto,setSendingPhoto]=useState(false),[photoMessage,setPhotoMessage]=useState('');
 useFocusEffect(useCallback(()=>{
  let active=true;setLoading(true);setError('');setVenue(null);setPhotos([]);
  setSelectedPhoto(null);setPhotoMessage('');
  setConditions([]);setRating(null);setExtraError(false);
  if(!Number.isSafeInteger(id)||id<=0){
   setError(t('Recinto inválido.'));setLoading(false);
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
    if(active)setError(e instanceof Error?e.message:t('Erro ao carregar o recinto.'));
   }finally{if(active)setLoading(false);}
  })();
  return()=>{active=false};
 },[id]));
 async function choosePhoto(){
  if(!auth.token||DEMO_MODE||sendingPhoto)return;
  setPhotoMessage('');
  try{
   // Defer native gallery initialization until an authenticated user requests it.
   const ImagePicker=await import('expo-image-picker');
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,
    aspect:[4,3],quality:0.75,exif:false,base64:false});
   if(!result.canceled&&result.assets?.[0])setSelectedPhoto(result.assets[0]);
  }catch{setPhotoMessage(t('Não foi possível abrir a galeria.'));}
 }
 async function submitPhoto(){
  if(!auth.token||DEMO_MODE||!selectedPhoto||sendingPhoto||!Number.isSafeInteger(id)||id<=0)return;
  setSendingPhoto(true);setPhotoMessage('');
  try{
   await uploadVenuePhoto(id,auth.token,selectedPhoto);
   setSelectedPhoto(null);
   // Refresh authoritative gallery rather than synthesising an image entry.
   try{setPhotos(await venuePhotos(id));setPhotoMessage(t('Fotografia enviada com sucesso.'));}
   catch{setPhotoMessage(t('Fotografia recebida. Reabre o recinto para atualizar a galeria.'));}
  }catch(e){setPhotoMessage(e instanceof Error?e.message:t('Não foi possível confirmar o envio.'));}
  finally{setSendingPhoto(false);}
 }
 const validCoordinates=venue?.latitude!=null&&venue?.longitude!=null&&
    Number.isFinite(venue.latitude)&&Number.isFinite(venue.longitude)&&
    Math.abs(venue.latitude)<=90&&Math.abs(venue.longitude)<=180;
 const mapUrl=validCoordinates&&venue?
  'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(
    String(venue.latitude)+','+String(venue.longitude)):null;
 const site=safeHttps(venue?.website);
 const booking=venueBookingAction(venue);
 return <Page>
  <DemoBanner/><Eyebrow>{t('DETALHE DO RECINTO')}</Eyebrow>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {extraError?<Message>{t('Algumas informações adicionais não estão disponíveis neste momento.')}</Message>:null}
  {venue?<View style={styles.card}>
   <Text style={styles.name}>{venue.name}</Text>
   <Text style={styles.meta}>{[venue.city,venue.district].filter(Boolean).join(' · ')}</Text>
   {booking?.kind==='free'?<Text style={styles.free}>✓ {t('Acesso livre · não precisa de reserva')}</Text>:null}
   {booking?.kind==='link'?<Button title={t('Reservar campo')+' ↗'} onPress={()=>{void openExternal(booking.url);}}/>:null}
   {booking?.kind==='phone'?<View style={styles.bookRow}>
    <Button title={'📞 '+t('Ligar para reservar')} onPress={()=>{void openExternal(booking.url);}}/>
    {booking.whatsapp?<Button title={t('WhatsApp')} secondary onPress={()=>{void openExternal(booking.whatsapp!);}}/>:null}
   </View>:null}
   {booking?.kind==='search'?<Button title={'🔎 '+t('Procurar como reservar')} secondary onPress={()=>{void openExternal(booking.url);}}/>:null}
   {booking&&booking.kind!=='link'&&booking.kind!=='free'&&auth.token?<Button title={t('Sugerir link de reserva')} secondary
    onPress={()=>router.push({pathname:'/venues/[id]/suggest-edit',params:{id:String(id),field:'bookingUrl'}})}/>:null}
   {!DEMO_MODE?<VenueJynloBooking venueId={id} token={auth.token} sessionId={bookingSession}/>:null}
   {info('Modalidades',sportNames(venue.sports))}
   {info(t('Tipo de recinto'),venueTypeName(venue.venueType))}
   {info('Morada',venue.address)}
   {mapUrl?<Button title={t('Abrir localização no mapa')} secondary
      onPress={()=>{void openExternal(mapUrl);}}/>:null}
   <Eyebrow>{t('INSTALAÇÕES E SERVIÇOS')}</Eyebrow>
   {info('Superfície',surfaceName(venue.surfaceType))}
   {info('Ambiente',venue.environmentType)}
   {info('Horário',venue.openingHours)}
   {info('Preços',venue.priceInfo)}
   {info('Transportes',venue.transport)}
   {info('Serviços',venue.services)}
   {availability('Interior',venue.indoor)}
   {availability('Balneários',venue.changingRooms)}
   {availability('Chuveiros',venue.showers)}
   {availability(t('Casas de banho'),venue.toilets)}
   {availability('Acessibilidade',venue.accessible)}
   {availability('Iluminação',venue.lighting)}
   {availability('Estacionamento',venue.parking)}
   {availability('Wi-Fi',venue.wifi)}
   <Eyebrow>{t('CONTACTOS')}</Eyebrow>
   {info('Contacto',venue.contact)}
   {site?<Button title={t('Abrir website do recinto')} secondary
     onPress={()=>{void openExternal(site);}}/>:null}
   {!venue.contact&&!site?<Text style={styles.meta}>{t('Contactos não disponíveis.')}</Text>:null}
   <Eyebrow>{t('AJUDAR A MELHORAR ESTE RECINTO')}</Eyebrow>
   <Button title={t('Sugerir correção das informações')} secondary
    onPress={()=>router.push({pathname:'/venues/[id]/suggest-edit',params:{id:String(id)}})}/>
   <Eyebrow>{t('AVALIAÇÕES')}</Eyebrow>
   {rating&&rating.averageScore!=null&&rating.ratingCount>=3?
     <Text style={styles.meta}>{t('Avaliação média: {a}/5 · {b} avaliações',{a:rating.averageScore.toFixed(1),b:rating.ratingCount})}</Text>:
     <Text style={styles.meta}>{t('Ainda não existem avaliações públicas suficientes.')}</Text>}
   <Eyebrow>{t('FOTOGRAFIAS')}</Eyebrow>
   {photos.length?photos.filter(photo=>safeHttps(photo.photoUrl)).map(photo=>
    <Image key={photo.id} source={{uri:photo.photoUrl}} style={styles.photo} resizeMode="cover"/>):
    <Text style={styles.meta}>{t('Ainda não existem fotografias disponíveis.')}</Text>}
   <Message>{t('O envio de novas fotografias está temporariamente suspenso até existir um processo de aprovação das contribuições.')}</Message>
   <Eyebrow>{t('CONDIÇÕES POR MODALIDADE')}</Eyebrow>
   {conditions.length?conditions.map(condition=><View key={condition.id} style={styles.condition}>
    <Text style={styles.conditionTitle}>{sportName(condition.sport)}</Text>
    <Text style={styles.meta}>{condition.conditions}</Text>
    {info('Fonte',condition.informationSource)}
   </View>):<Text style={styles.meta}>{t('Sem informações adicionais por modalidade.')}</Text>}
  </View>:null}
 </Page>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:18,padding:16,gap:12},
 name:{color:C.white,fontSize:25,fontWeight:'900',lineHeight:32},
 meta:{color:C.muted,fontSize:15,lineHeight:22},
 infoRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',gap:8,paddingVertical:3},
 infoLabel:{minWidth:110,maxWidth:'43%',color:C.muted,fontSize:14,fontWeight:'700',lineHeight:22},
 infoValue:{flexGrow:1,flexShrink:1,flexBasis:155,color:C.white,fontSize:15,fontWeight:'600',lineHeight:23},
 photo:{width:'100%',height:190,borderRadius:12,backgroundColor:C.background},
 condition:{gap:5,padding:12,borderRadius:12,backgroundColor:C.background},
 conditionTitle:{color:C.white,fontSize:15,fontWeight:'800'},
 photoControls:{gap:10},
 bookRow:{gap:8},
 free:{alignSelf:'flex-start',paddingVertical:6,paddingHorizontal:12,borderRadius:999,backgroundColor:'rgba(94,230,200,0.14)',color:'#7ae5c5',fontWeight:'800',fontSize:14,overflow:'hidden'}
});
