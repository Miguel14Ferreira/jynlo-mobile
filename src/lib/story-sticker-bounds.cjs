'use strict';
// Keep a movable, zoomable caption entirely inside the actual preview area.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function stickerBounds(area,sticker,zoom=1){
 const width=Math.max(1,Number(area?.width)||1),height=Math.max(1,Number(area?.height)||1);
 const scale=clamp(Number.isFinite(zoom)?zoom:1,.5,3);
 const halfX=Math.min(50,Math.max(0,(Number(sticker?.width)||0)*scale/width*50));
 const halfY=Math.min(50,Math.max(0,(Number(sticker?.height)||0)*scale/height*50));
 return {minX:halfX,maxX:100-halfX,minY:halfY,maxY:100-halfY};
}
function clampStickerPosition(geometry,area,sticker){
 const bounds=stickerBounds(area,sticker,geometry.zoom);
 return {...geometry,x:clamp(geometry.x,bounds.minX,bounds.maxX),y:clamp(geometry.y,bounds.minY,bounds.maxY)};
}
module.exports={stickerBounds,clampStickerPosition};
