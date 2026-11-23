import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
import {CommunityCard} from '../../src/components/CommunityUI';
import {DEMO_MODE} from '../../src/lib/api';
import {myCommunities,searchCommunities} from '../../src/lib/community-api';
import {useAuth} from '../../src/lib/auth';
import {C,MobileTheme} from '../../src/lib/theme';
import {SPORTS} from '../../src/lib/sports';
import type {CommunityGroup,CommunitySummary} from '../../src/lib/types';
import {sportMatches} from '../../src/lib/sport-names.cjs';

type Mode='mine'|'explore';
export default function CommunitiesScreen(){
  const auth=useAuth();const router=useRouter();
  const [mode,setMode]=useState<Mode>('mine');const [term,setTerm]=useState('');
  const [debouncedTerm,setDebouncedTerm]=useState('');
  const requestVersion=useRef(0);
  const [sportSearch,setSportSearch]=useState(''),[sportFilter,setSportFilter]=useState('');
  const [mine,setMine]=useState<CommunityGroup[]>([]);const [results,setResults]=useState<CommunitySummary[]>([]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const sportQuery=sportSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const suggestions=sportQuery?SPORTS.filter(s=>sportMatches(s,sportQuery)).slice(0,8):[];
  useEffect(()=>{const timer=setTimeout(()=>setDebouncedTerm(term.trim()),350);return()=>clearTimeout(timer);},[term]);
  const load=useCallback(async()=>{
    const request=++requestVersion.current;
    setError('');setLoading(true);
    try{
      if(mode==='mine'){
        const data=auth.token&&auth.username?await myCommunities(auth.token,auth.username):[];
        if(request===requestVersion.current)setMine(data);
      }else{
        const data=(await searchCommunities(debouncedTerm,sportFilter)).communities;
        if(request===requestVersion.current)setResults(data);
      }
    }catch(e){
      if(request===requestVersion.current)setError(e instanceof Error?e.message:t('Não foi possível carregar as comunidades.'));
    }finally{
      if(request===requestVersion.current)setLoading(false);
    }
  },[mode,debouncedTerm,sportFilter,auth.token,auth.username]);
  useFocusEffect(useCallback(()=>{void load();return()=>{requestVersion.current++;};},[load]));
  const list=mode==='mine'?mine:results;
  const open=(id:number)=>router.push({pathname:'/communities/[id]',params:{id:String(id)}});
  return <Page>
    <Brand subtitle={t('ENCONTRA AS TUAS PESSOAS')}/><DemoBanner/>
    <View style={styles.hero}>
      <Eyebrow>{t('JUNTOS É OUTRO JOGO')}</Eyebrow>
      <Text maxFontSizeMultiplier={1.3} style={styles.headline}>{t('A tua malta.')}{"\n"}<Text style={{color:C.mint}}>{t('A tua comunidade.')}</Text></Text>
      <Text style={styles.sub}>{t('De uma sessão podem nascer amizades, equipas e grandes desafios.')}</Text>
      <Text style={styles.sub}>{t('Jogos, ligas e torneios individuais ou por equipas. Tens o histórico num Excel? Importa-o.')}</Text>
    </View>
    <View style={styles.actions}>
      <View style={{flex:1}}><Button title={t('+ Criar comunidade')} onPress={()=>auth.token?router.push('/communities/create'):router.push({pathname:'/login',params:{redirect:'/communities/create'}})}/></View>
      <Pressable accessibilityRole="button" onPress={()=>auth.token?router.push('/communities/invites'):router.push('/login')}
        style={styles.inbox}><Text style={styles.inboxIcon}>✉</Text><Text style={styles.inboxLabel}>{t('Convites')}</Text></Pressable>
    </View>
    <View style={styles.segment}>
      {(['mine','explore'] as const).map(tab=><Pressable key={tab} onPress={()=>setMode(tab)}
        accessibilityRole="tab" accessibilityState={{selected:mode===tab}}
        style={[styles.segmentTab,mode===tab&&styles.segmentActive]}>
        <Text style={[styles.segmentText,mode===tab&&{color:C.background}]}>{tab==='mine'?t('As minhas'):t('Explorar')}</Text>
      </Pressable>)}
    </View>
    {mode==='explore'?<View style={styles.filters}>
      <TextInput style={styles.input} value={term} onChangeText={setTerm}
        placeholder={t('Pesquisar comunidades…')} placeholderTextColor={C.muted} autoCapitalize="none" accessibilityLabel={t('Pesquisar comunidades')}/>
      <TextInput style={styles.input} value={sportSearch} onChangeText={setSportSearch}
        placeholder={t('Filtrar por modalidade…')} placeholderTextColor={C.muted} autoCapitalize="none"
        accessibilityLabel={t('Pesquisar modalidades das comunidades')}/>
      {(term.trim()||sportFilter)?<Pressable accessibilityRole="button" accessibilityLabel={t('Limpar filtros das comunidades')} onPress={()=>{setTerm('');setDebouncedTerm('');setSportFilter('');setSportSearch('');}} style={styles.resetFilters}><Text style={styles.resetFiltersText}>{t('Limpar filtros  ×')}</Text></Pressable>:null}
      {sportFilter?<Pressable accessibilityRole="button" onPress={()=>{setSportFilter('');setSportSearch('');}}>
        <Text style={styles.selectedFilter}>{t('Modalidade: {a}  × Limpar',{a:sportFilter})}</Text>
      </Pressable>:null}
      {suggestions.map(s=><Pressable key={s} accessibilityRole="button" accessibilityLabel={t('Filtrar por {v}',{v:s})}
        onPress={()=>{setSportFilter(s);setSportSearch('');}} style={styles.suggestion}>
        <Text style={styles.suggestionText}>{s}  +</Text>
      </Pressable>)}
    </View>:null}
    {mode==='mine'&&!auth.token?<Message>{t('Inicia sessão para veres as comunidades de que fazes parte. Podes explorar comunidades públicas mesmo sem conta.')}</Message>:null}
    {!loading&&!error?<View style={styles.resultHeader}><Text style={styles.resultTitle}>{mode==='mine'?t('As tuas comunidades'):t('Descobrir comunidades')}</Text><Text style={styles.resultCount}>{list.length===1?t('1 comunidade'):t('{n} comunidades',{n:list.length})}</Text></View>:null}
    {loading?<Loader/>:null}
    {error?<Message tone="error">{error}</Message>:null}
    {!loading&&!error&&list.length===0?<View style={styles.empty}>
      <Text maxFontSizeMultiplier={1.3} style={styles.emptyEmoji}>{mode==='mine'?'🤝':'⌕'}</Text>
      <Text style={styles.emptyTitle}>{mode==='mine'?t('Ainda não tens comunidades'):t('Não encontrámos comunidades')}</Text>
      <Text style={styles.sub}>{mode==='mine'?t('Cria a tua primeira comunidade ou explora as existentes.'):t('Experimenta outro nome ou pesquisa novamente.')}</Text>
      {mode==='mine'?<Button title={t('Explorar comunidades')} secondary onPress={()=>setMode('explore')}/>:<Button title={t('Limpar pesquisa')} secondary onPress={()=>{setTerm('');setDebouncedTerm('');setSportFilter('');setSportSearch('');}}/>}
    </View>:null}
    {list.map(item=><CommunityCard key={item.id} community={item}
      memberCount={'memberCount' in item?(item as CommunityGroup).memberCount:undefined}
      role={'myRole' in item?(item as CommunityGroup).myRole:null} onPress={()=>open(item.id)}/>)}
    {DEMO_MODE?<Text style={styles.note}>{t('Demonstração: cria uma comunidade, termina sessão e entra como André para aceitares o convite.')}</Text>:null}
  </Page>;
}
const styles=StyleSheet.create({
  hero:{gap:12},headline:{fontSize:30,lineHeight:37,color:C.white,fontWeight:'900'},sub:{color:C.muted,fontSize:14,lineHeight:21},
  actions:{flexDirection:'row',alignItems:'stretch',gap:10},inbox:{minWidth:80,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:17,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:11},
  inboxIcon:{fontSize:22,color:C.mint},inboxLabel:{fontSize:12,color:C.white,fontWeight:'800'},
  segment:{flexDirection:'row',padding:5,borderRadius:MobileTheme.radius.lg,backgroundColor:MobileTheme.colors.surface,gap:4},segmentTab:{flex:1,alignItems:'center',justifyContent:'center',minHeight:44,paddingVertical:10,borderRadius:11},
  segmentActive:{backgroundColor:C.mint},segmentText:{color:C.white,fontSize:13,fontWeight:'800'},
  input:{backgroundColor:MobileTheme.colors.surface,borderColor:MobileTheme.colors.border,borderWidth:1,color:MobileTheme.colors.text,minHeight:52,borderRadius:MobileTheme.radius.md,paddingHorizontal:15},
  filters:{gap:10},resetFilters:{alignSelf:'flex-start',minHeight:MobileTheme.touchTarget,justifyContent:'center',borderColor:MobileTheme.colors.border,borderWidth:1,borderRadius:MobileTheme.radius.pill,paddingHorizontal:13},resetFiltersText:{color:MobileTheme.colors.accent,fontSize:12,fontWeight:'800'},resultHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:9},resultTitle:{fontSize:17,fontWeight:'900',color:MobileTheme.colors.text},resultCount:{fontSize:13,color:MobileTheme.colors.muted},selectedFilter:{color:C.mint,fontSize:13,fontWeight:'800'},
  suggestion:{padding:12,borderRadius:11,backgroundColor:C.surface2},suggestionText:{color:C.white,fontSize:13,fontWeight:'700'},
  empty:{alignItems:'center',padding:23,backgroundColor:C.surface,borderRadius:22,gap:13},emptyEmoji:{fontSize:42},emptyTitle:{fontSize:18,color:C.white,fontWeight:'800'},
  note:{color:C.muted,fontSize:13,lineHeight:20,textAlign:'center'}
});
