import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import {publicShareUrl} from './public-share-core.cjs';

export interface PublicShareSetting {enabled:boolean;path:string;}
export type PublicShareTarget={kind:'TOURNAMENT';communityId:number;tournamentId:number}|{kind:'RANKING';communityId:number};
function endpoint(target:PublicShareTarget):string{
 const c='/api/communities/'+validTournamentId(target.communityId);
 return target.kind==='TOURNAMENT'?c+'/tournaments/'+validTournamentId(target.tournamentId)+'/public-page':c+'/public-ranking';
}
export async function publicShareSetting(target:PublicShareTarget,token:string):Promise<PublicShareSetting>{
 if(!token)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE)return {enabled:false,path:target.kind==='TOURNAMENT'?'/torneio/'+target.tournamentId:'/classificacao/'+target.communityId};
 return request<PublicShareSetting>(endpoint(target),{token});
}
/** Owner/Admin only; the server checks the role. Never retried automatically. */
export async function updatePublicShare(target:PublicShareTarget,enabled:boolean,token:string):Promise<PublicShareSetting>{
 if(!token)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE)throw Error('Alterações desativadas nesta demonstração.');
 return request<PublicShareSetting>(endpoint(target),{token,method:'PUT',body:{enabled}});
}
export {publicShareUrl};
