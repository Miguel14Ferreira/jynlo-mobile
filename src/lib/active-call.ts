/** The call in progress on this device, so other screens can offer "back to the call". */
export type ActiveCall={peer:string;media:'voice'|'video'};
let current:ActiveCall|null=null;
const listeners=new Set<(call:ActiveCall|null)=>void>();
export function activeCall(){return current;}
export function setActiveCall(call:ActiveCall|null){
 if(current?.peer===call?.peer&&current?.media===call?.media)return;
 current=call;
 for(const listener of listeners)listener(current);
}
export function subscribeActiveCall(listener:(call:ActiveCall|null)=>void){
 listeners.add(listener);
 return()=>{listeners.delete(listener);};
}
