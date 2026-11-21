export const MAX_AGE_MS:number;
export function isOffline(state:{isConnected?:boolean|null;isInternetReachable?:boolean|null}|null|undefined):boolean;
export function snapshotName(kind:string,owner:string|null|undefined):string;
export function usableSnapshot(raw:string|null|undefined,owner:string|null|undefined,now?:number,maxAge?:number):{data:unknown;savedAt:number}|null;
export function serializeSnapshot(data:unknown,owner:string|null|undefined,now?:number):string;
export function savedLabel(savedAt:number,now?:number):string;
