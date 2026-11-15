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
 try{
  const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+
   new URLSearchParams({name:query,count:'12',language:'pt'}));
  if(!response.ok)return [];
  const data=await response.json() as {results?:Array<{id:number;name:string;country?:string;admin1?:string;admin2?:string}>};
  return (data.results||[]).filter(place=>Number.isSafeInteger(place.id)&&typeof place.name==='string'&&place.name.trim())
    .map(place=>({id:'geonames:'+place.id,label:place.name,subtitle:[place.admin2,place.admin1,place.country]
      .filter((value,index,all)=>value&&all.indexOf(value)===index&&value!==place.name).join(', ')}))
    .slice(0,10);
 }catch{return [];}
}

export function socialPlaceLabel(place:SocialPlace):string{
 return [place.label.trim(),place.subtitle.trim()].filter(Boolean).join(', ').slice(0,160);
}
