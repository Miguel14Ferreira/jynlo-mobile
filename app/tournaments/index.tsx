import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Stack,useFocusEffect,useRouter} from 'expo-router';
import {Button,DemoBanner,Loader,Message,Page} from '../../src/components/UI';
import {useAuth} from '../../src/lib/auth';
import {myTournaments} from '../../src/lib/competition-api';
import {classificationKind,label} from '../../src/lib/competition-core.cjs';
import {STATUSES,availableSports,filterTournaments,sportIcon} from '../../src/lib/tournament-discovery-core.cjs';
import {C} from '../../src/lib/theme';
import type {JynloTournament} from '../../src/lib/types';
import {sportName} from '../../src/lib/sport-names.cjs';
type Entry={communityId:number;communityName:string;tournament:JynloTournament};
export default function TournamentsScreen(){
 const auth=useAuth(),router=useRouter();const [items,setItems]=useState<Entry[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const requestVersion=useRef(0);
 const [query,setQuery]=useState(''),[status,setStatus]=useState('ALL'),[sport,setSport]=useState('ALL');
 // Invalidate old account data before showing a new authenticated tournament list.
 useEffect(()=>{requestVersion.current++;setItems([]);setError('');setLoading(true);},[auth.token,auth.username]);
 const load=useCallback(async()=>{
   const version=++requestVersion.current;
   if(!auth.token||!auth.username){setItems([]);setLoading(false);return;}
   setLoading(true);setError('');
   try{
     const next=await myTournaments(auth.token,auth.username);
     if(version===requestVersion.current)setItems(next);
   }catch(e){
     if(version===requestVersion.current){
       setItems([]);setError(e instanceof Error?e.message:t('Não foi possível carregar os torneios.'));
     }
   }finally{if(version===requestVersion.current)setLoading(false);}
 },[auth.token,auth.username]);
 useFocusEffect(useCallback(()=>{void load();return()=>{requestVersion.current++;};},[load]));
 const sports=useMemo(()=>availableSports(items),[items]);
 const filtered=useMemo(()=>filterTournaments(items,{query,status,sport}),[items,query,status,sport]);
 return <Page>
  {/* Creating goes in the title bar, so the list starts right away. */}
  <Stack.Screen options={{headerRight:auth.token?()=><Pressable accessibilityRole="button" accessibilityLabel={t('Criar torneio')}
    onPress={()=>router.push('/tournaments/create')} hitSlop={8} style={styles.headerAction}>
    <Text style={styles.headerActionText}>＋ {t('Criar')}</Text></Pressable>:undefined}}/>
  <DemoBanner/>
  {!auth.token?<Button title={t('Entrar para ver torneios')} onPress={()=>router.push('/login')}/>:null}
  {auth.token&&items.length>0?<View style={styles.filters}>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} autoCorrect={false}
      placeholder={t('Procurar torneios')} placeholderTextColor={C.muted} returnKeyType="search" clearButtonMode="while-editing"
      accessibilityLabel={t('Procurar torneios')}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {STATUSES.map(x=><Pressable key={x.value} accessibilityRole="button"
        accessibilityState={{selected:status===x.value}}
        onPress={()=>setStatus(x.value)} style={[styles.chip,status===x.value&&styles.selected]}>
        <Text style={[styles.chipText,status===x.value&&styles.selectedText]}>{t(x.label)}</Text>
      </Pressable>)}
    </ScrollView>
    {sports.length>1?<>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {['ALL',...sports].map(value=><Pressable key={value} accessibilityRole="button"
          accessibilityState={{selected:sport===value}}
          onPress={()=>setSport(value)} style={[styles.chip,sport===value&&styles.selected]}>
          <Text style={[styles.chipText,sport===value&&styles.selectedText]}>{value==='ALL'?t('Todas'):value}</Text>
        </Pressable>)}
      </ScrollView></>:null}
  </View>:null}
  {loading?<Loader/>:null}
  {error?<View style={styles.recovery}><Message tone="error">{error}</Message>
    <Button secondary title={t('Tentar novamente')} onPress={()=>{void load();}}/>
  </View>:null}
  {!loading&&!error&&auth.token&&items.length===0?<View style={styles.empty}>
    <Text maxFontSizeMultiplier={1.3} style={styles.emptyIcon}>🏆</Text>
    <Text style={styles.emptyTitle}>{t('Ainda não há torneios')}</Text>
    <Text style={styles.emptyText}>{t('Os torneios das tuas comunidades aparecem aqui. Cria um ou junta-te a uma comunidade.')}</Text>
    <View style={styles.emptyActions}>
     <Button title={t('Criar torneio')} onPress={()=>router.push('/tournaments/create')}/>
     <Button secondary title={t('Descobrir comunidades')} onPress={()=>router.push('/communities')}/>
    </View>
  </View>:null}
  {!loading&&!error&&items.length>0&&filtered.length===0?<View style={styles.empty}>
    <Text style={styles.emptyTitle}>{t('Nenhum torneio com estes filtros')}</Text>
    <Button secondary title={t('Limpar filtros')} onPress={()=>{setQuery('');setStatus('ALL');setSport('ALL');}}/>
  </View>:null}
  {!loading&&!error?filtered.map(x=><Pressable accessibilityRole="button" accessibilityLabel={t('Abrir torneio {v}',{v:x.tournament.name})} key={`${x.communityId}-${x.tournament.id}`}
    onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(x.communityId),id:String(x.tournament.id)}})}
    style={styles.card}>
    <View style={styles.row}>
      <View style={styles.sportMark}><Text maxFontSizeMultiplier={1.3} style={styles.sport}>{sportIcon(x.tournament.sport)}</Text></View>
      <View style={styles.cardCopy}><Text numberOfLines={2} style={styles.name}>{x.tournament.name}</Text>
       <Text numberOfLines={1} style={styles.sub}>{x.communityName} · {sportName(x.tournament.sport)}</Text></View>
      <Text maxFontSizeMultiplier={1.3} style={styles.arrow}>›</Text>
    </View>
    <View style={styles.cardMeta}>
      <Text style={styles.classification}>{label(classificationKind(x.tournament))}</Text>
      <Text style={[styles.status,x.tournament.status==='IN_PROGRESS'&&styles.statusActive]}>{x.tournament.status==='DRAFT'?t('Em preparação'):x.tournament.status==='IN_PROGRESS'?t('A decorrer'):t('Concluído')}</Text>
    </View>
  </Pressable>):null}
 </Page>;
}
const styles=StyleSheet.create({recovery:{gap:10},sub:{fontSize:13,lineHeight:18,color:'#B6D8DC'},
 headerAction:{minHeight:44,paddingHorizontal:8,justifyContent:'center'},headerActionText:{color:C.mint,fontWeight:'900',fontSize:15},
 empty:{alignItems:'center',gap:8,paddingVertical:24,paddingHorizontal:8},emptyIcon:{fontSize:36},
 emptyTitle:{color:C.white,fontWeight:'900',fontSize:17,textAlign:'center'},emptyText:{color:C.muted,fontSize:14,lineHeight:20,textAlign:'center'},
 emptyActions:{alignSelf:'stretch',gap:10,marginTop:6},
 card:{backgroundColor:'#092D3A',borderColor:'#3BC3AF52',borderWidth:1,borderRadius:16,padding:13,gap:10,minWidth:0},
 row:{flexDirection:'row',alignItems:'center',gap:12},sportMark:{width:44,height:44,borderRadius:13,backgroundColor:'#114C54',borderColor:'#48DBBD55',borderWidth:1,alignItems:'center',justifyContent:'center'},sport:{fontSize:22},cardCopy:{flex:1,minWidth:0,gap:4},name:{fontSize:16,fontWeight:'900',color:C.white,lineHeight:22},arrow:{fontSize:28,color:C.mint},
 cardMeta:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:11,borderTopWidth:1,borderTopColor:'#3CB4A53A'},
 classification:{color:'#9AF7DF',fontWeight:'800',fontSize:12,flexShrink:1},status:{color:'#C4DDE0',backgroundColor:'#17414B',borderRadius:20,paddingHorizontal:10,paddingVertical:6,fontWeight:'800',fontSize:11,overflow:'hidden'},statusActive:{color:'#072D2C',backgroundColor:'#5BE7C0'},sportDetail:{color:'#93BDC6',fontSize:12,fontWeight:'700'},
 filters:{gap:8},
 search:{minHeight:44,paddingHorizontal:14,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,color:C.white,borderRadius:22,fontSize:14},
 filterLabel:{color:C.muted,fontWeight:'800',fontSize:12,letterSpacing:1.1},
 chips:{gap:8,paddingVertical:2,paddingRight:16},
 chip:{minHeight:44,justifyContent:'center',paddingHorizontal:14,paddingVertical:8,borderRadius:22,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 selected:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{fontSize:13,fontWeight:'800',color:C.white},selectedText:{color:C.background},
 count:{fontSize:12,fontWeight:'800',color:C.muted}
});
