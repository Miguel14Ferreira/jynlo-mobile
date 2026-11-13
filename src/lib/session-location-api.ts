import {DEMO_MODE,request} from './api';
import * as Location from 'expo-location';

export type SessionCoordinates={latitude:number;longitude:number;accuracyMeters:number|null};
export type SessionResolvedLocation=SessionCoordinates&{city:string;address:string};
type ResolvedLink={latitude:number|null;longitude:number|null;resolvedUrl?:string};
type ReverseLocation={city:string|null;address:string|null;distanceMeters?:number|null};
export function validCoordinates(latitude:number,longitude:number):boolean{
 return Number.isFinite(latitude)&&Number.isFinite(longitude)&&
  Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
}
export function googleMapsPreview(latitude:number,longitude:number):string{
 if(!validCoordinates(latitude,longitude))throw Error('Coordenadas inválidas.');
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(latitude+','+longitude);
}
/** Only invoked by an explicit tap on "Estou no recinto"; never acquire background GPS. */
export async function getCurrentSessionCoordinates():Promise<SessionCoordinates>{
 const permission=await Location.requestForegroundPermissionsAsync();
 if(permission.status!=='granted')throw Error('Autoriza a localização durante a utilização ou escolhe outro método.');
 const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
 const {latitude,longitude,accuracy}=point.coords;
 if(!validCoordinates(latitude,longitude))throw Error('O telemóvel não devolveu coordenadas válidas.');
 return {latitude,longitude,accuracyMeters:typeof accuracy==='number'&&Number.isFinite(accuracy)?accuracy:null};
}
export async function resolveSessionMapLink(url:string,token:string):Promise<SessionCoordinates>{
 if(DEMO_MODE)throw Error('A resolução do mapa exige ligação à Jynlo.');
 const link=url.trim();
 if(link.length>1800||!/^https:\/\/(?:www\.)?(?:google\.[a-z.]+|maps\.app\.goo\.gl)\//i.test(link))
  throw Error('Cola uma ligação partilhada pelo Google Maps.');
 const result=await request<ResolvedLink>('/api/venues/resolve-map-link',{token,method:'POST',body:{url:link}});
 if(typeof result.latitude!=='number'||typeof result.longitude!=='number'||
    !validCoordinates(result.latitude,result.longitude))
  throw Error('Não foi possível obter um ponto desta ligação. Abre o Google Maps e partilha um pin específico.');
 return {latitude:result.latitude,longitude:result.longitude,accuracyMeters:null};
}
export async function describeSessionCoordinates(point:SessionCoordinates,token:string):Promise<SessionResolvedLocation>{
 if(DEMO_MODE)throw Error('A localização exige ligação à Jynlo.');
 const q=new URLSearchParams({latitude:String(point.latitude),longitude:String(point.longitude)});
 if(point.accuracyMeters!==null)q.set('accuracyMeters',String(point.accuracyMeters));
 const value=await request<ReverseLocation>('/api/venues/reverse-location?'+q,{token});
 const city=value.city?.trim()||'';
 const address=value.address?.trim()||'';
 if(!city||!address)throw Error('O serviço não encontrou uma morada completa. Insere-a manualmente e confirma o ponto no mapa.');
 return {...point,city,address};
}
