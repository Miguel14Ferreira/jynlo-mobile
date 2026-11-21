import * as Location from 'expo-location';
import {DEMO_MODE,request} from './api';
import {approximate,emptyPreference,normalizePreference,type NearbyAlertPreference} from './nearby-alerts-core.cjs';

let demoPreference:NearbyAlertPreference=emptyPreference();

export async function myNearbyAlerts(token:string):Promise<NearbyAlertPreference>{
 if(!token)throw Error('Inicia sessão para gerir os avisos.');
 if(DEMO_MODE)return demoPreference;
 return normalizePreference(await request<unknown>('/api/notifications/me/nearby-sessions',{token}));
}

export async function saveNearbyAlerts(preference:NearbyAlertPreference,token:string):Promise<NearbyAlertPreference>{
 if(!token)throw Error('Inicia sessão para gerir os avisos.');
 const body=normalizePreference(preference);
 if(DEMO_MODE){demoPreference=body;return body;}
 return normalizePreference(await request<unknown>('/api/notifications/me/nearby-sessions',{token,method:'PUT',body}));
}

/** Asked only on an explicit tap; one reading, rounded to about 1 km. Never in the background. */
export async function approximatePosition():Promise<{latitude:number;longitude:number}>{
 const permission=await Location.requestForegroundPermissionsAsync();
 if(permission.status!=='granted')throw Error('Sem autorização de localização. Escolhe uma cidade da lista.');
 const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
 const rounded=approximate(point.coords.latitude,point.coords.longitude);
 if(!rounded)throw Error('O telemóvel não devolveu uma localização válida.');
 return rounded;
}
