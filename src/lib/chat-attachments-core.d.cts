import type {ImagePickerAsset} from 'expo-image-picker';
export declare const MAX_FILES:number;
export declare const MAX_TOTAL_BYTES:number;
export declare const MAX_PHOTO_BYTES:number;
export interface PrivateAttachmentMeta {index:number;filename:string;mimeType:string;size:number;}
export interface PrivateAttachment {index:number;name:string;mime:string|null;size:number|null;}
export declare function validateChatAlbum(files:ImagePickerAsset[],options?:{allowUnknownSize?:boolean}):string|null;
export declare function chatAttachmentList(message:{
 attachmentName?:string|null;attachmentMimeType?:string|null;attachmentSize?:number|null;
 attachments?:PrivateAttachmentMeta[]|null;deletedAt?:string|null;
}):PrivateAttachment[];

/** Native file measurement is mandatory for every private media upload. */
export declare function verifiedLocalChatMediaSize(actualSize:number,type:'image'|'video'):number;
/** Backwards-compatible helper for non-private photo metadata calculations. */
export declare function measuredPhotoSize(actualSize:number,pickerSize?:number):number;
/** Return IDs of the most recent image-bearing chat messages, bounded for auto preview. */
export declare function recentPreviewMessageIds(
 messages:Array<{
  id:number;deletedAt?:string|null;
  attachmentName?:string|null;attachmentMimeType?:string|null;attachmentSize?:number|null;
  attachments?:PrivateAttachmentMeta[]|null;
 }>,
 maxMessages?:number
):number[];

/** Confirm that all uploaded album files are represented by the server. */
export declare function confirmedChatAlbumReply(reply:{id?:number;attachments?:Array<{index:number;filename:string;mimeType:string;size:number}>}|null,requestedMimes:string[]):boolean;

/** Validate a single photo upload against its authenticated conversation. */
export declare function confirmedSingleChatPhotoReply(
 reply:{
  id?:number;deletedAt?:string|null;attachmentName?:string|null;attachmentMimeType?:string|null;attachmentSize?:number|null;
  replyToMessageId?:number|null;communityId?:number;kind?:string;sessionId?:number;senderUsername?:string;
  username2?:string;
 }|null,
 scope:'community'|'session'|'direct',conversationId:number|string,requestedMime:string,replyToId?:number|null
):boolean;
/** Append selected picker assets without replacing earlier files. */
export declare function appendChatMediaSelection(existing:ImagePickerAsset[],selected:ImagePickerAsset[]):{items:ImagePickerAsset[];error:string|null};
