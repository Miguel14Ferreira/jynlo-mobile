'use strict';
/** Pixels of a frame (window coordinates) hidden behind a keyboard whose top edge is at keyboardTop. */
function keyboardOverlap(frameY,frameHeight,keyboardTop){
 if(![frameY,frameHeight,keyboardTop].every(Number.isFinite))return 0;
 return Math.max(0,Math.round(frameY+frameHeight-keyboardTop));
}
/**
 * How far to scroll so a focused field sits above the keyboard (with a margin),
 * or below the visible top when it is hidden there. 0 means it is already visible.
 */
function scrollToReveal(fieldY,fieldHeight,keyboardTop,visibleTop=0,margin=24){
 if(![fieldY,fieldHeight,keyboardTop,visibleTop].every(Number.isFinite))return 0;
 const limit=keyboardTop-margin;
 const bottom=fieldY+Math.min(fieldHeight,Math.max(0,limit-visibleTop-margin));
 if(bottom>limit)return Math.round(bottom-limit);
 if(fieldY<visibleTop+margin)return Math.round(fieldY-visibleTop-margin);
 return 0;
}
module.exports={keyboardOverlap,scrollToReveal};
