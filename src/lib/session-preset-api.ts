import {DEMO_MODE,request} from './api';
import {validatePresetName,type SessionPreset,type SessionPresetSettings} from './session-preset-core.cjs';
const validId=(id:number)=>{if(!Number.isSafeInteger(id)||id<=0)throw Error('Perfil inválido.');return id;};
export async function myPresets(token:string):Promise<SessionPreset[]>{
 if(DEMO_MODE||!token)return [];
 return request<SessionPreset[]>('/api/sessions/presets',{token});
}
export async function createPreset(name:string,settings:SessionPresetSettings,token:string):Promise<SessionPreset>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para guardares perfis.');
 return request<SessionPreset>('/api/sessions/presets',{token,method:'POST',body:{name:validatePresetName(name),settings}});
}
export async function updatePreset(id:number,name:string,settings:SessionPresetSettings,token:string):Promise<SessionPreset>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para guardares perfis.');
 return request<SessionPreset>(`/api/sessions/presets/${validId(id)}`,{token,method:'PUT',body:{name:validatePresetName(name),settings}});
}
export async function deletePreset(id:number,token:string):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para gerires perfis.');
 await request<void>(`/api/sessions/presets/${validId(id)}`,{token,method:'DELETE'});
}
