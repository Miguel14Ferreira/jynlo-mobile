'use strict';
// Keep a movable, zoomable caption entirely inside the actual preview area.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function stickerBounds(area,sticker,zoom=1,rotation=0,reservedTopPx=0){
 const width=Math.max(1,Number(area?.width)||1),height=Math.max(1,Number(area?.height)||1);
 const scale=clamp(Number.isFinite(zoom)?zoom:1,.5,3);
 const angle=(Number.isFinite(rotation)?rotation:0)*Math.PI/180;
 const rawW=Math.max(0,Number(sticker?.width)||0)*scale;
 const rawH=Math.max(0,Number(sticker?.height)||0)*scale;
 const boundingWidth=Math.abs(rawW*Math.cos(angle))+Math.abs(rawH*Math.sin(angle));
 const boundingHeight=Math.abs(rawW*Math.sin(angle))+Math.abs(rawH*Math.cos(angle));
 const halfX=Math.min(50,boundingWidth/width*50);
 const halfY=Math.min(50,boundingHeight/height*50);
 const maxY=100-halfY;
 const minY=Math.min(maxY,Math.max(halfY,(Math.max(0,Number(reservedTopPx)||0)+boundingHeight/2)/height*100));
 return {minX:halfX,maxX:100-halfX,minY,maxY};
}
function clampStickerPosition(geometry,area,sticker,reservedTopPx=0){
 const bounds=stickerBounds(area,sticker,geometry.zoom,geometry.rotation,reservedTopPx);
 return {...geometry,x:clamp(geometry.x,bounds.minX,bounds.maxX),y:clamp(geometry.y,bounds.minY,bounds.maxY)};
}
function storyMetadataReservedHeight(locationLabel,taggedUsernames){
 const location=typeof locationLabel==='string'&&locationLabel.trim().length>0;
 const mentions=typeof taggedUsernames==='string'&&taggedUsernames.trim().length>0;
 return location&&mentions?124:location?80:mentions?76:0;
}
module.exports={stickerBounds,clampStickerPosition,storyMetadataReservedHeight};
