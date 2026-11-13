'use strict';
// Native camera/gallery URIs can use a different format from picker metadata.
// Do not label MOV/HEIC as MP4/JPEG: changing the MIME label is not transcoding.
const formats=Object.freeze({
 jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
 mp4:'video/mp4',webm:'video/webm'
});
const unsupported=new Set(['mov','heic','heif','avi','mkv','3gp','m4v','bmp','tiff','tif']);
function mediaUriExtension(uri){
 if(typeof uri!=='string'||!uri)return null;
 const clean=uri.split(/[?#]/,1)[0].toLowerCase();
 const match=/\.([a-z0-9]{2,5})$/.exec(clean);
 return match?match[1]:null;
}
function isUnsupportedMediaContainer(uri){
 const extension=mediaUriExtension(uri);
 return extension!==null&&unsupported.has(extension);
}
function pickerMediaMime(asset){
 if(!asset||(asset.type!=='image'&&asset.type!=='video')||
  typeof asset.uri!=='string'||!asset.uri||
  isUnsupportedMediaContainer(asset.uri))return null;
 const declared=typeof asset.mimeType==='string'?asset.mimeType.toLowerCase():'';
 const extension=mediaUriExtension(asset.uri);
 const fromUri=extension?formats[extension]:null;
 const mime=declared||fromUri||null;
 if(!mime)return null;
 if(asset.type==='video'&&!mime.startsWith('video/'))return null;
 if(asset.type==='image'&&!mime.startsWith('image/'))return null;
 return Object.values(formats).includes(mime)?mime:null;
}
module.exports={mediaUriExtension,isUnsupportedMediaContainer,pickerMediaMime};
