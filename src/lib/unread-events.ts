/** Tiny in-app signal: something changed the unread count (a chat was read or a message arrived). */
type Listener=()=>void;
const listeners=new Set<Listener>();
export function onUnreadChanged(listener:Listener):()=>void{listeners.add(listener);return()=>{listeners.delete(listener);};}
export function notifyUnreadChanged():void{for(const l of [...listeners]){try{l();}catch{/* ignore */}}}
