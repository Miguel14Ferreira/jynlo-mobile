export interface CommunityCreateInput { name:string;description:string|null;sport:string|null;visibility:'PUBLIC'|'PRIVATE'; }
export interface NormalizedCommunityCreate { name:string;description:string|null;sport:string;sports:string[];visibility:'PUBLIC'|'PRIVATE'; }
export function safeId(id:number|string):number;
export function communityUrl(id:number):string;
export function normalizeCommunityInput(input:CommunityCreateInput):NormalizedCommunityCreate;
export function makeStore():{
  get(id:number,user?:string|null):any;
  mine(user:string):any[];
  search(name?:string,sport?:string,page?:number):any;
  quota(user:string):{owned:number;limit:number;canCreate:boolean};
  create(input:CommunityCreateInput,user:string):any;
  joinPublic(id:number,user:string):any;
  requestJoin(id:number,user:string):any;
  myPendingRequest(id:number,user:string):any|null;
  pendingRequests(id:number,user:string):any[];
  acceptRequest(id:number,requestId:number,user:string):any;
  invite(id:number,toUser:string,byUser:string):any;
  myInvites(user:string):any[];
  acceptInvite(inviteId:number,user:string):any;
  rejectInvite(inviteId:number,user:string):void;
};
