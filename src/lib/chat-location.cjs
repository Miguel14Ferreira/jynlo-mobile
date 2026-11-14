'use strict';
/** Only expose a link button for valid HTTPS coordinates deliberately shared in chat. */
function chatLocationUrl(text){
 if(typeof text!=='string'||text.length>4000)return null;
 const matches=text.match(/https:\/\/www\.google\.com\/maps\?q=(-?\d{1,3}(?:\.\d{1,8})?),(-?\d{1,3}(?:\.\d{1,8})?)(?=$|\s)/g);
 if(!matches?.length)return null;
 const url=matches[matches.length-1];
 const coords=url.match(/\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
 if(!coords)return null;
 const lat=Number(coords[1]),lng=Number(coords[2]);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return url;
}
module.exports={chatLocationUrl};
