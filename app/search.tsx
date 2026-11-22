import React,{useEffect,useRef,useState} from 'react';
import {currentLocale,t} from '../src/lib/i18n';
import {ActivityIndicator,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Message,Page} from '../src/components/UI';
import {JynloIcon,type JynloIconName} from '../src/components/JynloIcon';
import {useAuth} from '../src/lib/auth';
import {globalSearch,type GlobalSearchResults} from '../src/lib/global-search-api';
import {cleanQuery,sections} from '../src/lib/global-search-core.cjs';
import {resolveJynloMedia} from '../src/lib/social-feed-api';
import {C,MobileTheme} from '../src/lib/theme';
import {sportName} from '../src/lib/sport-names.cjs';

const when=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':
 d.toLocaleDateString(currentLocale(),{weekday:'short',day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString(currentLocale(),{hour:'2-digit',minute:'2-digit'});};

/** One search box for people, communities, teams, venues and games. */
export default function SearchScreen(){
 const auth=useAuth(),router=useRouter();
 const [query,setQuery]=useState(''),[results,setResults]=useState<GlobalSearchResults|null>(null);
 const [loading,setLoading]=useState(false);
 const version=useRef(0);
 useEffect(()=>{
  const q=cleanQuery(query);
  const request=++version.current;
  if(!q){setResults(null);setLoading(false);return;}
  setLoading(true);
  const timer=setTimeout(()=>{
   void globalSearch(q,auth.token).then(r=>{if(request===version.current)setResults(r);})
    .finally(()=>{if(request===version.current)setLoading(false);});
  },350);
  return()=>clearTimeout(timer);
 },[query,auth.token]);
 const view=results?sections({people:results.people,sessions:results.sessions,communities:results.communities,teams:results.teams,venues:results.venues}):null;
 return <Page>
  <View style={styles.box}>
   <JynloIcon name="search" size={20} color={C.muted}/>
   <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={t('Pessoas, comunidades, equipas, recintos, modalidade ou cidade…')}
    placeholderTextColor={C.muted} style={styles.input} returnKeyType="search" maxLength={80} accessibilityLabel={t('Pesquisar na Jynlo')}/>
   {loading?<ActivityIndicator color={C.mint}/>:null}
  </View>
  {!cleanQuery(query)?<Text style={styles.hint}>{t('Escreve pelo menos 2 letras. Uma modalidade («Padel») ou uma cidade («Porto») também mostra os próximos jogos.')}</Text>:null}
  {results?.failed.length?<Message tone="error">{t('Não foi possível pesquisar: {areas}.',{areas:results.failed.map(a=>t(a)).join(', ')})}</Message>:null}
  {view&&!loading&&view.total===0?<Message>{t('Nada encontrado para «{query}».',{query:cleanQuery(query)})}</Message>:null}
  {view?<>
   <Section title={t('Pessoas')} icon="profile" items={view.sections.people} render={p=><Row key={p.username} title={p.nickname||p.fullName||p.username}
    subtitle={'@'+p.username+(p.location?' · '+p.location:'')} image={p.profilePicUrl?resolveJynloMedia(p.profilePicUrl):null}
    onPress={()=>router.push({pathname:'/social/[username]',params:{username:p.username}})}/>}/>
   <Section title={t('Jogos')} icon="session" items={view.sections.sessions} render={s=><Row key={s.id} title={sportName(s.sport)+' · '+s.city}
    subtitle={when(s.gameDate)+' · '+s.participantCount+'/'+s.maxParticipants} onPress={()=>router.push({pathname:'/sessions/[id]',params:{id:String(s.id)}})}/>}/>
   <Section title={t('Comunidades')} icon="community" items={view.sections.communities} render={c=><Row key={c.id} title={c.name}
    subtitle={sportName(c.sport)||c.description||''} image={c.photoUrl?resolveJynloMedia(c.photoUrl):null}
    onPress={()=>router.push({pathname:'/communities/[id]',params:{id:String(c.id)}})}/>}/>
   <Section title={t('Equipas')} icon="championship" items={view.sections.teams} render={t=><Row key={t.id} title={t.name}
    subtitle={[sportName(t.sport),t.location].filter(Boolean).join(' · ')} onPress={()=>router.push({pathname:'/teams/[id]',params:{id:String(t.id)}})}/>}/>
   <Section title={t('Recintos')} icon="venue" items={view.sections.venues} render={v=><Row key={v.id} title={v.name}
    subtitle={v.city} onPress={()=>router.push({pathname:'/venues/[id]',params:{id:String(v.id)}})}/>}/>
  </>:null}
 </Page>;
}

function Section<T>({title,icon,items,render}:{title:string;icon:JynloIconName;items:T[];render:(item:T)=>React.ReactNode}){
 if(!items.length)return null;
 return <View style={styles.section}>
  <View style={styles.sectionHead}><JynloIcon name={icon} size={18} color={C.mint}/><Text style={styles.sectionTitle}>{title}</Text></View>
  {items.map(render)}
 </View>;
}

function Row({title,subtitle,image,onPress}:{title:string;subtitle:string;image?:string|null;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={title+(subtitle?', '+subtitle:'')} onPress={onPress} style={styles.row}>
  {image?<Image source={{uri:image}} style={styles.avatar}/>:<View style={styles.avatar}><Text style={styles.initial}>{title.slice(0,1).toUpperCase()}</Text></View>}
  <View style={{flex:1}}><Text style={styles.title} numberOfLines={1}>{title}</Text>{subtitle?<Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>:null}</View>
  <JynloIcon name="chevron-right" size={18} color={C.muted}/>
 </Pressable>;
}

const styles=StyleSheet.create({
 box:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.border,borderRadius:14,backgroundColor:C.surface,paddingHorizontal:12,minHeight:52},
 input:{flex:1,color:C.white,fontSize:15,minHeight:48},
 hint:{color:C.muted,fontSize:13,lineHeight:19},
 section:{gap:8},
 sectionHead:{flexDirection:'row',alignItems:'center',gap:8,marginTop:6},
 sectionTitle:{color:C.white,fontSize:16,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,minHeight:MobileTheme.touchTarget},
 avatar:{width:40,height:40,borderRadius:20,backgroundColor:'#125C6B',alignItems:'center',justifyContent:'center'},
 initial:{color:C.white,fontWeight:'900'},
 title:{color:C.white,fontWeight:'800',fontSize:15},
 subtitle:{color:C.muted,fontSize:12,marginTop:2},
});
