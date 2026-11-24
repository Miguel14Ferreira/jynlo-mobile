'use strict';
/** Pixels of a frame (window coordinates) hidden behind a keyboard whose top edge is at keyboardTop. */
function keyboardOverlap(frameY,frameHeight,keyboardTop){
 if(![frameY,frameHeight,keyboardTop].every(Number.isFinite))return 0;
 return Math.max(0,Math.round(frameY+frameHeight-keyboardTop));
}
/**
 * How far to scroll so a focused field is comfortably visible above the keyboard,
 * or below the visible top when it is hidden there. 0 means it is already visible.
 * Some keyboards (e.g. Samsung's toolbar row) are taller than the height Android
 * reports, so a field close to the keyboard is treated as hidden and moved to the
 * upper part of the free space instead of just above the reported keyboard edge.
 */
function scrollToReveal(fieldY,fieldHeight,keyboardTop,visibleTop=0,margin=24){
 if(![fieldY,fieldHeight,keyboardTop,visibleTop].every(Number.isFinite))return 0;
 const safeBottom=keyboardTop-Math.max(margin,96);
 const room=Math.max(0,safeBottom-visibleTop-margin);
 const bottom=fieldY+Math.min(fieldHeight,room);
 if(bottom>safeBottom){
  const target=visibleTop+Math.round((keyboardTop-visibleTop)*0.25);
  return Math.round(Math.max(bottom-safeBottom,fieldY-target));
 }
 if(fieldY<visibleTop+margin)return Math.round(fieldY-visibleTop-margin);
 return 0;
}
module.exports={keyboardOverlap,scrollToReveal};
