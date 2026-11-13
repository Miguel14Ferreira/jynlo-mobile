import type {MobileMedia} from './types';
export declare function confirmedSocialMediaReceipt(
 reply:{id?:unknown;postId?:unknown;imageUrl?:unknown;videoUrl?:unknown;
  mediaUrl?:unknown;video?:unknown;extraMedia?:unknown}|null,
 mediaTypes:Array<MobileMedia['mimeType']>,
 isStory:boolean
):boolean;
