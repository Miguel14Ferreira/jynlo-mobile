import React from 'react';
import {t} from '../lib/i18n';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {TournamentTeamMatch} from '../lib/types';
import {matchRound,matchScore} from '../lib/tournament-fixtures-core.cjs';
import {C} from '../lib/theme';
export function TournamentMatchCard({match,onTeamPress}:{match:TournamentTeamMatch;onTeamPress?:(teamId:number)=>void}){
 const names=[{id:match.homeTeamId,name:match.homeTeamName},{id:match.awayTeamId,name:match.awayTeamName}];
 return <View style={styles.match}>
   <View style={styles.row}><Text style={styles.label}>{matchRound(match)}</Text><Text style={styles.status}>{match.status==='COMPLETED'?t('Terminado'):t('Por disputar')}</Text></View>
   <View style={styles.row}><View style={{flex:1,gap:10}}>{names.map(t=><Pressable key={t.id} disabled={!onTeamPress} onPress={()=>onTeamPress?.(t.id)} accessibilityRole={onTeamPress?'button':undefined}><Text style={styles.name}>{t.name}</Text></Pressable>)}</View><Text style={styles.result}>{matchScore(match)}</Text></View>
 </View>;
}
const styles=StyleSheet.create({match:{backgroundColor:C.surface,borderRadius:15,borderWidth:1,borderColor:C.border,padding:15,gap:11},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},label:{color:C.mint,fontSize:11,fontWeight:'800'},status:{color:C.muted,fontSize:11},name:{color:C.white,fontSize:14,fontWeight:'800'},result:{fontSize:14,color:C.mint,fontWeight:'900'}});
