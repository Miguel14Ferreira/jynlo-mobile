export interface PrivateGroupMember{username:string;displayName:string;profilePicUrl:string|null;admin:boolean;}
export interface PrivateGroup{id:number;title:string;creatorUsername:string;members:PrivateGroupMember[];createdAt:string;photoUrl:string|null;}
export interface PrivateGroupAttachment{index:number;filename:string;mimeType:string;size:number;}
export interface PrivateGroupMessage{id:number;groupId:number;sender:string;text:string;createdAt:string;replyToId?:number|null;editedAt?:string|null;deleted?:boolean;attachments?:PrivateGroupAttachment[];}
export interface InvitableFriend{username:string;fullName:string|null;nickname:string|null;profilePicUrl:string|null;}
export const MAX_MEMBERS:number;export const MAX_MESSAGE:number;
export function validateGroupTitle(title:string):string;
export function validateInvitees(usernames:string[],me:string|null,currentCount:number):string[];
export function validateGroupMessage(text:string):string;
export function mergeMessages(current:PrivateGroupMessage[],incoming:PrivateGroupMessage[]):PrivateGroupMessage[];
export function isCreator(group:PrivateGroup|null|undefined,me:string|null|undefined):boolean;
export function isMine(message:PrivateGroupMessage,me:string|null|undefined):boolean;
export function membersLabel(n:number):string;
export function editableGroupMessage(message:PrivateGroupMessage,me:string|null|undefined,now?:number):boolean;
export function replyQuote(messages:PrivateGroupMessage[],message:PrivateGroupMessage):{sender:string;text:string}|null;
export function invitableFriends<T extends InvitableFriend>(friends:T[],group:PrivateGroup|null,query:string):T[];
