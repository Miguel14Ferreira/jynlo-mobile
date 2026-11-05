import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../lib/theme';
import type {CommunitySummary} from '../lib/types';
import {communitySports,describeCommunitySports} from '../lib/community-core.cjs';

function icon(sport:string|null):string {
  const normalized=(sport||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/futebol|futsal|teqball/.test(normalized))return '⚽';
  if(/voleibol/.test(normalized))return '🏐';
  if(/karting|automobilismo/.test(normalized))return '🏎️';
  if(/padel|tenis/.test(normalized))return '🎾';
  if(/ciclismo|bmx/.test(normalized))return '🚴';
  if(/basquetebol/.test(normalized))return '🏀';
  return '🏅';
}
export function CommunityCard({community,onPress,memberCount,role}:{community:CommunitySummary;onPress:()=>void;memberCount?:number;role?:string|null}){
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Abrir comunidade ${community.name}`}
    style={({pressed})=>[styles.card,pressed&&{opacity:0.77}]}>
    <View style={styles.row}>
      <View style={styles.picture}><Text style={{fontSize:28}}>{icon(communitySports(community)[0]||null)}</Text></View>
      <View style={{flex:1,gap:5}}>
        <Text numberOfLines={2} style={styles.title}>{community.name}</Text>
        <Text style={styles.meta}>{describeCommunitySports(community)} · {community.visibility==='PRIVATE'?'Privada':'Pública'}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </View>
    {!!community.description&&<Text numberOfLines={2} style={styles.desc}>{community.description}</Text>}
    {(typeof memberCount==='number'||role)?<View style={styles.row}>
      {typeof memberCount==='number'&&<Text style={styles.small}>{memberCount} {memberCount===1?'membro':'membros'}</Text>}
      {!!role&&<View style={styles.pill}><Text style={styles.pillText}>{role==='OWNER'?'Organizador':role==='ADMIN'?'Administrador':'Membro'}</Text></View>}
    </View>:null}
  </Pressable>;
}
const styles=StyleSheet.create({
  card:{backgroundColor:C.surface,borderRadius:20,padding:17,borderWidth:1,borderColor:C.border,gap:13},
  row:{flexDirection:'row',alignItems:'center',gap:13},picture:{width:56,height:56,borderRadius:17,backgroundColor:C.surface2,justifyContent:'center',alignItems:'center'},
  title:{fontSize:18,color:C.white,fontWeight:'900'},meta:{fontSize:12,color:C.muted},arrow:{fontSize:33,color:C.mint},
  desc:{color:C.muted,lineHeight:20,fontSize:13},small:{color:C.muted,fontSize:12},
  pill:{paddingHorizontal:10,paddingVertical:6,borderRadius:10,backgroundColor:'#194D40'},pillText:{fontSize:11,color:C.mint,fontWeight:'800'}
});
