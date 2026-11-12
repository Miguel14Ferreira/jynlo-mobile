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
