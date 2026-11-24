export const DOUBLE_TAP_MS:number;
export function isDoubleTap(previousAt:number,now:number,previousX:number,previousY:number,x:number,y:number):boolean;
export function pinchScale(startDistance:number,distance:number):number;
export function touchDistance(touches:ReadonlyArray<{pageX:number;pageY:number}>|undefined):number;
