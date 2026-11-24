import {C,MobileTheme} from './theme';

/** One look for every chat (private, community, game, team, groups). Spread into each chat's StyleSheet. */
export const chatLook={
 message:{paddingHorizontal:11,paddingTop:7,paddingBottom:5,borderRadius:16,backgroundColor:'#0D3945',gap:3,maxWidth:'84%',alignSelf:'flex-start',borderBottomLeftRadius:5,borderWidth:0},
 mine:{backgroundColor:'#12554D',alignSelf:'flex-end',borderBottomLeftRadius:16,borderBottomRightRadius:5,borderWidth:0},
 sender:{fontSize:12,color:C.mint,fontWeight:'800'},
 body:{fontSize:15,color:C.white,lineHeight:21},
 time:{fontSize:10,color:C.muted},
 footer:{flexShrink:0,paddingHorizontal:10,paddingTop:8,paddingBottom:8,gap:7,borderTopWidth:1,borderTopColor:C.border,backgroundColor:C.background},
 composer:{flexDirection:'row',alignItems:'flex-end',gap:8},
 typing:{color:'#74DFCA',fontSize:12,fontWeight:'700',fontStyle:'italic',paddingHorizontal:6},
 plus:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:C.surface},
 input:{flex:1,minHeight:MobileTheme.touchTarget,maxHeight:130,backgroundColor:'#061F2E',borderColor:'#3BB6AA66',borderWidth:1,color:MobileTheme.colors.text,paddingHorizontal:14,paddingVertical:11,borderRadius:22},
 send:{backgroundColor:MobileTheme.colors.accent,borderRadius:22,width:46,minHeight:MobileTheme.touchTarget,justifyContent:'center',alignItems:'center'},
 header:{minHeight:58,paddingHorizontal:6,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:C.border,backgroundColor:C.background},
 headerIcon:{width:44,height:44,alignItems:'center',justifyContent:'center'},
} as const;
