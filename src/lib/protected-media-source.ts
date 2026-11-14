import {API_BASE} from './api';

/** Only Jynlo's own protected-media endpoint receives the user's bearer token.
 * Never attach credentials to public CDN URLs or externally supplied media. */
export function mediaRequestSource(uri:string,token:string|null|undefined){
 const base=API_BASE.replace(/\/$/,'');
 const ownProtected=uri.startsWith(base+'/api/profile-media/') &&
   !uri.slice(base.length).startsWith('//');
 return ownProtected&&token
   ? {uri,headers:{Authorization:'Bearer '+token}}
   : {uri};
}
