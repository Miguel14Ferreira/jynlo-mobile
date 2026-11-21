import {DEMO_MODE,request} from './api';
import {shouldOffer,skipFileName} from './first-steps-core.cjs';

export interface FirstSteps {favoriteSports:string[];location:string|null;needed:boolean}

export function getFirstSteps(token:string):Promise<FirstSteps>{
 return request<FirstSteps>('/api/profile/me/first-steps',{token});
}
export function saveFirstSteps(token:string,favoriteSports:string[],location:string):Promise<FirstSteps>{
 return request<FirstSteps>('/api/profile/me/first-steps',{token,method:'PUT',body:{favoriteSports,location}});
}
export function sportsCatalog(token:string):Promise<string[]>{
 return request<string[]>('/api/profile/sports-catalog',{token});
}

async function skipFile(username:string){
 const {File,Paths}=await import('expo-file-system');
 return new File(Paths.document,skipFileName(username));
}
/** Remember on this device that the person chose "Agora não". */
export async function skipFirstSteps(username:string):Promise<void>{
 try{const f=await skipFile(username);await f.write(String(Date.now()));}catch{/* never block the app */}
}
async function skipped(username:string):Promise<boolean>{
 try{return (await skipFile(username)).exists;}catch{return false;}
}

const checked=new Set<string>();
/** Once per app run and account: true when the first-steps screen should open. */
export async function firstStepsDue(token:string|null,username:string|null):Promise<boolean>{
 if(!token||!username||DEMO_MODE||checked.has(username))return false;
 checked.add(username);
 if(await skipped(username))return false;
 try{return shouldOffer(await getFirstSteps(token),false);}catch{return false;}
}
