import React from 'react';
import {t} from '../lib/i18n';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {MobileTheme} from '../lib/theme';
import {resolveJynloMedia} from '../lib/social-feed-api';
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
const T=MobileTheme.colors;
export function CommunityCard({community,onPress,memberCount,role}:{community:CommunitySummary;onPress:()=>void;memberCount?:number;role?:string|null}){
  const sports=communitySports(community);
  const image=community.photoUrl?resolveJynloMedia(community.photoUrl):null;
  const memberLabel=typeof memberCount==='number'&&Number.isFinite(memberCount)
    ?(memberCount===1?t('1 membro'):t('{n} membros',{n:memberCount})):null;
  const isPrivate=community.visibility==='PRIVATE';
  const roleLabel=role==='OWNER'?'Organizador':role==='ADMIN'?'Administrador':role?'Membro':null;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('Abrir comunidade {a}',{a:community.name})}
    style={({pressed})=>[styles.card,pressed&&styles.pressed]}>
    <View style={styles.row}>
      <View style={styles.picture}>{image?<Image source={{uri:image}} style={styles.photo} resizeMode="cover"/>:<Text maxFontSizeMultiplier={1.3} style={styles.sportIcon}>{icon(sports[0]||null)}</Text>}</View>
      <View style={styles.identity}>
        <Text numberOfLines={2} style={styles.title}>{community.name}</Text>
        <Text numberOfLines={2} style={styles.meta}>{describeCommunitySports(community)}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} style={styles.arrow}>›</Text>
    </View>
    {!!community.description&&<Text numberOfLines={2} style={styles.desc}>{community.description}</Text>}
    <View style={styles.footer}>
      <View style={styles.badges}>
        <View style={styles.visibility}><Text style={styles.visibilityText}>{isPrivate?t('Privada'):t('Pública')}</Text></View>
        {memberLabel?<Text style={styles.small}>{memberLabel}</Text>:null}
        {roleLabel?<View style={styles.pill}><Text style={styles.pillText}>{roleLabel}</Text></View>:null}
      </View>
      <Text style={styles.openText}>{t('Ver comunidade  ↗')}</Text>
    </View>
  </Pressable>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:T.surface,borderRadius:MobileTheme.radius.xl,padding:MobileTheme.spacing.lg,borderWidth:1,borderColor:T.border,gap:14},
 pressed:{opacity:.82,transform:[{scale:.99}]},
 row:{flexDirection:'row',alignItems:'center',gap:12},
 picture:{width:64,height:64,borderRadius:18,backgroundColor:T.raised,overflow:'hidden',justifyContent:'center',alignItems:'center'},
 photo:{width:'100%',height:'100%'},sportIcon:{fontSize:30},
 identity:{flex:1,gap:5},title:{fontSize:18,color:T.text,fontWeight:'900'},meta:{fontSize:12,color:T.muted,lineHeight:18},arrow:{fontSize:28,color:T.accent},
 desc:{color:T.muted,lineHeight:20,fontSize:13},
 footer:{flexDirection:'row',alignItems:'center',gap:10,justifyContent:'space-between',borderTopWidth:1,borderTopColor:T.border,paddingTop:12},
 badges:{flex:1,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7},
 visibility:{backgroundColor:T.raised,paddingHorizontal:9,paddingVertical:6,borderRadius:MobileTheme.radius.pill},
 visibilityText:{fontSize:11,fontWeight:'800',color:T.muted},
 small:{color:T.muted,fontSize:11},
 pill:{paddingHorizontal:9,paddingVertical:6,borderRadius:MobileTheme.radius.pill,backgroundColor:'#10483F'},
 pillText:{fontSize:11,color:T.accent,fontWeight:'800'},
 openText:{fontSize:11,fontWeight:'800',color:T.accent},
});
