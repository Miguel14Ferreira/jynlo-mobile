'use strict';
/** Validate the mobile API origin before constructing authenticated requests.
 * Reject userinfo, paths, queries and fragments even if the URL parser would
 * silently normalize them into a seemingly valid origin.
 */
function validateApiOrigin(value,{allowLocalhost=false}={}){
 if(typeof value!=='string'||!value||value!==value.trim())throw new Error('Origem da API inválida.');
 let url;
 try {url=new URL(value);}catch{throw new Error('Origem da API inválida.');}
 const localhost=allowLocalhost && url.protocol==='http:' && url.hostname==='localhost' && url.port!=='';
 if(!localhost && url.protocol!=='https:')throw new Error('A API Jynlo requer HTTPS (ou localhost para desenvolvimento).');
 if(!url.hostname||url.username||url.password||url.search||url.hash||
    (url.pathname&&url.pathname!=='/')||value.includes('\\')||
    // URL() can normalize an explicit default port, so reject ambiguous URLs.
    !/^https?:\/\/[^/?#]+\/?$/.test(value))throw new Error('A API Jynlo deve ser uma origem sem credenciais, caminhos ou parâmetros.');
 return url.origin;
}
module.exports={validateApiOrigin};
