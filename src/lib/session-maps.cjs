'use strict';

/** Only allow destinations accepted by the Jynlo Backend, without URL rewriting. */
function trustedGoogleMapsUrl(value){
 if(typeof value!=='string'||!value.trim()||value.length>512||/[\x00-\x1f\x7f]/.test(value))return null;
 try{
  const url=new URL(value.trim());
  const host=url.hostname.toLowerCase();
  const official=(host==='google.com'||host==='www.google.com')&&url.pathname.startsWith('/maps');
  const short=host==='maps.app.goo.gl'&&url.pathname.length>1;
  if(url.protocol!=='https:'||url.username||url.password||url.port||!(official||short))return null;
  return value.trim();
 }catch{return null;}
}

function usableVenueCoordinates(venue){
 const lat=Number(venue?.latitude),lon=Number(venue?.longitude);
 if(venue?.latitude==null||venue?.longitude==null||!Number.isFinite(lat)||!Number.isFinite(lon)
    ||Math.abs(lat)>90||Math.abs(lon)>180||(lat===0&&lon===0))return null;
 return {latitude:lat,longitude:lon};
}

function exactSessionMapPin(detail){
 if(!detail||detail.canSeeExactAddress!==true)return null;
 const pin=usableVenueCoordinates({latitude:detail.pinLatitude,longitude:detail.pinLongitude});
 if(pin)return pin;
 // A manually saved link might point elsewhere than the catalogue venue.
 if(trustedGoogleMapsUrl(detail.googleMapsUrl))return null;
 return usableVenueCoordinates(detail.venue);
}

function exactSessionMapsDestination(detail){
 if(!detail||detail.canSeeExactAddress!==true)return null;
 const chosen=trustedGoogleMapsUrl(detail.googleMapsUrl);
 if(chosen)return chosen;
 const coords=exactSessionMapPin(detail);
 if(coords)return 'https://www.google.com/maps/search/?api=1&query='+
   encodeURIComponent(coords.latitude+','+coords.longitude);
 const address=typeof detail.address==='string'?detail.address.trim():'';
 if(!address)return null;
 return 'https://www.google.com/maps/search/?api=1&query='+
   encodeURIComponent(address+(detail.city?', '+detail.city:''));
}

module.exports={trustedGoogleMapsUrl,usableVenueCoordinates,exactSessionMapPin,exactSessionMapsDestination};
