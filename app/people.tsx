import React,{useCallback,useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {Page,Brand,DemoBanner,Loader,Message} from '../src/components/UI';
import {discoverPeople,resolveJynloMedia} from '../src/lib/social-feed-api';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import type {FeedUserSuggestion} from '../src/lib/types';
export default function DiscoverPeople(){
  const auth=useAuth();const [people,setPeople]=useState<FeedUserSuggestion[]>([]);
  const [query,setQuery]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setPeople(await discoverPeople(auth.token));}catch{setError('Não foi possível procurar pessoas.');}finally{setLoading(false);}},[auth.token]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const filtered=useMemo(()=>people.filter(p=>(`${p.username} ${p.displayName} ${p.sport||''} ${p.city||''}`).toLowerCase().includes(query.trim().toLowerCase())),[people,query]);
  return <Page><Brand subtitle="AS TUAS PESSOAS"/><DemoBanner/>
    <Text style={styles.title}>Pessoas para conhecer</Text>
    <Text style={styles.note}>Explora desportistas da Jynlo. O acesso e os dados apresentados dependem das permissões do backend.</Text>
    <TextInput style={styles.search} placeholder="Pesquisar por nome ou modalidade…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery} accessibilityLabel="Pesquisar desportistas"/>
    {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
    {!loading&&!error&&!filtered.length?<Message>Não encontrámos pessoas para estes filtros.</Message>:null}
    {filtered.map(person=><View key={person.username} style={styles.person}>
      {resolveJynloMedia(person.photoUrl)?<Image source={{uri:resolveJynloMedia(person.photoUrl)!}} style={styles.avatar}/>:<View style={styles.avatar}><Text style={styles.initial}>{person.displayName.charAt(0).toUpperCase()}</Text></View>}
      <View style={{flex:1}}><Text style={styles.name}>{person.displayName}</Text><Text style={styles.handle}>@{person.username}</Text><Text style={styles.handle}>{[person.sport,person.city].filter(Boolean).join(' · ')}</Text></View>
    </View>)}
  </Page>;
}
const styles=StyleSheet.create({title:{fontSize:26,fontWeight:'900',color:C.white},note:{color:C.muted,fontSize:12,lineHeight:19},search:{color:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface,padding:13,minHeight:50},person:{flexDirection:'row',gap:12,padding:14,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,alignItems:'center'},avatar:{width:45,height:45,borderRadius:23,backgroundColor:'#125C6B',alignItems:'center',justifyContent:'center'},initial:{color:C.white,fontSize:20,fontWeight:'900'},name:{color:C.white,fontWeight:'900',fontSize:15},handle:{fontSize:11,color:C.muted,marginTop:3}});
