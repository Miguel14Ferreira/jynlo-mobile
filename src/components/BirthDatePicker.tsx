import React,{useState} from 'react';
import {FlatList,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../lib/theme';
import {validAdultDate} from '../lib/native-registration';

type Part='day'|'month'|'year';
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const pad=(value:number)=>String(value).padStart(2,'0');
const YEARS=Array.from({length:121},(_,index)=>new Date().getFullYear()-18-index);

export default function BirthDatePicker({onChange,disabled=false}:{onChange:(isoDate:string)=>void;disabled?:boolean}){
 const [day,setDay]=useState<number|null>(null);
 const [month,setMonth]=useState<number|null>(null);
 const [year,setYear]=useState<number|null>(null);
 const [open,setOpen]=useState<Part|null>(null);
 const count=month?new Date(Date.UTC(year??2000,month,0)).getUTCDate():31;
 const days=Array.from({length:count},(_,i)=>i+1);
 const values=open==='day'?days:open==='month'?MONTHS.map((_,i)=>i+1):YEARS;
 const select=(value:number)=>{
  const nextDay=open==='day'?value:day;
  const nextMonth=open==='month'?value:month;
  const nextYear=open==='year'?value:year;
  const maxDay=nextMonth?new Date(Date.UTC(nextYear??2000,nextMonth,0)).getUTCDate():31;
  const safeDay=nextDay&&nextDay>maxDay?null:nextDay;
  setDay(safeDay);setMonth(nextMonth);setYear(nextYear);
  const iso=safeDay&&nextMonth&&nextYear?`${nextYear}-${pad(nextMonth)}-${pad(safeDay)}`:'';
  onChange(iso&&validAdultDate(iso)?iso:'');
  setOpen(null);
 };
 const value=(part:Part)=>part==='day'?(day?pad(day):'Dia'):part==='month'?(month?MONTHS[month-1]:'Mês'):(year?String(year):'Ano');
 return <>
  <View style={styles.row} accessibilityLabel="Data de nascimento">
   {(['day','month','year'] as const).map(part=><Pressable key={part} accessibilityRole="button"
     accessibilityLabel={'Selecionar '+(part==='day'?'dia':part==='month'?'mês':'ano')+' de nascimento'}
     accessibilityHint="Abre uma lista de opções, sem utilizar o teclado"
     disabled={disabled} onPress={()=>setOpen(part)}
     style={[styles.field,disabled&&styles.disabled]}>
    <Text style={[styles.fieldText,!(part==='day'?day:part==='month'?month:year)&&styles.placeholder]}>{value(part)}</Text>
    <Text style={styles.chevron}>⌄</Text>
   </Pressable>)}
  </View>
  <Modal visible={open!==null} transparent animationType="slide" onRequestClose={()=>setOpen(null)}>
   <View style={styles.overlay}>
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar seleção da data" onPress={()=>setOpen(null)} style={styles.backdrop}/>
    <View style={styles.sheet}>
     <View style={styles.heading}>
      <Text style={styles.title}>{open==='day'?'Escolhe o dia':open==='month'?'Escolhe o mês':'Escolhe o ano'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={()=>setOpen(null)} style={styles.close}><Text style={styles.closeText}>✕</Text></Pressable>
     </View>
     <FlatList key={open} data={open?values:[]} keyExtractor={item=>String(item)}
       numColumns={open==='month'?2:3} contentContainerStyle={styles.options}
       keyboardShouldPersistTaps="handled" initialNumToRender={24}
       renderItem={({item})=><Pressable accessibilityRole="button"
         accessibilityLabel={open==='month'?MONTHS[item-1]:String(item)}
         accessibilityState={{selected:(open==='day'?day:open==='month'?month:year)===item}}
         onPress={()=>select(item)} style={[styles.option,(open==='day'?day:open==='month'?month:year)===item&&styles.selected]}>
        <Text style={styles.optionText}>{open==='month'?MONTHS[item-1]:item}</Text>
       </Pressable>}/>
    </View>
   </View>
  </Modal>
 </>;
}

const styles=StyleSheet.create({
 row:{flexDirection:'row',gap:9},
 field:{flex:1,minWidth:0,minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,borderWidth:1,borderColor:C.border,borderRadius:13,backgroundColor:C.surface,gap:4},
 fieldText:{color:C.white,fontWeight:'700',fontSize:14,flexShrink:1},placeholder:{color:C.muted},
 chevron:{fontSize:17,color:C.mint},disabled:{opacity:.55},
 overlay:{flex:1,justifyContent:'flex-end'},backdrop:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,.75)'},
 sheet:{backgroundColor:C.background,borderTopLeftRadius:22,borderTopRightRadius:22,maxHeight:'70%',paddingHorizontal:16,paddingTop:14,paddingBottom:30,borderWidth:1,borderColor:C.border},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:12},
 title:{fontSize:19,fontWeight:'900',color:C.white},close:{minWidth:44,minHeight:44,justifyContent:'center',alignItems:'center'},
 closeText:{fontSize:24,color:C.white},options:{paddingBottom:20,gap:9},
 option:{flex:1,minWidth:0,minHeight:48,alignItems:'center',justifyContent:'center',marginHorizontal:4,marginBottom:8,paddingHorizontal:5,borderRadius:10,borderWidth:1,borderColor:C.border,backgroundColor:C.surface2},
 selected:{borderColor:C.mint,backgroundColor:C.surface3},
 optionText:{color:C.white,fontSize:14,fontWeight:'700',textAlign:'center'}
});
