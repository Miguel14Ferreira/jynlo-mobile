import {request} from './api';

export type SocialPlace={id:string;label:string;subtitle:string};

/** Uses the same Google Places proxy as Jynlo Web; a public worldwide geocoder
 * remains available when Google has not been configured or is unavailable. */
export async function searchSocialPlaces(text:string,token:string|null):Promise<SocialPlace[]>{
 const query=text.trim().slice(0,100);
 if(query.length<2)return [];
 if(query.length>=3&&token){
  try{
   const reply=await request<{places?:SocialPlace[]}>(
    '/api/places/suggestions?q='+encodeURIComponent(query),{token});
   const items=(reply?.places||[]).filter(item=>typeof item.id==='string'&&
    typeof item.label==='string'&&item.label.trim()&&typeof item.subtitle==='string');
   if(items.length)return items.slice(0,10);
  }catch{/* Try the independent geographic index. */}
 }
 const [cities,places]=await Promise.all([
  (async():Promise<SocialPlace[]>=>{
   try{
    const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+
     new URLSearchParams({name:query,count:'12',language:'pt'}));
    if(!response.ok)return [];
    const data=await response.json() as {results?:Array<{id:number;name:string;country?:string;admin1?:string;admin2?:string}>};
    return (data.results||[]).filter(place=>Number.isSafeInteger(place.id)&&typeof place.name==='string'&&place.name.trim())
      .map(place=>({id:'geonames:'+place.id,label:place.name,subtitle:[place.admin2,place.admin1,place.country]
        .filter((value,index,all)=>value&&all.indexOf(value)===index&&value!==place.name).join(', ')}));
   }catch{return [];}
  })(),
  (async():Promise<SocialPlace[]>=>{
   try{
    const response=await fetch('https://photon.komoot.io/api/?'+
     new URLSearchParams({q:query,limit:'12',lang:'pt'}));
    if(!response.ok)return [];
    const data=await response.json() as {features?:Array<{properties?:{
      osm_id?:number;osm_type?:string;name?:string;street?:string;city?:string;
      district?:string;county?:string;state?:string;country?:string
    }}>};
    return (data.features||[]).flatMap(feature=>{
      const point=feature.properties;
      if(!point?.name||!point.osm_id||!point.osm_type)return [];
      const components=[point.street,point.district,point.city,point.county,point.state,point.country]
        .filter((part,index,all)=>part&&all.indexOf(part)===index&&part!==point.name);
      return [{id:'osm:'+point.osm_type+':'+point.osm_id,label:point.name,subtitle:components.join(', ')}];
    });
   }catch{return [];}
  })()
 ]);
 const seen=new Set<string>();
 return [...cities,...places].filter(place=>{
  const label=socialPlaceLabel(place).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
  if(seen.has(label))return false;
  seen.add(label);
  return true;
 }).slice(0,12);
}

export function socialPlaceLabel(place:SocialPlace):string{
 return [place.label.trim(),place.subtitle.trim()].filter(Boolean).join(', ').slice(0,160);
}
