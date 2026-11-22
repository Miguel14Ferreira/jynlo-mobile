import React,{useEffect,useState} from 'react';
import {t} from '../lib/i18n';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import TeamKitPreview from './TeamKitPreview';
import {
 safeTeamKitColor,type SportsTeam,type TeamKitKind,type TeamKitPattern,
 type TeamKitGarment,type TeamKitDesign,type TeamKitVariant
} from '../lib/sports-teams-api';

type Props={team:SportsTeam;disabled:boolean;onSave:(primary:TeamKitDesign,variants:TeamKitVariant[])=>void};
const COLORS=['#19CBB6','#FFFFFF','#0E3A52','#2554D9','#E74855','#F6C94B','#101820','#EF7B2D','#912FD2','#B3D6A2'];
const PATTERNS:ReadonlyArray<{id:TeamKitPattern;label:string}>=[
 {id:'PLAIN',label:'Liso'},{id:'STRIPES',label:'Riscas verticais'},
 {id:'DIAGONAL',label:'Diagonal'},{id:'HOOPS',label:'Riscas horizontais'},
 {id:'HALVES',label:'Metades'},{id:'CHEVRON',label:'Chevron'}
];
const GARMENTS:ReadonlyArray<{id:TeamKitGarment;label:string}>=[
 {id:'jersey',label:'Camisola de jogo'},{id:'singlet',label:'Singlet / atletismo'},
 {id:'vest',label:'Colete'},{id:'polo',label:'Polo / golfe'},
 {id:'cycling',label:'Jersey de ciclismo'},{id:'rashguard',label:'Rashguard / combate'}
];
const SLOTS:ReadonlyArray<{id:TeamKitKind;label:string}>=[
 {id:'PRIMARY',label:'Principal'},{id:'ALTERNATE',label:'Alternativo'},{id:'TRAINING',label:'Treino'}
];
function suggestedGarment(sport:string|null):TeamKitGarment{
 const normalized=(sport||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/basket|basquet|atlet|running|corrida|triat/.test(normalized))return 'singlet';
 if(/cicl|cycling|btt/.test(normalized))return 'cycling';
 if(/golf|golfe/.test(normalized))return 'polo';
 if(/jiu|judo|mma|muay|combat|boxe|wrestling|luta|karate/.test(normalized))return 'rashguard';
 return 'jersey';
}
export function primaryTeamKit(team:SportsTeam):TeamKitDesign{
 return {
  primary:safeTeamKitColor(team.kitPrimary,'#19CBB6'),
  secondary:safeTeamKitColor(team.kitSecondary,'#F0FAFB'),
  accent:safeTeamKitColor(team.kitAccent,'#FFFFFF'),
  pattern:team.kitPattern||'PLAIN',garment:team.kitGarment||suggestedGarment(team.sport),
  playerName:team.kitPlayerName||'',playerNumber:team.kitPlayerNumber||''
 };
}
export default function TeamKitStudio({team,disabled,onSave}:Props){
 const [slot,setSlot]=useState<TeamKitKind>('PRIMARY');
 const [primary,setPrimary]=useState<TeamKitDesign>(()=>primaryTeamKit(team));
 const [variants,setVariants]=useState<TeamKitVariant[]>(()=>team.kitVariants||[]);
 const [side,setSide]=useState<'front'|'back'>('front');
 const [dirty,setDirty]=useState(false),[warning,setWarning]=useState('');
 // New team or new authoritative save: never leak a previous club's identity.
 useEffect(()=>{
  if(dirty)return;
  setPrimary(primaryTeamKit(team));
  setVariants((team.kitVariants||[]).filter(v=>v.type==='ALTERNATE'||v.type==='TRAINING'));
 },[team,dirty]);
 const current:TeamKitDesign=slot==='PRIMARY'?primary:
  variants.find(v=>v.type===slot)||{
   ...primary,primary:slot==='ALTERNATE'?primary.secondary:primary.primary,
   secondary:slot==='ALTERNATE'?primary.primary:primary.secondary,
   playerName:'',playerNumber:''
  };
 const update=(change:Partial<TeamKitDesign>)=>{
  if(disabled)return;
  const next={...current,...change};
  setDirty(true);setWarning('');
  if(slot==='PRIMARY')setPrimary(next);
  else setVariants(prev=>[...prev.filter(v=>v.type!==slot),{type:slot,...next}]);
 };
 const selectSlot=(next:TeamKitKind)=>{setWarning('');setSlot(next);};
 const removeVariant=()=>{
  if(slot==='PRIMARY'||disabled)return;
  setVariants(prev=>prev.filter(v=>v.type!==slot));
  setSlot('PRIMARY');setDirty(true);
 };
 const save=()=>{
  const all=[primary,...variants];
  if(all.some(v=>v.playerName.trim().length>14||
    (v.playerName.trim()!==''&&!/^[\p{L}0-9 .'-]+$/u.test(v.playerName.trim())))){
   setWarning(t('O nome deve conter até 14 letras, números e espaços.'));return;
  }
  if(all.some(v=>v.playerNumber.trim()!==''&&!/^[0-9]{1,2}$/.test(v.playerNumber.trim()))){
   setWarning(t('O número deve conter um ou dois algarismos.'));return;
  }
  // Keep the draft until the server confirms it: an uncertain upload must not
  // silently restore the old team design while the request is in flight.
  onSave({...primary,playerName:primary.playerName.trim(),playerNumber:primary.playerNumber.trim()},
   variants.map(v=>({...v,playerName:v.playerName.trim(),playerNumber:v.playerNumber.trim()})));
 };
 return <View style={styles.studio}>
  <Text style={styles.title}>{t('Estúdio de equipamentos')}</Text>
  <Text style={styles.hint}>{t('Três conjuntos próprios, para qualquer modalidade. As alterações só são oficiais depois de guardar.')}</Text>
  <View style={styles.slotRow}>{SLOTS.map(item=><Pressable key={item.id}
   accessibilityRole="button" accessibilityState={{selected:slot===item.id}}
   disabled={disabled} onPress={()=>selectSlot(item.id)}
   style={[styles.slot,slot===item.id&&styles.selected]}>
   <Text style={[styles.slotText,slot===item.id&&styles.selectedText]}>{item.label}</Text>
  </Pressable>)}</View>
  <View style={styles.preview}>
   <View style={styles.sideRow}>{(['front','back'] as const).map(name=><Pressable key={name}
    accessibilityRole="button" accessibilityState={{selected:side===name}}
    style={[styles.side,side===name&&styles.sideActive]} onPress={()=>setSide(name)}>
    <Text style={styles.light}>{name==='front'?t('Frente'):t('Costas')}</Text>
   </Pressable>)}</View>
   <TeamKitPreview primary={current.primary} secondary={current.secondary}
    accent={current.accent} garment={current.garment} pattern={current.pattern}
    playerName={current.playerName} playerNumber={current.playerNumber} side={side} size={222}/>
   <Text style={styles.hint}>{t(GARMENTS.find(g=>g.id===current.garment)?.label??'')}</Text>
  </View>
  <Text style={styles.label}>{t('Tipo de peça')}</Text>
  <View style={styles.choices}>{GARMENTS.map(f=>({...f,label:t(f.label)})).map(g=><Pressable key={g.id} disabled={disabled}
   accessibilityRole="button" accessibilityState={{selected:current.garment===g.id}}
   style={[styles.choice,current.garment===g.id&&styles.choiceActive]}
   onPress={()=>update({garment:g.id})}>
   <Text style={styles.light}>{g.label}</Text>
  </Pressable>)}</View>
  <Text style={styles.label}>{t('Padrão')}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patterns}>
   {PATTERNS.map(f=>({...f,label:t(f.label)})).map(item=><Pressable key={item.id}
    accessibilityRole="button" accessibilityState={{selected:current.pattern===item.id}}
    disabled={disabled} onPress={()=>update({pattern:item.id})}
    style={[styles.pattern,current.pattern===item.id&&styles.choiceActive]}>
    <TeamKitPreview primary={current.primary} secondary={current.secondary}
     pattern={item.id} garment={current.garment} size={65}/>
    <Text style={styles.light}>{item.label}</Text>
   </Pressable>)}
  </ScrollView>
  {(['primary','secondary','accent'] as const).map((key)=><View key={key}>
   <Text style={styles.label}>{key==='primary'?t('Cor principal'):key==='secondary'?t('Cor secundária'):t('Cor de destaque')}</Text>
   <View style={styles.colors}>{COLORS.map(color=><Pressable key={color}
    accessibilityRole="button" accessibilityLabel={color}
    accessibilityState={{selected:current[key].toUpperCase()===color}}
    disabled={disabled} onPress={()=>update({[key]:color})}
    style={[styles.swatch,{backgroundColor:color},current[key].toUpperCase()===color&&styles.swatchSelected]}/>)}</View>
  </View>)}
  <View style={styles.nameRow}>
   <View style={styles.nameField}><Text style={styles.label}>{t('Nome nas costas')}</Text>
    <TextInput style={styles.input} placeholder={t('ATLETA')} placeholderTextColor="#8AADB3"
      maxLength={14} autoCapitalize="characters" editable={!disabled}
      value={current.playerName} onChangeText={value=>update({playerName:value})}/></View>
   <View style={styles.numberField}><Text style={styles.label}>N.º</Text>
    <TextInput style={styles.input} placeholder="10" placeholderTextColor="#8AADB3"
      keyboardType="number-pad" maxLength={2} editable={!disabled}
      value={current.playerNumber} onChangeText={value=>update({playerNumber:value})}/></View>
  </View>
  {slot!=='PRIMARY'&&variants.some(v=>v.type===slot)?<Pressable
   accessibilityRole="button" disabled={disabled} onPress={removeVariant} style={styles.remove}>
   <Text style={styles.removeText}>{t('Eliminar este conjunto {a}',{a:slot==='ALTERNATE'?'alternativo':t('de treino')})}</Text>
  </Pressable>:null}
  {warning?<Text style={styles.warning}>{warning}</Text>:null}
  <Pressable accessibilityRole="button" disabled={disabled} onPress={save} style={[styles.save,disabled&&styles.disabled]}>
   <Text style={styles.saveText}>{disabled?t('Aguardar…'):t('Guardar os equipamentos')}</Text>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 studio:{backgroundColor:'#0B2938',borderRadius:17,padding:15,gap:12,borderWidth:1,borderColor:'#28656B'},
 title:{fontSize:20,fontWeight:'800',color:'#EEFFF8'},hint:{fontSize:12,color:'#B2D2D6',lineHeight:19},
 slotRow:{flexDirection:'row',gap:5},slot:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'#377B82'},
 selected:{backgroundColor:'#43D9BE',borderColor:'#43D9BE'},slotText:{color:'#DBF9F4',fontWeight:'700',fontSize:12},selectedText:{color:'#092A32'},
 preview:{backgroundColor:'#123844',alignItems:'center',padding:13,gap:5,borderRadius:14},
 sideRow:{flexDirection:'row',gap:8,alignSelf:'stretch'},side:{flex:1,padding:10,alignItems:'center',borderRadius:9,borderWidth:1,borderColor:'#2F7781'},
 sideActive:{backgroundColor:'#27606B'},light:{color:'#E4FAF7',fontWeight:'600',fontSize:12},
 label:{fontWeight:'700',color:'#F1FFFA',fontSize:13,marginBottom:6},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:7},choice:{padding:10,borderWidth:1,borderColor:'#376F76',borderRadius:10},
 choiceActive:{borderColor:'#4CE1C7',backgroundColor:'#194E54'},
 patterns:{gap:7,paddingBottom:5},pattern:{width:105,alignItems:'center',padding:8,borderWidth:1,borderColor:'#356D77',borderRadius:11,gap:4},
 colors:{flexDirection:'row',flexWrap:'wrap',gap:10},swatch:{width:36,height:36,borderRadius:10,borderWidth:1,borderColor:'#456B74'},
 swatchSelected:{borderColor:'#6EFFE0',borderWidth:4},
 nameRow:{flexDirection:'row',gap:9},nameField:{flex:1},numberField:{width:83},
 input:{borderWidth:1,borderColor:'#487D82',borderRadius:10,backgroundColor:'#102D3A',color:'#FFFFFF',padding:12,fontSize:15},
 remove:{alignItems:'center',padding:10,borderRadius:9,borderWidth:1,borderColor:'#AD6C7A'},
 removeText:{color:'#FFE3E4',fontWeight:'700'},warning:{color:'#FFD0B6',fontSize:13},
 save:{padding:14,backgroundColor:'#43D9BE',borderRadius:11,alignItems:'center'},
 saveText:{fontWeight:'800',color:'#082B33'},disabled:{opacity:.5}
});
