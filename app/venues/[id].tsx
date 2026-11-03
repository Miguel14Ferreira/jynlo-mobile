import React,{useCallback,useState} from 'react';
import {Linking,StyleSheet,Text,View} from 'react-native';
import {useLocalSearchParams,useFocusEffect} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {venueDetails} from '../../src/lib/parity-api';
import {C} from '../../src/lib/theme';
import type {VenueSummary} from '../../src/lib/types';
export default function VenueDetailScreen(){
 const params=useLocalSearchParams<{id:string}>();const id=Number(params.id);
 const [venue,setVenue]=useState<VenueSummary|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{let active=true;setLoading(true);setError('');setVenue(null);
  void venueDetails(id).then(v=>{if(active)setVenue(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Erro ao carregar recinto.');}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};},[id]));
 return <Page><Brand subtitle="RECINTOS"/><DemoBanner/><Eyebrow>DETALHE DO RECINTO</Eyebrow>
 {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
 {venue?<View style={styles.card}><Text style={styles.name}>{venue.name}</Text>
 <Text style={styles.meta}>{venue.city}</Text><Text style={styles.meta}>{venue.sports||'Modalidades não indicadas'}</Text>
 <Text style={styles.meta}>{venue.address||'Morada não disponível'}</Text>
 {venue.latitude!=null&&venue.longitude!=null?<Button title="Abrir localização no mapa" onPress={()=>{void Linking.openURL('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(`${venue.latitude},${venue.longitude}`))}}/>:null}
 </View>:null}</Page>
}
const styles=StyleSheet.create({card:{backgroundColor:C.surface,borderColor:C.border,borderWidth:1,borderRadius:18,padding:20,gap:14},name:{color:C.white,fontSize:25,fontWeight:'900'},meta:{color:C.muted,fontSize:14,lineHeight:21}});
