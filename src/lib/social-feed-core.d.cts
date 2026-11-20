export declare function mediaKind(type:string):'image'|'video'|null;
export declare function validateMedia(type:string,size:number,forStory?:boolean):string|null;
export interface StoryGroup<T>{key:string;name:string;avatar:string|null;stories:T[];}
export declare function groupStories<T extends {id:number;expiresAt:string;createdAt:string;communityId:number|null;authorUsername:string;displayName:string;communityName:string|null;communityPhotoUrl:string|null;teamId?:number|null;teamName?:string|null;teamLogoUrl?:string|null;avatarUrl:string|null}>(mine:T[],entries:T[],at?:number):StoryGroup<T>[];
export declare function upcoming(s:{status:string;gameDate:string},at?:number):boolean;
export declare function futureWeek(s:{status:string;gameDate:string},at?:number):boolean;
export declare function uniqueSessions<T extends {id:number}>(created:T[],joined:T[]):T[];
export declare function mediaUrl(base:string,url:string|null|undefined):string|null;
