import React,{useCallback,useMemo,useRef,useState} from 'react';
import {t} from '../src/lib/i18n';
import {Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {peopleYouMayKnow,type KnownSuggestion} from '../src/lib/social-relations-api';
import {Page,DemoBanner,Loader,Message} from '../src/components/UI';
import {discoverPeople,resolveJynloMedia} from '../src/lib/social-feed-api';
import {useAuth} from '../src/lib/auth';
import {C} from '../src/lib/theme';
import type {FeedUserSuggestion} from '../src/lib/types';
import {sportName} from '../src/lib/sport-names.cjs';
export default function DiscoverPeople(){
  const auth=useAuth(),router=useRouter();const [people,setPeople]=useState<FeedUserSuggestion[]>([]);
  const [known,setKnown]=useState<KnownSuggestion[]>([]);
  const [query,setQuery]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const generation=useRef(0);
  const load=useCallback(async()=>{
    const requestId=++generation.current;
    // Clearing previous suggestions immediately prevents private results
    // from being shown after a logout or account change.
    setPeople([]);setKnown([]);setLoading(true);setError('');
    try{
      const [next,mutual]=await Promise.all([discoverPeople(auth.token),peopleYouMayKnow(auth.token).catch(()=>[] as KnownSuggestion[])]);
      if(requestId===generation.current){setPeople(next);setKnown(mutual);}
    }catch{
      if(requestId===generation.current)setError(t('Não foi possível procurar pessoas.'));
    }finally{
      if(requestId===generation.current)setLoading(false);
    }
  },[auth.token]);
  useFocusEffect(useCallback(()=>{
    void load();
    return()=>{generation.current++;setPeople([]);setKnown([]);};
  },[load]));
  // People followed by people you follow come first, with the reason, like Instagram.
  const reasons=useMemo(()=>new Map(known.map(k=>[k.username.toLowerCase(),k])),[known]);
  const merged=useMemo(()=>{
    const seen=new Set(known.map(k=>k.username.toLowerCase()));
    const first:FeedUserSuggestion[]=known.map(k=>{
      const match=people.find(p=>p.username.toLowerCase()===k.username.toLowerCase());
      return match??({username:k.username,displayName:k.nickname||k.fullName||k.username,photoUrl:k.profilePicUrl} as FeedUserSuggestion);
    });
    return [...first,...people.filter(p=>!seen.has(p.username.toLowerCase()))];
  },[known,people]);
  function reason(username:string):string|null{
    const k=reasons.get(username.toLowerCase());
    if(!k||!k.followedBy[0])return null;
    const [a,b]=k.followedBy;
    if(k.followedByCount===1)return t('Seguido por @{a}',{a});
    if(k.followedByCount===2&&b)return t('Seguido por @{a} e @{b}',{a,b});
    return t('Seguido por @{a} e mais {n}',{a,n:k.followedByCount-1});
  }
  const filtered=useMemo(()=>merged.filter(p=>(`${p.username} ${p.displayName} ${p.sport||''} ${p.city||''}`).toLowerCase().includes(query.trim().toLowerCase())),[merged,query]);
  return <Page><DemoBanner/>
    <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Pessoas para conhecer')}</Text>
    <Text style={styles.note}>{t('Descobre desportistas na Jynlo. Só vês o que cada pessoa decidiu partilhar.')}</Text>
    <TextInput style={styles.search} placeholder={t('Pesquisar por nome ou modalidade…')} placeholderTextColor={C.muted} value={query} onChangeText={setQuery} accessibilityLabel={t('Pesquisar desportistas')}/>
    {loading?<Loader/>:null}{error?<Message tone="error">{error}</Message>:null}
    {!loading&&!error&&!filtered.length?<Message>{t('Não encontrámos pessoas para estes filtros.')}</Message>:null}
    {filtered.map(person=><Pressable key={person.username} accessibilityRole="link" onPress={()=>router.push({pathname:'/social/[username]',params:{username:person.username}})} style={styles.person}>
      {resolveJynloMedia(person.photoUrl)?<Image source={{uri:resolveJynloMedia(person.photoUrl)!}} style={styles.avatar}/>:<View style={styles.avatar}><Text style={styles.initial}>{person.displayName.charAt(0).toUpperCase()}</Text></View>}
      <View style={{flex:1}}><Text style={styles.name}>{person.displayName}</Text><Text style={styles.handle}>@{person.username}</Text>{person.sport||person.city?<Text style={styles.handle}>{[sportName(person.sport),person.city].filter(Boolean).join(' · ')}</Text>:null}
        {reason(person.username)?<Text style={styles.reason}>{reason(person.username)}</Text>:null}</View>
    </Pressable>)}
  </Page>;
}
const styles=StyleSheet.create({title:{fontSize:26,fontWeight:'900',color:C.white},note:{color:C.muted,fontSize:12,lineHeight:19},search:{color:C.white,borderWidth:1,borderColor:C.border,borderRadius:12,backgroundColor:C.surface,padding:13,minHeight:50},person:{flexDirection:'row',gap:12,padding:14,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,alignItems:'center'},avatar:{width:45,height:45,borderRadius:23,backgroundColor:'#125C6B',alignItems:'center',justifyContent:'center'},initial:{color:C.white,fontSize:20,fontWeight:'900'},name:{color:C.white,fontWeight:'900',fontSize:15},handle:{fontSize:11,color:C.muted,marginTop:3},reason:{fontSize:11,color:C.mint,marginTop:3,fontWeight:'700'}});
