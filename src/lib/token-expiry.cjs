'use strict';
// This reads JWT expiry only for local UI/session housekeeping.
// The backend remains solely responsible for validating token signatures.
function accessTokenExpiresAt(token){
  if(typeof token!=='string')return null;
  const parts=token.split('.');
  if(parts.length!==3||!parts[1]||!/^[A-Za-z0-9_-]+$/.test(parts[1]))return null;
  try {
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const normalized=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    let buffer=0,bits=0,out='';
    for(const ch of normalized){
      const value=alphabet.indexOf(ch);
      if(value<0)return null;
      buffer=(buffer<<6)|value;bits+=6;
      if(bits>=8){bits-=8;out+=String.fromCharCode((buffer>>>bits)&255);}
    }
    const data=JSON.parse(out);
    return typeof data.exp==='number'&&Number.isSafeInteger(data.exp)&&data.exp>0
      ?data.exp*1000:null;
  }catch{return null;}
}
function isAccessTokenUsable(token,now=Date.now()){
  const expires=accessTokenExpiresAt(token);
  return expires!==null&&expires>now+15000;
}
module.exports={accessTokenExpiresAt,isAccessTokenUsable};
