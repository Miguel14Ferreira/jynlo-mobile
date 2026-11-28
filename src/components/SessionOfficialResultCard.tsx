import React,{useCallback,useRef,useState} from 'react';
import {t} from '../lib/i18n';
import {View,Text,StyleSheet,Share,Alert} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {Button,Loader,Message} from './UI';
import {C} from '../lib/theme';
import {ApiError} from '../lib/api';
import {sessionOfficialResult} from '../lib/session-competition-api';
import type {SessionOfficialResult} from '../lib/session-competition-api';
import {publicSessionResultMessage} from '../lib/session-result-share.cjs';
import type {SessionDetail} from '../lib/types';

/** Read-only, authorization-scoped result. No private roster in this component. */
export function SessionOfficialResultCard({sessionId,token,game}:{sessionId:number;token:string|null;game?:SessionDetail}){
 const requestVersion=useRef(0);
 const [result,setResult]=useState<SessionOfficialResult|null>(null);
 const [loadedFor,setLoadedFor]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const identity=sessionId+'|'+(token||'');
 const load=useCallback(async()=>{
  const version=++requestVersion.current;
  setResult(null);setLoadedFor('');setError('');
  if(!token||!Number.isSafeInteger(sessionId)||sessionId<=0){setLoading(false);return;}
  setLoading(true);
  try{
   const response=await sessionOfficialResult(sessionId,token);
   if(version!==requestVersion.current)return;
   if(response.sessionId!==sessionId||!Number.isSafeInteger(response.roundId)||response.roundId<=0)
    throw Error(t('O resultado devolvido pelo servidor não corresponde ao jogo.'));
   setResult(response);
   setLoadedFor(identity);
  }catch(e){
   if(version!==requestVersion.current)return;
   // A missing result is normal. Never imply that a played game has a score.
   if(!(e instanceof ApiError&&e.status===404))
    setError(e instanceof Error?e.message:t('Não foi possível consultar o marcador.'));
  }finally{
   if(version===requestVersion.current)setLoading(false);
  }
 },[sessionId,token,identity]);
 useFocusEffect(useCallback(()=>{
  void load();
  return()=>{requestVersion.current++;setResult(null);setLoadedFor('');};
 },[load]));
 if(!token)return null;
 return <View style={styles.panel}>
  <Text style={styles.label}>{t('RESULTADO OFICIAL')}</Text>
  {loading?<Loader/>:null}
  {error?<Message tone="error">{error}</Message>:null}
  {result&&loadedFor===identity?<>
   <View style={styles.scoreRow}>
    <View style={styles.side}><Text style={styles.team}>{t('Equipa A')}</Text><Text maxFontSizeMultiplier={1.3} style={styles.score}>{result.scoreA??'—'}</Text></View>
    <Text style={styles.separator}>–</Text>
    <View style={styles.side}><Text style={styles.team}>{t('Equipa B')}</Text><Text maxFontSizeMultiplier={1.3} style={styles.score}>{result.scoreB??'—'}</Text></View>
   </View>
   {game&&publicSessionResultMessage(game,result,sessionId)?<Button secondary title={t('Partilhar marcador oficial')}
     onPress={()=>{
       const message=publicSessionResultMessage(game,result,sessionId);
       if(message)void Share.share({message}).catch(()=>Alert.alert(t('Partilhar resultado'),t('Não foi possível abrir a partilha.')));
     }}/>:null}
   <Text style={styles.caption}>{result.scoreA===null||result.scoreB===null?
    t('Jornada registada; o marcador oficial não foi indicado.'):
    t('Marcador confirmado na jornada da comunidade.')}</Text>
   {Array.isArray(result.contributions)&&result.contributions.length>0?<View style={styles.contributions}>
    <Text style={styles.contributionHeader}>{t('MARCADORES E ASSISTÊNCIAS')}</Text>
    {result.contributions.filter(player=>player&&typeof player.username==='string'&&
       Number.isInteger(player.goals)&&Number.isInteger(player.assists)&&
       (player.goals>0||player.assists>0)).map((player,index)=>
      <View key={player.username+'-'+index} style={styles.contributionRow}>
       <Text style={styles.player}>{t('{a} · Equipa {b}',{a:player.username,b:player.team||'?'})}</Text>
       <Text style={styles.stats}>{[
        player.goals>0?player.goals+' golos':null,
        player.assists>0?player.assists+' assistências':null
       ].filter(Boolean).join(' · ')}</Text>
      </View>)}
   </View>:null}
  </>:null}
  {!result&&!loading&&!error?<Text style={styles.caption}>{t('O resultado ainda não foi registado na classificação.')}</Text>:null}
  {error?<Button title={t('Voltar a consultar o resultado')} secondary onPress={()=>{void load();}}/>:null}
 </View>;
}
const styles=StyleSheet.create({
 panel:{padding:17,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.surface,gap:10},
 label:{fontSize:11,color:C.mint,fontWeight:'900',letterSpacing:1.1},
 scoreRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
 side:{flex:1,alignItems:'center',gap:5},
 team:{color:C.muted,fontSize:12,fontWeight:'800'},
 score:{color:C.white,fontSize:36,fontWeight:'900'},
 separator:{color:C.white,fontSize:24,fontWeight:'800'},
 caption:{color:C.muted,fontSize:12,lineHeight:19,textAlign:'center'},
 contributions:{gap:9,paddingTop:12,borderTopWidth:1,borderTopColor:C.border},contributionHeader:{color:C.mint,fontSize:11,fontWeight:'900'},contributionRow:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between',minHeight:36},player:{color:C.white,fontSize:12,fontWeight:'700',flex:1},stats:{color:C.muted,fontSize:11,fontWeight:'700'}
});
