'use strict';
// Pure helpers for Instagram-style photo gestures (double tap to like, pinch to zoom).
const DOUBLE_TAP_MS=280;
function isDoubleTap(previousAt,now,previousX,previousY,x,y){
 if(!previousAt)return false;
 return now-previousAt<=DOUBLE_TAP_MS&&Math.hypot(x-previousX,y-previousY)<=40;
}
function pinchScale(startDistance,distance){
 if(!(startDistance>0)||!(distance>0))return 1;
 return Math.min(4,Math.max(1,distance/startDistance));
}
function touchDistance(touches){
 if(!touches||touches.length<2)return 0;
 const [a,b]=touches;
 return Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY);
}
module.exports={DOUBLE_TAP_MS,isDoubleTap,pinchScale,touchDistance};
