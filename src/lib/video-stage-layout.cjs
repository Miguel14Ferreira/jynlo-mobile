'use strict';
// Pure LiveKit camera selection. Do not reorder the track array owned by the SDK.
function chooseVideoStageTracks(tracks,maxPreviews=1){
 const selected=Array.isArray(tracks)?tracks.filter(track=>track&&track.participant&&typeof track.participant.isLocal==='boolean'):[];
 const ordered=[...selected].sort((a,b)=>Number(a.participant.isLocal)-Number(b.participant.isLocal));
 const limit=Number.isSafeInteger(maxPreviews)?Math.max(0,Math.min(maxPreviews,4)):1;
 return {dominant:ordered[0]||null,previews:ordered.slice(1,limit+1),remaining:Math.max(0,ordered.length-1-limit)};
}
function videoStageDimensions(width,height,expanded=false){
 const w=Number.isFinite(width)&&width>0?width:360;
 const h=Number.isFinite(height)&&height>0?height:760;
 const available=Math.max(180,h-(expanded?185:310));
 const preferred=w*(expanded?1.2:0.92);
 const stageHeight=Math.round(Math.min(Math.max(200,preferred),available));
 const previewWidth=Math.max(76,Math.min(112,Math.round(w*.27)));
 return {stageHeight,previewWidth,previewHeight:Math.round(previewWidth*1.25)};
}
module.exports={chooseVideoStageTracks,videoStageDimensions};
