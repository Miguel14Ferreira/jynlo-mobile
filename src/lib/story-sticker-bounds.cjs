'use strict';
// Keep a movable, zoomable caption entirely inside the actual preview area.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function stickerBounds(area,sticker,zoom=1,rotation=0){
 const width=Math.max(1,Number(area?.width)||1),height=Math.max(1,Number(area?.height)||1);
 const scale=clamp(Number.isFinite(zoom)?zoom:1,.5,3);
 const angle=(Number.isFinite(rotation)?rotation:0)*Math.PI/180;
 const rawW=Math.max(0,Number(sticker?.width)||0)*scale;
 const rawH=Math.max(0,Number(sticker?.height)||0)*scale;
 const boundingWidth=Math.abs(rawW*Math.cos(angle))+Math.abs(rawH*Math.sin(angle));
 const boundingHeight=Math.abs(rawW*Math.sin(angle))+Math.abs(rawH*Math.cos(angle));
 const halfX=Math.min(50,boundingWidth/width*50);
 const halfY=Math.min(50,boundingHeight/height*50);
 return {minX:halfX,maxX:100-halfX,minY:halfY,maxY:100-halfY};
}
function clampStickerPosition(geometry,area,sticker){
 const bounds=stickerBounds(area,sticker,geometry.zoom,geometry.rotation);
 return {...geometry,x:clamp(geometry.x,bounds.minX,bounds.maxX),y:clamp(geometry.y,bounds.minY,bounds.maxY)};
}
module.exports={stickerBounds,clampStickerPosition};
