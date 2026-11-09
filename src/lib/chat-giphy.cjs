'use strict';

/** Decode Jynlo's legacy GIPHY envelope without trusting remote URLs in chat text. */
function giphyImageUrl(text){
 if(typeof text!=='string'||!text.startsWith('[JYNLO:GIPHY:1]'))return null;
 try{
  const payload=JSON.parse(text.slice('[JYNLO:GIPHY:1]'.length));
  const id=payload&&typeof payload.id==='string'?payload.id:'';
  if(!/^[a-zA-Z0-9_-]{4,100}$/.test(id))return null;
  return 'https://media.giphy.com/media/'+encodeURIComponent(id)+'/giphy.gif';
 }catch{return null;}
}
module.exports={giphyImageUrl};
