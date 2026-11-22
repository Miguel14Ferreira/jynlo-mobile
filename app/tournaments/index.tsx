import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {t} from '../../src/lib/i18n';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Brand,Button,DemoBanner,Eyebrow,Loader,Message,Page} from '../../src/components/UI';
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
 return <Page><Brand subtitle={t('A COMPETIÇÃO ACONTECE AQUI')}/><DemoBanner/>
  <View style={styles.intro}>
   <Eyebrow>{t('AS COMPETIÇÕES DAS TUAS COMUNIDADES')}</Eyebrow>
   <Text maxFontSizeMultiplier={1.3} style={styles.title}>{t('Torneios')}</Text>
   <Text style={styles.sub}>{t('Acompanha competições, resultados e classificações por modalidade.')}</Text>
  </View>
  {!auth.token?<Button title={t('Entrar para ver torneios')} onPress={()=>router.push('/login')}/>:null}
  {auth.token?<Button title={t('Criar torneio')} onPress={()=>router.push('/tournaments/create')}/>:null}
  {auth.token?<View style={styles.filters}>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} autoCorrect={false}
      placeholder={t('Procurar torneio, comunidade ou desporto…')} placeholderTextColor={C.muted}
      accessibilityLabel={t('Procurar torneios')}/>
    <Text style={styles.filterLabel}>{t('ESTADO DA COMPETIÇÃO')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {STATUSES.map(x=><Pressable key={x.value} accessibilityRole="button"
        accessibilityState={{selected:status===x.value}}
        onPress={()=>setStatus(x.value)} style={[styles.chip,status===x.value&&styles.selected]}>
        <Text style={[styles.chipText,status===x.value&&styles.selectedText]}>{t(x.label)}</Text>
      </Pressable>)}
    </ScrollView>
    {sports.length>1?<><Text style={styles.filterLabel}>{t('MODALIDADE')}</Text>
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
  {!loading&&!error&&auth.token&&items.length===0?<View style={styles.recovery}>
    <Message>{t('Ainda não existem torneios nas tuas comunidades. Junta-te a uma comunidade para os descobrires.')}</Message>
    <Button secondary title={t('Descobrir comunidades')} onPress={()=>router.push('/communities')}/>
  </View>:null}
  {!loading&&!error&&items.length>0?<Text style={styles.count}>{filtered.length} {filtered.length===1?t('torneio encontrado'):t('torneios encontrados')} de {items.length}</Text>:null}
  {!loading&&!error&&items.length>0&&filtered.length===0?<View style={styles.recovery}>
    <Message>{t('Não existem torneios com estes filtros. Experimenta outra modalidade ou estado.')}</Message>
    <Button secondary title={t('Limpar filtros')} onPress={()=>{setQuery('');setStatus('ALL');setSport('ALL');}}/>
  </View>:null}
  {!loading&&!error?filtered.map(x=><Pressable accessibilityRole="button" accessibilityLabel={t('Abrir torneio {v}',{v:x.tournament.name})} key={`${x.communityId}-${x.tournament.id}`}
    onPress={()=>router.push({pathname:'/tournaments/[communityId]/[id]',params:{communityId:String(x.communityId),id:String(x.tournament.id)}})}
    style={styles.card}>
    <View style={styles.row}>
      <View style={styles.sportMark}><Text maxFontSizeMultiplier={1.3} style={styles.sport}>{sportIcon(x.tournament.sport)}</Text></View>
      <View style={styles.cardCopy}><Text numberOfLines={2} style={styles.name}>{x.tournament.name}</Text>
       <Text numberOfLines={1} style={styles.sub}>{x.communityName}</Text></View>
      <Text maxFontSizeMultiplier={1.3} style={styles.arrow}>›</Text>
    </View>
    <View style={styles.cardMeta}>
      <Text style={styles.classification}>{label(classificationKind(x.tournament))}</Text>
      <Text style={[styles.status,x.tournament.status==='IN_PROGRESS'&&styles.statusActive]}>{x.tournament.status==='DRAFT'?t('Em preparação'):x.tournament.status==='IN_PROGRESS'?t('A decorrer'):t('Concluído')}</Text>
    </View>
    <Text style={styles.sportDetail}>{sportName(x.tournament.sport)}</Text>
  </Pressable>):null}
  {auth.token&&items.length>0?<Message>{t('As classificações respeitam as regras disponíveis para cada modalidade. Algumas provas podem ter funcionalidades limitadas no mobile.')}</Message>:null}
 </Page>;
}
const styles=StyleSheet.create({recovery:{gap:10},intro:{gap:7,paddingVertical:4},title:{fontSize:28,fontWeight:'900',color:C.white,letterSpacing:-0.5},sub:{fontSize:13,lineHeight:20,color:'#B6D8DC'},
 card:{backgroundColor:'#092D3A',borderColor:'#3BC3AF52',borderWidth:1,borderRadius:18,padding:17,gap:13,minWidth:0},
 row:{flexDirection:'row',alignItems:'center',gap:12},sportMark:{width:53,height:53,borderRadius:15,backgroundColor:'#114C54',borderColor:'#48DBBD55',borderWidth:1,alignItems:'center',justifyContent:'center'},sport:{fontSize:26},cardCopy:{flex:1,minWidth:0,gap:4},name:{fontSize:17,fontWeight:'900',color:C.white,lineHeight:22},arrow:{fontSize:28,color:C.mint},
 cardMeta:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:11,borderTopWidth:1,borderTopColor:'#3CB4A53A'},
 classification:{color:'#9AF7DF',fontWeight:'800',fontSize:12,flexShrink:1},status:{color:'#C4DDE0',backgroundColor:'#17414B',borderRadius:20,paddingHorizontal:10,paddingVertical:6,fontWeight:'800',fontSize:11,overflow:'hidden'},statusActive:{color:'#072D2C',backgroundColor:'#5BE7C0'},sportDetail:{color:'#93BDC6',fontSize:12,fontWeight:'700'},
 filters:{gap:10,marginTop:6},
 search:{minHeight:52,paddingHorizontal:15,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,color:C.white,borderRadius:16,fontSize:14},
 filterLabel:{color:C.muted,fontWeight:'800',fontSize:12,letterSpacing:1.1},
 chips:{gap:9,paddingVertical:3},
 chip:{minHeight:44,justifyContent:'center',paddingHorizontal:14,paddingVertical:10,borderRadius:24,borderWidth:1,borderColor:C.border,backgroundColor:C.surface},
 selected:{backgroundColor:C.mint,borderColor:C.mint},
 chipText:{fontSize:13,fontWeight:'800',color:C.white},selectedText:{color:C.background},
 count:{fontSize:12,fontWeight:'800',color:C.muted}
});
