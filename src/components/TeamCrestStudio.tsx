import React,{useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import Svg,{ClipPath,Defs,G,Path,Rect,Text as SvgText} from 'react-native-svg';
import {captureRef} from 'react-native-view-shot';
import type {TeamCrestDesign,TeamCrestLayer} from '../lib/sports-teams-api';

type ImageAsset={uri:string;type:'image';mimeType:'image/png'};
type Props={teamId:number;teamName:string;design:string|null|undefined;disabled:boolean;
 onSave:(asset:ImageAsset,project:string)=>void};
const SHAPES=[
 {id:'shield',label:'Escudo'},{id:'rounded',label:'Arredondado'},{id:'circle',label:'Circular'},
 {id:'hex',label:'Hexágono'},{id:'diamond',label:'Losango'},{id:'square',label:'Quadrado'},
 {id:'oval',label:'Oval'},{id:'banner',label:'Estandarte'}
];
const SYMBOLS=[
 {id:'star',label:'★ Estrela',glyph:'★'},{id:'bolt',label:'⚡ Raio',glyph:'⚡'},
 {id:'crown',label:'♛ Coroa',glyph:'♛'},{id:'flame',label:'🔥 Chama',glyph:'🔥'},
 {id:'heart',label:'♥ Coração',glyph:'♥'},{id:'trophy',label:'🏆 Troféu',glyph:'🏆'},
 {id:'ball',label:'⚽ Futebol',glyph:'⚽'},{id:'basketball',label:'🏀 Basquetebol',glyph:'🏀'},
 {id:'volleyball',label:'🏐 Voleibol',glyph:'🏐'},{id:'tennis',label:'🎾 Ténis',glyph:'🎾'},
 {id:'rugby',label:'🏉 Rugby',glyph:'🏉'},{id:'badminton',label:'🏸 Badminton',glyph:'🏸'},
 {id:'cricket',label:'🏏 Cricket',glyph:'🏏'},{id:'hockey',label:'🏑 Hóquei',glyph:'🏑'},
 {id:'golf',label:'⛳ Golfe',glyph:'⛳'},{id:'cycling',label:'🚴 Ciclismo',glyph:'🚴'},
 {id:'running',label:'🏃 Atletismo',glyph:'🏃'},{id:'swimming',label:'🏊 Natação',glyph:'🏊'},
 {id:'boxing',label:'🥊 Combate',glyph:'🥊'},{id:'target',label:'🎯 Precisão',glyph:'🎯'},
 {id:'mountain',label:'⛰ Montanha',glyph:'⛰'},{id:'wave',label:'≈ Ondas',glyph:'≈'}
] as const;
const COLORS=['#0D7169','#FFFFFF','#F5FFFF','#0E3A52','#F6C94B','#EF7B2D','#EA435E',
 '#2554D9','#6F30BB','#101820','#4EDDA8','#000000'];
const PATTERNS=[
 {id:'none',label:'Liso'},{id:'stripes',label:'Riscas verticais'},
 {id:'hoops',label:'Riscas horizontais'},{id:'diagonal',label:'Diagonal'},
 {id:'split',label:'Metades'},{id:'chevron',label:'Chevron'}
];
function defaultCrest():TeamCrestDesign{
 return {version:2,shape:'shield',symbol:'none',pattern:'none',
 primary:'#0D7169',secondary:'#F5FFFF',textColor:'#FFFFFF',borderColor:'#F5FFFF',
 patternOpacity:30,borderWidth:8,symbolSize:76,symbolY:145,showInitials:true,
 innerBorder:true,initialsSize:30,initialsY:225,customInitials:'',caption:'',layers:[]};
}
export function parseTeamCrest(raw:string|null|undefined):TeamCrestDesign{
 if(!raw)return defaultCrest();
 try{
  const value=JSON.parse(raw) as TeamCrestDesign;
  if(!value||![1,2].includes(value.version)||!SHAPES.some(s=>s.id===value.shape))
   return defaultCrest();
  return {...defaultCrest(),...value,version:2,layers:
   Array.isArray(value.layers)?value.layers.slice(0,6).map(l=>({...l})):[]};
 }catch{return defaultCrest();}
}
function shieldPath(shape:string):string {
 switch(shape){
  case 'circle':return 'M160 23 A142 142 0 1 1 159.99 23 Z';
  case 'hex':return 'M160 17 L286 89 L286 252 L160 333 L34 252 L34 89 Z';
  case 'diamond':return 'M160 15 L297 169 L160 345 L23 169 Z';
  case 'rounded':return 'M68 27 H252 Q288 27 288 66 V209 Q276 287 160 339 Q44 287 32 209 V66 Q32 27 68 27 Z';
  case 'square':return 'M43 34 H277 V326 H43 Z';
  case 'oval':return 'M160 20 C260 20 293 84 293 180 C293 277 259 340 160 340 C61 340 27 277 27 180 C27 84 60 20 160 20 Z';
  case 'banner':return 'M42 34 H278 V321 L160 261 L42 321 Z';
  default:return 'M42 34 H278 V207 Q269 284 160 340 Q51 284 42 207 Z';
 }
}
function glyph(symbol:string):string {
 return SYMBOLS.find(s=>s.id===symbol)?.glyph||'';
}
function initials(name:string,custom:string):string {
 return (custom.trim()||name.split(/\s+/).filter(Boolean).map(n=>n[0]).join(''))
  .replace(/[^\p{L}0-9]/gu,'').toUpperCase().slice(0,5)||'J';
}
function ensureRange(v:number,min:number,max:number):number{
 return Math.round(Math.max(min,Math.min(max,v)));
}
export default function TeamCrestStudio({teamId,teamName,design,disabled,onSave}:Props){
 const [project,setProject]=useState<TeamCrestDesign>(()=>parseTeamCrest(design));
 const [selected,setSelected]=useState<string|null>(null);
 const [seq,setSeq]=useState(0),[notice,setNotice]=useState(''),[exporting,setExporting]=useState(false);
 const previewRef=useRef<View>(null);
 const pointerRef=useRef<string|null>(null);
 const projectRef=useRef(project);projectRef.current=project;
 const layers=project.layers||[];
 const selectedLayer=layers.find(l=>l.id===selected);
 // Only a change of team/official saved project may reset the draft.
 useEffect(()=>{
  setProject(parseTeamCrest(design));setSelected(null);setSeq(0);setNotice('');
 },[teamId,design]);
 const update=(change:Partial<TeamCrestDesign>)=>setProject(p=>({...p,...change}));
 const updateLayer=(id:string,change:Partial<TeamCrestLayer>)=>
  setProject(p=>({...p,layers:(p.layers||[]).map(l=>l.id===id?{...l,...change}:l)}));
 const createLayer=(kind:'text'|'symbol')=>{
  if(disabled||layers.length>=6)return;
  const id='m-'+Date.now().toString(36)+'-'+seq;
  setSeq(n=>n+1);
  update({layers:[...layers,{id,kind,text:kind==='text'?'JYNLO':'',symbol:'star',
   x:160,y:160,size:42,rotation:0,color:'#FFFFFF',opacity:100}]});
  setSelected(id);setNotice('');
 };
 const removeLayer=()=>{
  if(!selected||disabled)return;
  update({layers:layers.filter(l=>l.id!==selected)});setSelected(null);
 };
 const duplicateLayer=()=>{
  if(!selectedLayer||disabled||layers.length>=6)return;
  const id='m-'+Date.now().toString(36)+'-'+seq;
  setSeq(n=>n+1);
  update({layers:[...layers,{...selectedLayer,id,x:ensureRange(selectedLayer.x+16,24,296),
   y:ensureRange(selectedLayer.y+16,24,330)}]});setSelected(id);
 };
 const reorder=(direction:-1|1)=>{
  if(disabled||!selected)return;
  const from=layers.findIndex(l=>l.id===selected),to=from+direction;
  if(from<0||to<0||to>=layers.length)return;
  const list=[...layers];[list[from],list[to]]=[list[to],list[from]];
  update({layers:list});
 };
 const dragAt=(pageX:number,pageY:number,first:boolean)=>{
  previewRef.current?.measureInWindow((x,y,w,h)=>{
   if(!w||!h||disabled)return;
   const px=(pageX-x)*320/w,py=(pageY-y)*360/h;
   if(first){
    const match=[...projectRef.current.layers||[]].reverse().find(l=>
     Math.hypot(l.x-px,l.y-py)<Math.max(34,l.size/2+8));
    pointerRef.current=match?.id||null;setSelected(match?.id||null);
   }
   const id=pointerRef.current;
   if(id)updateLayer(id,{x:ensureRange(px,24,296),y:ensureRange(py,24,330)});
  });
 };
 const save=async()=>{
  if(disabled||exporting)return;
  const current=projectRef.current;
  if((current.layers||[]).some(l=>l.text.length>18||/[\x00-\x1F]/.test(l.text)
     ||(l.kind==='text'&&!l.text.trim()))){
   setNotice('Cada camada de texto deve ter entre 1 e 18 caracteres.');return;
  }
  if(!/^[\p{L}0-9]{0,5}$/u.test(current.customInitials)||current.caption.length>22){
   setNotice('Revê as iniciais e o texto inferior.');return;
  }
  setExporting(true);setNotice('');
  try{
   if(!previewRef.current)throw Error('Pré-visualização indisponível.');
   const uri=await captureRef(previewRef.current,{
    format:'png',quality:1,result:'tmpfile',width:640,height:720});
   onSave({uri,type:'image',mimeType:'image/png'},JSON.stringify({...current,version:2}));
  }catch{setNotice('Não foi possível gerar o PNG. Confirma o emblema antes de repetir.');}
  finally{setExporting(false);}
 };
 const path=shieldPath(project.shape);
 const isDisabled=disabled||exporting;
 const label=selectedLayer?.kind==='text'?selectedLayer.text:glyph(selectedLayer?.symbol||'');
 const numberControl=(name:string,value:number,min:number,max:number,step:number,apply:(v:number)=>void)=>
  <View style={styles.numeric} key={name}>
   <Text style={styles.label}>{name}: {value}</Text>
   <View style={styles.controls}>
    <Pressable disabled={isDisabled||value<=min} accessibilityLabel={'Diminuir '+name}
     style={styles.step} onPress={()=>apply(ensureRange(value-step,min,max))}><Text style={styles.controlText}>−</Text></Pressable>
    <Pressable disabled={isDisabled||value>=max} accessibilityLabel={'Aumentar '+name}
     style={styles.step} onPress={()=>apply(ensureRange(value+step,min,max))}><Text style={styles.controlText}>+</Text></Pressable>
   </View>
  </View>;
 const palette=(labelText:string,chosen:string,apply:(v:string)=>void)=>
  <View style={styles.palette}>
   <Text style={styles.label}>{labelText}</Text>
   <View style={styles.colors}>{COLORS.map(color=><Pressable key={color}
    accessibilityRole="button" accessibilityLabel={labelText+' '+color}
    accessibilityState={{selected:chosen.toUpperCase()===color}}
    disabled={isDisabled} onPress={()=>apply(color)}
    style={[styles.color,{backgroundColor:color},chosen.toUpperCase()===color&&styles.colorSelected]}/>)}</View>
  </View>;
 return <View style={styles.studio}>
  <Text style={styles.title}>Estúdio de emblemas</Text>
  <Text style={styles.note}>Cria símbolos para qualquer desporto. Arrasta os elementos com o dedo, altera cores, tamanho e rotação e volta a editá-los depois de guardar.</Text>
  <View style={styles.previewBackground}>
   <View ref={previewRef} collapsable={false} style={styles.preview}
    onStartShouldSetResponder={()=>!isDisabled}
    onMoveShouldSetResponder={()=>!isDisabled}
    onResponderGrant={event=>dragAt(event.nativeEvent.pageX,event.nativeEvent.pageY,true)}
    onResponderMove={event=>dragAt(event.nativeEvent.pageX,event.nativeEvent.pageY,false)}
    onResponderRelease={()=>{pointerRef.current=null;}}
    onResponderTerminate={()=>{pointerRef.current=null;}}>
    <Svg width="100%" height="100%" viewBox="0 0 320 360">
     <Defs><ClipPath id="mobileCrestClip"><Path d={path}/></ClipPath></Defs>
     <Path d={path} fill={project.primary} stroke={project.borderColor} strokeWidth={project.borderWidth}/>
     <G clipPath="url(#mobileCrestClip)" opacity={project.patternOpacity/100} fill={project.secondary}>
      {project.pattern==='stripes'?[66,141,216].map(x=><Rect key={x} x={x} y={0} width={38} height={360}/>):null}
      {project.pattern==='hoops'?[80,165,250].map(y=><Rect key={y} x={0} y={y} width={320} height={35}/>):null}
      {project.pattern==='diagonal'?<Path d="M-60 300 L240 -40 L335 15 L35 355 Z"/>:null}
      {project.pattern==='split'?<Path d="M160 0H320V360H160Z"/>:null}
      {project.pattern==='chevron'?<Path d="M0 75 L160 175 L320 75 V125 L160 225 L0 125 Z"/>:null}
     </G>
     {project.innerBorder?<Path d={path} fill="none" stroke={project.borderColor}
      strokeWidth={4} transform="translate(160 178) scale(.88) translate(-160 -178)"/>:null}
     {project.symbol!=='none'?<SvgText x={160} y={project.symbolY}
      textAnchor="middle" alignmentBaseline="middle" fontSize={project.symbolSize}
      fontWeight="800" fill={project.textColor}>{glyph(project.symbol)}</SvgText>:null}
     {project.showInitials?<SvgText x={160} y={project.initialsY}
      textAnchor="middle" alignmentBaseline="middle" fontSize={project.initialsSize}
      fontWeight="900" fill={project.textColor}>{initials(teamName,project.customInitials)}</SvgText>:null}
     {project.caption?<SvgText x={160} y={286} textAnchor="middle" alignmentBaseline="middle"
      fontSize={16} fontWeight="800" fill={project.textColor}>{project.caption}</SvgText>:null}
     {layers.map(layer=><G key={layer.id} transform={'translate('+layer.x+' '+layer.y+') rotate('+layer.rotation+')'}
      opacity={layer.opacity/100}>
      <SvgText textAnchor="middle" alignmentBaseline="middle"
       fontWeight="800" fontSize={layer.size} fill={layer.color}>
       {layer.kind==='text'?layer.text:glyph(layer.symbol)}
      </SvgText>
     </G>)}
    </Svg>
   </View>
   <Text style={styles.note}>{selectedLayer?'Camada selecionada: '+label:'Toca num elemento para o selecionar e arrastar.'}</Text>
  </View>
  <Text style={styles.label}>Modelos rápidos</Text>
  <View style={styles.choices}>{['Clássico','Minimalista','Energético','Em branco'].map((name,index)=><Pressable
   key={name} disabled={isDisabled} style={styles.option}
   onPress={()=>{
    const base=defaultCrest();
    if(index===0){base.symbol='star';base.caption='DESDE 2026';}
    if(index===1){base.shape='circle';base.borderWidth=2;base.innerBorder=false;}
    if(index===2){base.shape='hex';base.pattern='chevron';base.symbol='flame';base.primary='#142E60';}
    if(index===3){base.showInitials=false;base.innerBorder=false;base.borderWidth=0;}
    setProject(base);setSelected(null);
   }}><Text style={styles.controlText}>{name}</Text></Pressable>)}</View>
  <Text style={styles.label}>Formato</Text>
  <View style={styles.choices}>{SHAPES.map(option=><Pressable key={option.id} disabled={isDisabled}
   accessibilityRole="button" accessibilityState={{selected:project.shape===option.id}}
   style={[styles.option,project.shape===option.id&&styles.active]}
   onPress={()=>update({shape:option.id})}><Text style={styles.controlText}>{option.label}</Text></Pressable>)}</View>
  <Text style={styles.label}>Fundo</Text>
  <View style={styles.choices}>{PATTERNS.map(option=><Pressable key={option.id} disabled={isDisabled}
   accessibilityRole="button" accessibilityState={{selected:project.pattern===option.id}}
   style={[styles.option,project.pattern===option.id&&styles.active]}
   onPress={()=>update({pattern:option.id})}><Text style={styles.controlText}>{option.label}</Text></Pressable>)}</View>
  {palette('Cor principal',project.primary,value=>update({primary:value}))}
  {palette('Cor do padrão',project.secondary,value=>update({secondary:value}))}
  {palette('Cor de texto',project.textColor,value=>update({textColor:value}))}
  {palette('Contorno',project.borderColor,value=>update({borderColor:value}))}
  <View style={styles.row}>
   <Pressable style={[styles.option,project.showInitials&&styles.active]} disabled={isDisabled}
    onPress={()=>update({showInitials:!project.showInitials})}>
    <Text style={styles.controlText}>{project.showInitials?'✓ ':''}Iniciais</Text></Pressable>
   <Pressable style={[styles.option,project.innerBorder&&styles.active]} disabled={isDisabled}
    onPress={()=>update({innerBorder:!project.innerBorder})}>
    <Text style={styles.controlText}>{project.innerBorder?'✓ ':''}Aro interior</Text></Pressable>
  </View>
  {project.showInitials?<TextInput editable={!isDisabled} style={styles.input}
   value={project.customInitials} maxLength={5} placeholder="Iniciais (opcional)"
   placeholderTextColor="#A2C6CC" onChangeText={value=>update({customInitials:value})}/>:null}
  <TextInput editable={!isDisabled} style={styles.input} value={project.caption} maxLength={22}
   placeholder="Texto inferior opcional" placeholderTextColor="#A2C6CC"
   onChangeText={value=>update({caption:value})}/>
  <Text style={styles.section}>Camadas livres ({layers.length}/6)</Text>
  <View style={styles.choices}>
   <Pressable style={styles.option} disabled={isDisabled||layers.length>=6}
    onPress={()=>createLayer('text')}><Text style={styles.controlText}>+ Texto</Text></Pressable>
   <Pressable style={styles.option} disabled={isDisabled||layers.length>=6}
    onPress={()=>createLayer('symbol')}><Text style={styles.controlText}>+ Símbolo</Text></Pressable>
  </View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerStrip}>
   {layers.map(layer=><Pressable key={layer.id}
    accessibilityRole="button" accessibilityState={{selected:selected===layer.id}}
    onPress={()=>setSelected(layer.id)} style={[styles.option,selected===layer.id&&styles.active]}>
    <Text style={styles.controlText} numberOfLines={1}>
     {layer.kind==='text'?layer.text||'Texto':glyph(layer.symbol)}</Text>
   </Pressable>)}
  </ScrollView>
  {selectedLayer?<View style={styles.layerEditor}>
   <Text style={styles.label}>Editar camada selecionada</Text>
   {selectedLayer.kind==='text'?<TextInput style={styles.input} editable={!isDisabled}
    maxLength={18} placeholder="Texto" placeholderTextColor="#A2C6CC"
    value={selectedLayer.text} onChangeText={value=>updateLayer(selectedLayer.id,{text:value})}/>
   :<View style={styles.choices}>{SYMBOLS.map(icon=><Pressable key={icon.id}
      accessibilityRole="button" accessibilityState={{selected:selectedLayer.symbol===icon.id}}
      style={[styles.option,selectedLayer.symbol===icon.id&&styles.active]}
      disabled={isDisabled} onPress={()=>updateLayer(selectedLayer.id,{symbol:icon.id})}>
      <Text style={styles.controlText}>{icon.label}</Text>
     </Pressable>)}</View>}
   {palette('Cor desta camada',selectedLayer.color,value=>updateLayer(selectedLayer.id,{color:value}))}
   <View style={styles.numbers}>
    {numberControl('Tamanho',selectedLayer.size,18,110,4,v=>updateLayer(selectedLayer.id,{size:v}))}
    {numberControl('Rotação',selectedLayer.rotation,-180,180,15,v=>updateLayer(selectedLayer.id,{rotation:v}))}
    {numberControl('Opacidade',selectedLayer.opacity,0,100,10,v=>updateLayer(selectedLayer.id,{opacity:v}))}
   </View>
   <View style={styles.choices}>
    <Pressable style={styles.option} disabled={isDisabled} onPress={()=>reorder(-1)}>
     <Text style={styles.controlText}>Para trás</Text></Pressable>
    <Pressable style={styles.option} disabled={isDisabled} onPress={()=>reorder(1)}>
     <Text style={styles.controlText}>Para a frente</Text></Pressable>
    <Pressable style={styles.option} disabled={isDisabled||layers.length>=6} onPress={duplicateLayer}>
     <Text style={styles.controlText}>Duplicar</Text></Pressable>
    <Pressable style={styles.deleteButton} disabled={isDisabled} onPress={removeLayer}>
     <Text style={styles.controlText}>Eliminar</Text></Pressable>
   </View>
  </View>:null}
  {notice?<Text style={styles.warning}>{notice}</Text>:null}
  <Pressable accessibilityRole="button" disabled={isDisabled} onPress={()=>void save()}
   style={[styles.save,isDisabled&&styles.disabled]}>
   <Text style={styles.saveLabel}>{isDisabled?'A gerar…':'Guardar emblema da equipa'}</Text>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 studio:{backgroundColor:'#0A2735',borderRadius:16,borderWidth:1,borderColor:'#3A8E83',padding:13,gap:12},
 title:{color:'#F2FFF8',fontWeight:'800',fontSize:20},note:{fontSize:12,color:'#B7D7D7',lineHeight:18},
 previewBackground:{backgroundColor:'#123D47',borderRadius:14,alignItems:'center',padding:8,gap:5},
 preview:{width:300,height:338},label:{fontWeight:'700',fontSize:13,color:'#E9FFF7'},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:7},
 option:{backgroundColor:'#14505A',borderColor:'#377F82',borderWidth:1,borderRadius:9,padding:9,minHeight:40,justifyContent:'center'},
 active:{borderColor:'#50F5D0',backgroundColor:'#207C78'},controlText:{color:'#F0FFFA',fontWeight:'600',fontSize:12},
 palette:{gap:7},colors:{flexDirection:'row',flexWrap:'wrap',gap:8},
 color:{width:35,height:35,borderRadius:8,borderWidth:1,borderColor:'#397279'},
 colorSelected:{borderColor:'#4DF9CC',borderWidth:4},input:{borderWidth:1,borderColor:'#457B83',borderRadius:9,
  backgroundColor:'#103A47',color:'#FFFFFF',padding:11,fontSize:14},
 row:{flexDirection:'row',flexWrap:'wrap',gap:7},section:{fontWeight:'800',color:'#E7FFF8',fontSize:16},
 layerStrip:{gap:8,paddingBottom:3},layerEditor:{gap:10,borderTopWidth:1,borderColor:'#39747C',paddingTop:12},
 numbers:{flexDirection:'row',flexWrap:'wrap',gap:10},numeric:{minWidth:98,flex:1},
 controls:{flexDirection:'row',gap:5,marginTop:7},step:{borderWidth:1,borderColor:'#4C9B96',minWidth:44,
  minHeight:42,borderRadius:8,alignItems:'center',justifyContent:'center'},
 deleteButton:{borderWidth:1,borderColor:'#B1798A',borderRadius:9,padding:10},
 save:{backgroundColor:'#45E4BE',padding:14,borderRadius:11,alignItems:'center'},
 saveLabel:{fontWeight:'800',color:'#062F30'},disabled:{opacity:.5},
 warning:{color:'#FFD0B6',fontSize:12}
});
